#!/usr/bin/env python3
"""
테스트 실행 전 유니크한 ID를 생성하고 테스트 시나리오 CSV 파일을 업데이트하는 스크립트
"""

import subprocess
import sys
import os

def run_command(command, description):
    """명령어를 실행하고 결과를 출력합니다."""
    print(f"실행 중: {description}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print("✅ 성공!")
        return True
    except subprocess.CalledProcessError as e:
        print("❌ 실패!")
        print("오류:", e.stderr)
        return False

def main():
    """메인 실행 함수"""
    print("🚀 테스트 실행 준비를 시작합니다...")
    
    # 1. 유니크한 ID 생성
    if not run_command("python3 scripts/generate_unique_id.py", "유니크한 ID 생성"):
        print("❌ 유니크한 ID 생성에 실패했습니다.")
        sys.exit(1)
    
    # 2. 테스트 시나리오 CSV 파일 생성
    if not run_command("python3 scripts/create_csv_from_json.py", "테스트 시나리오 CSV 파일 생성"):
        print("❌ CSV 파일 생성에 실패했습니다.")
        sys.exit(1)
    
    print("\n🎉 모든 준비가 완료되었습니다!")
    print("\n📋 다음 단계:")
    print("1. 'test-scenarios-final.csv' 파일을 확인하세요")
    print("2. 테스트를 실행하려면: npx playwright test tests/agent-studio-users-test.spec.js")
    print("3. 다음 테스트 실행 시에는 이 스크립트를 다시 실행하여 새로운 유니크한 ID를 생성하세요")

if __name__ == "__main__":
    main() 