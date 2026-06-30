# 시나리오 작성 가이드 — Step 템플릿 · Expected Result 키워드

[`users-test-scenarios.csv`](users-test-scenarios.csv)를 수정할 때 참고하는 문서입니다.  
[playwright-test-e2e](../playwright-test-e2e/)의 Playwright Test가 CSV를 런타임에 읽고, `executeScenario()`가 **Step·Expected Result 문자열 패턴(`includes`)** 으로 UI 조작·검증을 수행합니다.

> **핵심**: 사람이 읽기 쉬운 문장 ≠ 코드가 인식하는 문장. 아래 **템플릿·키워드를 그대로** 쓰면 spec 수정 없이 실행 가능합니다.  
> 상세 배경: [01-false-pass.md](../docs/troubleshooting/01-false-pass.md)  
> **범위**: 본 가이드는 `playwright-test-e2e` · `executeScenario()` 기준입니다. [playwright-mcp-e2e](../playwright-mcp-e2e/) `rules.js` 패턴과는 다를 수 있습니다.

---

## 1. CSV 기본 규칙

### 1.1 컬럼

| 컬럼 | 설명 |
|------|------|
| `Scenario Id` | 시나리오 묶음 ID (`users_02_01` 등). spec의 `test()`와 1:1 대응해야 실행됨 |
| `Step Id` | 시나리오 내 순서 (1, 2, 3…) |
| `Precondition` | **문서용** — 코드가 자동 검증하지 않음 |
| `Step` | 사용자 행동 (UI 조작 트리거) |
| `Expected Result` | 기대 결과 (**검증 assertion 트리거**) |

### 1.2 CSV만 수정해도 되는 범위

| 가능 | 불가능 (개발자 협업 필요) |
|------|--------------------------|
| 기존 `Scenario Id` 행의 Step·Expected Result **문구 정비** | 새 `Scenario Id` 추가 |
| 아래 **등록된 템플릿·키워드** 범위 내 수정 | 새 Step 동작·새 검증 패턴 |
| 등록된 **플레이스홀더** 사용 | 새 플레이스홀더 (`{validation_messages.id_format}` 등 일부 미등록) |

### 1.3 주의 — 쉼표

CSV 로더는 단순 `split(',')`입니다. Step·Expected Result 안에 **쉼표가 많으면** 컬럼이 밀릴 수 있습니다. 가능하면 쉼표 대신 `·` 또는 문장을 짧게 유지하세요.

---

## 2. 플레이스홀더

실제 값은 아래 파일에서 관리합니다. CSV에는 **플레이스홀더만** 씁니다.

| 플레이스홀더 | 출처 |
|-------------|------|
| `{domain}` | `playwright-test-e2e/.env` → `BASE_URL` |
| `{test_users.A.id}`, `{test_users.A.password}` | `.env` |
| `{test_users.B.id}`, `{test_users.B.password}`, `{test_users.B.name}`, `{test_users.B.initial_password}` | `.env` |
| `{validation_messages.name_required}` 등 | `playwright-test-e2e/test-data/test-data.json` |
| `{invalid_test_data.wrong_names.wrong_name_1}` 등 | `test-data.json` |

### 등록된 `validation_messages` 키

| 키 | UI 문구 (예시) |
|----|----------------|
| `name_required` | 이름을 입력해주세요 |
| `id_required` | 아이디를 입력해주세요 |
| `name_min_length` | 이름은 최소 2자 이상이어야 합니다 |
| `id_format` | 아이디는 영문 소문자와 숫자만 사용 가능합니다 |
| `password_min_length` | 비밀번호는 최소 8자 이상이어야 합니다. |
| `password_confirm_required` | 비밀번호 확인을 입력해주세요. |
| `success_registration` | 사용자 등록이 완료되었습니다. |

> `replacePlaceholders()`에 **등록되지 않은 키**는 CSV에 써도 치환되지 않습니다. 새 메시지 추가 시 [CONTRIBUTING.md#유효성-검사-메시지-추가](../playwright-test-e2e/docs/CONTRIBUTING.md#유효성-검사-메시지-추가) 절차를 따릅니다.

---

## 3. Step 템플릿

Step은 `executeScenario()`의 **UI 조작 분기**를 트리거합니다.  
**굵은 부분**은 반드시 포함되어야 하는 키워드입니다.

### 3.1 로그인 (`users_01_01`)

| 용도 | Step 템플릿 |
|------|-------------|
| 접속 | `웹 브라우저에서 {domain}/login 접속` |
| 아이디 입력 | `로그인 화면에서 '아이디' 필드에 {test_users.A.id} 입력` |
| 비밀번호 입력 | `로그인 화면에서 '비밀번호' 필드에 {test_users.A.password} 입력` |
| 로그인 클릭 | `[로그인] 버튼 클릭` |
| 로드 대기 | `로그인 완료 후 화면 로드 대기` |

### 3.2 네비게이션 (`users_01_02`)

| 용도 | Step 템플릿 | 필수 키워드 |
|------|-------------|------------|
| 설정 찾기 | `대시보드 화면에서 좌측 사이드바의 '설정' 메뉴 찾기` | `설정` + `메뉴` + `찾기` |
| 설정 클릭 | `'설정' 메뉴 클릭` | `설정` + `클릭` |
| 사용자 관리 찾기 | `설정 하위 메뉴에서 '사용자 관리' 메뉴 찾기` | `사용자 관리` + `메뉴` + `찾기` |
| 사용자 관리 클릭 | `'사용자 관리' 메뉴 클릭` | `사용자 관리` + `클릭` |

> `users_02_*` 이후 시나리오는 spec에서 `performLogin()` · `navigateToUserManagement()`를 **먼저 호출**합니다. CSV의 `사용자 관리 화면으로 이동 (users_01_02와 동일한 과정)` 행은 **문서용**이며, 코드 분기가 없을 수 있습니다.

### 3.3 사용자 등록 화면

| 용도 | Step 템플릿 | 필수 키워드 |
|------|-------------|------------|
| 등록 버튼 | `사용자 목록 화면에서 '사용자 등록' 버튼 클릭` | `사용자 등록` + `버튼` |
| 빈 필드 등록 | `사용자 등록 화면에서 모든 필수 입력 필드를 비워둔 상태로 '[등록하기]' 버튼 클릭` | `모든 필수 입력 필드를 비워둔 상태로` + `[등록하기]` + `클릭` |
| 이름 입력 (정상) | `사용자 등록 화면에서 '이름' 필드에 {test_users.B.name} 입력` | `이름` + `필드` + `입력` |
| 이름 입력 (1자) | `… '이름' 필드에 {invalid_test_data.wrong_names.wrong_name_1} (1자) 입력` | `(1자)` |
| 이름 입력 (숫자) | `… (숫자 포함) 입력` | `(숫자 포함)` |
| 이름 입력 (특수문자) | `… (특수문자 포함) 입력` | `(특수문자 포함)` |
| 아이디 입력 (정상) | `'아이디' 필드에 {test_users.B.id} 입력` | `아이디` + `필드` + `입력` |
| 아이디 (3자 미만) | `… (3자 미만) 입력` | `(3자 미만)` |
| 아이디 (대문자) | `… (대문자 포함) 입력` | `(대문자 포함)` |
| 아이디 (특수문자) | `… (특수문자 포함) 입력` | `(특수문자 포함)` |
| 비밀번호 | `'비밀번호' 필드에 {test_users.B.password} 입력` | `비밀번호` + `필드` + `입력` |
| 비밀번호 (초기) | `'비밀번호' 필드에 {test_users.B.initial_password} 입력` | `initial_password` 값 포함 |
| 비밀번호 확인 | `'비밀번호 확인' 필드에 … 입력` | `비밀번호 확인` + `필드` + `입력` |
| 등록하기 | `'[등록하기]' 버튼 클릭` | `등록하기` + `클릭` |
| 성공 확인 클릭 | `성공 얼럿의 '[확인]' 버튼 클릭 (있는 경우)` | `확인` + `버튼` |

### 3.4 라이프사이클 (`users_lifecycle` — `users_03_02` ~ `users_05_01`)

| 용도 | Step 템플릿 | 필수 키워드 |
|------|-------------|------------|
| 사용자 클릭 | `사용자 목록 화면에서 '아이디'가 {test_users.B.id}인 사용자를 클릭` | `사용자 목록 화면에서` + `사용자를 클릭` |
| 상세 확인 | `사용자 상세 화면에서 사용자 정보 확인` | 동일 문구 |
| 변경 버튼 | `사용자 상세 화면에서 [변경] 버튼 클릭` | `[변경] 버튼 클릭` |
| 비활성화 | `상태 필드를 '활성'에서 '비활성'으로 변경` | `상태 필드를` + `변경` + `활성` + `비활성` |
| 삭제 | `상태 필드를 '비활성'에서 '삭제'로 변경` | `비활성` + `삭제` |
| 저장 | `[저장] 버튼 클릭` | `[저장] 버튼 클릭` |
| 목록 | `화면 상단 [목록] 버튼 클릭` | `[목록] 버튼 클릭` |
| 상태 확인 | `사용자 목록에서 {test_users.B.id} 사용자의 상태 확인` | `사용자 목록에서` + `상태 확인` |
| 삭제 확인 | `사용자 목록에서 {test_users.B.id} 사용자 존재 여부 확인` | `존재 여부 확인` |

---

## 4. Expected Result 키워드

**검증(assertion)은 Expected Result** 문자열로만 트리거됩니다. Step에만 키워드를 넣으면 **검증이 스킵**될 수 있습니다(False Pass).

### 4.1 공통 — 화면·네비게이션

| 검증 내용 | Expected Result에 포함할 키워드 | 비고 |
|-----------|------------------------------|------|
| 로그인 화면 | `로그인 화면이 표시된다` | |
| 로그인 성공 | `대시보드` 또는 `로그인 성공` | |
| 사용자 목록 URL | `/users` | URL 포함 문자열 |
| 등록 화면 이동 | `사용자 등록 화면으로 이동한다` | |
| 목록·등록 버튼 | `사용자 목록` 또는 `사용자 등록 버튼` | |
| 상세 화면 | `사용자 상세 화면이 표시된다` | |
| 편집 모드 | `사용자 정보 편집 모드로 전환된다` | |
| 저장 완료 | `변경사항이 저장되고 저장 완료 메시지가 표시된다` | |
| 목록 이동 | `사용자 목록 화면으로 이동한다` | |

### 4.2 유효성 검사 (필수 규격)

반드시 Expected Result에 **`유효성 검사 오류`** 가 포함되어야 합니다.

| 검증 내용 | Expected Result 템플릿 |
|-----------|-------------------------|
| 빈 필드 4건 (`users_02_01`) | `1) '이름' 입력 필드에 포커스가 이동한다, 2) 유효성 검사 오류 메시지가 4개 노출된다: '{validation_messages.name_required}', '{validation_messages.id_required}', '{validation_messages.password_min_length}', '{validation_messages.password_confirm_required}'` |
| 이름 오류 1건 | `1) '이름' 입력 필드에 포커스가 이동한다, 2) 유효성 검사 오류 메시지가 노출된다: '{validation_messages.name_min_length}'` |
| 아이디 오류 1건 | `1) '아이디' 입력 필드에 포커스가 이동한다, 2) 유효성 검사 오류 메시지가 노출된다: '{validation_messages.id_format}'` |

**4개 노출** vs **1개 노출** 키워드가 다릅니다. 혼용하지 마세요.

| 사용 금지 (False Pass 위험) | 이유 |
|----------------------------|------|
| `에러 메시지가 노출된다` | `유효성 검사 오류` 키워드 없음 |
| `빨간색 오류 문구 노출` | 시각적 설명만, 분기 미진입 |
| `유효성 검사 오류 아이콘 4개` | `유효성 검사 오류` 없음 |

### 4.3 등록 성공

| 검증 내용 | Expected Result 템플릿 |
|-----------|-------------------------|
| 등록 성공 | `1) '{validation_messages.success_registration}' 성공 얼럿이 표시되거나, 2) 사용자 목록 화면으로 자동 리다이렉트된다` |

`성공` · `완료` · `성공 얼럿이 표시되거나` · `사용자 등록 성공 확인` 키워드로도 분기됩니다.

---

## 5. 시나리오별 빠른 참조

| Scenario Id | spec `test()` | CSV만 수정 가능 범위 |
|-------------|---------------|---------------------|
| `users_01_01` | ✅ | 로그인 Step·Expected Result |
| `users_01_02` | ✅ | 네비게이션 Step·Expected Result |
| `users_02_01` ~ `users_02_07` | ✅ | 유효성 Step·Expected Result (§4.2 규격 준수) |
| `users_03_01` | ✅ | 등록 Step·Expected Result |
| `users_03_02` ~ `users_05_01` | `users_lifecycle` 내 순차 실행 | §3.4 템플릿 준수 |
| **새 ID** | ❌ 미등록 | spec + `executeScenario()` 추가 필요 |

---

## 6. 작성·수정 체크리스트

수정 후 PR·실행 요청 전에 확인하세요.

- [ ] `Scenario Id`가 spec에 등록된 ID인가?
- [ ] Step에 해당 템플릿의 **필수 키워드**가 모두 포함되는가?
- [ ] 유효성 검사 Expected Result에 **`유효성 검사 오류`** 가 있는가?
- [ ] 메시지는 **`{validation_messages.키}`** 로 참조하는가? (하드코딩 지양)
- [ ] `test-data.json`의 문구가 **현행 UI**와 일치하는가?
- [ ] Step·Expected Result에 **불필요한 쉼표**가 없는가?
- [ ] 실행: `npx playwright test --grep "시나리오ID"`

```bash
cd playwright-test-e2e
npx playwright test --grep "users_02_01"
npx playwright show-report
```

---

## 7. 관련 문서

| 문서 | 내용 |
|------|------|
| [CONTRIBUTING.md](../playwright-test-e2e/docs/CONTRIBUTING.md) | 새 시나리오·코드 추가 절차 |
| [mcp-workflow.md](../playwright-test-e2e/docs/mcp-workflow.md) | MCP로 UI 확인 후 CSV 반영 |
| [architecture.md](../playwright-test-e2e/docs/architecture.md) | CSV · `executeScenario` 설계 |
| [01-false-pass.md](../docs/troubleshooting/01-false-pass.md) | False Pass 상세 |
