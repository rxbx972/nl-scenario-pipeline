# Architecture

## 설계 결정

### CSV로 시나리오를 분리한 이유

시나리오 Step·Expected Result를 루트 `test-data/users-test-scenarios.csv`에 두어, 기존 Step 패턴 범위 안에서는 spec 수정 없이 문구만 갱신할 수 있게 했습니다. 새 Step 패턴·플레이스홀더는 `replacePlaceholders()`·`executeScenario()` 수정이 필요합니다. Playwright는 CSV를 런타임에 로드하고 `replacePlaceholders()`로 값을 치환합니다.

### `executeScenario` 패턴 매칭

Step·Expected Result 텍스트를 `includes()`로 분기해 UI 조작·검증을 수행합니다. CSV 문구와 코드가 1:1로 대응해 추적이 쉽지만, UI 변경 시 분기 수정 범위가 넓어지는 트레이드오프가 있습니다.

### 데이터 분리 (`.env` / `test-data.json`)

| 저장소 | 내용 |
|--------|------|
| `.env` | URL, 계정, 비밀번호 |
| `test-data.json` | 검증 메시지, 유효성 실패 입력값 |
| `test-data/users-test-scenarios.csv` (모노레포 루트) | 시나리오 Step·Expected Result |

Node(`load-test-data.js`)가 Playwright 실행 시 `.env`와 JSON을 병합합니다. Python 쪽은 `generate_unique_id.py`가 `.env`의 `TEST_USER_B_ID`만 갱신할 때 `load_test_data.py`를 사용합니다.

### Playwright MCP + Playwright Test (하이브리드)

| 레이어 | 도구 | 저장 위치 |
|--------|------|----------|
| 탐색·작성 | Playwright MCP (`@playwright/mcp`) | Cursor 세션 (커밋 안 됨) |
| 시나리오 (CSV) | 자연어 Step·Expected Result | 루트 `test-data/users-test-scenarios.csv` |
| 자동화 코드 | Playwright Test | `tests/*.spec.js` |
| 회귀 실행 | `npx playwright test` | `test-results/`, `playwright-report/` |

```
[개발]  CSV Step ──► Cursor + Playwright MCP (탐색·검증)
                           │
                           ▼
                    executeScenario() 반영
                           │
[실행]                     ▼
              npx playwright test ──► 리포트·영상
```

MCP 설정: [`.cursor/mcp.json`](../../.cursor/mcp.json) · 워크플로우: [mcp-workflow.md](mcp-workflow.md)

## 데이터 흐름

```
.env ──────────────┐
                   ├── load-test-data.js ──► testData
test-data.json ────┘

루트 test-data/users-test-scenarios.csv ──► loadScenarios()
                         └── replacePlaceholders() ──► executeScenario()
```

`test.beforeAll`에서 `generate_unique_id.py`가 `.env`의 `TEST_USER_B_ID`를 갱신한 뒤, 위 흐름으로 테스트가 실행됩니다.

프로젝트·파일 구조는 [README.md](../README.md#프로젝트-구조)를 참고하세요.

### test-data.json 키

| 키 | 설명 |
|----|------|
| `validation_messages` | UI 오류·성공 메시지 7종 |
| `invalid_test_data.wrong_names` | 이름 실패 입력 3종 |
| `invalid_test_data.wrong_ids` | 아이디 실패 입력 3종 |
| `invalid_test_data.wrong_passwords` | 비밀번호 실패 입력 4종 (향후 시나리오용) |
| `id_generation` | 유니크 ID 규칙 설명 |

### CSV 플레이스홀더

| 플레이스홀더 | 출처 |
|-------------|------|
| `{domain}` | `.env` → `BASE_URL` |
| `{test_users.A.id}`, `{test_users.B.name}` 등 | `.env` |
| `{validation_messages.*}` | `test-data.json` |
| `{invalid_test_data.*}` | `test-data.json` |

## 스크립트

| 스크립트 | 설명 |
|----------|------|
| `generate_unique_id.py` | `testuser + YYYYMMDD + HHMMSS` 형식 ID 생성, `.env`의 `TEST_USER_B_ID` 갱신. `beforeAll`에서 호출 |
| `load_test_data.py` | `.env` 파일 읽기·쓰기 유틸 (`ENV_PATH`, `update_env_var`). `generate_unique_id.py`에서 사용 |

외부 Python 패키지 의존성 없음 (표준 라이브러리만 사용).

## 테스트 아티팩트

`playwright.config.js` 설정:

| 항목 | 값 |
|------|-----|
| 비디오 | `on` — 모든 테스트 녹화 |
| 스크린샷 | `only-on-failure` |
| Trace | `on-first-retry` |
| Reporter | `html` → `playwright-report/` |

테스트 종료 후 `normalize-test-results.js`가 결과 폴더를 정리합니다.

```
test-results/
├── users-01-01-chromium/
│   └── video.webm
├── users-01-02-chromium/
│   ├── video.webm
│   ├── failed.png
│   └── error-context.md
└── users-lifecycle-chromium/
    └── ...
```
