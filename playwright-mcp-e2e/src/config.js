import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_ROOT } from '../test-data/load-test-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const args = {
    mode: process.env.RUN_MODE || 'rules',
    scenario: process.env.SCENARIO_ID || 'users_01_01',
    headless: true,
    list: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      args.mode = argv[++i];
    } else if (arg === '--scenario' && argv[i + 1]) {
      args.scenario = argv[++i];
    } else if (arg === '--headed') {
      args.headless = false;
    } else if (arg === '--list') {
      args.list = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

export function printHelp() {
  console.log(`
playwright-mcp-e2e — CSV 시나리오를 Playwright MCP로 실행

Usage:
  npm run run -- --scenario users_01_01          # 기본: rules (API 키 불필요)
  npm run run:llm -- --scenario users_01_01    # llm 모드 (OPENAI_API_KEY 필요)
  npm run list

Options:
  --scenario <id>   시나리오 ID (기본: users_01_01)
  --mode rules|llm  실행 모드 (기본: rules)
  --headed          MCP 브라우저 headed 모드
  --list            시나리오 ID 목록
  --help            도움말

Environment:
  .env              BASE_URL, 계정 정보 (기본 실행에 충분)
  OPENAI_API_KEY    llm 모드에서만 필요
  OPENAI_MODEL      (선택) llm 모드, 기본 gpt-4o-mini
`);
}

export function generateUniqueId() {
  const script = path.join(PROJECT_ROOT, 'scripts/generate_unique_id.py');
  execSync(`python3 "${script}"`, { encoding: 'utf8', cwd: PROJECT_ROOT });
}

export function getAllowedOrigins() {
  const base = process.env.BASE_URL;
  if (!base) return undefined;
  try {
    return new URL(base).origin;
  } catch {
    return undefined;
  }
}
