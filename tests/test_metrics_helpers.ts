import assert from 'assert';
import { computeRepeatRate, median } from '../services/metrics_helpers';

function testMedian() {
  assert.strictEqual(median([]), 0);
  assert.strictEqual(median([1]), 1);
  assert.strictEqual(median([3, 1, 2]), 2);
  assert.strictEqual(median([1, 2, 3, 4]), 2.5);
  console.log('median tests passed');
}

function testRepeatRate() {
  assert.strictEqual(computeRepeatRate([]), 0);
  assert.strictEqual(computeRepeatRate([1, 1, 1]), 0);
  assert.strictEqual(computeRepeatRate([2, 1, 3]), 2 / 3);
  assert.strictEqual(computeRepeatRate([2, 2, 2]), 1);
  console.log('repeatRate tests passed');
}

function run() {
  testMedian();
  testRepeatRate();
}

run();
