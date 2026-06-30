# 유니크 ID 생성 Race Condition — JSONDecodeError

> **문서 시점**: 2025.07 인시던트 발생·해결  
> **현재 코드**: `nl-scenario-pipeline/playwright-test-e2e` (동시성 가드 유지 + ID 갱신 대상 `.env`로 리팩터)

---

## 1. 문제 개요

### 증상

Playwright **5워커 병렬 실행** 시 `test.beforeAll` 단계에서 유니크 ID 생성이 간헐적으로 실패한다.

| 항목 | 내용 |
|------|------|
| 오류 | `json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)` |
| 발생 위치 | `generate_unique_id.py` → `update_test_data()` → `json.load(f)` |
| 부수 증상 | ID 생성 실패 시 기존 ID fallback, 간헐적 테스트 데이터 충돌 |

### 재현 조건

- `playwright.config.js`: `fullyParallel: true`, 로컬 workers 5 (또는 `--workers=5`)
- `test.beforeAll`에서 **모든 워커**가 `generateUniqueId()` 호출
- 공유 파일에 **read-modify-write** (잠금 없음)

---

## 2. 원인 분석

### 2.1 Playwright 병렬 실행 구조

Playwright Test는 spec 파일을 여러 **워커 프로세스**에 분배한다. `test.beforeAll`은 **워커마다 1회** 실행된다.

```
Worker 0 ──► beforeAll ──► generateUniqueId()
Worker 1 ──► beforeAll ──► generateUniqueId()   ← 동시 실행
Worker 2 ──► beforeAll ──► generateUniqueId()
Worker 3 ──► beforeAll ──► generateUniqueId()
Worker 4 ──► beforeAll ──► generateUniqueId()
```

### 2.2 Race Condition (인시던트 당시)

당시 `generate_unique_id.py`는 `test-data.json`을 읽고, `test_users.B.id`를 갱신한 뒤 다시 쓴다.

```
워커 1: test-data.json 읽기 시작
워커 2: test-data.json 읽기 시작
워커 3: test-data.json 쓰기 시작 → 파일 내용 비어 있거나 깨짐 (partial write)
워커 4: test-data.json 읽기 시도 → json.load 실패 → JSONDecodeError
워커 5: test-data.json 읽기 시도 → JSONDecodeError
```

**핵심**: JSON 파일에 대한 **동시 read-modify-write**. 파일 잠금 메커니즘이 없어, 한 프로세스가 쓰는 도중 다른 프로세스가 읽으면 빈 파일·불완전 JSON을 읽게 된다.

### 2.3 문제가 된 코드 (수정 전)

**spec.js**

```javascript
test.beforeAll(async () => {
    generateUniqueId(); // 모든 워커에서 동시 실행
    testData = loadTestData();
    scenarios = loadScenarios();
});
```

**generate_unique_id.py (인시던트 당시)**

```python
def update_test_data():
    with open(test_data_path, 'r', encoding='utf-8') as f:
        test_data = json.load(f)          # ← JSONDecodeError 발생 지점

    unique_id = generate_unique_id()
    test_data['test_users']['B']['id'] = unique_id

    with open(test_data_path, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)
```

---

## 3. 해결 방안

### 3.1 선택한 해결책: 단일 워커 쓰기 + 다중 워커 읽기

Playwright가 주입하는 `process.env.WORKER_INDEX`로 **워커 0만** ID 생성(파일 쓰기)을 수행한다.

```javascript
test.beforeAll(async () => {
    if (process.env.WORKER_INDEX === '0' || !process.env.WORKER_INDEX) {
        generateUniqueId();
    }
    testData = loadTestData();
    scenarios = loadScenarios();
});
```

| 조건 | 동작 |
|------|------|
| `WORKER_INDEX === '0'` | 유니크 ID 생성 (쓰기 1회) |
| `WORKER_INDEX === '1'~'4'` | ID 생성 건너뜀, `loadTestData()`만 (읽기) |
| `WORKER_INDEX` 미설정 | 단일 프로세스 실행 → ID 생성 수행 |

### 3.2 검토한 대안

| 대안 | 장점 | 미채택 이유 |
|------|------|------------|
| **WORKER_INDEX 가드** (채택) | 변경 최소, 성능 유지 | — |
| 파일 잠금 | 이론적으로 완전 | OS·플랫폼별 동작 차이, 디버깅 난이도 |
| `globalSetup` 1회 실행 | 쓰기 지점 단일화 | spec·설정 구조 변경 범위 큼 |
| 워커별 독립 데이터 파일 | 충돌 없음 | 테스트 간 공유 ID 필요, 후처리 복잡 |

---

## 4. 해결 전후

### 4.1 오류 로그 (해결 전)

```
유니크 ID 생성 실패: Command failed: python3 ".../generate_unique_id.py"
Traceback (most recent call last):
  File ".../generate_unique_id.py", line 56, in main
    unique_id = update_test_data()
  File ".../generate_unique_id.py", line 35, in update_test_data
    test_data = json.load(f)
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

> 스택 트레이스의 `update_test_data()`·`json.load`는 **인시던트 당시 코드** 기준. 프로젝트 초기명 `QA-MCP-Automation` 시절 경로.

### 4.2 성공 로그 (해결 직후, 2025.07)

```
첫 번째 워커에서 유니크 ID를 생성합니다...
유니크한 ID가 생성되었습니다: testuser250729103926
ID 길이: 20자
test-data.json 파일이 업데이트되었습니다.
```

- 워커 1~4: `워커 N에서 유니크 ID 생성을 건너뜁니다.` 출력 후 정상 진행
- `JSONDecodeError` **재발 없음**

---

## 5. 이후 리팩터링 (현재 코드)

인시던트 해결 이후, 데이터 구조를 분리하는 리팩터가 진행되었다.

| 구분 | 인시던트 당시 | 현재 (`playwright-test-e2e`) |
|------|--------------|------------------------------|
| ID 갱신 대상 | `test-data.json` → `test_users.B.id` | `.env` → `TEST_USER_B_ID` |
| Python 함수 | `update_test_data()` | `update_test_user_b_id()` |
| JSON 파싱 | `generate_unique_id.py` 내부 | 없음 (`.env` 텍스트 갱신) |
| **동시성 가드** | `WORKER_INDEX === '0'` | **동일하게 유지** |

```python
# 현재 generate_unique_id.py (요약)
def update_test_user_b_id():
    unique_id = generate_unique_id()
    update_env_var('TEST_USER_B_ID', unique_id)
    return unique_id
```

**왜 가드를 유지하는가**: 쓰기 대상이 JSON에서 `.env`로 바뀌었어도, `.env`에 대한 동시 쓰기 역시 Race Condition을 유발할 수 있다. 단일 워커 쓰기 패턴은 리팩터 후에도 유효한 방어 수단이다.

---

## 6. 검증 결과

### 인시던트 해결 직후 (5워커 병렬)

| 지표 | 결과 |
|------|------|
| Race Condition | 재발 0건 |
| JSONDecodeError | 재발 0건 |
| 병렬 성능 | ID 생성 1회만 추가, 체감 지연 없음 |

### 프로젝트 전체 회귀 (2025-08-04, README 기록)

| 지표 | 결과 |
|------|------|
| 통과율 | **9/9** |
| 실행 시간 | **21.9초** |
| 제외 | `users_02_03`, `users_lifecycle` (당시 미실행) |
| 아티팩트 | HTML 리포트, 전 테스트 영상, 실패 시 스크린샷 |

> 인시던트 해결 당시 "5개 테스트 통과"는 **당시 실행 범위** 기준 수치. 포트폴리오·README에는 확장된 9/9 기준을 사용.

---

## 7. 결론

1. **원인**: `beforeAll` × N워커 × 공유 파일 read-modify-write = 전형적인 Race Condition
2. **해결**: `WORKER_INDEX === '0'`으로 쓰기를 단일 워커에 한정, 나머지는 read-only
3. **지속**: 데이터 리팩터(JSON → `.env`) 후에도 동시성 가드 유지
4. **교훈**: 병렬 E2E에서 setup 훅의 **공유 mutable state**는 Flaky의 고빈도 원인. 쓰기 지점을 하나로 모으는 것이 file lock보다 단순하고 실용적

---

## 8. 관련 코드 위치 (현재 레포)

| 파일 | 역할 |
|------|------|
| `playwright-test-e2e/tests/agent-studio-users-test.spec.js` | `beforeAll` + `WORKER_INDEX` 가드 |
| `playwright-test-e2e/scripts/generate_unique_id.py` | `.env`의 `TEST_USER_B_ID` 갱신 |
| `playwright-test-e2e/playwright.config.js` | `fullyParallel: true`, CI 시 `workers: 1` |
