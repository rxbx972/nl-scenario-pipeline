import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from load_test_data import TEST_DATA_PATH, ensure_test_data_file


def generate_unique_id():
    """유니크한 테스트 사용자 ID를 생성합니다. (최대 20자, 영문 소문자와 숫자만)"""
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")

    unique_id = f"testuser{date_str}{time_str}"

    if len(unique_id) > 20:
        short_date = now.strftime("%y%m%d")
        unique_id = f"testuser{short_date}{time_str}"

        if len(unique_id) > 20:
            month_day = now.strftime("%m%d")
            hour_min_sec = now.strftime("%H%M%S")
            unique_id = f"testuser{month_day}{hour_min_sec}"

    return unique_id


def update_test_data():
    """test-data.json 파일을 읽어서 유니크한 ID로 업데이트합니다."""
    test_data_path = ensure_test_data_file()

    try:
        with open(test_data_path, 'r', encoding='utf-8') as f:
            test_data = json.load(f)

        unique_id = generate_unique_id()
        test_data['test_users']['B']['id'] = unique_id

        with open(test_data_path, 'w', encoding='utf-8') as f:
            json.dump(test_data, f, ensure_ascii=False, indent=2)

        return unique_id
    except Exception as e:
        print(f"Error: test-data.json 파일 처리 중 오류 발생: {e}")
        return None


def main():
    if not TEST_DATA_PATH.parent.exists():
        print(f"Error: test-data 디렉토리를 찾을 수 없습니다: {TEST_DATA_PATH.parent}")
        return

    update_test_data()


if __name__ == "__main__":
    main()
