const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('health check', () => {
  it('confirms the test runner is wired up', () => {
    assert.ok(true);
  });
});
