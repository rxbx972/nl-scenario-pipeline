# Architecture

## 개요

루트 `test-data/users-test-scenarios.csv`의 Step을 **Playwright MCP 프로토콜**로 실행합니다. Playwright Test(`page`, `locator`)를 쓰지 않고 `browser_*` MCP 도구를 호출합니다.

```
루트 test-data/users-test-scenarios.csv
        │
        ▼
  load-csv + placeholders
        │
        ▼
  ┌─────────────────────────────────┐
  │  Step 실행기 (per Step)         │
  │  ┌──────────┐  ┌─────────────┐  │
  │  │ llm.js   │  │ rules.js    │  │
  │  │ OpenAI   │  │ 패턴 매칭    │  │
  │  └────┬─────┘  └──────┬──────┘  │
  │       └───────┬───────┘         │
  │               ▼                 │
  │     PlaywrightMcpClient         │
  │     (stdio → @playwright/mcp)   │
  └─────────────────────────────────┘
        │
        ▼
  browser_navigate / browser_click / browser_snapshot / ...
```

프로젝트·파일 구조는 [README.md](../README.md#프로젝트-구조)를 참고하세요.

## 실행 모드

기본값은 **`rules`** (`OPENAI_API_KEY` 불필요). Playwright MCP만으로 브라우저를 제어합니다.

### `rules` (기본)

`src/runners/rules.js`가 Step 텍스트 패턴을 MCP 호출에 직접 매핑합니다 (`browser_navigate`, `browser_click` 등).

| 시나리오 | 지원 범위 |
|----------|-----------|
| `users_01_01` | 전체 Step |
| `users_01_02` | Step 1~4 (설정·사용자 관리 네비게이션). Step 5~6(URL·목록 확인) 미지원 |
| 그 외 | 미지원 — `llm` 모드 안내 오류 |

미지원 Step은 오류와 함께 `--mode llm` 사용을 권장합니다.

### `llm` (선택)

1. CSV Step·Expected Result를 OpenAI에 전달
2. MCP 도구 목록을 function calling으로 노출
3. LLM이 `browser_*` 도구 선택 → 러너가 MCP `callTool` 실행
4. 스냅샷을 LLM에 다시 전달 (최대 15라운드)

**`OPENAI_API_KEY` 필요** — MCP 자체가 아니라 Step 해석용 LLM 때문입니다.

**특징**
- 새 Step을 CSV만으로 시도 가능 (`rules.js` 분기 추가 없이)
- API 비용·비결정성 — 안정적 회귀에는 `rules` 모드 권장

## MCP 클라이언트

`src/mcp/client.js`가 `@modelcontextprotocol/sdk`의 `StdioClientTransport`로 `npx @playwright/mcp@latest` 서브프로세스를 띄웁니다. 루트 [`.cursor/mcp.json`](../../.cursor/mcp.json)이나 `config/mcp.json`은 **Cursor 참고용**이며, 러너는 아래 옵션을 코드에서 직접 전달합니다.

| 옵션 | 설명 |
|------|------|
| `--caps=testing` | `browser_verify_text_visible` 등 검증 도구 활성화 |
| `--headless` | 기본 headless (CLI `--headed`로 해제) |
| `--allowed-origins` | `.env`의 `BASE_URL` origin으로 제한 (`config.js`) |

## 데이터 흐름

```
.env ──────────────┐
                   ├── load-test-data.js ──► testData
test-data/test-data.json┘

루트 test-data/users-test-scenarios.csv ──► load-csv.js
                              └── placeholders.js ──► rules.js / llm.js
```

실행 시작 시 `index.js`가 `generate_unique_id.py`로 `.env`의 `TEST_USER_B_ID`를 갱신한 뒤 위 흐름으로 Step을 실행합니다.

## 결과물

| 경로 | 내용 |
|------|------|
| `results/<scenario>/run-*.json` | Step별 pass/fail 로그 |
| `results/<scenario>/step-*-failed.png` | 실패 시 스크린샷 |

HTML 리포트·`globalTeardown`·실패 영상은 이 프로젝트에 없습니다. [playwright-test-e2e](../../playwright-test-e2e/)가 회귀·리포트·영상을 담당합니다.

## `rules` 패턴 확장

새 Step을 `rules`로 지원하려면 `src/runners/rules.js`에 `step.includes(...)` 분기를 추가합니다.

1. CSV Step 문구와 매칭할 키워드 결정
2. `runStepWithRules()`에 분기 추가 → `McpBrowser` 메서드 호출
3. `npm run run -- --scenario <id>`로 회귀 확인

탐색적 검증이 필요하면 먼저 `llm` 모드로 Step을 시도한 뒤, 안정화된 패턴을 `rules.js`로 옮깁니다.
