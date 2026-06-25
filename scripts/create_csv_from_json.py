import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from load_test_data import load_test_data


def replace_placeholders(text, test_data):
    """텍스트에서 JSON 플레이스홀더를 실제 값으로 치환합니다."""
    if not isinstance(text, str):
        return text

    text = text.replace('{domain}', test_data['domain'])
    text = text.replace('{test_users.A.id}', test_data['test_users']['A']['id'])
    text = text.replace('{test_users.A.password}', test_data['test_users']['A']['password'])
    text = text.replace('{test_users.B.id}', test_data['test_users']['B']['id'])
    text = text.replace('{test_users.B.password}', test_data['test_users']['B']['password'])
    text = text.replace('{test_users.B.name}', test_data['test_users']['B']['name'])
    text = text.replace('{test_users.B.initial_password}', test_data['test_users']['B']['initial_password'])
    text = text.replace('{invalid_test_data.wrong_names.wrong_name_1}', test_data['invalid_test_data']['wrong_names']['wrong_name_1'])
    text = text.replace('{invalid_test_data.wrong_names.wrong_name_2}', test_data['invalid_test_data']['wrong_names']['wrong_name_2'])
    text = text.replace('{invalid_test_data.wrong_names.wrong_name_3}', test_data['invalid_test_data']['wrong_names']['wrong_name_3'])
    text = text.replace('{invalid_test_data.wrong_ids.wrong_id_1}', test_data['invalid_test_data']['wrong_ids']['wrong_id_1'])
    text = text.replace('{invalid_test_data.wrong_ids.wrong_id_2}', test_data['invalid_test_data']['wrong_ids']['wrong_id_2'])
    text = text.replace('{invalid_test_data.wrong_ids.wrong_id_3}', test_data['invalid_test_data']['wrong_ids']['wrong_id_3'])
    text = text.replace('{validation_messages.name_min_length}', test_data['validation_messages']['name_min_length'])
    text = text.replace('{validation_messages.success_registration}', test_data['validation_messages']['success_registration'])

    return text


def process_dataframe(df, test_data):
    """데이터프레임의 모든 셀에서 플레이스홀더를 치환합니다."""
    for column in df.columns:
        df[column] = df[column].apply(lambda x: replace_placeholders(x, test_data))
    return df


def main():
    test_data = load_test_data()
    df = pd.read_csv('test-data/users-test-scenarios.csv')
    df = process_dataframe(df, test_data)
    df.to_csv('test-scenarios-final.csv', index=False, encoding='utf-8-sig')


if __name__ == "__main__":
    main()
