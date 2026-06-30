# nl-scenario-pipeline

자연어 시나리오를 시작점으로, 테스트 코드·실행·리포트까지 이어지는 자동화 파이프라인 PoC입니다.

루트 [`test-data/users-test-scenarios.csv`](test-data/users-test-scenarios.csv)를 두 패키지가 공유하며, 실행 방식만 다릅니다.

| 패키지 | 한 줄 요약 | README |
|--------|-----------|--------|
| [playwright-test-e2e](playwright-test-e2e/) | `executeScenario()` + Playwright Test — 회귀·CI·리포트·영상 | [README](playwright-test-e2e/README.md) |
| [playwright-mcp-e2e](playwright-mcp-e2e/) | CLI가 Playwright MCP를 직접 호출 — `rules` / `llm` 러너 | [README](playwright-mcp-e2e/README.md) |

```
nl-scenario-pipeline/
├── test-data/
│   ├── users-test-scenarios.csv      # 두 패키지 공유 시나리오 CSV
│   └── scenario-writing-guide.md     # CSV Step · Expected Result 작성 가이드 (QA용)
├── playwright-test-e2e/              # Playwright Test — 회귀·CI
├── playwright-mcp-e2e/            # Playwright MCP CLI 러너 (rules 기본)
├── docs/troubleshooting/          # PoC 구축 중 이슈·해결 기록
├── .cursor/mcp.json               # Cursor용 Playwright MCP (test-e2e 탐색·작성)
└── README.md
```

## 프로젝트 비교

| | [playwright-test-e2e](playwright-test-e2e/) | [playwright-mcp-e2e](playwright-mcp-e2e/) |
|---|---------------------------------------------|-------------------------------------------|
| **실행** | `npx playwright test` | `npm run run` |
| **브라우저 API** | Playwright Test (`page`, `locator`) | Playwright MCP (`browser_*` 도구) |
| **Step 해석** | `executeScenario()` 코드 | `rules.js`(기본) 또는 `llm.js`(선택) |
| **MCP 역할** | Cursor에서 UI 탐색·작성 (선택) | CLI 러너가 MCP 서버를 직접 호출 |
| **Cursor 필요** | 탐색·작성 시만 | 불필요 |
| **OPENAI_API_KEY** | 불필요 | `llm` 모드만 필요 |
| **CI·회귀** | 적합 (리포트·영상·병렬) | `rules` 제한적 · `llm`은 비결정성 |
| **결과물** | `test-results/`, `playwright-report/` | `results/` (JSON 로그·스크린샷) |
| **시나리오 CSV** | [test-data/users-test-scenarios.csv](test-data/users-test-scenarios.csv) | 동일 (공유) |
| **CSV 작성 가이드** | [scenario-writing-guide.md](test-data/scenario-writing-guide.md) | 동일 (공유, `executeScenario` 기준) |

## PoC 현황

샘플 앱(Agent Studio Stage 사용자 관리)으로 파이프라인을 검증 중입니다.

> **2025-09~**: 대상 앱 UI·정책 변경으로 `users_03_02` 이후 구현·패턴 확장 중단

**[playwright-test-e2e](playwright-test-e2e/)** — 마지막 성공 실행 2025-08-04: 9/9 통과, 21.9초 (`users_02_03`·`users_lifecycle` 제외)

**[playwright-mcp-e2e](playwright-mcp-e2e/)** — `rules`: `users_01_01` 전체, `users_01_02` 일부(step 5~6 미지원). 그 외는 `llm` 모드 시도

## 주요 이슈와 해결

PoC 구축(2025.06~08) 중 Expected Result 문구 불일치로 검증이 건너뛰어지는 **False Pass**, 5워커 병렬 실행 시 공유 파일 동시 쓰기 **Race Condition** 등을 해결했습니다. UI 셀렉터 불안정·민감 정보 분리·MCP 탐색/회귀 역할 분리 이슈도 함께 정리해 두었습니다.

상세: [docs/troubleshooting/](docs/troubleshooting/)

## Quick Start

**playwright-test-e2e** — 회귀 테스트

```bash
cd playwright-test-e2e
cp .env.example .env
npm install && npx playwright install
npx playwright test tests/agent-studio-users-test.spec.js
```

**playwright-mcp-e2e** — MCP CLI 러너

```bash
cd playwright-mcp-e2e
cp .env.example .env
npm install
npm run list
npm run run -- --scenario users_01_01

# (선택) llm 모드 — OPENAI_API_KEY 설정 후
npm run run:llm -- --scenario users_01_01
```

## Cursor + Playwright MCP

[`.cursor/mcp.json`](.cursor/mcp.json)은 **Cursor IDE**에서 Playwright MCP를 쓸 때의 설정입니다. 주로 [playwright-test-e2e](playwright-test-e2e/)에서 UI 탐색·시나리오 작성에 사용합니다.

[playwright-mcp-e2e](playwright-mcp-e2e/)는 Cursor 없이 터미널에서 MCP를 실행합니다.

탐색·작성 가이드: [playwright-test-e2e/docs/mcp-workflow.md](playwright-test-e2e/docs/mcp-workflow.md)

---

**마지막 업데이트**: 2026년 6월 26일
