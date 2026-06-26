# playwright-mcp-e2e

[nl-scenario-pipeline](../README.md) 모노레포의 **Playwright MCP CLI 러너** 패키지입니다.

루트 [`test-data/users-test-scenarios.csv`](../test-data/users-test-scenarios.csv)에 자연어로 적어 둔 Step·Expected Result를 읽어, `npm run run`이 Playwright MCP 서버(`@playwright/mcp`)를 subprocess로 띄운 뒤 `browser_*` 도구로 직접 실행합니다. Playwright Test(`page`, `locator`)는 사용하지 않습니다.

| 모드 | 용도 |
|------|------|
| `rules` (기본) | `rules.js` 패턴 매칭 → MCP 호출. `OPENAI_API_KEY` 불필요 |
| `llm` (선택) | OpenAI가 Step 해석 → MCP 호출. 미지원 Step 탐색용 (PoC) |

[playwright-test-e2e](../playwright-test-e2e/)가 Cursor MCP로 UI를 탐색하는 반면, 이 패키지는 **터미널에서 MCP 러너가 실행**합니다. 설계 상세는 [docs/architecture.md](docs/architecture.md)를 참고하세요.

> **현황 (2025-09~)**: 샘플 앱 UI·정책 변경으로 `rules` 패턴 확장 중단.  
> **PoC 범위**: `rules` — `users_01_01` 전체, `users_01_02` 일부(step 5~6 미지원). 그 외는 `llm` 모드 시도.

## Quick Start

```bash
cp .env.example .env   # BASE_URL, TEST_USER_* 입력
npm install
npm run list
npm run run -- --scenario users_01_01
```

기본(`rules`) 실행에는 `OPENAI_API_KEY`가 필요 없습니다. `python3`는 `TEST_USER_B_ID` 자동 갱신에 사용됩니다.

## 실행 모드

| | `rules` (기본) | `llm` (선택) |
|---|----------------|--------------|
| `OPENAI_API_KEY` | 불필요 | 필요 |
| Step 해석 | `src/runners/rules.js` | `src/runners/llm.js` |
| 적합한 경우 | 정의된 Step 회귀 | 미지원·복잡한 Step 탐색 |

상세·지원 범위·`llm` 동작: [docs/architecture.md#실행-모드](docs/architecture.md#실행-모드)

```bash
npm run run -- --scenario users_01_01              # rules (기본)
npm run run -- --scenario users_01_01 --headed   # 브라우저 표시
npm run run:llm -- --scenario users_02_01        # llm (OPENAI_API_KEY 필요)
npm run run -- --help
```

## 프로젝트 구조

```
playwright-mcp-e2e/
├── test-data/
│   ├── test-data.json             # 검증 메시지 · 유효성 실패 입력값
│   └── load-test-data.js          # .env + JSON 병합 로더
├── src/
│   ├── index.js                   # CLI 진입점 · 시나리오 실행 루프
│   ├── config.js                  # 인자 파싱 · ID 갱신 · allowed-origins
│   ├── mcp/
│   │   ├── client.js              # PlaywrightMcpClient (stdio → @playwright/mcp)
│   │   ├── browser.js             # MCP browser_* 래퍼
│   │   └── snapshot.js            # 스냅샷 텍스트 유틸
│   ├── scenario/
│   │   ├── load-csv.js            # CSV 로드
│   │   └── placeholders.js        # 플레이스홀더 치환
│   └── runners/
│       ├── rules.js               # 패턴 매칭 실행 (기본)
│       └── llm.js                 # OpenAI + MCP 실행 (선택)
├── scripts/
│   ├── generate_unique_id.py      # TEST_USER_B_ID 자동 갱신
│   └── load_test_data.py          # Python용 .env 읽기·쓰기 유틸
├── config/
│   └── mcp.json                   # Cursor MCP 설정 참고용 (러너 미사용)
├── docs/
│   └── architecture.md            # 설계 · 실행 모드 · 데이터 흐름
├── results/                       # 실행 로그 · 실패 스크린샷 (gitignore)
├── package.json
└── .env.example
```

### 문서 (`docs/`)

| 문서 | 내용 |
|------|------|
| [architecture.md](docs/architecture.md) | 실행 모드 · MCP 클라이언트 · 데이터 흐름 · 결과물 · `rules` 패턴 확장 |

## 환경 설정

### 1. 의존성 설치

```bash
npm install
```

Playwright MCP는 실행 시 `npx @playwright/mcp@latest`로 자동 설치됩니다. `npx playwright install`은 **필요 없습니다**.

### 2. `.env` 설정

```bash
cp .env.example .env
```

| 변수 | 설명 |
|------|------|
| `BASE_URL` | 테스트 대상 URL |
| `TEST_USER_A_ID` / `TEST_USER_A_PASSWORD` | 로그인용 계정 |
| `TEST_USER_B_PASSWORD` / `TEST_USER_B_NAME` / `TEST_USER_B_INITIAL_PASSWORD` | 사용자 등록 테스트용 |
| `TEST_USER_B_ID` | 비워 두면 실행 시작 시 `scripts/generate_unique_id.py`가 자동 갱신 |

> 민감 정보(URL·계정)는 `.env`, UI 메시지·입력값은 `test-data/test-data.json`에서 관리합니다.

### 3. `llm` 모드 (선택)

`rules`만 쓴다면 이 단계는 **건너뛰어도 됩니다**. `.env`에 `OPENAI_API_KEY`를 추가하고 `npm run run:llm`으로 실행합니다. `OPENAI_MODEL` 기본값은 `gpt-4o-mini`입니다.

## 실행 & 결과

```bash
npm run list
npm run run -- --scenario users_01_01
npm run run -- --scenario users_01_02 --headed
```

실패 시 `results/<scenario-id>/`에서 확인합니다.

- `run-*.json` — Step별 pass/fail 로그
- `step-*-failed.png` — 실패 스크린샷

HTML 리포트·영상은 이 패키지에 없습니다. 상세: [docs/architecture.md#결과물](docs/architecture.md#결과물)

시나리오 목록: [`test-data/users-test-scenarios.csv`](../test-data/users-test-scenarios.csv) · `rules` 패턴 추가: [docs/architecture.md#rules-패턴-확장](docs/architecture.md#rules-패턴-확장)

---

**마지막 업데이트**: 2026년 6월 26일
