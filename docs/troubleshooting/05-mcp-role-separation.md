# MCP 역할 분리 — 탐색 vs 회귀 실행

> **문서 시점**: 2025.06 ~ 2025.08 파이프라인 PoC 설계·검증 기간  
> **현재 코드**: `playwright-test-e2e`(회귀) + `playwright-mcp-e2e`(MCP CLI PoC) + Cursor MCP(탐색)

---

## 1. 문제 개요

### 배경

자연어 CSV 시나리오를 자동 실행하는 방법으로 **Playwright MCP를 직접 러너로 쓰는 방안**(`playwright-mcp-e2e`)과 **Playwright Test + `executeScenario()`**(`playwright-test-e2e`)을 동시에 검토했다.

### 핵심 질문

> "Cursor + Playwright MCP로 시나리오를 실행하면, 테스트 자동화 파이프라인이 완성되는가?"

### 증상 (MCP 단독 실행 시)

| 항목 | 내용 |
|------|------|
| `rules` 모드 | 정의된 Step 패턴만 실행 — `users_01_01` 전체, `users_01_02` 일부만 지원 |
| `llm` 모드 | 미지원 Step 탐색 가능하나 **비결정성** — 동일 시나리오 재실행 결과 변동 |
| CI 회귀 | HTML 리포트·영상·병렬 워커 등 Playwright Test 대비 인프라 부족 |
| Cursor 의존 | IDE 세션 기반 탐색은 팀원·CI에서 재현 어려움 |

---

## 2. 원인 분석

### 2.1 도구별 성격 차이

```
Playwright MCP                    Playwright Test
─────────────────                 ─────────────────
browser_* 도구 (프로토콜)          page / locator (코드 API)
LLM·rules로 Step 해석             executeScenario() 결정론적 분기
탐색·대화형에 강함                 CI·병렬·리포트에 강함
비결정성 (llm 모드)               동일 입력 → 동일 결과
```

### 2.2 PoC 비교 결과

| | `playwright-test-e2e` | `playwright-mcp-e2e` |
|---|----------------------|----------------------|
| 실행 | `npx playwright test` | `npm run run` |
| Step 해석 | `executeScenario()` | `rules.js` / `llm.js` |
| 회귀 적합성 | **9/9 통과**, 21.9s, 영상·리포트 | `rules` 제한적, `llm` 비결정 |
| OPENAI_API_KEY | 불필요 | `llm`만 필요 |
| Cursor | 탐색·작성 시만 (선택) | 불필요 |

### 2.3 잘못된 가정

| 가정 | 실제 |
|------|------|
| "MCP = 테스트 실행기" | MCP는 **브라우저 조작 프로토콜** — 러너·assertion·리포트는 별도 |
| "자연어면 LLM이 알아서 검증" | Expected Result 키워드 불일치 시 False Pass ([01-false-pass.md](./01-false-pass.md)) |
| "AI 주도 = 전 구간 AI" | 작성·탐색은 MCP, **회귀는 결정론적 코드**가 안정적 |

---

## 3. 해결 방안

### 3.1 선택한 아키텍처: 하이브리드 역할 분리

```
[작성·탐색]  Cursor + Playwright MCP
                  │  browser_snapshot, browser_generate_locator
                  │  UI 확인 · 셀렉터 초안 · CSV 문구 검증
                  ▼
         users-test-scenarios.csv + test-data.json
                  │
                  ▼
         executeScenario() 분기 반영 (spec)
                  │
[회귀·CI]         ▼
         npx playwright test ──► test-results/ · playwright-report/
```

| 레이어 | 도구 | 책임 |
|--------|------|------|
| 탐색·작성 | Playwright MCP (Cursor) | UI 구조 파악, 셀렉터·시나리오 초안, 실패 디버깅 |
| 시나리오 | CSV | 자연어 Step · Expected Result |
| 실행·검증 | Playwright Test | 결정론적 패턴 매칭, assertion, 아티팩트 |
| PoC 비교 | `playwright-mcp-e2e` | MCP 단독 러너 가능성 검증 (참고용) |

### 3.2 MCP 워크플로우 (작성 시)

[playwright-test-e2e/docs/mcp-workflow.md](../../playwright-test-e2e/docs/mcp-workflow.md)에 정리된 5단계:

1. `test-data.json`에 검증 메시지 추가 (필요 시)
2. CSV에 Step·Expected Result 초안
3. MCP로 브라우저에서 Step 수행·`browser_snapshot` 확인
4. `executeScenario()`에 분기·셀렉터 반영
5. `npx playwright test --grep "시나리오ID"` 회귀 확인

### 3.3 검토했으나 채택하지 않은 대안

| 대안 | 미채택 이유 |
|------|------------|
| MCP `llm` 모드만으로 회귀 | 비결정성·API 비용·CI 부적합 |
| MCP `rules`만으로 전 시나리오 | 패턴 추가마다 `rules.js` 유지보수 — 결국 `executeScenario()`와 동형 |
| Playwright Test 없이 MCP만 | 리포트·병렬·영상·워커 제어 미비 |

### 3.4 보안: MCP allowed-origins

Stage URL만 허용하도록 MCP 설정을 제한했다 (`.cursor/mcp.json`, `playwright-mcp-e2e` `config.js`).

```json
"args": [
  "@playwright/mcp@latest",
  "--caps=testing",
  "--allowed-origins",
  "https://your-test-url.example.com"
]
```

---

## 4. 해결 전후

### Before (단일 MCP 실행기 가정)

```
CSV ──► Playwright MCP (rules/llm) ──► 결과?
         ↑ 비결정 · 패턴 한계 · CI 미비
```

### After (하이브리드)

```
CSV ──► MCP (탐색·작성) ──► spec + CSV 정비
              │
              ▼
         Playwright Test (회귀) ──► 9/9 PASS · 리포트 · 영상
```

`playwright-mcp-e2e`는 **MCP 단독 실행 가능성을 검증하는 PoC**로 유지하고, **실무 회귀는 `playwright-test-e2e`**로 확정.

---

## 5. 검증 결과

| 지표 | `playwright-test-e2e` | `playwright-mcp-e2e` |
|------|----------------------|----------------------|
| 회귀 통과 | 9/9 (2025-08-04) | `rules`: `users_01_01` 전체 |
| 결정론 | ✅ `includes()` 분기 | `rules` ✅ / `llm` ❌ |
| CI·병렬 | ✅ workers·retry·리포트 | 제한적 |
| 탐색·작성 | Cursor MCP | CLI MCP (동일 프로토콜) |
| OPENAI_API_KEY | 불필요 | `llm`만 필요 |

---

## 6. 결론

1. **문제**: Playwright MCP를 테스트 **실행기**로만 쓰면 비결정성·패턴 커버리지·CI 인프라에서 한계.
2. **해결**: MCP = **탐색·작성**, Playwright Test = **회귀·CI** — 역할 분리.
3. **PoC 가치**: `playwright-mcp-e2e`로 MCP 단독 러너 한계를 **직접 검증**한 뒤 아키텍처 결정.
4. **교훈**: "AI 주도 테스트 자동화"는 **어디에 AI를 쓰고 어디를 결정론적 코드로 고정할지** 설계 문제다. 회귀 실행은 후자가 맞다.

---

## 7. 관련 코드·문서

| 파일 | 역할 |
|------|------|
| `playwright-test-e2e/docs/architecture.md` | MCP + Test 하이브리드 설계 |
| `playwright-test-e2e/docs/mcp-workflow.md` | Cursor MCP 탐색·작성 흐름 |
| `playwright-mcp-e2e/docs/architecture.md` | `rules` / `llm` 모드 비교 |
| `README.md` (루트) | 두 패키지 비교표 |
| `.cursor/mcp.json` | Cursor용 Playwright MCP 설정 |

---

## 8. 체크리스트 — MCP 도입 시 역할 분리

- [ ] MCP로 **UI 탐색·셀렉터 확인·CSV 초안** — 실행기로 착각하지 않기
- [ ] 회귀·CI는 **Playwright Test**(또는 동등한 결정론적 러너) 사용
- [ ] Expected Result는 코드 분기와 1:1 매핑 ([01-false-pass.md](./01-false-pass.md))
- [ ] `llm` 모드는 **탐색·PoC**에만 — 회귀 게이트에 넣지 않기
- [ ] `--allowed-origins`로 Stage URL 제한
- [ ] MCP 세션 결과(셀렉터·분기)는 **spec·CSV에 커밋** — 세션 자체는 재현 불가
