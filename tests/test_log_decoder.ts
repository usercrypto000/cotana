import assert from 'assert';
import { extractUserFromLogHeuristic } from '../services/log_decoder';

function testTopicsExtraction() {
  const topics = [
    '0xddf252ad',
    '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  ];
  const user = extractUserFromLogHeuristic(topics as any, null, ['from']);
  assert.strictEqual(user, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  console.log('topics extraction passed');
}

function testDataExtraction() {
  const data = '0x000000000000000000000000cccccccccccccccccccccccccccccccccccccccc000000';
  const user = extractUserFromLogHeuristic(null, data, ['to']);
  assert.strictEqual(user, '0xcccccccccccccccccccccccccccccccccccccccc');
  console.log('data extraction passed');
}

function run() {
  testTopicsExtraction();
  testDataExtraction();
}

run();
