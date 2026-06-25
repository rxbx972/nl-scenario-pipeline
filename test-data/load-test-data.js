const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TEST_DATA_DIR = __dirname;
const TEST_DATA_PATH = path.join(TEST_DATA_DIR, 'test-data.json');
const TEST_DATA_EXAMPLE_PATH = path.join(TEST_DATA_DIR, 'test-data.example.json');

const REQUIRED_FIELDS = [
  { path: 'domain', env: 'BASE_URL', label: 'BASE_URL' },
  { path: 'test_users.A.id', env: 'TEST_USER_A_ID', label: 'TEST_USER_A_ID' },
  { path: 'test_users.A.password', env: 'TEST_USER_A_PASSWORD', label: 'TEST_USER_A_PASSWORD' },
  { path: 'test_users.B.password', env: 'TEST_USER_B_PASSWORD', label: 'TEST_USER_B_PASSWORD' },
  { path: 'test_users.B.name', env: 'TEST_USER_B_NAME', label: 'TEST_USER_B_NAME' },
  { path: 'test_users.B.initial_password', env: 'TEST_USER_B_INITIAL_PASSWORD', label: 'TEST_USER_B_INITIAL_PASSWORD' },
];

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function applyEnvOverrides(testData) {
  const result = JSON.parse(JSON.stringify(testData));

  if (process.env.BASE_URL) {
    result.domain = process.env.BASE_URL;
  }
  if (process.env.TEST_USER_A_ID) {
    result.test_users.A.id = process.env.TEST_USER_A_ID;
  }
  if (process.env.TEST_USER_A_PASSWORD) {
    result.test_users.A.password = process.env.TEST_USER_A_PASSWORD;
  }
  if (process.env.TEST_USER_B_ID) {
    result.test_users.B.id = process.env.TEST_USER_B_ID;
  }
  if (process.env.TEST_USER_B_PASSWORD) {
    result.test_users.B.password = process.env.TEST_USER_B_PASSWORD;
  }
  if (process.env.TEST_USER_B_NAME) {
    result.test_users.B.name = process.env.TEST_USER_B_NAME;
  }
  if (process.env.TEST_USER_B_INITIAL_PASSWORD) {
    result.test_users.B.initial_password = process.env.TEST_USER_B_INITIAL_PASSWORD;
  }

  return result;
}

function validateTestData(testData) {
  const missing = REQUIRED_FIELDS
    .filter(({ path: fieldPath }) => !getNestedValue(testData, fieldPath))
    .map(({ label }) => label);

  if (missing.length > 0) {
    throw new Error(
      `필수 테스트 설정이 없습니다: ${missing.join(', ')}\n` +
      '`.env` 파일을 생성하세요: cp .env.example .env'
    );
  }
}

function resolveTestDataPath() {
  if (fs.existsSync(TEST_DATA_PATH)) {
    return TEST_DATA_PATH;
  }
  if (fs.existsSync(TEST_DATA_EXAMPLE_PATH)) {
    return TEST_DATA_EXAMPLE_PATH;
  }
  throw new Error(
    'test-data/test-data.json 또는 test-data/test-data.example.json 파일이 필요합니다.'
  );
}

function loadTestData({ validate = true } = {}) {
  const filePath = resolveTestDataPath();
  const testData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const merged = applyEnvOverrides(testData);

  if (validate) {
    validateTestData(merged);
  }

  return merged;
}

function getTestDataFilePath() {
  return TEST_DATA_PATH;
}

function ensureTestDataFile() {
  if (!fs.existsSync(TEST_DATA_PATH) && fs.existsSync(TEST_DATA_EXAMPLE_PATH)) {
    fs.copyFileSync(TEST_DATA_EXAMPLE_PATH, TEST_DATA_PATH);
  }
  return TEST_DATA_PATH;
}

module.exports = {
  loadTestData,
  applyEnvOverrides,
  getTestDataFilePath,
  ensureTestDataFile,
  TEST_DATA_PATH,
  TEST_DATA_EXAMPLE_PATH,
};
