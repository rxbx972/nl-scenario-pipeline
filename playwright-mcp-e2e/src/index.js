import fs from 'fs';
import path from 'path';
import { loadTestData, PROJECT_ROOT } from '../test-data/load-test-data.js';
import { loadScenarios, filterByScenarioId, listScenarioIds } from './scenario/load-csv.js';
import { replacePlaceholders } from './scenario/placeholders.js';
import { PlaywrightMcpClient } from './mcp/client.js';
import { McpBrowser } from './mcp/browser.js';
import { runStepWithRules } from './runners/rules.js';
import { runStepWithLlm } from './runners/llm.js';
import { parseArgs, printHelp, generateUniqueId, getAllowedOrigins } from './config.js';

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  const allScenarios = loadScenarios();

  if (args.list) {
    console.log('시나리오 목록:');
    for (const id of listScenarioIds(allScenarios)) {
      console.log(`  - ${id}`);
    }
    return;
  }

  generateUniqueId();
  const testData = loadTestData();
  const steps = filterByScenarioId(allScenarios, args.scenario);

  if (!steps.length) {
    throw new Error(`시나리오를 찾을 수 없습니다: ${args.scenario}`);
  }

  const resultsDir = path.join(PROJECT_ROOT, 'results', args.scenario);
  fs.mkdirSync(resultsDir, { recursive: true });

  const mcpClient = new PlaywrightMcpClient({
    headless: args.headless,
    allowedOrigins: getAllowedOrigins(),
  });

  console.log(`\n▶ 시나리오: ${args.scenario} (${steps.length} steps, mode=${args.mode})\n`);

  await mcpClient.connect();
  const browser = new McpBrowser(mcpClient);

  const log = [];
  let failed = false;

  try {
    for (const row of steps) {
      const stepId = row['Step Id'];
      const step = replacePlaceholders(row.Step, testData);
      const expected = replacePlaceholders(row['Expected Result'], testData);

      console.log(`--- Step ${stepId} ---`);
      console.log(`Step: ${step}`);

      const started = Date.now();
      try {
        if (args.mode === 'llm') {
          const { summary } = await runStepWithLlm(mcpClient, step, expected, testData);
          console.log(`✓ ${summary}`);
        } else {
          await runStepWithRules(browser, step, expected, testData);
          console.log('✓ 완료');
        }
        log.push({ stepId, step, status: 'passed', ms: Date.now() - started });
      } catch (err) {
        failed = true;
        console.error(`✗ ${err.message}`);
        log.push({ stepId, step, status: 'failed', error: err.message, ms: Date.now() - started });

        const screenshot = await mcpClient.callTool('browser_take_screenshot', {
          filename: path.join(resultsDir, `step-${stepId}-failed.png`),
        });
        console.error(screenshot.text?.slice(0, 200) || '');

        break;
      }
    }
  } finally {
    await mcpClient.close();
  }

  const logPath = path.join(resultsDir, `run-${Date.now()}.json`);
  fs.writeFileSync(logPath, JSON.stringify({ scenario: args.scenario, mode: args.mode, log }, null, 2));
  console.log(`\n로그: ${logPath}`);

  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
