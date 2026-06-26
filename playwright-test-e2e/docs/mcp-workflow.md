# Playwright MCP 워크플로우

역할 분담·하이브리드 구조는 [architecture.md#playwright-mcp--playwright-test-하이브리드](architecture.md#playwright-mcp--playwright-test-하이브리드)를 참고하세요. 

MCP는 테스트 러너가 아니며, 회귀 실행은 Playwright Test가 담당합니다.

## MCP 설정

프로젝트 루트([nl-scenario-pipeline](../../README.md))의 [`.cursor/mcp.json`](../../.cursor/mcp.json)에 Playwright MCP가 정의되어 있습니다.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--caps=testing"]
    }
  }
}
```

Cursor를 프로젝트 폴더로 연 뒤 **Settings → MCP**에서 `playwright` 서버가 활성화됐는지 확인합니다.  
Stage URL만 허용하려면 `args`에 `--allowed-origins`를 추가합니다 (`.env`의 `BASE_URL`과 동일 도메인).

```json
"args": [
  "@playwright/mcp@latest",
  "--caps=testing",
  "--allowed-origins",
  "https://your-test-url.example.com"
]
```

## 시나리오 작성 흐름

```
0. (필요 시) test-data.json에 검증 메시지·입력값 추가
        ↓
1. 루트 `test-data/users-test-scenarios.csv`에 Step·Expected Result 초안 작성
        ↓
2. Cursor + Playwright MCP로 해당 Step을 브라우저에서 수행
        ↓
3. browser_snapshot / browser_generate_locator로 셀렉터·문구 확인
        ↓
4. executeScenario() 분기·검증 로직을 spec에 반영
        ↓
5. npx playwright test --grep "시나리오ID" 로 회귀 확인
```

코드 반영 상세는 [CONTRIBUTING.md#새-시나리오-추가](CONTRIBUTING.md#새-시나리오-추가)를 참고하세요.

## Cursor에서 쓸 만한 프롬프트 예시

**UI 탐색 (실패 시나리오 디버깅)**

```
.env의 BASE_URL/login으로 이동해서 로그인한 뒤,
users-test-scenarios.csv의 users_01_02 Step 1~4를 순서대로 수행해줘.
각 단계마다 browser_snapshot으로 화면 구조를 확인해줘.
```

**셀렉터 → Playwright 코드**

```
지금 화면에서 '사용자 관리' 메뉴에 대한 Playwright locator를
browser_generate_locator로 생성하고, getByRole 기준 코드를 제안해줘.
```

**CSV Expected Result 검증**

```
현재 화면에 '{validation_messages.name_required}' 문구가 보이는지
browser_verify_text_visible로 확인해줘.
```

## MCP 도구 ↔ 프로젝트 파일 매핑


| MCP 도구                               | 프로젝트에서의 대응                         |
| ------------------------------------ | ---------------------------------- |
| `browser_navigate`                   | `performLogin()`, `page.goto()`    |
| `browser_snapshot`                   | 실패 시 `error-context.md`와 유사한 화면 파악 |
| `browser_fill_form` / `browser_type` | `executeScenario()` 입력 분기          |
| `browser_verify_text_visible`        | Expected Result 검증 분기              |
| `browser_generate_locator`           | spec 셀렉터 작성 시 참고                   |


## UI 변경 후 갱신 순서

1. **MCP** — 변경된 화면에서 네비게이션·버튼·메시지를 직접 확인
2. **CSV** — Step·Expected Result 문구를 현행 UI에 맞게 수정
3. **spec** — `executeScenario()` 셀렉터·분기 수정
4. **Playwright Test** — 회귀 확인 ([README.md#실행](../README.md#실행) 참고)

## 관련 문서

- 패키지 개요·실행: [README.md](../README.md)
- 설계·아티팩트: [architecture.md#테스트-아티팩트](architecture.md#테스트-아티팩트)
- 시나리오·코드 추가: [CONTRIBUTING.md](CONTRIBUTING.md)
- [Playwright MCP 공식 문서](https://playwright.dev/mcp/introduction)

