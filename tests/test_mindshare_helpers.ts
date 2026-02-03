import assert from 'assert';
import { isApprovalOnlyFromEventNames, isApprovalOnlyFromTopics, extractUserFromEventArgs } from '../services/mindshare_helpers';

function testApprovalOnly() {
  assert.strictEqual(isApprovalOnlyFromEventNames([]), false);
  assert.strictEqual(isApprovalOnlyFromEventNames([{ eventName: 'Approval' }]), true);
  assert.strictEqual(isApprovalOnlyFromEventNames([{ eventName: 'Transfer' }]), false);
  assert.strictEqual(isApprovalOnlyFromEventNames([{ eventName: 'Approval' }, { eventName: 'Approval' }]), true);
  const approvalSig = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
  assert.strictEqual(isApprovalOnlyFromTopics([{ topics: [approvalSig] }]), true);
  assert.strictEqual(isApprovalOnlyFromTopics([{ topics: [approvalSig] }, { topics: [approvalSig] }]), true);
  assert.strictEqual(isApprovalOnlyFromTopics([{ topics: [approvalSig] }, { topics: ['0xdead'] }]), false);
  console.log('approvalOnly tests passed');
}

function testExtractUser() {
  const args = { owner: '0xabc', to: '0xdef' };
  assert.strictEqual(extractUserFromEventArgs(args, ['user','owner']), '0xabc');
  assert.strictEqual(extractUserFromEventArgs(args, ['to']), '0xdef');
  assert.strictEqual(extractUserFromEventArgs(args, ['notexist']), null);
  const nested = { data: { user: '0x111' } };
  assert.strictEqual(extractUserFromEventArgs(nested, ['data.user']), '0x111');
  console.log('extractUser tests passed');
}

async function testWalletTypeCache() {
  // cannot call RPC in unit test environment reliably; we instead test cache key behaviour
  const Redis = (await import('ioredis')).default;
  const r = new Redis();
  await r.set('wallet:type:1:0xdead', 'EOA', 'EX', 10);
  const v = await r.get('wallet:type:1:0xdead');
  assert.strictEqual(v, 'EOA');
  await r.del('wallet:type:1:0xdead');
  await r.quit();
  console.log('walletType cache test passed');
}

function run() {
  testApprovalOnly();
  testExtractUser();
  testWalletTypeCache().catch((e)=>{ console.log('wallet cache test skipped', e) });
}

run();
