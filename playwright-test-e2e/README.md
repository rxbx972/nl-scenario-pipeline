# playwright-test-e2e

[nl-scenario-pipeline](../README.md) 모노레포의 E2E 회귀 테스트 패키지입니다. 

루트 [`test-data/users-test-scenarios.csv`](../test-data/users-test-scenarios.csv)에 자연어로 적어 둔 Step·Expected Result를 `executeScenario()`가 해석해 Playwright Test로 실행하고, 리포트·실패 영상을 수집합니다.

| 도구 | 용도 |
|------|------|
| Playwright MCP (Cursor) | UI 탐색, 셀렉터·시나리오 작성 |
| Playwright Test | 자동화 실행, 리포트·영상 |

시나리오를 새로 만들거나 화면·셀렉터를 확인할 때는 Cursor Playwright MCP를 씁니다. 설계 배경은 [architecture.md](docs/architecture.md)를 참고하세요.

> **현황 (2025-09~)**: 샘플 앱 UI·정책 변경으로 `users_03_02` 이후 구현 중단.  
> **마지막 실행 (2025-08-04)**: 9/9 통과, 21.9초 (`users_02_03`·`users_lifecycle` 제외)


## Quick Start

```bash
cp .env.example .env   # BASE_URL, TEST_USER_* 입력
npm install
npx playwright install
npx playwright test tests/agent-studio-users-test.spec.js
```

## 프로젝트 구조

```
playwright-test-e2e/
├── tests/
│   ├── agent-studio-users-test.spec.js   # CSV 로드 · executeScenario() 패턴 매칭 · 시나리오 실행
│   └── helpers/normalize-test-results.js # test-results 폴더명 정규화
├── test-data/
│   ├── test-data.json                    # 검증 메시지 · 유효성 실패 입력값
│   └── load-test-data.js                 # .env + JSON 병합 로더
├── scripts/
│   ├── generate_unique_id.py             # TEST_USER_B_ID 자동 갱신
│   └── load_test_data.py                 # Python용 .env 읽기·쓰기 유틸
├── docs/
│   ├── architecture.md                   # 설계 · 데이터 흐름 · MCP+Test 하이브리드 · 아티팩트
│   ├── mcp-workflow.md                   # Cursor MCP 설정 · 시나리오 탐색·작성 흐름
│   └── CONTRIBUTING.md                   # 시나리오 추가 · 주요 함수 · UI 변경 점검
├── playwright.config.js                  # Playwright 실행 설정
├── package.json
└── .env.example                          # 환경 변수 템플릿
```

### 문서 (`docs/`)


| 문서                                      | 내용                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------ |
| [architecture.md](docs/architecture.md) | CSV 분리 · `executeScenario` · `.env`/`test-data.json` 역할 · MCP+Test 하이브리드 |
| [mcp-workflow.md](docs/mcp-workflow.md) | Cursor Playwright MCP 설정 · UI 탐색 → CSV/`executeScenario` 반영 흐름           |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | 새 시나리오 추가 절차 · 주요 함수 · 코딩 규칙                                             |


## 환경 설정

### 1. 의존성 설치

```bash
npm install
npx playwright install   # 브라우저 바이너리 (최초 1회)
```

### 2. `.env` 설정

```bash
cp .env.example .env
```


| 변수                                                                           | 설명                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `BASE_URL`                                                                   | 테스트 대상 URL                                                 |
| `TEST_USER_A_ID` / `TEST_USER_A_PASSWORD`                                    | 로그인용 계정                                                    |
| `TEST_USER_B_PASSWORD` / `TEST_USER_B_NAME` / `TEST_USER_B_INITIAL_PASSWORD` | 사용자 등록 테스트용                                                |
| `TEST_USER_B_ID`                                                             | 비워 두면 `beforeAll`에서 `scripts/generate_unique_id.py`가 자동 갱신 |


> 민감 정보(URL·계정)는 `.env`, UI 메시지·입력값은 `test-data/test-data.json`에서 관리합니다.

### 3. Cursor + Playwright MCP (선택)

기존 시나리오만 실행한다면 이 단계는 **건너뛰어도 됩니다**. 새 시나리오 작성·UI 탐색이 필요할 때 [mcp-workflow.md](docs/mcp-workflow.md)를 따릅니다.

> 현 프로젝트에서 MCP는 시나리오 탐색·작성에만 사용합니다. 테스트 실행(`npx playwright test`)과는 별개입니다.

## 실행

```bash
npx playwright test tests/agent-studio-users-test.spec.js
npx playwright test --grep "users_02_01"
npx playwright test --headed --reporter=list
npx playwright show-report
```

실패 시 `test-results/users-XX-YY-chromium/`에서 `video.webm`, `failed.png`, `error-context.md`를 확인합니다. 아티팩트 설정 상세는 [architecture.md#테스트-아티팩트](docs/architecture.md#테스트-아티팩트).

시나리오 목록: [`test-data/users-test-scenarios.csv`](../test-data/users-test-scenarios.csv) · 개발용 실행 옵션: [CONTRIBUTING.md#로컬-실행](docs/CONTRIBUTING.md#로컬-실행)

---

**마지막 업데이트**: 2026년 6월 26일