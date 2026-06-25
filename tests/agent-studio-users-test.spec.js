const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadTestData } = require('../test-data/load-test-data');

// 유니크 ID 생성 함수
function generateUniqueId() {
    try {
        const scriptPath = path.join(__dirname, '../scripts/generate_unique_id.py');
        execSync(`python3 "${scriptPath}"`, { encoding: 'utf8' });
        return true;
    } catch (error) {
        console.error('유니크 ID 생성 실패:', error.message);
        return false;
    }
}

// CSV 시나리오 데이터 로드
function loadScenarios() {
    const csvPath = path.join(__dirname, '../test-data/users-test-scenarios.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');

    const scenarios = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',');
            const scenario = {};
            headers.forEach((header, index) => {
                scenario[header.trim()] = values[index] ? values[index].trim() : '';
            });
            scenarios.push(scenario);
        }
    }
    return scenarios;
}

// 플레이스홀더 치환 함수
function replacePlaceholders(text, testData) {
    if (!text) return text;

    // 도메인 치환
    text = text.replace(/{domain}/g, testData.domain);

    // 테스트 사용자 데이터 치환
    text = text.replace(/{test_users\.A\.id}/g, testData.test_users.A.id);
    text = text.replace(/{test_users\.A\.password}/g, testData.test_users.A.password);
    text = text.replace(/{test_users\.B\.id}/g, testData.test_users.B.id);
    text = text.replace(/{test_users\.B\.password}/g, testData.test_users.B.password);
    text = text.replace(/{test_users\.B\.name}/g, testData.test_users.B.name);
    text = text.replace(/{test_users\.B\.initial_password}/g, testData.test_users.B.initial_password);

    // 잘못된 테스트 데이터 치환
    text = text.replace(/{invalid_test_data\.wrong_names\.wrong_name_1}/g, testData.invalid_test_data.wrong_names.wrong_name_1);
    text = text.replace(/{invalid_test_data\.wrong_names\.wrong_name_2}/g, testData.invalid_test_data.wrong_names.wrong_name_2);
    text = text.replace(/{invalid_test_data\.wrong_names\.wrong_name_3}/g, testData.invalid_test_data.wrong_names.wrong_name_3);
    text = text.replace(/{invalid_test_data\.wrong_ids\.wrong_id_1}/g, testData.invalid_test_data.wrong_ids.wrong_id_1);
    text = text.replace(/{invalid_test_data\.wrong_ids\.wrong_id_2}/g, testData.invalid_test_data.wrong_ids.wrong_id_2);
    text = text.replace(/{invalid_test_data\.wrong_ids\.wrong_id_3}/g, testData.invalid_test_data.wrong_ids.wrong_id_3);

    // 검증 메시지 치환
    text = text.replace(/{validation_messages\.name_min_length}/g, testData.validation_messages.name_min_length);
    text = text.replace(/{validation_messages\.success_registration}/g, testData.validation_messages.success_registration);
    text = text.replace(/{validation_messages\.name_required}/g, testData.validation_messages.name_required);
    text = text.replace(/{validation_messages\.id_required}/g, testData.validation_messages.id_required);
    text = text.replace(/{validation_messages\.password_min_length}/g, testData.validation_messages.password_min_length);
    text = text.replace(/{validation_messages\.password_confirm_required}/g, testData.validation_messages.password_confirm_required);

    return text;
}

function getLoginUrl(testData) {
    const base = testData.domain.replace(/\/$/, '');
    return `${base}/login`;
}

async function fillLoginCredentials(page, testData) {
    const idInput = page.locator('input[type="text"]').first();
    const pwInput = page.locator('input[type="password"]').first();

    await idInput.click();
    await idInput.fill(testData.test_users.A.id);
    await idInput.press('Tab');
    await pwInput.click();
    await pwInput.fill(testData.test_users.A.password);
    await pwInput.press('Tab');
}

async function clickLoginButton(page) {
    const loginButton = page.locator('button.MuiButton-containedPrimary:has-text("로그인")').first();
    await expect(loginButton).toBeEnabled({ timeout: 10000 });
    await loginButton.click();
}

async function waitForLoginComplete(page, testData) {
    const base = testData.domain.replace(/\/$/, '');
    await page.waitForLoadState('networkidle');
    await page.waitForURL(
        (url) => url.href.includes('/dashboard') || (url.href.startsWith(base) && !url.href.includes('/login')),
        { timeout: 15000 }
    ).catch(() => {});
}

async function verifyLoginSuccess(page, testData) {
    const currentUrl = page.url();
    const base = testData.domain.replace(/\/$/, '');
    const hasDashboardUrl =
        currentUrl.includes('/dashboard') ||
        (currentUrl.startsWith(base) && !currentUrl.includes('/login'));
    const hasLogout = await page.getByRole('button', { name: '로그아웃' }).count() > 0;
    const hasSettings = await page.getByText('설정', { exact: true }).count() > 0;

    return hasDashboardUrl || hasLogout || hasSettings;
}

// 로그인 함수
async function performLogin(page, testData) {
    await page.goto(getLoginUrl(testData));
    await page.waitForLoadState('networkidle');

    await fillLoginCredentials(page, testData);
    await clickLoginButton(page);
    await waitForLoginComplete(page, testData);
}

// 사용자 관리 화면으로 이동하는 함수
async function navigateToUserManagement(page) {

    // 설정 메뉴 찾기 및 클릭
    const settingsMenu = page.locator('text="설정"').first();
    await settingsMenu.waitFor({ timeout: 10000 });
    await settingsMenu.click();
    await page.waitForTimeout(1000);

    // 사용자 관리 메뉴 찾기 및 클릭
    const userManagementMenu = page.locator('a:has-text("사용자 관리")').first();
    await userManagementMenu.waitFor({ timeout: 10000 });
    await userManagementMenu.click();
    await page.waitForLoadState('networkidle');

    // 사용자 관리 화면 URL 확인
    await expect(page).toHaveURL(/.*\/users$/);
}

// 사용자 등록 화면으로 이동하는 함수
async function navigateToUserRegistration(page) {

    // 사용자 등록 버튼 클릭
    const registerButton = page.locator('button:has-text("사용자 등록")').first();
    await registerButton.waitFor({ timeout: 10000 });
    await registerButton.click();
    await page.waitForLoadState('networkidle');

    // 사용자 등록 화면 URL 확인
    await expect(page).toHaveURL(/.*\/users\/register$/);
}

// 시나리오별 테스트 실행 함수
async function executeScenario(page, scenario, testData) {
    const step = replacePlaceholders(scenario.Step, testData);
    const expectedResult = replacePlaceholders(scenario['Expected Result'], testData);

    // 단계별 실행 로직
    if (step.includes('웹 브라우저에서') && step.includes('접속')) {
        const targetUrl = step.includes('/login') ? getLoginUrl(testData) : testData.domain;
        await page.goto(targetUrl);
        await page.waitForLoadState('networkidle');

    } else if (step.includes('로그인 화면') && step.includes('아이디') && step.includes('입력')) {
        const idInput = page.locator('input[type="text"]').first();
        await idInput.click();
        await idInput.fill(testData.test_users.A.id);
        await idInput.press('Tab');

    } else if (step.includes('로그인 화면') && step.includes('비밀번호') && step.includes('입력')) {
        const pwInput = page.locator('input[type="password"]').first();
        await pwInput.click();
        await pwInput.fill(testData.test_users.A.password);
        await pwInput.press('Tab');

    } else if (step.includes('로그인') && step.includes('클릭')) {
        await clickLoginButton(page);
        await page.waitForLoadState('networkidle');

    } else if (step.includes('로그인 완료 후') && step.includes('대기')) {
        await waitForLoginComplete(page, testData);

    } else if (step.includes('설정') && step.includes('메뉴') && step.includes('찾기')) {
        const settingsMenu = page.locator('text="설정"').first();
        await settingsMenu.waitFor({ timeout: 10000 });

    } else if (step.includes('설정') && step.includes('클릭')) {
        const settingsMenu = page.locator('text="설정"').first();
        await settingsMenu.click();
        await page.waitForTimeout(1000);

    } else if (step.includes('사용자 관리') && step.includes('메뉴') && step.includes('찾기')) {
        const userManagementMenu = page.locator('a:has-text("사용자 관리")').first();
        await userManagementMenu.waitFor({ timeout: 10000 });

    } else if (step.includes('사용자 관리') && step.includes('클릭')) {
        const userManagementMenu = page.locator('a:has-text("사용자 관리")').first();
        await userManagementMenu.click();
        await page.waitForLoadState('networkidle');

    } else if (step.includes('모든 필수 입력 필드를 비워둔 상태로') && step.includes('[등록하기]') && step.includes('클릭')) {
        // 필드를 비우고 등록하기 버튼 클릭
        const nameInput = page.locator('input[placeholder*="이름"], input[name*="name"]').first();
        const idInput = page.locator('input[placeholder*="아이디"], input[name*="id"]').first();
        const pwInput = page.locator('input[type="password"]').first();
        const confirmPwInput = page.locator('input[type="password"]').nth(1);
        
        // 모든 필드를 비움
        await nameInput.clear();
        await idInput.clear();
        await pwInput.clear();
        await confirmPwInput.clear();
        
        const submitButton = page.locator('button:has-text("등록하기")').first();
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
    } else if (step.includes('사용자 등록') && step.includes('버튼')) {
        // 이미 사용자 등록 화면에 있는지 확인
        const currentUrl = page.url();
        if (currentUrl.includes('/users/register')) {
            return;
        }

        const registerButton = page.locator('button:has-text("사용자 등록")').first();
        await registerButton.waitFor({ timeout: 10000 });
        await registerButton.click();
        await page.waitForLoadState('networkidle');

    } else if (step.includes('이름') && step.includes('필드') && step.includes('입력')) {
        const nameInput = page.locator('input[placeholder*="이름"], input[name*="name"]').first();
        
        if (step.includes('(1자)')) {
            await nameInput.fill(testData.invalid_test_data.wrong_names.wrong_name_1);
        } else if (step.includes('(숫자 포함)')) {
            await nameInput.fill(testData.invalid_test_data.wrong_names.wrong_name_2);
        } else if (step.includes('(특수문자 포함)')) {
            await nameInput.fill(testData.invalid_test_data.wrong_names.wrong_name_3);
        } else {
            await nameInput.fill(testData.test_users.B.name);
        }

    } else if (step.includes('아이디') && step.includes('필드') && step.includes('입력')) {
        const idInput = page.locator('input[placeholder*="아이디"], input[name*="id"]').first();
        
        // 치환된 step 값에서 실제 아이디 값 확인
        if (step.includes('(3자 미만)') || step.includes(testData.invalid_test_data.wrong_ids.wrong_id_1)) {
            await idInput.fill(testData.invalid_test_data.wrong_ids.wrong_id_1);
        } else if (step.includes('(대문자 포함)') || step.includes(testData.invalid_test_data.wrong_ids.wrong_id_2)) {
            await idInput.fill(testData.invalid_test_data.wrong_ids.wrong_id_2);
        } else if (step.includes('(특수문자 포함)') || step.includes(testData.invalid_test_data.wrong_ids.wrong_id_3)) {
            await idInput.fill(testData.invalid_test_data.wrong_ids.wrong_id_3);
        } else if (step.includes(testData.test_users.B.id)) {
            await idInput.fill(testData.test_users.B.id);
        }

    } else if (step.includes('비밀번호 확인') && step.includes('필드') && step.includes('입력')) {
        const confirmPwInput = page.locator('input[type="password"]').nth(1);
        
        // 치환된 step 값에서 실제 비밀번호 값 확인
        if (step.includes(testData.test_users.B.initial_password)) {
            await confirmPwInput.fill(testData.test_users.B.initial_password);
        } else {
            await confirmPwInput.fill(testData.test_users.B.password);
        }

    } else if (step.includes('비밀번호') && step.includes('필드') && step.includes('입력')) {
        const pwInput = page.locator('input[type="password"]').first();
        
        // 치환된 step 값에서 실제 비밀번호 값 확인
        if (step.includes(testData.test_users.B.initial_password)) {
            await pwInput.fill(testData.test_users.B.initial_password);
        } else {
            await pwInput.fill(testData.test_users.B.password);
        }

    } else if (step.includes('등록하기') && step.includes('클릭')) {
        const submitButton = page.locator('button:has-text("등록하기")').first();
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

    } else if (step.includes('확인') && step.includes('버튼')) {
        const confirmButton = page.locator('button:has-text("확인")').first();
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
        
        // 확인 버튼 클릭 후 URL 변경 확인
        const currentUrl = page.url();
        const isUserListPage = currentUrl.includes('/users') && !currentUrl.includes('/register');
        
        // URL 변경 검증
        expect(isUserListPage).toBeTruthy();
    } else if ((step.includes('사용자 목록 화면에서')) && step.includes('사용자를 클릭')) {
        // 사용자 목록에서 특정 사용자 클릭
        console.log('=== 디버깅: 사용자 클릭 ===');
        
        // 기존 'auto테스트' 사용자 찾기
        const targetUserName = 'auto테스트';
        console.log('찾을 사용자 이름:', targetUserName);
        console.log('현재 URL:', page.url());
        
        // 화면 새로고침 대기
        await page.waitForTimeout(3000);
        
        // 현재 화면 내용 확인
        const pageText = await page.textContent('body');
        console.log('현재 화면에 사용자 이름 포함 여부:', pageText.includes(targetUserName));
        
        // 화면 내용에서 사용자 이름 검색
        const userNameRegex = new RegExp(targetUserName, 'g');
        const matches = pageText.match(userNameRegex);
        console.log('화면에서 찾은 사용자 이름 개수:', matches ? matches.length : 0);
        
        // 다양한 방법으로 사용자 행 찾기 시도
        let userRow = null;
        let clickSuccess = false;
        
        // 방법 1: 직접 텍스트로 찾기
        try {
            userRow = page.locator(`text="${targetUserName}"`).first();
            await userRow.waitFor({ timeout: 5000 });
            console.log('방법 1 성공: 직접 텍스트로 찾음');
            await userRow.click();
            await page.waitForLoadState('networkidle');
            clickSuccess = true;
        } catch (error) {
            console.log('방법 1 실패:', error.message);
        }
        
        // 방법 2: 테이블 셀에서 찾기
        if (!clickSuccess) {
            try {
                userRow = page.locator(`td:has-text("${targetUserName}")`).first();
                await userRow.waitFor({ timeout: 5000 });
                console.log('방법 2 성공: 테이블 셀에서 찾음');
                await userRow.click();
                await page.waitForLoadState('networkidle');
                clickSuccess = true;
            } catch (error) {
                console.log('방법 2 실패:', error.message);
            }
        }
        
        // 방법 3: 링크로 찾기
        if (!clickSuccess) {
            try {
                userRow = page.locator(`a:has-text("${targetUserName}")`).first();
                await userRow.waitFor({ timeout: 5000 });
                console.log('방법 3 성공: 링크로 찾음');
                await userRow.click();
                await page.waitForLoadState('networkidle');
                clickSuccess = true;
            } catch (error) {
                console.log('방법 3 실패:', error.message);
            }
        }
        
        // 방법 4: 행 전체에서 찾기
        if (!clickSuccess) {
            try {
                userRow = page.locator(`tr:has-text("${targetUserName}")`).first();
                await userRow.waitFor({ timeout: 5000 });
                console.log('방법 4 성공: 행 전체에서 찾음');
                await userRow.click();
                await page.waitForLoadState('networkidle');
                clickSuccess = true;
            } catch (error) {
                console.log('방법 4 실패:', error.message);
            }
        }
        
        if (!clickSuccess) {
            console.log('모든 방법 실패, 스크린샷 저장');
            await page.screenshot({ path: 'debug-user-not-found.png' });
            console.log('스크린샷 저장됨: debug-user-not-found.png');
        } else {
            console.log('클릭 성공! 클릭 후 URL:', page.url());
        }

    } else if (step.includes('사용자 상세 화면에서 사용자 정보 확인')) {
        // 사용자 상세 화면에서 이름과 아이디 확인 (디버깅 추가)
        const nameValue = 'auto테스트';
        const idValue = 'testuser250804171740'; // 기존 사용자 ID
        
        console.log('=== 디버깅: 사용자 상세 정보 확인 ===');
        console.log('찾을 이름:', nameValue);
        console.log('찾을 아이디:', idValue);
        
        // 현재 URL 확인
        const currentUrl = page.url();
        console.log('현재 URL:', currentUrl);
        
        // 상세 화면 로드 대기
        await page.waitForTimeout(3000);
        
        // 화면 전체에서 텍스트 검색
        const pageContent = await page.content();
        const hasNameInPage = pageContent.includes(nameValue);
        const hasIdInPage = pageContent.includes(idValue);
        
        console.log('화면에 이름 포함 여부:', hasNameInPage);
        console.log('화면에 아이디 포함 여부:', hasIdInPage);
        
        // 화면 내용 일부 출력 (디버깅용)
        const pageText = await page.textContent('body');
        console.log('화면 텍스트 (처음 500자):', pageText.substring(0, 500));
        
        // 또는 더 구체적인 요소 검색
        const nameElements = page.locator(`text="${nameValue}"`);
        const idElements = page.locator(`text="${idValue}"`);
        
        const hasNameElement = await nameElements.count() > 0;
        const hasIdElement = await idElements.count() > 0;
        
        console.log('이름 요소 개수:', hasNameElement);
        console.log('아이디 요소 개수:', hasIdElement);
        
        // 다양한 방법으로 확인
        const hasName = hasNameInPage || hasNameElement;
        const hasId = hasIdInPage || hasIdElement;
        
        console.log('최종 결과 - 이름 존재:', hasName, '아이디 존재:', hasId);
        
        // 스크린샷 저장 (디버깅용)
        await page.screenshot({ path: 'debug-user-detail.png' });
        console.log('스크린샷 저장됨: debug-user-detail.png');
        
        // 상세 화면 URL 확인도 포함
        const isDetailPage = currentUrl.includes('/users/detail/');
        expect(isDetailPage || (hasName && hasId)).toBeTruthy();

    } else if (step.includes('[변경] 버튼 클릭')) {
        // 사용자 상세 화면에서 변경 버튼 클릭
        console.log('=== 디버깅: 변경 버튼 클릭 ===');
        
        // 모든 변경 버튼 찾기
        const allChangeButtons = page.locator('button:has-text("변경"), button:has-text("수정"), button:has-text("편집")');
        const buttonCount = await allChangeButtons.count();
        console.log('찾은 변경 버튼 개수:', buttonCount);
        
        // 상태와 관련된 변경 버튼 찾기
        let statusChangeButton = null;
        
        // 방법 1: '활성' 또는 'Active' 텍스트 우측의 변경 버튼 찾기
        try {
            statusChangeButton = page.locator('text="활성", text="Active"').locator('..').locator('button:has-text("변경")').first();
            await statusChangeButton.waitFor({ timeout: 3000 });
            console.log('방법 1 성공: 활성/Active 텍스트 우측의 변경 버튼 찾음');
        } catch (error) {
            console.log('방법 1 실패:', error.message);
        }
        
        // 방법 2: 상태 관련 요소 근처의 변경 버튼 찾기
        if (!statusChangeButton) {
            try {
                statusChangeButton = page.locator('select, [class*="status"], [data-testid*="status"]').locator('..').locator('button:has-text("변경")').first();
                await statusChangeButton.waitFor({ timeout: 3000 });
                console.log('방법 2 성공: 상태 선택 요소 근처의 변경 버튼 찾음');
            } catch (error) {
                console.log('방법 2 실패:', error.message);
            }
        }
        
        // 방법 3: 모든 변경 버튼을 순회하면서 상태 관련 버튼 찾기
        if (!statusChangeButton) {
            try {
                for (let i = 0; i < buttonCount; i++) {
                    const button = allChangeButtons.nth(i);
                    const buttonText = await button.textContent();
                    const parentText = await button.locator('..').textContent();
                    
                    console.log(`버튼 ${i}: "${buttonText}", 부모 텍스트: "${parentText}"`);
                    
                    if (parentText.includes('상태') || parentText.includes('Status')) {
                        statusChangeButton = button;
                        console.log(`방법 3 성공: 버튼 ${i}가 상태 관련 버튼임`);
                        break;
                    }
                }
            } catch (error) {
                console.log('방법 3 실패:', error.message);
            }
        }
        
        // 방법 4: 마지막 변경 버튼 사용 (상태 변경 버튼이 보통 마지막에 위치)
        try {
            statusChangeButton = allChangeButtons.last();
            console.log('방법 4 성공: 마지막 변경 버튼 사용');
        } catch (error) {
            console.log('방법 4 실패:', error.message);
        }
        
        if (statusChangeButton) {
            await statusChangeButton.click();
            await page.waitForLoadState('networkidle');
            console.log('상태 변경 버튼 클릭 성공!');
        } else {
            console.log('상태 변경 버튼을 찾을 수 없음');
            await page.screenshot({ path: 'debug-status-change-button-not-found.png' });
        }

    } else if (step.includes('상태 필드를') && step.includes('변경')) {
        // 상태 필드 변경
        console.log('=== 디버깅: 상태 필드 변경 ===');
        
        let statusSelect = null;
        let selectSuccess = false;
        
        // 방법 1: 일반적인 select 요소 찾기
        try {
            statusSelect = page.locator('select').first();
            await statusSelect.waitFor({ timeout: 5000 });
            console.log('방법 1 성공: 일반 select 요소 찾음');
            
            if (step.includes('활성') && step.includes('비활성')) {
                await statusSelect.selectOption('비활성');
            } else if (step.includes('비활성') && step.includes('삭제')) {
                await statusSelect.selectOption('삭제');
            }
            selectSuccess = true;
        } catch (error) {
            console.log('방법 1 실패:', error.message);
        }
        
        // 방법 2: 더 구체적인 선택자로 찾기
        if (!selectSuccess) {
            try {
                statusSelect = page.locator('select[name*="status"], select[data-testid*="status"], .status-select, select[class*="status"]').first();
                await statusSelect.waitFor({ timeout: 5000 });
                console.log('방법 2 성공: 구체적인 status select 요소 찾음');
                
                if (step.includes('활성') && step.includes('비활성')) {
                    await statusSelect.selectOption('비활성');
                } else if (step.includes('비활성') && step.includes('삭제')) {
                    await statusSelect.selectOption('삭제');
                }
                selectSuccess = true;
            } catch (error) {
                console.log('방법 2 실패:', error.message);
            }
        }
        
        // 방법 3: 드롭다운이나 다른 형태의 상태 선택 요소 찾기
        if (!selectSuccess) {
            try {
                statusSelect = page.locator('[role="combobox"], [data-testid*="status"], .dropdown, .status-dropdown').first();
                await statusSelect.waitFor({ timeout: 5000 });
                console.log('방법 3 성공: 드롭다운 형태의 상태 선택 요소 찾음');
                
                await statusSelect.click();
                await page.waitForTimeout(1000);
                
                if (step.includes('활성') && step.includes('비활성')) {
                    const inactiveOption = page.locator('text="비활성", option:has-text("비활성"), [role="option"]:has-text("비활성")').first();
                    await inactiveOption.click();
                } else if (step.includes('비활성') && step.includes('삭제')) {
                    const deleteOption = page.locator('text="삭제", option:has-text("삭제"), [role="option"]:has-text("삭제")').first();
                    await deleteOption.click();
                }
                selectSuccess = true;
            } catch (error) {
                console.log('방법 3 실패:', error.message);
            }
        }
        
        if (!selectSuccess) {
            console.log('모든 상태 선택 방법 실패');
            await page.screenshot({ path: 'debug-status-select-failed.png' });
        } else {
            console.log('상태 변경 성공!');
        }
        
        await page.waitForTimeout(1000);

    } else if (step.includes('[저장] 버튼 클릭')) {
        // 저장 버튼 클릭
        const saveButton = page.locator('button:has-text("저장"), button:has-text("확인"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

    } else if (step.includes('[목록] 버튼 클릭')) {
        // 목록 버튼 클릭
        const listButton = page.locator('button:has-text("목록"), a:has-text("목록"), .back-to-list').first();
        await listButton.click();
        await page.waitForLoadState('networkidle');

    } else if (step.includes('사용자 목록에서') && step.includes('상태 확인')) {
        // 사용자 목록에서 특정 사용자의 상태 확인
        const userRow = page.locator(`tr:has-text("${testData.test_users.B.id}"), .user-item:has-text("${testData.test_users.B.id}")`).first();
        const statusCell = userRow.locator('td:has-text("비활성"), .status:has-text("비활성"), [data-testid*="status"]:has-text("비활성")');
        
        const hasInactiveStatus = await statusCell.count() > 0;
        expect(hasInactiveStatus).toBeTruthy();

    } else if (step.includes('사용자 목록에서') && step.includes('존재 여부 확인')) {
        // 사용자 목록에서 특정 사용자가 제거되었는지 확인
        const userRow = page.locator(`tr:has-text("${testData.test_users.B.id}"), .user-item:has-text("${testData.test_users.B.id}")`);
        
        const userExists = await userRow.count() > 0;
        expect(userExists).toBeFalsy(); // 사용자가 존재하지 않아야 함
    }

    // 예상 결과 검증
    if (expectedResult.includes('로그인 화면이 표시된다')) {
        const currentUrl = page.url();
        const loginUrl = getLoginUrl(testData);
        expect(
            currentUrl === loginUrl ||
            currentUrl === loginUrl + '/' ||
            currentUrl === testData.domain ||
            currentUrl === testData.domain + '/'
        ).toBeTruthy();

    } else if (expectedResult.includes('대시보드') || expectedResult.includes('로그인 성공')) {
        expect(await verifyLoginSuccess(page, testData)).toBeTruthy();

    } else if (expectedResult.includes('/users')) {
        await expect(page).toHaveURL(/.*\/users$/);

    } else if (expectedResult.includes('사용자 등록 화면으로 이동한다')) {
        await expect(page).toHaveURL(/.*\/users\/register$/);

    } else if (expectedResult.includes('사용자 목록') || expectedResult.includes('사용자 등록 버튼')) {
        const userList = page.locator('table, .user-list, [data-testid*="user"]');
        const registerButton = page.locator('button:has-text("사용자 등록")');
        expect(await userList.count() > 0 || await registerButton.count() > 0).toBeTruthy();

    } else if (expectedResult.includes('유효성 검사 오류')) {
        // users_02_01의 경우: 4개 오류 메시지 확인
        if (expectedResult.includes('유효성 검사 오류 메시지가 4개 노출된다')) {
            // 1) 이름 입력 필드에 포커스가 이동하는지 확인
            const nameInput = page.locator('input[placeholder*="이름"], input[name*="name"]').first();
            const isFocused = await nameInput.evaluate(el => el === document.activeElement);
            
            // 2) 4개 오류 메시지 확인
            const nameError = page.locator(`text="${testData.validation_messages.name_required}"`);
            const idError = page.locator(`text="${testData.validation_messages.id_required}"`);
            const passwordError = page.locator(`text="${testData.validation_messages.password_min_length}"`);
            const passwordConfirmError = page.locator(`text="${testData.validation_messages.password_confirm_required}"`);

            const hasNameError = await nameError.count() > 0;
            const hasIdError = await idError.count() > 0;
            const hasPasswordError = await passwordError.count() > 0;
            const hasPasswordConfirmError = await passwordConfirmError.count() > 0;

            // 검증
            expect(isFocused).toBeTruthy();
            expect(hasNameError && hasIdError && hasPasswordError && hasPasswordConfirmError).toBeTruthy();
        } else {
            // 기존 유효성 검사 로직 (다른 시나리오용)
            const redFields = page.locator('input[style*="red"], input[class*="error"], input[style*="border-color: red"], input[class*="invalid"], input[class*="danger"]');
            const errorMessages = page.locator('text*="이름은", text*="필수", text*="입력", text*="오류", text*="error"');
            const hasRedFields = await redFields.count() > 0;
            const hasErrorMessages = await errorMessages.count() > 0;
            expect(hasRedFields || hasErrorMessages).toBeTruthy();
        }
    } else if (expectedResult.includes('이름 유효성 검사 결과 확인')) {
        // users_02_02, users_02_03, users_02_04의 경우: 이름 유효성 검사 확인
        
        // 1) 이름 입력 필드에 포커스가 이동하는지 확인
        const nameInput = page.locator('input[placeholder*="이름"], input[name*="name"]').first();
        const isFocused = await nameInput.evaluate(el => el === document.activeElement);
        
        // 2) 이름 최소 길이 오류 메시지 확인
        const nameMinLengthError = page.locator(`text="${testData.validation_messages.name_min_length}"`);
        const hasNameMinLengthError = await nameMinLengthError.count() > 0;
        
        // 검증
        expect(isFocused).toBeTruthy();
        expect(hasNameMinLengthError).toBeTruthy();
    } else if (expectedResult.includes('아이디 유효성 검사 결과 확인')) {
        // users_02_05, users_02_06, users_02_07의 경우: 아이디 유효성 검사 확인
        
        // 1) 아이디 입력 필드에 포커스가 이동하는지 확인
        const idInput = page.locator('input[placeholder*="아이디"], input[name*="id"]').first();
        const isFocused = await idInput.evaluate(el => el === document.activeElement);
        
        // 2) 아이디 유효성 검사 오류 메시지 확인
        const idFormatError = page.locator(`text="${testData.validation_messages.id_format}"`);
        const hasIdFormatError = await idFormatError.count() > 0;
        
        // 검증
        expect(isFocused).toBeTruthy();
        expect(hasIdFormatError).toBeTruthy();
    } else if (expectedResult.includes('성공') || expectedResult.includes('완료')) {
        // 성공 메시지 확인 (모달 형태)
        if (expectedResult.includes('성공 얼럿이 표시되거나') || expectedResult.includes('사용자 등록 성공 확인')) {
            // 1) 성공 메시지 확인
            const successMessage = page.locator(`text="${testData.validation_messages.success_registration}"`);
            const hasSuccessMessage = await successMessage.count() > 0;
            
            // 2) URL 변경 확인 (사용자 목록 화면으로 리다이렉트)
            const currentUrl = page.url();
            const hasUrlChange = currentUrl.includes('/users') && !currentUrl.includes('/register');
            
            // 3) 화면 내용 확인 (성공 표시 요소)
            const successElements = page.locator('[class*="success"], [class*="complete"], .alert-success, .toast-success');
            const hasSuccessElements = await successElements.count() > 0;
            
            // 셋 중 하나라도 만족하면 성공
            expect(hasSuccessMessage || hasUrlChange || hasSuccessElements).toBeTruthy();
        } else {
            // 기존 성공 메시지 확인 (다른 시나리오용)
            const successMessage1 = page.locator('text="완료"');
            const successMessage2 = page.locator('text="성공"');
            const successMessage3 = page.locator('text="등록이 완료"');
            const successMessage4 = page.locator('text="사용자 등록이 완료"');
            const successMessage5 = page.locator('text="사용자 등록이 완료되었습니다"');

            const hasSuccess1 = await successMessage1.count() > 0;
            const hasSuccess2 = await successMessage2.count() > 0;
            const hasSuccess3 = await successMessage3.count() > 0;
            const hasSuccess4 = await successMessage4.count() > 0;
            const hasSuccess5 = await successMessage5.count() > 0;

            // 더 유연한 성공 검증: URL 변경이나 화면 이동도 확인
            const currentUrl = page.url();
            const hasUrlChange = currentUrl.includes('/users') && !currentUrl.includes('/register');

            // 성공 얼럿이나 모달 확인
            const alertElements = page.locator('[role="alert"], .alert, .modal, .toast, [class*="success"], [class*="complete"]');
            const hasAlert = await alertElements.count() > 0;

            expect(hasSuccess1 || hasSuccess2 || hasSuccess3 || hasSuccess4 || hasSuccess5 || hasUrlChange || hasAlert).toBeTruthy();
        }
    } else if (expectedResult.includes('사용자 상세 화면이 표시된다')) {
        // 사용자 상세 화면 표시 확인
        const currentUrl = page.url();
        const isDetailPage = currentUrl.includes('/users/') && !currentUrl.includes('/register');
        
        // 상세 화면 요소 확인
        const detailElements = page.locator('[class*="detail"], [class*="profile"], .user-detail, [data-testid*="detail"]');
        const hasDetailElements = await detailElements.count() > 0;
        
        expect(isDetailPage || hasDetailElements).toBeTruthy();

    } else if (expectedResult.includes('사용자 정보 편집 모드로 전환된다')) {
        // 편집 모드 전환 확인
        const editElements = page.locator('input[readonly="false"], input:not([readonly]), select:not([disabled]), button:has-text("저장"), button:has-text("취소")');
        const hasEditElements = await editElements.count() > 0;
        
        expect(hasEditElements).toBeTruthy();

    } else if (expectedResult.includes('변경사항이 저장되고 저장 완료 메시지가 표시된다')) {
        // 저장 완료 확인
        const successMessages = page.locator('text*="저장", text*="완료", text*="성공", text*="변경", .alert-success, .toast-success');
        const hasSuccessMessage = await successMessages.count() > 0;
        
        expect(hasSuccessMessage).toBeTruthy();

    } else if (expectedResult.includes('사용자 목록 화면으로 이동한다')) {
        // 목록 화면 이동 확인
        const currentUrl = page.url();
        const isListPage = currentUrl.includes('/users') && !currentUrl.includes('/register') && !currentUrl.includes('/users/');
        
        expect(isListPage).toBeTruthy();
    }
}

// 메인 테스트 함수들
test.describe('Agent Studio CSV 기반 테스트', () => {
    let testData;
    let scenarios;

    test.beforeAll(async () => {
        // 단일 프로세스에서만 유니크 ID 생성 (경쟁 상태 방지)
        if (process.env.WORKER_INDEX === '0' || !process.env.WORKER_INDEX) {
            generateUniqueId();
        }
        
        testData = loadTestData();
        scenarios = loadScenarios();
    });

    test('users_01_01: 로그인 테스트', async ({ page }) => {
        const loginScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_01_01');

        for (const scenario of loginScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_01_02: 사용자 관리 네비게이션 테스트', async ({ page }) => {
        // 먼저 로그인
        await performLogin(page, testData);

        const navScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_01_02');

        for (const scenario of navScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_02_01: 빈 필드 유효성 검사 테스트', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const validationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_02_01');

        for (const scenario of validationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_02_02: 이름 유효성 검사 테스트', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const nameValidationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_02_02');

        for (const scenario of nameValidationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_02_03: 이름 유효성 검사 테스트 (숫자 포함)', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const nameValidationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_02_03');

        for (const scenario of nameValidationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_02_04: 이름 유효성 검사 테스트 (특수문자 포함)', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const nameValidationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_02_04');

        for (const scenario of nameValidationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_02_05: 아이디 유효성 검사 테스트 (3자 미만)', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const idValidationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_02_05');

        for (const scenario of idValidationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_02_06: 아이디 유효성 검사 테스트 (대문자 포함)', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const idValidationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_02_06');

        for (const scenario of idValidationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_02_07: 아이디 유효성 검사 테스트 (특수문자 포함)', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const idValidationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_02_07');

        for (const scenario of idValidationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('users_03_01: 사용자 등록 테스트', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        const registrationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_03_01');

        for (const scenario of registrationScenarios) {
            await executeScenario(page, scenario, testData);
        }
    });

    test('사용자 라이프사이클 통합 테스트: 등록 → 상세확인 → 비활성화 → 삭제', async ({ page }) => {
        // 로그인 및 사용자 등록 화면으로 이동
        await performLogin(page, testData);
        await navigateToUserManagement(page);
        await navigateToUserRegistration(page);

        // 1. 사용자 등록 (users_03_01)
        console.log('=== 1단계: 사용자 등록 시작 ===');
        const registrationScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_03_01');
        for (const scenario of registrationScenarios) {
            await executeScenario(page, scenario, testData);
        }

        // 2. 사용자 상세 정보 확인 (users_03_02)
        console.log('=== 2단계: 사용자 상세 정보 확인 시작 ===');
        const detailScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_03_02');
        console.log('users_03_02 시나리오 개수:', detailScenarios.length);
        for (const scenario of detailScenarios) {
            console.log('=== 실행할 단계 ===');
            console.log('Step ID:', scenario['Step Id']);
            console.log('Step:', scenario.Step);
            console.log('Expected Result:', scenario['Expected Result']);
            console.log('Precondition:', scenario.Precondition);
            await executeScenario(page, scenario, testData);
        }

        // 3. 사용자 상태 비활성화 (users_04_01)
        console.log('=== 3단계: 사용자 상태 비활성화 시작 ===');
        const deactivateScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_04_01');
        for (const scenario of deactivateScenarios) {
            await executeScenario(page, scenario, testData);
        }

        // 4. 사용자 삭제 (users_05_01)
        console.log('=== 4단계: 사용자 삭제 시작 ===');
        const deleteScenarios = scenarios.filter(s => s['Scenario Id'] === 'users_05_01');
        for (const scenario of deleteScenarios) {
            await executeScenario(page, scenario, testData);
        }

        console.log('=== 사용자 라이프사이클 통합 테스트 완료 ===');
    });
}); 