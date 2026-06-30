# 민감 정보 분리 — 공개 저장소 안전화

> **문서 시점**: 2025.08 PoC 정리 · Git 공개·모노레포화 기간  
> **현재 코드**: `nl-scenario-pipeline/playwright-test-e2e` — `.env` + `test-data.json` + CSV 3계층 (커밋 `9c0ecda`)

---

## 1. 문제 개요

### 증상

테스트 데이터 파일에 **URL·계정·비밀번호**가 JSON 필드로 포함되어 있어, 저장소 공개·포트폴리오 공유·협업 시 민감 정보 노출 리스크가 있다.

| 항목 | 내용 |
|------|------|
| 당시 구조 | `test-data.json`에 `domain`, `test_users.A/B` (id, password) 혼재 |
| 부가 문제 | `.env`와 JSON **이중 관리** — 어느 쪽이 source of truth인지 불명확 |
| 연관 이슈 | `generate_unique_id.py`가 JSON의 `test_users.B.id`를 갱신 → Race Condition 대상이 JSON이었음 ([02-race-condition-jsondecode.md](./02-race-condition-jsondecode.md)) |

### 재현 조건

- `test-data.example.json`을 복사해 사용하는 워크플로우
- JSON에 빈 문자열 placeholder라도 **구조상 계정 필드가 커밋 대상**
- 팀원마다 로컬 `.env`와 JSON override 규칙이 달라 **환경 불일치** 발생

---

## 2. 원인 분석

### 2.1 데이터 역할 혼재

초기 설계는 "테스트 데이터 한 파일에 모은다"는 단순 구조였다.

```
test-data.json (초기)
├── domain          ← 민감 (Stage URL)
├── test_users      ← 민감 (계정·비밀번호)
├── validation_messages   ← 비민감 (UI 문구)
└── invalid_test_data     ← 비민감 (실패 입력 샘플)
```

| 문제 | 설명 |
|------|------|
| 보안 | JSON이 예시·실데이터와 함께 Git 이력에 남을 수 있음 |
| 유지보수 | UI 메시지 수정 시 계정 정보 파일을 함께 열어야 함 |
| 동시성 | 유니크 ID 갱신이 JSON read-write → 병렬 실행 Race 유발 |

### 2.2 이중 소스 (Before)

`load-test-data.js` 초기 버전은 JSON을 읽은 뒤 `.env`로 **override**하는 구조였다.

```
.env (선택) ──override──► test-data.json ──► testData
```

어느 파일을 수정해야 하는지 혼란스럽고, `.env` 없이 JSON만으로도 실행 시도가 가능해 **실수로 빈 계정 커밋** 위험이 있었다.

---

## 3. 해결 방안

### 3.1 선택한 해결책: 3계층 데이터 분리

| 저장소 | 내용 | Git |
|--------|------|-----|
| `.env` | `BASE_URL`, `TEST_USER_*` (계정·비밀번호) | **제외** (`.gitignore`) |
| `test-data.json` | `validation_messages`, `invalid_test_data` | **포함** (비민감만) |
| `users-test-scenarios.csv` | Step · Expected Result (플레이스홀더 참조) | **포함** |

**로드 흐름 (After)**

```
.env ──────────────┐
                   ├── load-test-data.js ──► testData (런타임 병합)
test-data.json ────┘

CSV ──► replacePlaceholders({domain}, {test_users.*}, {validation_messages.*})
```

`loadTestData()`는 `.env` 필수 변수를 검증한 뒤 JSON과 병합한다.

```javascript
const REQUIRED_ENV_VARS = [
  'BASE_URL', 'TEST_USER_A_ID', 'TEST_USER_A_PASSWORD',
  'TEST_USER_B_PASSWORD', 'TEST_USER_B_NAME', 'TEST_USER_B_INITIAL_PASSWORD',
];
// TEST_USER_B_ID는 generate_unique_id.py가 .env에 자동 갱신
```

### 3.2 연쇄 변경

| 컴포넌트 | Before | After |
|----------|--------|-------|
| `generate_unique_id.py` | `test-data.json` → `test_users.B.id` | `.env` → `TEST_USER_B_ID` |
| `test-data.example.json` | 별도 템플릿 유지 | **삭제** — JSON은 검증 데이터만 |
| `.env.example` | URL·계정 placeholder | 팀 온보딩 단일 진입점 |

### 3.3 검토했으나 채택하지 않은 대안

| 대안 | 미채택 이유 |
|------|------------|
| JSON 암호화 | 로컬 복호화·키 관리 부담, PoC 범위 초과 |
| CI Secret만 사용 | 로컬 QA 실행·MCP 탐색 시 `.env` 여전히 필요 |
| 계정 hardcode in spec | 보안·유지보수 최악 |

---

## 4. 해결 전후

### Before (`test-data.example.json` 발췌)

```json
{
  "domain": "",
  "test_users": {
    "A": { "id": "", "password": "" },
    "B": { "id": "", "password": "", "name": "auto테스트" }
  },
  "validation_messages": { ... }
}
```

### After

**.env** (로컬만, gitignore)

```
BASE_URL=https://your-stage-url.example.com
TEST_USER_A_ID=...
TEST_USER_B_ID=          # generate_unique_id.py 자동 갱신
```

**test-data.json** (커밋 가능)

```json
{
  "validation_messages": { ... },
  "invalid_test_data": { ... }
}
```

---

## 5. 검증 결과

| 지표 | 결과 |
|------|------|
| 민감 정보 Git 노출 | `.env` gitignore, JSON에서 계정·URL 제거 |
| 온보딩 | `cp .env.example .env` 한 단계로 계정 설정 |
| Race Condition | ID 갱신 대상이 `.env`로 이동 ([02-race-condition-jsondecode.md](./02-race-condition-jsondecode.md) §5) |
| UI 문구 변경 | `test-data.json`만 수정 — 계정 파일 분리 |

---

## 6. 결론

1. **원인**: 민감·비민감 데이터가 한 JSON에 혼재 + `.env` override 이중 구조.
2. **해결**: `.env`(민감) / `test-data.json`(검증 데이터) / CSV(시나리오) 3계층 분리.
3. **부가 효과**: 유니크 ID 갱신이 `.env`로 이동해 병렬 쓰기 대상 단순화.
4. **교훈**: 테스트 자동화 PoC도 **공개 전제 데이터 설계**를 초기에 분리해야 이후 모노레포·포트폴리오 공개 비용이 들지 않는다.

---

## 7. 관련 코드·문서

| 파일 | 역할 |
|------|------|
| `playwright-test-e2e/.env.example` | 환경 변수 템플릿 |
| `playwright-test-e2e/test-data/load-test-data.js` | `.env` + JSON 병합 |
| `playwright-test-e2e/test-data/test-data.json` | 검증 메시지·실패 입력값 |
| `playwright-test-e2e/scripts/generate_unique_id.py` | `.env`의 `TEST_USER_B_ID` 갱신 |
| `.gitignore` | `.env` 제외 |

---

## 8. 체크리스트 — 테스트 데이터 분리

- [ ] URL·계정·비밀번호는 **`.env`만** — JSON·CSV에 실값 금지
- [ ] UI 문구·실패 입력 샘플은 **`test-data.json`**
- [ ] 시나리오는 **플레이스홀더**(`{test_users.A.id}`)로 참조
- [ ] `.env.example`에 필수 변수·설명 기재, 실제 값 없음
- [ ] `.gitignore`에 `.env` 포함 여부 확인
- [ ] 공개 커밋 전 `git diff`로 계정·URL 유출 스캔
