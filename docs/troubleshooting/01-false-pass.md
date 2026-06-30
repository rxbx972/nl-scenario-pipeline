# 유효성 검사 Expected Result 불일치 — False Pass

> **문서 시점**: 2025.06 ~ 2025.08 파이프라인 구축·정비 기간  
> **현재 코드**: `nl-scenario-pipeline/playwright-test-e2e` (`executeScenario()` 패턴 매칭 + CSV 플레이스홀더)

---

## 1. 문제 개요

### 증상

유효성 검사를 검증하는 테스트 케이스임에도, **Expected Result 문구가 코드 분기와 맞지 않으면** 검증 로직이 실행되지 않는데도 Playwright 리포트에는 **PASS(통과)** 로 표시된다. 이를 **False Pass(거짓 통과)** 라고 부른다.

> 예시:  
> "필수 입력값을 비운 채 저장 버튼을 클릭하면 에러 메시지가 노출된다"  
> → 사람이 읽기에는 유효성 검사 의도가 분명하지만, 자동화 코드는 이 문장을 인식하지 못함.

### 위험성

| 구분 | 설명 |
|------|------|
| **False Pass** | 리포트·CI에는 PASS로 기록되나, 유효성 검사 assertion은 실행되지 않음 |
| **탐지 난이도** | Step(UI 조작)은 정상 실행되어 실패 로그·영상만으로는 놓치기 쉬움 |
| **영향 범위** | `users_02_*` 유효성 검사 시나리오 전반 |

---

## 2. 실행 구조 (배경)

```
users-test-scenarios.csv
    Step              → UI 조작 분기 (step.includes(...))
    Expected Result   → 검증 분기 (expectedResult.includes(...))
           │
           ▼
    replacePlaceholders()  — {validation_messages.*} 등 치환
           │
           ▼
    executeScenario()  — includes() 패턴 매칭
```

- **Step**: "등록하기 버튼 클릭", "이름 필드에 … 입력" 등 **행동** 기술
- **Expected Result**: "유효성 검사 오류 메시지가 노출된다: …" 등 **기대 결과** 기술
- 검증은 **Expected Result 문자열**을 기준으로 분기한다. Step 문구만으로는 유효성 검사 분기가 트리거되지 않는다.

---

## 3. 원인 분석

### 3.1 코드 동작

`executeScenario()`는 Expected Result에 특정 키워드가 **포함(`includes`)** 되어야 해당 검증 블록이 실행된다.

```javascript
// expectedResult 기준 분기 (요약)
if (expectedResult.includes('유효성 검사 오류')) {
    if (expectedResult.includes('유효성 검사 오류 메시지가 4개 노출된다')) {
        // users_02_01: 4개 메시지 + 포커스 엄격 검증
    } else {
        // fallback: 빨간 테두리 또는 일반 오류 문구 (느슨한 검증)
    }
} else if (expectedResult.includes('이름 유효성 검사 결과 확인')) {
    // 이름 필드 포커스 + name_min_length 메시지 엄격 검증
} else if (expectedResult.includes('아이디 유효성 검사 결과 확인')) {
    // 아이디 필드 포커스 + id_format 메시지 엄격 검증
}
// ↑ 어느 분기에도 해당하지 않으면 유효성 검사 검증 없이 통과
```

**핵심**: 자연어 시나리오가 "사람에게 읽히는 문장"이어도, 코드가 정의한 **키워드 문자열**과 일치하지 않으면 검증 블록 자체에 진입하지 않는다.

### 3.2 인식 실패 케이스

| 기존 Expected Result (또는 Step) | 실패 이유 |
|----------------------------------|-----------|
| "에러 메시지가 노출된다" | `유효성 검사 오류` 키워드 없음 → **분기 미진입 (False Pass)** |
| "유효성 검사 오류 표시 아이콘이 4개 노출된다" | `유효성 검사 오류` 없음, 아이콘·시각적 표현만 기술 |
| "입력 필드 하단에 유효성 검사 문구가 표시된다" | 유사 표현이나 코드 정의 키워드와 불일치 |
| "입력창 하단에 빨간색으로 '이름은…' 문구 노출된다" | 시각적 설명 위주, 트리거 키워드 없음 |

> 구 버전 문서의 "인식 기준: `유효성 검사 결과`"는 **부정확**하다.  
> 실제 트리거는 Expected Result의 **`유효성 검사 오류`** (및 하위 패턴)이다.

### 3.3 False Pass가 발생하는 메커니즘

```
Step: [등록하기] 클릭          → step 분기 실행 ✅ (UI 조작 성공)
Expected Result: "에러 메시지 노출"
                              → expectedResult 분기 없음 ❌ (검증 스킵)
Playwright 리포트: PASS        → assertion 없이 통과 처리됨 (False Pass)
```

Step은 정상 수행되므로 `npx playwright test` 결과는 **passed**로 나오지만, **유효성 검사 expect()는 한 번도 호출되지 않은** 상태다.

---

## 4. 해결 방안

### 4.1 Expected Result 표준 명세 정의

유효성 검사 시나리오의 Expected Result는 아래 규격을 따른다.

| 패턴 | 용도 | 예시 |
|------|------|------|
| `유효성 검사 오류` + `…4개 노출된다` + `{validation_messages.*}` × 4 | 빈 필드 등록 (`users_02_01`) | `유효성 검사 오류 메시지가 4개 노출된다: '{validation_messages.name_required}', …` |
| `유효성 검사 오류` + `…노출된다` + `{validation_messages.키}` | 필드별 단일 메시지 | `유효성 검사 오류 메시지가 노출된다: '{validation_messages.name_min_length}'` |

**플레이스홀더 규칙**

- UI 실제 문구는 `test-data.json` → `validation_messages`에 저장
- CSV Expected Result에서는 `{validation_messages.키}`로 참조
- `replacePlaceholders()`가 실행 시점에 실제 문자열로 치환

```json
// test-data.json (발췌)
"validation_messages": {
  "name_required": "이름을 입력해주세요",
  "name_min_length": "이름은 최소 2자 이상이어야 합니다",
  "id_format": "아이디는 영문 소문자와 숫자만 사용 가능합니다"
}
```

### 4.2 Before / After

| Before | After |
|--------|-------|
| "입력창 하단에 빨간색 오류 문구 노출됨" | `유효성 검사 오류 메시지가 노출된다: '{validation_messages.name_min_length}'` |
| "유효성 검사 오류 표시 아이콘이 4개 노출된다" | `유효성 검사 오류 메시지가 4개 노출된다: '{validation_messages.name_required}', '{validation_messages.id_required}', '{validation_messages.password_min_length}', '{validation_messages.password_confirm_required}'` |
| "필수 입력값을 비우면 에러 메시지가 노출된다" | `유효성 검사 오류 메시지가 4개 노출된다: …` (users_02_01 표준 문장) |

### 4.3 정비 후 CSV 예시 (현재)

**users_02_01 — 빈 필드**

```
Step:            유효성 검사 결과 확인
Expected Result: 1) '이름' 입력 필드에 포커스가 이동한다,
                 2) 유효성 검사 오류 메시지가 4개 노출된다:
                    '{validation_messages.name_required}', '{validation_messages.id_required}', …
```

**users_02_02 — 이름 최소 길이**

```
Step:            이름 유효성 검사 결과 확인
Expected Result: 1) '이름' 입력 필드에 포커스가 이동한다,
                 2) 유효성 검사 오류 메시지가 노출된다: '{validation_messages.name_min_length}'
```

### 4.4 정비 절차

1. 유효성 검사 관련 CSV 행 **전수 검토**
2. Expected Result를 표준 키워드 + `{validation_messages.*}` 형식으로 수정
3. `test-data.json`의 `validation_messages` 값이 **현행 UI 문구**와 일치하는지 확인
4. `npx playwright test --grep "users_02"` 로 회귀 실행

---

## 5. 검증 강도와 설계 메모

### 5.1 분기별 검증 수준

| 분기 조건 | 검증 수준 | 대상 시나리오 |
|-----------|-----------|---------------|
| `유효성 검사 오류` + `4개 노출된다` | **엄격** — 4개 메시지 locator + 포커스 | `users_02_01` |
| `이름/아이디 유효성 검사 결과 확인` (Expected Result) | **엄격** — 필드별 메시지 locator + 포커스 | 코드상 분기 존재 |
| `유효성 검사 오류` (그 외) | **느슨** — 빨간 테두리 또는 일반 오류 문구 | fallback |

`users_02_02` ~ `users_02_07`은 Expected Result에 `유효성 검사 오류`가 포함되어 **최소한 유효성 분기에는 진입**한다. `users_02_01`은 `4개 노출` 하위 패턴으로 **메시지별 엄격 검증**이 수행된다.

### 5.2 Step vs Expected Result (후속 개선 여지)

현재 CSV에서 `이름 유효성 검사 결과 확인`은 **Step** 컬럼에 있으나, 코드의 엄격 분기(667행)는 **Expected Result**에서 해당 문자열을 찾는다.

```
Step:            이름 유효성 검사 결과 확인     ← QA 관점 "확인 행동"
Expected Result: … 유효성 검사 오류 메시지가 …  ← 코드가 읽는 "검증 트리거"
```

향후 개선 방향 (참고):

- Expected Result에도 `이름 유효성 검사 결과 확인`을 포함하거나
- 코드에서 Step·Expected Result를 함께 검사하도록 분기 통합

인시던트 해결의 1차 목표는 **False Pass(검증 0회) 제거**였고, 위 설계는 그 이후 정밀도 향상 과제로 남긴다.

---

## 6. 해결 전후

### 6.1 해결 전

- 유효성 시나리오 중 상당수가 **검증 분기 미진입** → False Pass
- MCP·수동 작성 시나리오마다 Expected Result 표현이 제각각
- UI 문구 변경 시 CSV·코드 양쪽을 뒤져야 함

### 6.2 해결 후

- 유효성 검사 시나리오 Expected Result **표준화 완료**
- UI 메시지는 `test-data.json` 단일 소스 → CSV는 플레이스홀더 참조
- `users_02_01` 포함 유효성 시나리오 **False Pass 0건** (2025-08-04 회귀 기준)

---

## 7. 검증 결과

| 지표 | 결과 |
|------|------|
| False Pass | 유효성 시나리오 **0건** (정비 후) |
| 회귀 실행 | 2025-08-04: **9/9 통과**, 21.9초 |
| 유효성 커버리지 | `users_02_01`(빈 필드), `users_02_02`~`07`(이름·아이디) |
| 제외 | `users_02_03`, `users_lifecycle` (당시 미실행) |

---

## 8. 결론

1. **원인**: `executeScenario()`는 Expected Result `includes()` 분기 구조. 모호한 자연어는 **분기 미진입 → False Pass**.
2. **해결**: Expected Result를 **`유효성 검사 오류` + `{validation_messages.*}`** 표준 명세로 규격화하고 CSV 전수 정비.
3. **부가 효과**: 검증 메시지를 JSON 데이터로 분리 → UI 문구 변경 시 유지보수 비용 감소.
4. **교훈**: 자연어 시나리오 자동화에서 Expected Result는 "설명 문장"이 아니라 **실행 코드와 1:1 매핑되는 명세**다. QA가 시나리오를 쓸 때 인식 가능한 키워드 목록(가이드)을 함께 제공해야 한다.

---

## 9. 관련 코드·문서 (현재 레포)

| 파일 | 역할 |
|------|------|
| `test-data/users-test-scenarios.csv` | Step · Expected Result 시나리오 |
| `playwright-test-e2e/test-data/test-data.json` | `validation_messages`, `invalid_test_data` |
| `playwright-test-e2e/tests/agent-studio-users-test.spec.js` | `executeScenario()` 유효성 검사 분기 (638~694행) |
| `playwright-test-e2e/docs/CONTRIBUTING.md` | 유효성 메시지 추가 절차 |
| `playwright-test-e2e/docs/mcp-workflow.md` | MCP 탐색 → CSV 반영 워크플로우 |
| `test-data/scenario-writing-guide.md` | Step 템플릿 · Expected Result 키워드 (False Pass 예방용) |

---

## 10. 새 시나리오 작성 체크리스트

> 전체 Step·Expected Result 템플릿: [scenario-writing-guide.md](../../test-data/scenario-writing-guide.md) §3~§4

유효성 검사 Expected Result 작성 시 아래를 확인한다.

- [ ] Expected Result에 **`유효성 검사 오류`** 키워드 포함
- [ ] 메시지는 **`{validation_messages.키}`** 플레이스홀더로 참조 (하드코딩 지양)
- [ ] `test-data.json`에 해당 키·UI 실제 문구 등록
- [ ] 4개 동시 노출 케이스는 **`4개 노출된다`** 하위 패턴 사용
- [ ] `executeScenario()`에 대응 분기 존재 여부 확인 (없으면 CONTRIBUTING 절차로 분기 추가)
- [ ] `--grep "시나리오ID"` 로 단독 실행 후 HTML 리포트·영상 확인
