# UI 셀렉터 불안정 — 다중 fallback locator

> **문서 시점**: 2025.07 ~ 2025.08 `users_lifecycle` 시나리오 구현 기간  
> **현재 코드**: `nl-scenario-pipeline/playwright-test-e2e` (`agent-studio-users-test.spec.js` 사용자 클릭·상태 변경 분기)

---

## 1. 문제 개요

### 증상

`users_lifecycle`(등록 → 상세 확인 → 비활성화 → 삭제) 시나리오에서 **사용자 목록 행 클릭**, **상태 변경 버튼**, **상태 select** 단계가 간헐적으로 실패한다.

| 항목 | 내용 |
|------|------|
| 실패 지점 | 사용자 목록에서 특정 사용자 클릭, 상세 화면 [변경] 버튼, 상태 필드 select |
| 증상 | `locator.waitFor` 타임아웃, 클릭 대상 미발견 |
| 환경 | `data-testid` 미제공 Stage UI, 테이블·링크·드롭다운 혼재 DOM |

### 재현 조건

- 사용자 관리 목록·상세 화면에 **안정적인 단일 셀렉터**가 없음
- 동일 텍스트가 여러 DOM 계층(셀, 링크, 행)에 존재
- 상태 변경 UI가 `select` / `combobox` / 커스텀 드롭다운 등 **형태가 화면마다 상이**

---

## 2. 원인 분석

### 2.1 단일 locator의 한계

초기에는 `text="사용자명"` 또는 `tr:has-text(...)` 단일 선택자로 요소를 찾았으나, 아래 이유로 실패가 반복되었다.

| 원인 | 설명 |
|------|------|
| DOM 구조 다양성 | 사용자명이 `td`, `a`, `span` 등 태그에 따라 클릭 가능 영역이 다름 |
| 클릭 불가 요소 | 텍스트 노드는 보이나 클릭 이벤트는 상위 `tr`/`a`에만 연결 |
| 복수 [변경] 버튼 | 상세 화면에 필드별 [변경] 버튼이 여러 개 — 상태 변경용을 특정하기 어려움 |
| UI 컴포넌트 차이 | 상태 필드가 native `<select>`가 아닌 combobox일 수 있음 |

### 2.2 실패 메커니즘

```
Step: 사용자 목록에서 'auto테스트' 클릭
  → locator(`text="auto테스트"`) 1종 시도
  → 요소 없음 / 클릭 불가 / URL 미변경
  → 다음 Step 진행 불가 (연쇄 실패)
```

라이프사이클 시나리오는 **선행 Step 실패 시 후속 전체가 무의미**해지므로, 개별 locator의 복원력이 중요했다.

---

## 3. 해결 방안

### 3.1 선택한 해결책: 우선순위 fallback locator 체인

단일 셀렉터 실패 시 **다음 전략을 순차 시도**하고, 각 시도마다 성공·실패를 로그로 남긴다.

**사용자 목록 행 클릭 (4단계 fallback)**

```javascript
let clickSuccess = false;

// 방법 1: 직접 텍스트
try {
  await page.locator(`text="${targetUserName}"`).first().click();
  clickSuccess = true;
} catch (e) { /* 방법 2로 */ }

// 방법 2: 테이블 셀
if (!clickSuccess) {
  await page.locator(`td:has-text("${targetUserName}")`).first().click();
  clickSuccess = true;
}

// 방법 3: 링크
// 방법 4: 행 전체 (tr:has-text)
```

**상태 [변경] 버튼 (4단계 fallback)**

| 순서 | 전략 |
|------|------|
| 1 | `활성`/`Active` 텍스트 인접 [변경] 버튼 |
| 2 | `select`·status 클래스 근처 [변경] 버튼 |
| 3 | 모든 [변경] 버튼 순회 — 부모 텍스트에 `상태` 포함 여부 |
| 4 | 마지막 [변경] 버튼 (상태 변경이 하단에 위치하는 UI 관례) |

**상태 select (3단계 fallback)**

| 순서 | 전략 |
|------|------|
| 1 | `select` 첫 번째 요소 + `selectOption` |
| 2 | `select[name*="status"]` 등 구체 속성 |
| 3 | `[role="combobox"]` 클릭 후 option 선택 |

### 3.2 검토했으나 채택하지 않은 대안

| 대안 | 미채택 이유 |
|------|------------|
| `data-testid` 개발팀 요청 | Stage 앱 수정 권한·일정 없음, PoC 범위 초과 |
| Page Object 전면 도입 | `executeScenario()` CSV 패턴 구조와 맞지 않음 |
| 고정 `waitForTimeout`만 증가 | 근본 원인(요소 미발견) 미해결, 실행 시간만 증가 |

### 3.3 디버깅 보조

모든 fallback 실패 시 **스크린샷 저장**으로 수동 분석 경로를 확보했다.

```javascript
if (!clickSuccess) {
  await page.screenshot({ path: 'debug-user-not-found.png' });
}
```

Playwright 기본 아티팩트(영상, `failed.png`)와 함께, Step별 커스텀 스크린샷으로 **어느 fallback에서 멈췄는지** 로그와 대조 가능.

---

## 4. 해결 전후

### 해결 전

- 단일 locator → 사용자 클릭·상태 변경 단계 **간헐적 실패**
- 실패 원인 파악에 MCP 수동 탐색 반복 소요

### 해결 후

- 4단계(클릭)·4단계(변경 버튼)·3단계(select) fallback으로 **DOM 변형에 대한 복원력 확보**
- 콘솔 로그 `방법 N 성공/실패`로 실패 지점 즉시 특정
- `users_lifecycle` 시나리오 **구현·실행 가능** (당시 범위 내)

---

## 5. 검증 결과

| 지표 | 결과 |
|------|------|
| 사용자 클릭 | fallback 체인으로 목록→상세 전환 성공 |
| 상태 변경 UI | select/combobox 혼재 환경에서 3단계 fallback 동작 |
| 디버깅 | 실패 시 `debug-*.png` + Playwright 영상으로 원인 추적 |
| 범위 | `users_lifecycle` — 2025-08-04 회귀에서는 **미포함**(별도 검증) |

---

## 6. 결론

1. **원인**: `data-testid` 없는 Stage UI에서 단일 locator로는 DOM 변형을 커버할 수 없음.
2. **해결**: 우선순위 fallback 체인 + 시도별 로그 + 실패 스크린샷.
3. **교훈**: QA 자동화에서 셀렉터는 "정답 하나"보다 **실패 시 다음 전략**을 설계하는 것이 실무적. 장기적으로는 `getByRole`·`data-testid` 협의가 근본 해결책.

---

## 7. 관련 코드 위치

| 파일 | 역할 |
|------|------|
| `playwright-test-e2e/tests/agent-studio-users-test.spec.js` | 사용자 클릭 327~387행, [변경] 버튼 441~509행, 상태 select 511~580행 |
| `test-data/users-test-scenarios.csv` | `users_lifecycle` Step 정의 |

---

## 8. 체크리스트 — fallback locator 도입 시

- [ ] 실패하는 Step의 DOM을 MCP `browser_snapshot`으로 먼저 확인
- [ ] 클릭 가능한 요소 계층(텍스트 / 셀 / 링크 / 행)을 각각 locator 후보로 등록
- [ ] try/catch 또는 `clickSuccess` 플래그로 **순차 시도** (병렬 시도 지양)
- [ ] 각 시도에 `console.log('방법 N 성공/실패')` 추가
- [ ] 전체 실패 시 스크린샷·영상 경로 문서화
- [ ] 장기: 개발팀에 `data-testid` 또는 role 기반 마크업 협의
