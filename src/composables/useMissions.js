import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther, isAddress } from 'ethers';
import { CONTRACT_ADDRESS, CHAIN_ID, RPC_URL, EXPLORER_URL, CONTRACT_ABI } from '../config';

const SAVED_KEY = 'civiquill-saved';
// Retained only to migrate bookmarks from an earlier release.
const LEGACY_SAVED_KEY = 'proofora-saved';
const MAX_UINT128 = (1n << 128n) - 1n;
const TOPICS = ['All topics', 'Market structure', 'Tokenized assets', 'Ecosystem', 'Risk research'];
const emptyForm = () => ({ title: '', category: 'Market structure', description: '', deadline: '', reward: '', uri: '' });
const byteLength = value => new TextEncoder().encode(value).length;

/** Never bind a contract-provided URI directly to an href. */
export function safeExternalUrl(value) {
  if (typeof value !== 'string') return '';
  const uri = value.trim();
  if (!uri || /[\u0000-\u0020\u007f\\]/u.test(uri)) return '';
  try {
    const url = new URL(uri);
    if (url.username || url.password) return '';
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
    if (url.protocol === 'ipfs:' && /^[a-zA-Z0-9]+$/.test(url.hostname)) {
      return `https://ipfs.io/ipfs/${url.hostname}${url.pathname}${url.search}${url.hash}`;
    }
  } catch { /* Invalid or relative URLs are not public evidence links. */ }
  return '';
}

export function validateAmount(value, label = 'Amount') {
  const amount = String(value ?? '').trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(amount)) throw new Error(`${label} must be a positive ETH amount.`);
  if ((amount.split('.')[1] || '').length > 18) throw new Error(`${label} supports at most 18 decimal places.`);
  const wei = parseEther(amount);
  if (wei <= 0n) throw new Error(`${label} must be greater than zero.`);
  if (wei > MAX_UINT128) throw new Error(`${label} exceeds the contract limit.`);
  return wei;
}

function validateUri(value, label) {
  const uri = String(value ?? '').trim();
  if (!safeExternalUrl(uri)) throw new Error(`${label} must be a public https://, http:// or ipfs:// URI.`);
  if (byteLength(uri) > 512) throw new Error(`${label} must be at most 512 UTF-8 bytes.`);
  return uri;
}

export function validateMissionForm(form, now = Date.now()) {
  const errors = {};
  const title = String(form.title || '').trim();
  const category = String(form.category || '').trim();
  const deadline = Math.floor(new Date(form.deadline).getTime() / 1000);
  const nowSeconds = Math.floor(now / 1000);
  if (!title || byteLength(title) > 96) errors.title = 'Use a title between 1 and 96 UTF-8 bytes.';
  if (!TOPICS.slice(1).includes(category) || byteLength(category) > 32) errors.category = 'Choose a research topic.';
  if (!Number.isFinite(deadline) || deadline <= nowSeconds) errors.deadline = 'Choose a future submission deadline.';
  else if (deadline > nowSeconds + 365 * 24 * 60 * 60) errors.deadline = 'The deadline must be within the next 365 days.';
  let uri = '', reward;
  try { uri = validateUri(form.uri, 'Brief URI'); } catch (error) { errors.uri = error.message; }
  try { reward = validateAmount(form.reward, 'Reward'); } catch (error) { errors.reward = error.message; }
  return { errors, values: { title, category, deadline, uri, reward } };
}

function errorMessage(error) {
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED' || error?.info?.error?.code === 4001) {
    return 'The wallet request was declined. You can try again when ready.';
  }
  if (error?.code === 'TRANSACTION_REPLACED' && error.cancelled) return 'The transaction was cancelled in your wallet.';
  const message = error?.reason || error?.shortMessage || error?.message || 'Something went wrong. Please try again.';
  return String(message).slice(0, 240);
}

function sampleMissions() {
  return [
    { title: 'What does a tokenized stock actually represent?', category: 'Tokenized assets', tag: 'FOUNDATION', reward: '0.08', color: 'peach', difficulty: 'Open brief', description: 'Map the rights, custody models and settlement paths behind tokenized equities.', brief: 'Compare at least three tokenized equity models. Identify legal rights, redemption paths, underlying custody, trading hours and geographic restrictions. Link every material claim to an original source. Highlight what cannot yet be independently verified.', deliverables: ['A comparison with primary-source links', 'A rights and custody diagram', 'Limitations and open questions'] },
    { title: 'A field guide to the Robinhood Chain ecosystem', category: 'Ecosystem', tag: 'ECOSYSTEM MAP', reward: '0.05', color: 'lavender', difficulty: 'Open brief', description: 'Connect the infrastructure, applications and builders shaping a new financial network.', brief: 'Create an ecosystem map of confirmed, publicly announced projects. Separate live deployments from announced plans. Include original source URLs and record your last verification date.', deliverables: ['A verifiable ecosystem directory', 'Deployment status and public contract links', 'A methodology and freshness statement'] },
    { title: 'Where does liquidity go when markets close?', category: 'Market structure', tag: 'DEEP DIVE', reward: '0.12', color: 'mint', difficulty: 'Technical', description: 'Explore price discovery, spread formation and liquidity outside traditional market hours.', brief: 'Study how extended trading hours affect liquidity and reference prices. Use reproducible public data where available. Explain assumptions and distinguish observations from hypotheses.', deliverables: ['Reproducible data and methodology', 'An analysis of spread and depth', 'Risks, limitations and unanswered questions'] },
    { title: 'Make smart contract risk understandable', category: 'Risk research', tag: 'PUBLIC GOOD', reward: '0.06', color: 'blue', difficulty: 'Technical', description: 'Turn contract permissions and failure modes into a practical research checklist.', brief: 'Produce an accessible checklist for reviewing contract permissions, upgradeability and custody. This is educational research, not an audit or assurance report.', deliverables: ['An approachable contract risk checklist', 'Annotated examples from public documentation', 'Clear boundaries between research and security audit'] },
  ].map((mission, index) => ({ ...mission, id: `sample-${index + 1}`, key: `sample-${index + 1}`, sample: true, submissions: 0, icon: ['01', '02', '03', '04'][index], deadline: 'Illustrative brief', deadlineTimestamp: 0, expired: false, closed: false, status: 'Sample', sponsor: 'Example sponsor', availableReward: mission.reward, totalAwarded: '0' }));
}

export function useMissions() {
  const account = ref(''), chainId = ref(''), walletError = ref(''), connecting = ref(false), busy = ref(false), notice = ref('');
  const activeView = ref('All missions'), search = ref(''), activeCategory = ref('All topics'), sortBy = ref('newest');
  const selected = ref(null), createOpen = ref(false), guideOpen = ref(false), mobileNav = ref(false);
  const txHash = ref(''), txStatus = ref('idle'), txError = ref(''), activeTransaction = ref(''), formErrors = ref({});
  const missionForm = ref(emptyForm()), evidence = ref(''), contribution = ref(''), submissionText = ref('');
  const contributions = ref([]), contributionsLoading = ref(false), contributionsError = ref('');
  const claimableAmount = ref('0'), walletBalance = ref('0'), networkTotals = ref({ escrowed: '0', awarded: '0', claimed: '0' });
  const statsLoading = ref(false), statsError = ref(''), loading = ref(false), loadError = ref(''), currentMissionCount = ref(0);
  const configured = computed(() => isAddress(CONTRACT_ADDRESS) && !/^0x0{40}$/i.test(CONTRACT_ADDRESS) && Array.isArray(CONTRACT_ABI) && CONTRACT_ABI.length > 0);
  const shortAccount = computed(() => account.value ? `${account.value.slice(0, 6)}…${account.value.slice(-4)}` : 'Connect wallet');
  const correctChain = computed(() => {
    try { return !!CHAIN_ID && BigInt(chainId.value || 0) === BigInt(CHAIN_ID); } catch { return false; }
  });
  const topics = TOPICS;
  const missionItems = ref(configured.value ? [] : sampleMissions());
  const now = ref(Date.now());
  const namespace = `chain:${CHAIN_ID}:${CONTRACT_ADDRESS.toLowerCase()}:mission:`;
  let provider, noticeTimer, deadlineTimer, refreshVersion = 0, contributionsVersion = 0, statsVersion = 0, disposed = false;
  const wallet = () => typeof window !== 'undefined' ? window.ethereum : undefined;
  const missionKey = mission => mission.key || (mission.sample ? String(mission.id) : `${namespace}${mission.id}`);
  const readContract = () => {
    if (!configured.value) throw new Error('Live missions are not configured yet.');
    if (!RPC_URL) throw new Error('A network RPC URL is required to load missions.');
    provider ||= new JsonRpcProvider(RPC_URL);
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  function readSaved() {
    try {
      const parse = raw => {
        try { const data = JSON.parse(raw || '[]'); return Array.isArray(data) ? data.filter(id => typeof id === 'string' || (Number.isSafeInteger(id) && id >= 0)) : []; }
        catch { return []; }
      };
      const existing = localStorage.getItem(SAVED_KEY);
      if (existing !== null) return [...new Set(parse(existing).map(String))];
      const oldItems = parse(localStorage.getItem(LEGACY_SAVED_KEY));
      const migrated = [...new Set(oldItems.map(id => typeof id === 'number' ? (configured.value ? `${namespace}${id}` : `sample-${id}`) : id))];
      if (oldItems.length) localStorage.setItem(SAVED_KEY, JSON.stringify(migrated));
      return migrated;
    } catch { return []; }
  }
  const previewSaved = ref(readSaved());
  const isSaved = mission => previewSaved.value.includes(missionKey(mission));
  const savedCount = computed(() => missionItems.value.filter(isSaved).length);
  const selectedIsCreator = computed(() => !!account.value && !!selected.value?.creator && selected.value.creator.toLowerCase() === account.value.toLowerCase());
  const selectedIsOpen = computed(() => !!selected.value && !selected.value.sample && !selected.value.closed && selected.value.deadlineTimestamp * 1000 > now.value);
  const selectedCanRefund = computed(() => selectedIsCreator.value && !selected.value.sample && !selected.value.closed && selected.value.deadlineTimestamp * 1000 <= now.value);
  const filtered = computed(() => {
    const query = search.value.trim().toLowerCase();
    const items = missionItems.value.filter(mission =>
      (activeCategory.value === 'All topics' || mission.category === activeCategory.value) &&
      (activeView.value !== 'Saved' || isSaved(mission)) &&
      (activeView.value !== 'My activity' || (account.value && mission.creator?.toLowerCase() === account.value.toLowerCase())) &&
      `${mission.title} ${mission.description} ${mission.category}`.toLowerCase().includes(query));
    const rank = mission => mission.sample ? Number(String(mission.id).replace('sample-', '')) : Number(mission.id);
    return items.sort((left, right) => {
      if (sortBy.value === 'reward' || sortBy.value === 'highest-reward') {
        const a = parseEther(left.availableReward), b = parseEther(right.availableReward);
        return a === b ? rank(right) - rank(left) : a > b ? -1 : 1;
      }
      if (sortBy.value === 'deadline' || sortBy.value === 'closing-soon') {
        const a = left.expired || left.closed || left.sample ? Infinity : left.deadlineTimestamp;
        const b = right.expired || right.closed || right.sample ? Infinity : right.deadlineTimestamp;
        return a === b ? rank(right) - rank(left) : a - b;
      }
      if (sortBy.value === 'recommended') {
        const a = left.closed || left.expired ? 1 : 0, b = right.closed || right.expired ? 1 : 0;
        if (a !== b) return a - b;
      }
      return left.sample && right.sample ? rank(left) - rank(right) : rank(right) - rank(left);
    });
  });

  function notify(message) {
    clearTimeout(noticeTimer);
    notice.value = message;
    noticeTimer = setTimeout(() => { notice.value = ''; }, 7000);
  }
  function saveMission(mission) {
    const key = missionKey(mission);
    previewSaved.value = isSaved(mission) ? previewSaved.value.filter(id => id !== key) : [...previewSaved.value, key];
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(previewSaved.value)); }
    catch { notify('Saved for this visit. Your browser did not allow local bookmark storage.'); }
  }
  function resetFilters() { activeView.value = 'All missions'; activeCategory.value = 'All topics'; search.value = ''; }
  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    mobileNav.value = false;
  }
  function explorerLink(hash) {
    return /^0x[0-9a-f]{64}$/i.test(hash || '') && EXPLORER_URL ? safeExternalUrl(`${EXPLORER_URL.replace(/\/$/, '')}/tx/${hash}`) : '';
  }
  function resetWalletStats() { walletBalance.value = '0'; claimableAmount.value = '0'; statsError.value = ''; }

  async function updateWalletStats() {
    const version = ++statsVersion;
    resetWalletStats();
    if (!wallet() || !account.value || !correctChain.value) { statsLoading.value = false; return; }
    const address = account.value;
    statsLoading.value = true;
    try {
      const browserProvider = new BrowserProvider(wallet());
      const balance = await browserProvider.getBalance(address);
      const claimable = configured.value ? await new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, browserProvider).claimable(address) : 0n;
      if (version !== statsVersion || disposed) return;
      walletBalance.value = formatEther(balance);
      claimableAmount.value = formatEther(claimable);
    } catch (error) {
      if (version === statsVersion) statsError.value = `Could not refresh wallet balances. ${errorMessage(error)}`;
    } finally { if (version === statsVersion) statsLoading.value = false; }
  }

  async function connectWallet() {
    if (connecting.value) return false;
    walletError.value = '';
    if (!wallet()) { walletError.value = 'No Ethereum wallet found. Install a compatible browser wallet and return here.'; return false; }
    connecting.value = true;
    try {
      const addresses = await wallet().request({ method: 'eth_requestAccounts' });
      account.value = addresses[0] || '';
      chainId.value = await wallet().request({ method: 'eth_chainId' });
      await updateWalletStats();
      return !!account.value;
    } catch (error) { walletError.value = errorMessage(error); return false; }
    finally { connecting.value = false; }
  }

  async function switchNetwork() {
    if (!wallet() || !CHAIN_ID) { walletError.value = 'The requested wallet network is not available.'; return false; }
    walletError.value = '';
    try {
      const targetChain = `0x${BigInt(CHAIN_ID).toString(16)}`;
      try { await wallet().request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChain }] }); }
      catch (error) {
        if ((error.code === 4902 || error?.data?.originalError?.code === 4902) && RPC_URL) {
          await wallet().request({ method: 'wallet_addEthereumChain', params: [{ chainId: targetChain, chainName: 'Robinhood Chain Testnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [RPC_URL], blockExplorerUrls: EXPLORER_URL ? [EXPLORER_URL] : [] }] });
          await wallet().request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChain }] });
        } else throw error;
      }
      chainId.value = await wallet().request({ method: 'eth_chainId' });
      const addresses = await wallet().request({ method: 'eth_accounts' });
      account.value = addresses[0] || '';
      await refreshAll();
      return correctChain.value;
    } catch (error) { walletError.value = errorMessage(error); return false; }
  }

  function mapMission(mission, id) {
    const deadlineTimestamp = Number(mission.deadline);
    const expired = deadlineTimestamp * 1000 <= now.value;
    return {
      id, key: `${namespace}${id}`, sample: false, title: mission.title, descriptionURI: mission.descriptionURI,
      description: 'Read the public brief for the research scope, evidence requirements and acceptance criteria.',
      category: mission.category, tag: 'PUBLIC BRIEF', reward: formatEther(mission.totalEscrowed),
      availableReward: formatEther(mission.totalEscrowed - mission.totalAwarded), totalAwarded: formatEther(mission.totalAwarded),
      submissions: Number(mission.contributionCount), color: ['peach', 'lavender', 'mint', 'blue'][id % 4], icon: String(id + 1).padStart(2, '0'),
      deadlineTimestamp, deadline: new Date(deadlineTimestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
      expired, closed: mission.closed, sponsor: mission.creator, creator: mission.creator,
      status: mission.closed ? 'Closed' : expired ? 'Ended' : 'Open', difficulty: 'Open brief',
      brief: 'Open the public brief before starting. The creator reviews contributions against its published acceptance criteria.',
      deliverables: ['Read the brief and its acceptance criteria', 'Publish research with original-source citations', 'Submit a public evidence URI before the deadline'],
    };
  }

  async function refreshMissions() {
    const version = ++refreshVersion;
    loadError.value = '';
    if (!configured.value) { missionItems.value = sampleMissions(); currentMissionCount.value = 0; loading.value = false; return; }
    loading.value = true;
    try {
      const contract = readContract();
      const countBig = await contract.missionCount();
      if (countBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('The mission registry is too large for this client.');
      const count = Number(countBig), allRows = [];
      // Respect the contract's 100-row page size without hiding older missions.
      for (let cursor = 0; cursor < count; cursor += 100) {
        const rows = await contract.getMissions(cursor, 100);
        if (version !== refreshVersion || disposed) return;
        allRows.push(...rows.map((mission, index) => mapMission(mission, cursor + index)));
      }
      const totals = await Promise.all([contract.totalEscrowed(), contract.totalAwarded(), contract.totalClaimed()]);
      if (version !== refreshVersion || disposed) return;
      missionItems.value = allRows;
      currentMissionCount.value = count;
      networkTotals.value = { escrowed: formatEther(totals[0]), awarded: formatEther(totals[1]), claimed: formatEther(totals[2]) };
      if (selected.value && !selected.value.sample) selected.value = allRows.find(mission => mission.key === selected.value.key) || null;
    } catch (error) {
      if (version === refreshVersion) loadError.value = `Live missions could not be loaded. ${errorMessage(error)}`;
    } finally { if (version === refreshVersion) loading.value = false; }
  }

  async function loadContributions() {
    const version = ++contributionsVersion, mission = selected.value;
    contributionsError.value = '';
    if (!mission || mission.sample || !configured.value) { contributions.value = []; contributionsLoading.value = false; return; }
    contributionsLoading.value = true;
    try {
      const contract = readContract(), allRows = [];
      for (let cursor = 0; ; cursor += 100) {
        const rows = await contract.getContributions(mission.id, cursor, 100);
        if (version !== contributionsVersion || disposed) return;
        allRows.push(...rows.map((item, index) => ({ id: cursor + index, contributor: item.contributor, evidenceURI: item.evidenceURI, approved: formatEther(item.approved), claimed: formatEther(item.claimed), approvedByCreator: item.approvedByCreator })));
        if (rows.length < 100) break;
      }
      if (version === contributionsVersion) contributions.value = allRows;
    } catch (error) {
      if (version === contributionsVersion) contributionsError.value = `Contributions could not be loaded. ${errorMessage(error)}`;
    } finally { if (version === contributionsVersion) contributionsLoading.value = false; }
  }

  async function refreshAll() { await Promise.all([refreshMissions(), updateWalletStats()]); await loadContributions(); }
  function accountsChanged(addresses) { account.value = addresses[0] || ''; void refreshAll(); }
  function chainChanged(chain) { chainId.value = chain; void refreshAll(); }
  function openCreate() { selected.value = null; guideOpen.value = false; formErrors.value = {}; txError.value = ''; createOpen.value = true; mobileNav.value = false; }
  function closeModal() { selected.value = null; createOpen.value = false; guideOpen.value = false; }

  watch(() => selected.value?.key, () => {
    contributions.value = []; evidence.value = ''; contribution.value = ''; submissionText.value = ''; formErrors.value = {};
    if (!busy.value) txError.value = '';
    void loadContributions();
  });

  async function transact(kind, index, amount) {
    if (busy.value) return false;
    if (!configured.value) { notify('This is a sample workspace. Live publishing is not available yet.'); return false; }
    busy.value = true; activeTransaction.value = kind; txError.value = ''; formErrors.value = {}; txHash.value = ''; txStatus.value = 'idle';
    const mission = selected.value;
    try {
      let value, uri, form;
      if (!['create', 'fund', 'submit', 'approve', 'refund', 'claim'].includes(kind)) throw new Error('Unknown transaction action.');
      if (kind === 'create') {
        const validation = validateMissionForm(missionForm.value);
        formErrors.value = validation.errors;
        if (Object.keys(validation.errors).length) throw new Error(Object.values(validation.errors)[0]);
        form = validation.values;
      } else if (kind !== 'claim') {
        if (!mission || mission.sample) throw new Error('Select a live mission first.');
        if (kind !== 'refund' && (mission.closed || mission.deadlineTimestamp * 1000 <= Date.now())) throw new Error('This mission is no longer accepting funding, submissions or approvals.');
        if (kind === 'refund' && (mission.closed || mission.deadlineTimestamp * 1000 > Date.now())) throw new Error('Unallocated funds can be refunded once, after the deadline.');
        if (kind === 'fund' || kind === 'approve') {
          try { value = validateAmount(kind === 'fund' ? contribution.value : (amount ?? contribution.value), kind === 'fund' ? 'Funding' : 'Approval amount'); }
          catch (error) { formErrors.value = { [kind === 'fund' ? 'contribution' : 'approval']: error.message }; throw error; }
          if (kind === 'approve') {
            if (!Number.isSafeInteger(Number(index)) || Number(index) < 0 || Number(index) >= mission.submissions) throw new Error('Select a valid contribution to approve.');
            if (value > parseEther(mission.availableReward)) throw new Error('The approval amount exceeds this mission’s unallocated reward pool.');
          } else if (value + parseEther(mission.reward) > MAX_UINT128) throw new Error('This funding amount exceeds the mission escrow limit.');
        }
        if (kind === 'submit') {
          try { uri = validateUri(evidence.value, 'Evidence URI'); }
          catch (error) { formErrors.value = { evidence: error.message }; throw error; }
        }
      }
      txStatus.value = 'wallet';
      if (!account.value && !(await connectWallet())) throw new Error(walletError.value || 'Connect a wallet to continue.');
      if (!correctChain.value && !(await switchNetwork())) throw new Error(walletError.value || 'Switch to Robinhood Chain Testnet to continue.');
      const browserProvider = new BrowserProvider(wallet()), signer = await browserProvider.getSigner();
      const signerAddress = await signer.getAddress();
      if ((kind === 'approve' || kind === 'refund') && signerAddress.toLowerCase() !== mission.creator.toLowerCase()) throw new Error('Only this mission’s creator can perform this action.');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      if (kind === 'claim' && await contract.claimable(signerAddress) === 0n) throw new Error('There are no available rewards to claim.');
      let transaction;
      if (kind === 'create') transaction = await contract.createMission(form.title, form.uri, form.category, form.deadline, { value: form.reward });
      else if (kind === 'fund') transaction = await contract.fundMission(mission.id, { value });
      else if (kind === 'submit') transaction = await contract.contribute(mission.id, uri);
      else if (kind === 'approve') transaction = await contract.approveContribution(mission.id, Number(index), value);
      else if (kind === 'refund') transaction = await contract.refundUnallocated(mission.id);
      else transaction = await contract.claimRewards();
      txHash.value = transaction.hash; txStatus.value = 'pending';
      notify('Transaction submitted. Waiting for network confirmation.');
      let receipt;
      try { receipt = await transaction.wait(); }
      catch (error) {
        if (error.code === 'TRANSACTION_REPLACED' && !error.cancelled && error.receipt) { receipt = error.receipt; txHash.value = error.replacement?.hash || receipt.hash; }
        else throw error;
      }
      if (!receipt || receipt.status !== 1) throw new Error('The transaction did not succeed. Check the transaction in the explorer.');
      txStatus.value = 'confirmed';
      if (kind === 'create') { createOpen.value = false; missionForm.value = emptyForm(); }
      if (kind === 'submit') evidence.value = '';
      if (kind === 'fund') contribution.value = '';
      notify(kind === 'refund' ? 'Refund allocated. Use Claim rewards to withdraw the available balance.' : 'Transaction confirmed on Robinhood Chain Testnet.');
      await refreshAll();
      return true;
    } catch (error) {
      txStatus.value = 'error'; txError.value = errorMessage(error); notify(txError.value); return false;
    } finally { busy.value = false; activeTransaction.value = ''; }
  }

  function updateDeadlines() {
    now.value = Date.now();
    missionItems.value = missionItems.value.map(mission => {
      if (mission.sample) return mission;
      const expired = mission.deadlineTimestamp * 1000 <= now.value;
      return { ...mission, expired, status: mission.closed ? 'Closed' : expired ? 'Ended' : 'Open' };
    });
    if (selected.value && !selected.value.sample) selected.value = missionItems.value.find(mission => mission.key === selected.value.key) || selected.value;
  }

  onMounted(async () => {
    void refreshMissions();
    deadlineTimer = setInterval(updateDeadlines, 15000);
    if (!wallet()) return;
    wallet().on?.('accountsChanged', accountsChanged);
    wallet().on?.('chainChanged', chainChanged);
    try {
      // Reading an existing connection must not open a wallet permission prompt.
      const [addresses, chain] = await Promise.all([wallet().request({ method: 'eth_accounts' }), wallet().request({ method: 'eth_chainId' })]);
      if (disposed) return;
      account.value = addresses[0] || ''; chainId.value = chain;
      await updateWalletStats();
    } catch (error) { walletError.value = `Could not read your wallet connection. ${errorMessage(error)}`; }
  });
  onUnmounted(() => {
    disposed = true; refreshVersion++; contributionsVersion++; statsVersion++;
    clearTimeout(noticeTimer); clearInterval(deadlineTimer);
    wallet()?.removeListener?.('accountsChanged', accountsChanged);
    wallet()?.removeListener?.('chainChanged', chainChanged);
    provider?.destroy();
  });

  return {
    account, chainId, walletError, connecting, busy, notice, activeView, search, activeCategory, sortBy,
    selected, createOpen, guideOpen, mobileNav, txHash, txStatus, txError, activeTransaction, formErrors,
    missionForm, evidence, contribution, submissionText, contributions, contributionsLoading, contributionsError,
    claimableAmount, walletBalance, networkTotals, statsLoading, statsError, loading, loadError, currentMissionCount,
    previewSaved, configured, shortAccount, correctChain, topics, missionItems, filtered, savedCount,
    selectedIsCreator, selectedIsOpen, selectedCanRefund, notify, saveMission, isSaved, scrollTo,
    updateWalletStats, connectWallet, switchNetwork, openCreate, refreshMissions, loadContributions,
    refreshAll, transact, closeModal, safeExternalUrl, explorerLink, resetFilters,
  };
}
