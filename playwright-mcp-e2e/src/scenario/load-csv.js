import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../../../test-data/users-test-scenarios.csv');

/** 간단한 CSV 파서 (따옴표 필드 지원) */
function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

export function loadScenarios() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  const scenarios = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim();
    });
    scenarios.push(row);
  }
  return scenarios;
}

export function filterByScenarioId(scenarios, scenarioId) {
  return scenarios
    .filter((s) => s['Scenario Id'] === scenarioId)
    .sort((a, b) => Number(a['Step Id']) - Number(b['Step Id']));
}

export function listScenarioIds(scenarios) {
  return [...new Set(scenarios.map((s) => s['Scenario Id']))];
}
