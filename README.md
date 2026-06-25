# QA-MCP-Automation

Agent Studio Stage 환경을 위한 Playwright MCP 기반 E2E 테스트 자동화 프로젝트

## 📋 프로젝트 개요

이 프로젝트는 Agent Studio의 사용자 관리 기능에 대한 종합적인 E2E 테스트를 자동화합니다. CSV 기반의 테스트 시나리오 관리와 동적 테스트 데이터 생성을 통해 유지보수성과 확장성을 제공합니다.

## 🏗️ 프로젝트 구조

```
QA-MCP-Automation/
├── tests/
│   └── agent-studio-users-test.spec.js           # CSV 기반 사용자 관리 통합 테스트
├── test-data/
│   ├── test-data.example.json          # 테스트 데이터 템플릿 (커밋됨)
│   ├── test-data.json                  # 로컬 테스트 데이터 (gitignore)
│   ├── load-test-data.js               # 환경 변수 병합 로더
│   └── users-test-scenarios.csv        # 테스트 시나리오 템플릿
├── scripts/
│   ├── generate_unique_id.py             # 유니크 ID 생성
│   ├── create_csv_from_json.py           # CSV 파일 생성
│   └── run_tests_with_unique_id.py       # 테스트 오케스트레이션
├── test-results/                         # 테스트 결과 (비디오, 스크린샷)
├── playwright-report/                    # HTML 테스트 리포트
├── playwright.config.js                  # Playwright 설정
├── .env.example                          # 환경 변수 템플릿
├── package.json                          # 프로젝트 의존성
└── README.md                             # 프로젝트 문서
```

## 🚀 주요 기능

### 1. CSV 기반 테스트 시나리오 관리
- **플레이스홀더 시스템**: `{domain}`, `{test_users.A.id}`, `{validation_messages.name_min_length}` 등
- **동적 데이터 치환**: 테스트 실행 시 실제 값으로 자동 치환
- **유지보수성**: 비개발자도 쉽게 테스트 시나리오 수정 가능

### 2. 동적 테스트 데이터 생성
- **유니크 ID 생성**: 매 테스트 실행 시마다 고유한 사용자 ID 자동 생성
- **형식**: `testuser + YYYYMMDD + HHMMSS` (최대 20자, 영문 소문자 + 숫자)
- **자동 업데이트**: `test-data/test-data.json` 파일의 사용자 정보 자동 갱신

### 3. 종합적인 유효성 검사 테스트
- **빈 필드 검증**: 4개 필수 필드의 빈 값 검증
- **이름 유효성 검사**: 최소 길이, 특수문자 포함 검증
- **아이디 유효성 검사**: 최소 길이, 대문자 포함, 특수문자 포함 검증

## 🧪 테스트 시나리오

### users_01: 로그인 및 네비게이션
| 시나리오 | 설명 | 검증 항목 |
|---------|------|----------|
| `users_01_01` | 유효한 사용자로 로그인 | 로그인 성공, 대시보드 이동 |
| `users_01_02` | 사용자 관리 페이지 네비게이션 | 사이드바 메뉴, 페이지 이동 |

### users_02: 사용자 등록 유효성 검사 (실패 시나리오)
| 시나리오 | 테스트 데이터 | 검증 항목 |
|---------|--------------|----------|
| `users_02_01` | 모든 필드 빈 값 | 4개 오류 메시지, 이름 필드 포커스 |
| `users_02_02` | 이름: "a" (1자) | 이름 최소 길이 오류, 이름 필드 포커스 |
| `users_02_03` | 이름: "a0" (숫자 포함) | 이름 최소 길이 오류, 이름 필드 포커스 |
| `users_02_04` | 이름: "a@" (특수문자 포함) | 이름 최소 길이 오류, 이름 필드 포커스 |
| `users_02_05` | 아이디: "qa0" (3자 미만) | 아이디 형식 오류, 아이디 필드 포커스 |
| `users_02_06` | 아이디: "qa0A" (대문자 포함) | 아이디 형식 오류, 아이디 필드 포커스 |
| `users_02_07` | 아이디: "qa0@" (특수문자 포함) | 아이디 형식 오류, 아이디 필드 포커스 |

### users_03: 사용자 등록 성공
| 시나리오 | 설명 | 검증 항목 |
|---------|------|----------|
| `users_03_01` | 유효한 데이터로 사용자 등록 | 등록 성공, 성공 메시지, 사용자 목록 확인 |

## 🛠️ 설치 및 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. Playwright 브라우저 설치
```bash
npx playwright install
```

### 3. 환경 설정

민감 정보(URL, 계정 비밀번호)는 `.env` 파일로 관리합니다.

```bash
# 환경 변수 템플릿 복사
cp .env.example .env

# .env 파일을 열어 실제 값으로 수정
```

| 환경 변수 | 설명 |
|----------|------|
| `BASE_URL` | 테스트 대상 URL |
| `TEST_USER_A_ID` | 로그인용 테스트 계정 ID |
| `TEST_USER_A_PASSWORD` | 로그인용 테스트 계정 비밀번호 |
| `TEST_USER_B_PASSWORD` | 등록 테스트용 비밀번호 |
| `TEST_USER_B_NAME` | 등록 테스트용 이름 |
| `TEST_USER_B_INITIAL_PASSWORD` | 등록 테스트용 초기 비밀번호 |

`TEST_USER_B_ID`는 `scripts/generate_unique_id.py` 실행 시 `test-data/test-data.json`에 자동 저장됩니다.

```bash
# (선택) 로컬 JSON 파일 생성 — 유니크 ID 저장용
cp test-data/test-data.example.json test-data/test-data.json
```

- **Base URL**: `BASE_URL` 환경 변수 (`playwright.config.js`에서 참조)
- **테스트 사용자**: `.env` + `test-data/test-data.json`에서 관리
- **브라우저**: Chromium (기본값)

## 🚀 테스트 실행

### 기본 테스트 실행
```bash
# 모든 테스트 실행
npx playwright test

# 특정 테스트 파일 실행
npx playwright test tests/agent-studio-users-test.spec.js

# 특정 시나리오만 실행
npx playwright test --grep "users_02_01"

# 특정 시나리오 제외하고 실행
npx playwright test tests/agent-studio-users-test.spec.js --grep-invert "users_02_03"
```

### Headed 모드로 실행 (브라우저 UI 표시)
```bash
npx playwright test --headed
```

### 디버깅 모드로 실행
```bash
npx playwright test --headed --reporter=list
```

### 유니크 ID 생성 후 테스트 실행
```bash
# 1. 유니크 ID 생성 및 CSV 업데이트
python3 scripts/run_tests_with_unique_id.py

# 2. 테스트 실행
npx playwright test tests/agent-studio-users-test.spec.js --headed
```

## 📊 테스트 데이터 구조

### test-data/test-data.example.json

민감 정보는 비워 두고, UI 검증 메시지·유효성 검사용 데이터만 포함합니다.
로컬에서는 `test-data.json`을 생성하거나 `.env`만으로도 실행할 수 있습니다.

```json
{
  "domain": "",
  "test_users": {
    "A": { "id": "", "password": "" },
    "B": { "id": "", "password": "", "name": "auto테스트", "initial_password": "" }
  },
  "validation_messages": { ... },
  "invalid_test_data": { ... }
}
```

실제 값은 `.env` 파일에 설정합니다:

```bash
BASE_URL=https://your-staging-url.example.com
TEST_USER_A_ID=your_test_user_id
TEST_USER_A_PASSWORD=your_password
```

### test-data/users-test-scenarios.csv
CSV 파일은 플레이스홀더를 사용하여 테스트 시나리오를 정의합니다:

```csv
Scenario Id,Step Id,Precondition,Step,Expected Result
users_02_01,1,users_01_01 로그인 성공,"사용자 관리 페이지로 이동","사용자 관리 페이지가 표시된다"
users_02_01,2,,"사용자 등록 버튼 클릭","사용자 등록 화면으로 이동한다"
users_02_01,3,,"빈 필드로 등록하기 버튼 클릭","등록 처리가 진행된다"
users_02_01,4,,"유효성 검사 결과 확인","1) '이름' 입력 필드에 포커스가 이동한다, 2) 유효성 검사 오류 메시지가 4개 노출된다: '{validation_messages.name_required}', '{validation_messages.id_required}', '{validation_messages.password_min_length}', '{validation_messages.password_confirm_required}'"
```

## 🔧 스크립트 설명

### scripts/generate_unique_id.py
- 현재 날짜/시간을 기반으로 유니크한 사용자 ID 생성
- `test-data/test-data.json`의 `test_users.B.id` 자동 업데이트
- 형식: `testuser + YYYYMMDD + HHMMSS`

### scripts/create_csv_from_json.py
- `test-data/users-test-scenarios.csv`의 플레이스홀더를 실제 데이터로 치환
- `test-data/test-data.json`의 값을 읽어서 `test-scenarios-final.csv` 생성

### scripts/run_tests_with_unique_id.py
- 위 두 스크립트를 순차적으로 실행하는 오케스트레이션 스크립트
- 전체 테스트 준비 과정을 자동화

## 📈 테스트 결과 및 리포트

### 결과 파일 위치
- **비디오 녹화**: `test-results/` 폴더
- **스크린샷**: `test-results/` 폴더 (실패 시)
- **HTML 리포트**: `playwright-report/` 폴더

### 리포트 확인
```bash
# HTML 리포트 열기
npx playwright show-report

# 최근 실행 결과 확인
npx playwright show-report playwright-report/
```

## ✅ 최근 테스트 결과

### 성공적인 테스트 실행 (2025년 8월 4일)
- **총 테스트 수**: 9개 (users_02_03 제외)
- **통과한 테스트**: 9개 (100%)
- **실행 시간**: 21.9초
- **제외된 테스트**: `users_02_03: 이름 유효성 검사 테스트 (숫자 포함)`

### 실행된 테스트 시나리오
1. `users_01_01`: 로그인 테스트
2. `users_01_02`: 사용자 관리 네비게이션 테스트
3. `users_02_01`: 빈 필드 유효성 검사 테스트
4. `users_02_02`: 이름 유효성 검사 테스트 (1자)
5. `users_02_04`: 이름 유효성 검사 테스트 (특수문자 포함)
6. `users_02_05`: 아이디 유효성 검사 테스트 (3자 미만)
7. `users_02_06`: 아이디 유효성 검사 테스트 (대문자 포함)
8. `users_02_07`: 아이디 유효성 검사 테스트 (특수문자 포함)
9. `users_03_01`: 성공적인 사용자 등록 테스트

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 테스트 실패 시
```bash
# 상세한 로그와 함께 실행
npx playwright test --headed --reporter=list

# 실패한 테스트만 재실행
npx playwright test --grep "실패한_테스트_이름"
```

#### 2. 네트워크 타임아웃
- `playwright.config.js`에서 타임아웃 설정 조정
- 네트워크 연결 상태 확인

#### 3. 브라우저 설치 문제
```bash
# 브라우저 재설치
npx playwright install --force
```

#### 4. Python 스크립트 경로 문제
- 스크립트 경로가 올바른지 확인
- Python3가 설치되어 있는지 확인

### 디버깅 팁

1. **Headed 모드 사용**: `--headed` 플래그로 브라우저 동작 확인
2. **슬로우 모드**: `--headed --timeout=30000`으로 천천히 실행
3. **특정 스텝 디버깅**: `--grep`으로 특정 시나리오만 실행
4. **로그 확인**: 콘솔 출력에서 상세한 실행 정보 확인

## 🔄 CI/CD 통합

### GitHub Actions 예시
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      BASE_URL: ${{ secrets.BASE_URL }}
      TEST_USER_A_ID: ${{ secrets.TEST_USER_A_ID }}
      TEST_USER_A_PASSWORD: ${{ secrets.TEST_USER_A_PASSWORD }}
      TEST_USER_B_PASSWORD: ${{ secrets.TEST_USER_B_PASSWORD }}
      TEST_USER_B_NAME: auto테스트
      TEST_USER_B_INITIAL_PASSWORD: ${{ secrets.TEST_USER_B_INITIAL_PASSWORD }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: pip install -r requirements.txt
      - run: python3 scripts/run_tests_with_unique_id.py
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📝 개발 가이드

### 새로운 테스트 시나리오 추가

1. **test-data/test-data.example.json에 데이터 추가** (비민감 데이터)
2. **test-data/users-test-scenarios.csv에 시나리오 추가**
3. **agent-studio-users-test.spec.js에 테스트 블록 추가**
4. **필요시 executeScenario 함수에 로직 추가**

### 유효성 검사 메시지 추가

1. **test-data/test-data.example.json의 validation_messages에 추가**
2. **CSV에서 해당 메시지 참조**
3. **executeScenario 함수에서 검증 로직 추가**

### 특정 시나리오 제외하기

```bash
# 특정 시나리오 제외하고 테스트 실행
npx playwright test tests/agent-studio-users-test.spec.js --grep-invert "시나리오명"
```

---

**마지막 업데이트**: 2025년 8월 4일
**최근 테스트 실행**: 2025년 8월 4일 (9개 테스트 통과, 21.9초) 