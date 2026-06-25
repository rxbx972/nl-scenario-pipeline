import json
import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEST_DATA_DIR = PROJECT_ROOT / 'test-data'
TEST_DATA_PATH = TEST_DATA_DIR / 'test-data.json'
TEST_DATA_EXAMPLE_PATH = TEST_DATA_DIR / 'test-data.example.json'

REQUIRED_FIELDS = [
    ('domain', 'BASE_URL', 'BASE_URL'),
    ('test_users.A.id', 'TEST_USER_A_ID', 'TEST_USER_A_ID'),
    ('test_users.A.password', 'TEST_USER_A_PASSWORD', 'TEST_USER_A_PASSWORD'),
    ('test_users.B.password', 'TEST_USER_B_PASSWORD', 'TEST_USER_B_PASSWORD'),
    ('test_users.B.name', 'TEST_USER_B_NAME', 'TEST_USER_B_NAME'),
    ('test_users.B.initial_password', 'TEST_USER_B_INITIAL_PASSWORD', 'TEST_USER_B_INITIAL_PASSWORD'),
]


def _get_nested_value(data, key_path):
    current = data
    for key in key_path.split('.'):
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _set_nested_value(data, key_path, value):
    keys = key_path.split('.')
    current = data
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value


def apply_env_overrides(test_data):
    result = json.loads(json.dumps(test_data))

    env_mappings = {
        'domain': 'BASE_URL',
        'test_users.A.id': 'TEST_USER_A_ID',
        'test_users.A.password': 'TEST_USER_A_PASSWORD',
        'test_users.B.id': 'TEST_USER_B_ID',
        'test_users.B.password': 'TEST_USER_B_PASSWORD',
        'test_users.B.name': 'TEST_USER_B_NAME',
        'test_users.B.initial_password': 'TEST_USER_B_INITIAL_PASSWORD',
    }

    for field_path, env_name in env_mappings.items():
        value = os.environ.get(env_name)
        if value:
            _set_nested_value(result, field_path, value)

    return result


def validate_test_data(test_data):
    missing = [
        label
        for field_path, _, label in REQUIRED_FIELDS
        if not _get_nested_value(test_data, field_path)
    ]

    if missing:
        raise ValueError(
            f"필수 테스트 설정이 없습니다: {', '.join(missing)}\n"
            "`.env` 파일을 생성하세요: cp .env.example .env"
        )


def resolve_test_data_path():
    if TEST_DATA_PATH.exists():
        return TEST_DATA_PATH
    if TEST_DATA_EXAMPLE_PATH.exists():
        return TEST_DATA_EXAMPLE_PATH
    raise FileNotFoundError(
        'test-data/test-data.json 또는 test-data/test-data.example.json 파일이 필요합니다.'
    )


def ensure_test_data_file():
    if not TEST_DATA_PATH.exists() and TEST_DATA_EXAMPLE_PATH.exists():
        TEST_DATA_PATH.write_text(
            TEST_DATA_EXAMPLE_PATH.read_text(encoding='utf-8'),
            encoding='utf-8',
        )
    return TEST_DATA_PATH


def load_test_data(validate=True):
    load_dotenv(PROJECT_ROOT / '.env')

    file_path = resolve_test_data_path()
    with open(file_path, 'r', encoding='utf-8') as f:
        test_data = json.load(f)

    merged = apply_env_overrides(test_data)

    if validate:
        validate_test_data(merged)

    return merged
