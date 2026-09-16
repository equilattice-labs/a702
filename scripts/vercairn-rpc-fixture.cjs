'use strict';

// Local browser QA only. This file is outside src/public and never enters Vite's
// production bundle. No RPC is forwarded and all signing/sending is rejected.
const { Interface, parseEther, toQuantity } = require('ethers');
const abi = require('../src/EvidaraEscrow.abi.json');

const CHAIN_ID = 46630;
const CONTRACT_ADDRESS = '0x9999999999999999999999999999999999999999';
const CREATOR = '0x1111111111111111111111111111111111111111';
const VIEWER = '0x2222222222222222222222222222222222222222';
const PENDING_CONTRIBUTOR = '0x3333333333333333333333333333333333333333';
const APPROVED_CONTRIBUTOR = '0x4444444444444444444444444444444444444444';
const DEFAULT_RPC_URL = 'http://127.0.0.1:5173/__qa_rpc';

function createFixture(options = {}) {
  const iface = new Interface(abi);
  const state = {
    mode: 'open', // open | expired | closed | error
    rpcUrl: DEFAULT_RPC_URL,
    unsafeEvidence: false,
    briefURI: 'https://example.com/vercairn/brief',
    evidenceURI: 'https://example.com/vercairn/pending-research',
    walletBalance: '3.0',
    creatorClaimable: '0.000000000000000001',
    ...options,
  };
  const requests = [];
  const now = Math.floor(Date.now() / 1000);
  const approvedAmount = parseEther('0.015000000000000001');
  const escrow = parseEther('0.100000000000000001');

  function data() {
    const closed = state.mode === 'closed';
    const mission = {
      creator: CREATOR,
      title: 'Trace the rights behind a tokenized share',
      descriptionURI: state.briefURI,
      category: 'Tokenized assets',
      deadline: BigInt(state.mode === 'expired' || closed ? now - 86400 : now + 7 * 86400),
      totalEscrowed: closed ? approvedAmount : escrow,
      totalAwarded: approvedAmount,
      totalClaimed: 0n,
      contributionCount: 2n,
      closed,
    };
    const contributions = [
      { contributor: PENDING_CONTRIBUTOR, evidenceURI: state.unsafeEvidence ? 'javascript:alert(1)' : state.evidenceURI, approved: 0n, claimed: 0n, approvedByCreator: false },
      { contributor: APPROVED_CONTRIBUTOR, evidenceURI: 'ipfs://Qm123456789abc/approved-research.md', approved: approvedAmount, claimed: 0n, approvedByCreator: true },
    ];
    return { mission, contributions };
  }

  function contractCall(transaction) {
    if (state.mode === 'error') throw new Error('QA fixture: mission registry is temporarily unavailable.');
    if (String(transaction.to || '').toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) throw new Error('QA fixture rejects unknown contract addresses.');
    const parsed = iface.parseTransaction({ data: transaction.data || transaction.input });
    if (!parsed || !['view', 'pure'].includes(parsed.fragment.stateMutability)) throw new Error('QA fixture permits read-only contract calls.');
    const { mission, contributions } = data();
    const { name, args } = parsed;
    let result;
    switch (name) {
      case 'missionCount': result = 1n; break;
      case 'getMissions': result = [mission].slice(Number(args[0]), Number(args[0] + args[1])); break;
      case 'getMission':
        if (args[0] !== 0n) throw new Error('QA fixture: invalid mission.');
        result = mission; break;
      case 'getContributions':
        if (args[0] !== 0n) throw new Error('QA fixture: invalid mission.');
        result = contributions.slice(Number(args[1]), Number(args[1] + args[2])); break;
      case 'getContribution':
        if (args[0] !== 0n || !contributions[Number(args[1])]) throw new Error('QA fixture: invalid contribution.');
        result = contributions[Number(args[1])]; break;
      case 'totalEscrowed': result = mission.totalEscrowed; break;
      case 'totalAwarded': result = mission.totalAwarded; break;
      case 'totalClaimed': result = 0n; break;
      case 'claimable': {
        const account = String(args[0]).toLowerCase();
        result = account === APPROVED_CONTRIBUTOR.toLowerCase() ? approvedAmount
          : account === CREATOR.toLowerCase() ? parseEther(state.creatorClaimable) + (mission.closed ? escrow - approvedAmount : 0n)
          : 0n;
        break;
      }
      case 'MAX_TITLE_BYTES': result = 96n; break;
      case 'MAX_URI_BYTES': result = 512n; break;
      case 'MAX_CATEGORY_BYTES': result = 32n; break;
      case 'MAX_MISSION_LIFETIME': result = 365n * 86400n; break;
      case 'MAX_PAGE_SIZE': result = 100n; break;
      default: throw new Error(`QA fixture does not implement ${name}.`);
    }
    return iface.encodeFunctionResult(parsed.fragment, [result]);
  }

  function respond(request) {
    requests.push({ method: request.method, params: request.params || [] });
    const response = { jsonrpc: '2.0', id: request.id ?? null };
    try {
      let result;
      switch (request.method) {
        case 'eth_chainId': result = toQuantity(CHAIN_ID); break;
        case 'net_version': result = String(CHAIN_ID); break;
        case 'eth_blockNumber': result = '0x100'; break;
        case 'eth_getBalance': result = toQuantity(parseEther(state.walletBalance)); break;
        case 'eth_getCode': result = '0x60006000'; break;
        case 'eth_call': result = contractCall(request.params?.[0] || {}); break;
        default: throw new Error(`QA fixture blocks unsupported RPC method: ${request.method}. Signing and transactions are disabled.`);
      }
      return { ...response, result };
    } catch (error) {
      return { ...response, error: { code: -32000, message: error.message } };
    }
  }

  return {
    state, requests, iface, data,
    setState(next) { Object.assign(state, next); },
    handle(payload) { return Array.isArray(payload) ? payload.map(respond) : respond(payload); },
    configSource() {
      return `import abi from '/src/EvidaraEscrow.abi.json?import';\nexport const CONTRACT_ADDRESS = ${JSON.stringify(CONTRACT_ADDRESS)};\nexport const CHAIN_ID = ${CHAIN_ID};\nexport const RPC_URL = ${JSON.stringify(state.rpcUrl)};\nexport const EXPLORER_URL = 'https://explorer.example';\nexport const CONTRACT_ABI = abi;\nexport const APP_NAME = 'Vercairn';\n`;
    },
    async fulfillRpc(route) {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
        return;
      }
      const payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(this.handle(payload)) });
    },
    walletOptions(next = {}) { return { rpcUrl: state.rpcUrl, account: CREATOR, chainId: toQuantity(CHAIN_ID), ...next }; },
  };
}

// Serializable function for page.addInitScript(installWallet, fixture.walletOptions()).
// Helpers let browser QA change the account/network and trigger real app listeners.
function installWallet(options) {
  let account = options.account || '', chainId = options.chainId || '0xb626', rpcId = 0;
  const listeners = new Map();
  const emit = (event, value) => { for (const listener of listeners.get(event) || []) listener(value); };
  const wallet = {
    isVercairnQaWallet: true,
    on(event, callback) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(callback); return wallet; },
    removeListener(event, callback) { listeners.get(event)?.delete(callback); return wallet; },
    async request({ method, params = [] }) {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return account ? [account] : [];
      if (method === 'eth_chainId') return chainId;
      if (method === 'wallet_switchEthereumChain') { chainId = params[0].chainId; emit('chainChanged', chainId); return null; }
      if (method === 'wallet_addEthereumChain') return null;
      if (!['eth_call', 'eth_getBalance', 'eth_getCode', 'eth_blockNumber', 'net_version'].includes(method)) {
        throw Object.assign(new Error(`QA wallet blocks ${method}. Signing and transactions are disabled.`), { code: 4001 });
      }
      const response = await fetch(options.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }) });
      const payload = await response.json();
      if (payload.error) throw Object.assign(new Error(payload.error.message), { code: payload.error.code });
      return payload.result;
    },
  };
  Object.defineProperty(window, 'ethereum', { configurable: true, value: wallet });
  window.__vercairnQaWallet = {
    setAccount(next) { account = next || ''; emit('accountsChanged', account ? [account] : []); },
    setChain(next) { chainId = next; emit('chainChanged', chainId); },
  };
}

module.exports = { createFixture, installWallet, CHAIN_ID, CONTRACT_ADDRESS, CREATOR, VIEWER, PENDING_CONTRIBUTOR, APPROVED_CONTRIBUTOR, DEFAULT_RPC_URL };

// Usage in a Playwright script in website/ (register routes before navigation):
// const qa = require('./scripts/vercairn-rpc-fixture.cjs');
// const fixture = qa.createFixture();
// await page.route('**/src/config.js*', route => route.fulfill({ contentType: 'text/javascript', body: fixture.configSource() }));
// await page.route('**/__qa_rpc', route => fixture.fulfillRpc(route));
// await page.addInitScript(qa.installWallet, fixture.walletOptions());
// await page.goto('http://127.0.0.1:5173');
// fixture.setState({ mode: 'expired', unsafeEvidence: true });
// await page.reload(); // Or use the app's Refresh missions button.
// await page.evaluate(address => window.__vercairnQaWallet.setAccount(address), qa.VIEWER);
// fixture.setState({ mode: 'error' }); await page.reload();
