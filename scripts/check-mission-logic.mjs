// Run with: node --test scripts/check-mission-logic.mjs
// Tests transform the config import in memory. They never read .env, contact an
// RPC, or use a real wallet. No generated test module enters the production app.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { parseEther, formatEther, isAddress } from 'ethers';

const sourceFile = new URL('../src/composables/useMissions.js', import.meta.url);
const address = '0x1111111111111111111111111111111111111111';
let assertions = 0;
const check = Object.fromEntries(['equal', 'deepEqual', 'ok', 'throws'].map(method => [method, (...args) => {
  assert[method](...args);
  assertions++;
}]));

async function loadModule({ configured = false, dependencies } = {}) {
  const config = {
    CONTRACT_ADDRESS: configured ? address : '', CHAIN_ID: 46630,
    RPC_URL: 'https://rpc.example', EXPLORER_URL: 'https://explorer.example',
    CONTRACT_ABI: configured ? ['mock-configured-abi'] : [],
  };
  const raw = await readFile(sourceFile, 'utf8');
  let source = raw
    .replace("from 'vue'", `from '${import.meta.resolve('vue')}'`)
    .replace(/^import \{ CONTRACT_ADDRESS[^\n]+$/m, `const { CONTRACT_ADDRESS, CHAIN_ID, RPC_URL, EXPLORER_URL, CONTRACT_ABI } = ${JSON.stringify(config)};`);
  if (dependencies) {
    globalThis.__civiquillMissionTestDeps = dependencies;
    source = source.replace(/^import \{ BrowserProvider[^\n]+$/m,
      'const { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther, isAddress } = globalThis.__civiquillMissionTestDeps;');
  } else source = source.replace("from 'ethers'", `from '${import.meta.resolve('ethers')}'`);
  try {
    return await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  } finally { delete globalThis.__civiquillMissionTestDeps; }
}

// SSR executes setup with Vue's real refs/computeds and lifecycle context, while
// deliberately leaving onMounted RPC and browser subscriptions inactive.
async function instantiate(module) {
  let state;
  await renderToString(createSSRApp({ setup() { state = module.useMissions(); return () => null; } }));
  return state;
}

function setGlobalForTest(context, key, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  context.after(() => {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  });
}

test('public evidence links, exact ETH amounts, and contract field boundaries', async () => {
  const module = await loadModule();
  for (const uri of [
    'javascript:alert(1)', 'data:text/html,<script>1</script>', '//evil.example',
    '/relative', 'ftp://example.com/file', 'https://user:pass@example.com',
    'https://example.com/\nx', 'ipfs://../bad',
  ]) check.equal(module.safeExternalUrl(uri), '', `Reject unsafe URI: ${uri}`);
  check.equal(module.safeExternalUrl('https://example.com/research'), 'https://example.com/research');
  check.equal(module.safeExternalUrl('ipfs://Qm123456789abc/research.json'), 'https://ipfs.io/ipfs/Qm123456789abc/research.json');
  check.equal(module.validateAmount('0.100000000000000001'), 100000000000000001n);
  check.equal(module.validateAmount('0.000000000000000001'), 1n);
  for (const amount of ['0', '-1', '1e-3', '1.1234567890123456789', 'Infinity', '1,000']) {
    check.throws(() => module.validateAmount(amount), `Reject invalid amount: ${amount}`);
  }
  const now = Date.now();
  const form = {
    title: 'A research question', category: 'Market structure', uri: 'https://example.com/brief',
    reward: '0.01', deadline: new Date(now + 86400000).toISOString(), description: '',
  };
  check.deepEqual(module.validateMissionForm(form, now).errors, {});
  check.ok(module.validateMissionForm({ ...form, title: '\u7814'.repeat(33) }, now).errors.title, 'The title limit counts UTF-8 bytes');
  check.ok(module.validateMissionForm({ ...form, deadline: new Date(now - 1000).toISOString() }, now).errors.deadline);
  check.ok(module.validateMissionForm({ ...form, deadline: new Date(now + 366 * 86400000).toISOString() }, now).errors.deadline);
  check.ok(module.validateMissionForm({ ...form, uri: 'javascript:alert(1)' }, now).errors.uri);
});

test('bookmark migration, malformed storage, sample labeling, filters and sorting', async context => {
  let storage = new Map([['proofora-saved', '[1,3,3]']]);
  setGlobalForTest(context, 'localStorage', {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  });
  const module = await loadModule();
  let state = await instantiate(module);
  check.deepEqual(state.previewSaved.value, ['sample-1', 'sample-3']);
  check.equal(state.savedCount.value, 2);
  check.ok(state.missionItems.value.every(mission => mission.sample));
  state.activeView.value = 'Saved';
  check.equal(state.filtered.value.length, 2);
  state.saveMission(state.missionItems.value[0]);
  check.equal(state.savedCount.value, 1);
  storage = new Map([['civiquill-saved', '{invalid json']]);
  state = await instantiate(module);
  check.deepEqual(state.previewSaved.value, []);
  storage = new Map([['civiquill-saved', '{"unexpected": true}']]);
  state = await instantiate(module);
  check.deepEqual(state.previewSaved.value, []);
  state.sortBy.value = 'reward';
  check.equal(state.filtered.value[0].reward, '0.12');
  state.search.value = 'custody';
  check.equal(state.filtered.value.length, 1);
});

test('mocked wallet transactions: switch, precision, duplicate guard and state refresh', async context => {
  const hash = `0x${'a'.repeat(64)}`;
  let chain = '0x1', createCalls = 0, resolveReceipt;
  const requested = [], fundValues = [], rows = [], contributed = [];
  const wallet = {
    async request({ method, params }) {
      requested.push(method);
      if (method === 'wallet_switchEthereumChain') chain = params[0].chainId;
      if (method === 'eth_chainId') return chain;
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [address];
    }, on() {}, removeListener() {},
  };
  setGlobalForTest(context, 'window', { ethereum: wallet });
  setGlobalForTest(context, 'localStorage', { getItem: () => null, setItem() {} });
  // Notices should not keep the test process alive for seven seconds.
  context.mock.method(globalThis, 'setTimeout', () => 0);
  const confirmedTransaction = () => ({ hash, wait: async () => ({ status: 1, hash }) });
  const contract = {
    missionCount: async () => BigInt(rows.length),
    getMissions: async (cursor, size) => rows.slice(cursor, cursor + size),
    totalEscrowed: async () => rows.reduce((sum, row) => sum + row.totalEscrowed, 0n),
    totalAwarded: async () => 0n, totalClaimed: async () => 0n, claimable: async () => 1n,
    getContributions: async () => contributed,
    async createMission(title, uri, category, deadline, { value }) {
      createCalls++;
      rows.push({ title, descriptionURI: uri, category, deadline: BigInt(deadline), totalEscrowed: value,
        totalAwarded: 0n, contributionCount: 0n, creator: address, closed: false });
      return { hash, wait: () => new Promise(resolve => { resolveReceipt = resolve; }) };
    },
    async fundMission(id, { value }) {
      fundValues.push(value); rows[id].totalEscrowed += value;
      return confirmedTransaction();
    },
    async contribute(id, uri) {
      contributed.push({ contributor: address, evidenceURI: uri, approved: 0n, claimed: 0n, approvedByCreator: false });
      rows[id].contributionCount++;
      return confirmedTransaction();
    },
  };
  const module = await loadModule({ configured: true, dependencies: {
    parseEther, formatEther, isAddress,
    Contract: class { constructor() { return contract; } },
    JsonRpcProvider: class { destroy() {} },
    BrowserProvider: class {
      async getSigner() { return { getAddress: async () => address }; }
      async getBalance() { return parseEther('3'); }
    },
  } });
  const state = await instantiate(module);
  check.equal(state.missionItems.value.length, 0, 'Configured mode must not show sample missions');
  check.equal(requested.length, 0, 'Setup must not request wallet authorization');
  state.createOpen.value = true;
  state.missionForm.value = {
    title: 'Verified question', category: 'Ecosystem', uri: 'https://example.com/brief',
    reward: '0.100000000000000001', deadline: new Date(Date.now() + 86400000).toISOString(), description: '',
  };
  const transaction = state.transact('create');
  check.equal(state.busy.value, true);
  check.equal(await state.transact('create'), false, 'A second click must not open another wallet request');
  for (let attempts = 0; !resolveReceipt && attempts < 100; attempts++) await new Promise(setImmediate);
  if (!resolveReceipt) throw new Error('Mock transaction failed to reach its pending state.');
  check.equal(state.txStatus.value, 'pending');
  check.equal(createCalls, 1);
  resolveReceipt({ status: 1, hash });
  check.equal(await transaction, true);
  check.equal(state.createOpen.value, false);
  check.equal(state.missionForm.value.title, '');
  check.equal(state.txStatus.value, 'confirmed');
  check.equal(state.correctChain.value, true);
  check.ok(requested.includes('wallet_switchEthereumChain'));
  check.equal(rows[0].totalEscrowed, 100000000000000001n);
  check.equal(state.missionItems.value[0].sample, false);
  state.selected.value = state.missionItems.value[0];
  state.contribution.value = '0.000000000000000001';
  check.equal(await state.transact('fund'), true);
  check.deepEqual(fundValues, [1n]);
  state.evidence.value = 'https://example.com/evidence';
  check.equal(await state.transact('submit'), true);
  check.equal(state.contributions.value.length, 1);
  check.equal(state.evidence.value, '');
  state.evidence.value = 'javascript:alert(1)';
  check.equal(await state.transact('submit'), false);
  check.equal(contributed.length, 1);
  check.ok(state.formErrors.value.evidence);
});

after(() => { console.log(`${assertions} mission logic assertions passed. All wallet and RPC operations were mocked.`); });
