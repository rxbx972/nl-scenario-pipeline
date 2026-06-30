# Contributing

전체 디렉터리 구조는 [README.md](../README.md#프로젝트-구조)를 참고하세요.

## 주요 함수

| 함수 | 역할 |
|------|------|
| `loadScenarios()` | CSV 시나리오 로드 |
| `replacePlaceholders()` | Step·Expected Result 플레이스홀더 치환 |
| `executeScenario()` | Step 텍스트 패턴 매칭으로 UI 조작·검증 |
| `performLogin()` | 공통 로그인 |
| `navigateToUserManagement()` | 사용자 관리 화면 이동 |
| `navigateToUserRegistration()` | 사용자 등록 화면 이동 |

## 시나리오 CSV 작성 (QA)

기존 시나리오 문구만 수정할 때는 루트 [scenario-writing-guide.md](../../test-data/scenario-writing-guide.md)의 **Step 템플릿·Expected Result 키워드**를 따릅니다.

## 새 시나리오 추가

[mcp-workflow.md#시나리오-작성-흐름](mcp-workflow.md#시나리오-작성-흐름)을 따릅니다. spec·코드 반영은 아래 순서로 진행하세요.

1. `test-data/test-data.json` — 검증 메시지·입력값 추가 (필요 시)
2. 루트 `test-data/users-test-scenarios.csv` — `Scenario Id`, `Step Id`, `Step`, `Expected Result` 행 추가
3. `replacePlaceholders()` — 새 플레이스홀더 패턴 등록 (필요 시)
4. `executeScenario()` — Step·Expected Result 분기 추가
5. `agent-studio-users-test.spec.js` — `test()` 블록 추가

```javascript
test('users_XX_YY: 설명', async ({ page }) => {
    await performLogin(page, testData);
    await navigateToUserManagement(page);

    const targetScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_XX_YY');
    for (const scenario of targetScenarios) {
        await executeScenario(page, scenario, testData);
    }
});
```

## 유효성 검사 메시지 추가

1. `test-data.json` → `validation_messages`에 키·값 추가
2. CSV `Expected Result`에서 `{validation_messages.새키}` 참조
3. `replacePlaceholders()`에 치환 패턴 추가
4. `executeScenario()`에 검증 분기 추가

## 결과 폴더명 커스터마이징

`tests/helpers/normalize-test-results.js`의 `extractScenarioSlug()`에 새 시나리오 ID 패턴을 추가하면 `test-results/users-XX-YY-chromium` 형식으로 정리됩니다.

## UI·정책 변경 시 점검

MCP 탐색 → CSV → spec → 회귀 실행 순서는 [mcp-workflow.md#ui-변경-후-갱신-순서](mcp-workflow.md#ui-변경-후-갱신-순서)를 따릅니다. 추가로 아래를 확인하세요.

- `test-data.json` — 검증 메시지 문구가 현행 UI와 일치하는지
- 미구현 시나리오 — `users_03_02` ~ `users_05_01`, `users_lifecycle` 재개 여부

## 로컬 실행

기본 실행 명령은 [README.md#실행](../README.md#실행)을 참고하세요. 개발 시 자주 쓰는 옵션:

```bash
npx playwright test --grep-invert "users_lifecycle"   # 통합 테스트 제외
```

설계 배경·데이터 흐름 → [architecture.md](architecture.md)  
MCP 탐색·작성 → [mcp-workflow.md](mcp-workflow.md)
