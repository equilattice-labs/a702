import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  APP_NAME,
  LAMPORTS_PER_SOL,
  SOLANA_CLUSTER,
  SOLANA_EXPLORER_URL,
  SOLANA_NETWORK_NAME,
  SOLANA_PROGRAM_ID,
  SOLANA_PROGRAM_READY,
  SOLANA_RPC_URL,
  SOLANA_TOKEN_MINT,
  SOLANA_TOKEN_SYMBOL,
} from '../config';
import { createSolanaProgramClient } from '../utils/solanaProgram';

const slug = value => String(value || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';
const SAVED_KEY = `${slug(APP_NAME)}-saved`;
// Newest first. Earlier brand keys are retained only for bookmark migration.
const LEGACY_SAVED_KEYS = ['evidalume-saved', 'bountelith-saved', 'findelora-saved', 'factrelle-saved', 'inquedra-saved', 'tessivra-saved', 'vercairn-saved', 'siftlane-saved', 'citeward-saved', 'civiquill-saved', 'proofora-saved'];
const MAX_U64 = (1n << 64n) - 1n;
const TOPICS = ['All topics', 'Market structure', 'Tokenized assets', 'Ecosystem', 'Risk research'];
const emptyForm = () => ({ title: '', category: 'Market structure', description: '', deadline: '', reward: '', uri: '' });
const byteLength = value => new TextEncoder().encode(value).length;
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodedBase58Length(value) {
  let number = 0n;
  for (const character of value) {
    const digit = BASE58.indexOf(character);
    if (digit < 0) return 0;
    number = number * 58n + BigInt(digit);
  }
  let bytes = 0;
  while (number > 0n) { bytes++; number >>= 8n; }
  let leadingZeroBytes = 0;
  while (leadingZeroBytes < value.length && value[leadingZeroBytes] === '1') leadingZeroBytes++;
  return leadingZeroBytes + bytes;
}

/** Solana public keys are base58 encodings of exactly 32 bytes. */
export function isSolanaAddress(value) {
  const address = String(value || '').trim();
  return address.length >= 32 && address.length <= 44 && decodedBase58Length(address) === 32;
}

/** Transaction signatures are base58 encodings of exactly 64 bytes. */
export function isSolanaSignature(value) {
  const signature = String(value || '').trim();
  return signature.length >= 64 && signature.length <= 90 && decodedBase58Length(signature) === 64;
}

function normalisePublicKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    if (typeof value.toBase58 === 'function') return value.toBase58();
    const text = value.toString();
    return text === '[object Object]' ? '' : text;
  } catch { return ''; }
}

/** Convert an exact decimal token amount into raw SPL units without floating-point rounding. */
export function parseTokenAmount(value, decimals, label = 'Amount') {
  const amount = String(value ?? '').trim();
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('The reward mint has invalid decimals.');
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(amount)) throw new Error(`${label} must be a positive token amount.`);
  const [whole = '0', fraction = ''] = amount.split('.');
  if (fraction.length > decimals) throw new Error(`${label} supports at most ${decimals} decimal places for this reward mint.`);
  const scale = 10n ** BigInt(decimals);
  const rawAmount = BigInt(whole || '0') * scale + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0');
  if (rawAmount <= 0n) throw new Error(`${label} must be greater than zero.`);
  if (rawAmount > MAX_U64) throw new Error(`${label} exceeds the SPL token u64 limit.`);
  return rawAmount;
}

/** SOL preview helper. A live SPL mint always uses parseTokenAmount with its own decimals. */
export function parseSol(value, label = 'Amount') {
  return parseTokenAmount(value, 9, label);
}

// Keep the old helper name as a small migration aid for integrations that call
// the validation module directly. It now validates native SOL amounts.
export const validateAmount = parseSol;

export function formatSol(value) {
  return formatTokenAmount(value, 9);
}

export function formatTokenAmount(value, decimals) {
  let rawAmount;
  try { rawAmount = typeof value === 'bigint' ? value : BigInt(value ?? 0); }
  catch { rawAmount = 0n; }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) return '0';
  const negative = rawAmount < 0n;
  if (negative) rawAmount = -rawAmount;
  const scale = 10n ** BigInt(decimals);
  const whole = rawAmount / scale;
  const fraction = decimals ? String(rawAmount % scale).padStart(decimals, '0').replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole}.${fraction || '0'}`;
}

function asBigInt(value) {
  try { return typeof value === 'bigint' ? value : BigInt(value ?? 0); }
  catch { return 0n; }
}

function amountLamports(item) {
  if (item?.availableRewardLamports !== undefined) return asBigInt(item.availableRewardLamports);
  try { return parseSol(item?.availableReward ?? 0, 'Reward'); }
  catch { return 0n; }
}

/** Never bind a contract/program-provided URI directly to an href. */
export function safeExternalUrl(value) {
  if (typeof value !== 'string') return '';
  const uri = value.trim();
  if (!uri || /[\u0000-\u0020\u007f\\]/u.test(uri)) return '';
  try {
    const url = new URL(uri);
    if (url.username || url.password) return '';
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      const host = url.hostname.toLowerCase().replace(/\.+$/, '');
      if (['twitter.com', 'x.com', 't.co'].some(blocked => host === blocked || host.endsWith(`.${blocked}`))) return '';
      return url.href;
    }
    if (url.protocol === 'ipfs:' && /^[a-zA-Z0-9]+$/.test(url.hostname)) {
      return `https://ipfs.io/ipfs/${url.hostname}${url.pathname}${url.search}${url.hash}`;
    }
  } catch { /* Invalid or relative URLs are not public evidence links. */ }
  return '';
}

function validateUri(value, label) {
  const uri = String(value ?? '').trim();
  if (!safeExternalUrl(uri)) throw new Error(`${label} must be a public https://, http:// or ipfs:// URI.`);
  if (byteLength(uri) > 512) throw new Error(`${label} must be at most 512 UTF-8 bytes.`);
  return uri;
}

export function validateMissionForm(form, now = Date.now(), decimals = 9) {
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
  try { reward = parseTokenAmount(form.reward, decimals, 'Reward'); } catch (error) { errors.reward = error.message; }
  return { errors, values: { title, category, deadline, uri, reward } };
}

function errorMessage(error) {
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED' || error?.code === 'USER_REJECTED') {
    return 'The wallet request was declined. You can try again when ready.';
  }
  const message = error?.reason || error?.shortMessage || error?.message || 'Something went wrong. Please try again.';
  return String(message).slice(0, 240);
}

function sampleMissions() {
  return [
    { title: 'What does a tokenized stock actually represent?', category: 'Tokenized assets', tag: 'FOUNDATION', reward: '0.08', color: 'peach', difficulty: 'Open brief', description: 'Map the rights, custody models and settlement paths behind tokenized equities.', brief: 'Compare at least three tokenized equity models. Identify legal rights, redemption paths, underlying custody, trading hours and geographic restrictions. Link every material claim to an original source. Highlight what cannot yet be independently verified.', deliverables: ['A comparison with primary-source links', 'A rights and custody diagram', 'Limitations and open questions'] },
    { title: 'A field guide to the Solana ecosystem', category: 'Ecosystem', tag: 'ECOSYSTEM MAP', reward: '0.05', color: 'lavender', difficulty: 'Open brief', description: 'Connect the infrastructure, applications and builders shaping an open financial network.', brief: 'Create an ecosystem map of confirmed, publicly announced projects. Separate live deployments from announced plans. Include original source URLs and record your last verification date.', deliverables: ['A verifiable ecosystem directory', 'Deployment status and public program links', 'A methodology and freshness statement'] },
    { title: 'Where does liquidity go when markets close?', category: 'Market structure', tag: 'DEEP DIVE', reward: '0.12', color: 'mint', difficulty: 'Technical', description: 'Explore price discovery, spread formation and liquidity outside traditional market hours.', brief: 'Study how extended trading hours affect liquidity and reference prices. Use reproducible public data where available. Explain assumptions and distinguish observations from hypotheses.', deliverables: ['Reproducible data and methodology', 'An analysis of spread and depth', 'Risks, limitations and unanswered questions'] },
    { title: 'Make program risk understandable', category: 'Risk research', tag: 'PUBLIC GOOD', reward: '0.06', color: 'blue', difficulty: 'Technical', description: 'Turn program permissions and failure modes into a practical research checklist.', brief: 'Produce an accessible checklist for reviewing Solana program permissions, upgradeability and custody. This is educational research, not an audit or assurance report.', deliverables: ['An approachable program risk checklist', 'Annotated examples from public documentation', 'Clear boundaries between research and security audit'] },
  ].map((mission, index) => ({ ...mission, id: `sample-${index + 1}`, key: `sample-${index + 1}`, sample: true, submissions: 0, icon: ['01', '02', '03', '04'][index], deadline: 'Illustrative brief', deadlineTimestamp: 0, expired: false, closed: false, status: 'Sample', sponsor: 'Example sponsor', availableReward: mission.reward, totalAwarded: '0' }));
}

async function solanaRpc(method, params = []) {
  if (!SOLANA_RPC_URL) throw new Error('A Solana RPC URL is required to read network data.');
  const response = await fetch(SOLANA_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  if (!response.ok) throw new Error(`Solana RPC returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error.message || 'Solana RPC request failed.');
  return payload?.result;
}

export function useMissions() {
  const account = ref(''), chainId = ref(''), walletError = ref(''), connecting = ref(false), busy = ref(false), notice = ref('');
  const noticeKind = ref(''), savedChange = ref(null);
  const activeView = ref('All missions'), search = ref(''), activeCategory = ref('All topics'), sortBy = ref('newest');
  const selected = ref(null), createOpen = ref(false), guideOpen = ref(false), mobileNav = ref(false);
  const txHash = ref(''), txStatus = ref('idle'), txError = ref(''), activeTransaction = ref(''), formErrors = ref({});
  const missionForm = ref(emptyForm()), evidence = ref(''), contribution = ref(''), submissionText = ref('');
  const contributions = ref([]), contributionsLoading = ref(false), contributionsError = ref('');
  const claimableAmount = ref('0'), walletBalance = ref('0'), rewardBalance = ref('0'), rewardDecimals = ref(9);
  const statsLoading = ref(false), statsError = ref(''), loading = ref(false), loadError = ref('');
  // A program id is deliberately insufficient. The instruction schema must be
  // reviewed and explicitly enabled after deployment via VITE_SOLANA_PROGRAM_READY.
  const configured = computed(() => isSolanaAddress(SOLANA_PROGRAM_ID) && isSolanaAddress(SOLANA_TOKEN_MINT) && SOLANA_PROGRAM_READY);
  const rewardSymbol = computed(() => configured.value ? SOLANA_TOKEN_SYMBOL : 'SOL');
  const rewardUnitLabel = computed(() => configured.value ? SOLANA_TOKEN_SYMBOL : `${SOLANA_CLUSTER} SOL`);
  const shortAccount = computed(() => account.value ? `${account.value.slice(0, 4)}...${account.value.slice(-4)}` : 'Connect wallet');
  // Solana wallets do not expose a standard chain-id signal. Transactions are
  // built with this app's target RPC blockhash and submitted to that RPC.
  const correctChain = computed(() => !!account.value && !!SOLANA_RPC_URL);
  const topics = TOPICS;
  const missionItems = ref(configured.value ? [] : sampleMissions());
  const now = ref(Date.now());
  const namespace = `cluster:${SOLANA_CLUSTER}:${SOLANA_PROGRAM_ID || 'preview'}:mission:`;
  let noticeTimer, deadlineTimer, noticeVersion = 0, refreshVersion = 0, contributionsVersion = 0, statsVersion = 0, disposed = false;
  let walletProvider;
  const wallet = () => {
    if (typeof window === 'undefined') return undefined;
    return window.solana || window.phantom?.solana || window.solflare || undefined;
  };
  const programClient = (provider = walletProvider || wallet() || {}) => {
    if (!configured.value) throw new Error('The Solana program and reward mint are not configured.');
    return createSolanaProgramClient({ rpcUrl: SOLANA_RPC_URL, programId: SOLANA_PROGRAM_ID, mint: SOLANA_TOKEN_MINT, provider });
  };
  const missionKey = mission => mission.key || (mission.sample ? String(mission.id) : `${namespace}${mission.id}`);

  function readSaved() {
    try {
      const parse = raw => {
        try { const data = JSON.parse(raw); return Array.isArray(data) ? data.filter(id => typeof id === 'string' || (Number.isSafeInteger(id) && id >= 0)) : null; }
        catch { return null; }
      };
      const existing = localStorage.getItem(SAVED_KEY);
      if (existing !== null) return [...new Set((parse(existing) || []).map(String))];
      for (const key of LEGACY_SAVED_KEYS) {
        const oldItems = parse(localStorage.getItem(key));
        if (oldItems === null) continue;
        const migrated = [...new Set(oldItems.map(id => typeof id === 'number' ? (configured.value ? `${namespace}${id}` : `sample-${id}`) : id))];
        try { localStorage.setItem(SAVED_KEY, JSON.stringify(migrated)); } catch { /* Keep the in-memory migration. */ }
        return migrated;
      }
      return [];
    } catch { return []; }
  }
  const previewSaved = ref(readSaved());
  const isSaved = mission => previewSaved.value.includes(missionKey(mission));
  const savedCount = computed(() => missionItems.value.filter(isSaved).length);
  const selectedIsCreator = computed(() => !!account.value && !!selected.value?.creator && selected.value.creator === account.value);
  const selectedIsOpen = computed(() => !!selected.value && !selected.value.sample && !selected.value.closed && selected.value.deadlineTimestamp * 1000 > now.value);
  const selectedCanRefund = computed(() => selectedIsCreator.value && !selected.value.sample && !selected.value.closed && selected.value.deadlineTimestamp * 1000 <= now.value);
  const filtered = computed(() => {
    const query = search.value.trim().toLowerCase();
    const items = missionItems.value.filter(mission =>
      (activeCategory.value === 'All topics' || mission.category === activeCategory.value) &&
      (activeView.value !== 'Saved' || isSaved(mission)) &&
      (activeView.value !== 'My activity' || (account.value && mission.creator === account.value)) &&
      `${mission.title} ${mission.description} ${mission.category}`.toLowerCase().includes(query));
    const rank = mission => mission.sample ? Number(String(mission.id).replace('sample-', '')) : Number(mission.id);
    return items.sort((left, right) => {
      if (sortBy.value === 'reward' || sortBy.value === 'highest-reward') {
        const a = amountLamports(left), b = amountLamports(right);
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

  const canUndoSavedChange = computed(() => !!notice.value && noticeKind.value === 'bookmark' && !!savedChange.value);
  function dismissNotice() {
    noticeVersion++;
    clearTimeout(noticeTimer);
    notice.value = '';
    noticeKind.value = '';
    savedChange.value = null;
  }
  function notify(message, { kind = 'general', bookmarkChange = null } = {}) {
    dismissNotice();
    const version = noticeVersion;
    notice.value = message;
    noticeKind.value = kind;
    savedChange.value = kind === 'bookmark' ? bookmarkChange : null;
    noticeTimer = setTimeout(() => { if (version === noticeVersion) dismissNotice(); }, 7000);
  }
  function persistSaved() {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(previewSaved.value)); return true; }
    catch { return false; }
  }
  function saveMission(mission) {
    const key = missionKey(mission), wasSaved = isSaved(mission);
    previewSaved.value = wasSaved ? previewSaved.value.filter(id => id !== key) : [...previewSaved.value, key];
    const persisted = persistSaved();
    const action = wasSaved ? 'Removed from your saved list.' : 'Saved to your list.';
    notify(action + (persisted ? '' : ' Changed for this visit only. Your browser did not allow local bookmark storage.'), {
      kind: 'bookmark', bookmarkChange: { key, wasSaved },
    });
  }
  function undoSavedChange() {
    if (!canUndoSavedChange.value) return false;
    const { key, wasSaved } = savedChange.value;
    previewSaved.value = wasSaved ? [...new Set([...previewSaved.value, key])] : previewSaved.value.filter(id => id !== key);
    const persisted = persistSaved();
    notify('Saved-list change undone.' + (persisted ? '' : ' Restored for this visit only. Your browser did not allow local bookmark storage.'), { kind: 'bookmark' });
    return true;
  }
  function resetFilters() { activeView.value = 'All missions'; activeCategory.value = 'All topics'; search.value = ''; }
  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    mobileNav.value = false;
  }
  function explorerLink(signature) {
    const value = String(signature || '').trim();
    if (!isSolanaSignature(value) || !SOLANA_EXPLORER_URL) return '';
    const suffix = SOLANA_CLUSTER === 'mainnet-beta' ? '' : `?cluster=${encodeURIComponent(SOLANA_CLUSTER)}`;
    return safeExternalUrl(`${SOLANA_EXPLORER_URL.replace(/\/$/, '')}/tx/${value}${suffix}`);
  }
  function resetWalletStats() { walletBalance.value = '0'; claimableAmount.value = '0'; rewardBalance.value = '0'; statsError.value = ''; }

  async function refreshRewardDecimals() {
    if (!configured.value) { rewardDecimals.value = 9; return rewardDecimals.value; }
    const decimals = await programClient({}).mintDecimals();
    rewardDecimals.value = decimals;
    return decimals;
  }

  async function updateWalletStats() {
    const version = ++statsVersion;
    resetWalletStats();
    if (!account.value || !correctChain.value || !SOLANA_RPC_URL) { statsLoading.value = false; return; }
    const address = account.value;
    statsLoading.value = true;
    try {
      if (configured.value) {
        const client = programClient();
        const [decimals, balance, claims] = await Promise.all([
          client.mintDecimals(), client.getWalletTokenBalance(address), client.listWalletClaims(address),
        ]);
        if (version !== statsVersion || disposed) return;
        rewardDecimals.value = decimals;
        rewardBalance.value = formatTokenAmount(balance, decimals);
        claimableAmount.value = formatTokenAmount(claims.reduce((sum, item) => sum + item.approvedAmount, 0n), decimals);
        walletBalance.value = formatSol((await solanaRpc('getBalance', [address, { commitment: 'confirmed' }]))?.value ?? 0);
      } else {
        const result = await solanaRpc('getBalance', [address, { commitment: 'confirmed' }]);
        if (version !== statsVersion || disposed) return;
        walletBalance.value = formatSol(result?.value ?? 0);
        claimableAmount.value = '0';
      }
    } catch (error) {
      if (version === statsVersion) statsError.value = `Could not refresh Solana wallet balances. ${errorMessage(error)}`;
    } finally { if (version === statsVersion) statsLoading.value = false; }
  }

  async function connectWallet() {
    if (connecting.value) return false;
    walletError.value = '';
    const provider = wallet();
    if (!provider || typeof provider.connect !== 'function') {
      walletError.value = 'No Solana wallet found. Install Phantom, Solflare or another Solana wallet and return here.';
      return false;
    }
    connecting.value = true;
    try {
      const response = await provider.connect();
      const publicKey = normalisePublicKey(response?.publicKey || provider.publicKey);
      if (!isSolanaAddress(publicKey)) throw new Error('The Solana wallet returned an invalid public key.');
      account.value = publicKey;
      chainId.value = SOLANA_CLUSTER;
      await updateWalletStats();
      return true;
    } catch (error) { walletError.value = errorMessage(error); return false; }
    finally { connecting.value = false; }
  }

  async function switchNetwork() {
    walletError.value = `This app targets ${SOLANA_NETWORK_NAME}. Check its configured Solana RPC and reconnect the wallet.`;
    return false;
  }

  function mapMission(mission) {
    const id = Number(mission.id);
    if (!Number.isSafeInteger(id)) throw new Error('A mission id exceeds the UI integer range.');
    const deadlineTimestamp = Number(mission.deadline || 0);
    const totalEscrowed = asBigInt(mission.totalEscrowed ?? mission.totalEscrowedLamports ?? 0);
    const totalAwarded = asBigInt(mission.totalAwarded ?? mission.totalAwardedLamports ?? 0);
    const available = totalEscrowed - totalAwarded;
    const expired = deadlineTimestamp * 1000 <= now.value;
    return {
      id, pubkey: mission.pubkey, key: `${namespace}${mission.pubkey}`, sample: false, title: mission.title, descriptionURI: mission.descriptionURI,
      description: 'Read the public brief for the research scope, evidence requirements and acceptance criteria.',
      category: mission.category, tag: 'PUBLIC BRIEF', reward: formatTokenAmount(totalEscrowed, rewardDecimals.value), rewardSymbol: rewardSymbol.value,
      availableReward: formatTokenAmount(available, rewardDecimals.value), availableRewardRaw: available, availableRewardLamports: available,
      totalAwarded: formatTokenAmount(totalAwarded, rewardDecimals.value), submissions: Number(mission.contributionCount || 0),
      color: ['peach', 'lavender', 'mint', 'blue'][id % 4], icon: String(id + 1).padStart(2, '0'),
      deadlineTimestamp, deadline: deadlineTimestamp ? new Date(deadlineTimestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Unscheduled',
      expired, closed: !!mission.closed, sponsor: mission.creator, creator: mission.creator,
      status: mission.closed ? 'Closed' : expired ? 'Ended' : 'Open', difficulty: 'Open brief',
      brief: 'Open the public brief before starting. The creator reviews contributions against its published acceptance criteria.',
      deliverables: ['Read the brief and its acceptance criteria', 'Publish research with original-source citations', 'Submit a public evidence URI before the deadline'],
    };
  }

  async function refreshMissions() {
    const version = ++refreshVersion;
    loadError.value = '';
    if (!configured.value) { missionItems.value = sampleMissions(); loading.value = false; return; }
    loading.value = true;
    try {
      const client = programClient();
      const [decimals, missions] = await Promise.all([client.mintDecimals(), client.listMissions()]);
      if (version !== refreshVersion || disposed) return;
      rewardDecimals.value = decimals;
      missionItems.value = missions.map(mapMission);
    } catch (error) {
      if (version === refreshVersion) loadError.value = `Live Solana missions could not be loaded. ${errorMessage(error)}`;
    } finally { if (version === refreshVersion) loading.value = false; }
  }

  async function loadContributions() {
    const version = ++contributionsVersion, mission = selected.value;
    contributionsError.value = '';
    if (!mission || mission.sample || !configured.value) { contributions.value = []; contributionsLoading.value = false; return; }
    contributionsLoading.value = true;
    try {
      const client = programClient();
      const items = await client.listContributions(mission);
      if (version !== contributionsVersion || disposed) return;
      contributions.value = items.map(item => ({
        id: item.id,
        contributor: item.contributor,
        evidenceURI: item.evidenceURI,
        approvedAmountRaw: item.approvedAmount,
        approved: formatTokenAmount(item.approvedAmount, rewardDecimals.value),
        approvedByCreator: item.approvedByCreator,
        claimed: item.claimed,
      }));
    } catch (error) {
      if (version === contributionsVersion) contributionsError.value = `Contributions could not be loaded. ${errorMessage(error)}`;
    } finally { if (version === contributionsVersion) contributionsLoading.value = false; }
  }

  async function refreshAll() { await Promise.all([refreshMissions(), updateWalletStats()]); await loadContributions(); }
  function accountsChanged(value) {
    const publicKey = normalisePublicKey(Array.isArray(value) ? value[0] : value);
    account.value = isSolanaAddress(publicKey) ? publicKey : '';
    chainId.value = account.value ? SOLANA_CLUSTER : '';
    void refreshAll();
  }
  function disconnected() { account.value = ''; chainId.value = ''; resetWalletStats(); void refreshAll(); }
  function openCreate() { selected.value = null; guideOpen.value = false; formErrors.value = {}; txError.value = ''; createOpen.value = true; mobileNav.value = false; }
  function closeModal() { selected.value = null; createOpen.value = false; guideOpen.value = false; }

  watch(() => selected.value?.key, () => {
    contributions.value = []; evidence.value = ''; contribution.value = ''; submissionText.value = ''; formErrors.value = {};
    if (!busy.value) txError.value = '';
    void loadContributions();
  });

  async function transact(kind, index, amount) {
    if (busy.value) return false;
    if (!configured.value) { notify('This Solana preview workspace is preview only until a reward mint is configured.'); return false; }
    busy.value = true; activeTransaction.value = kind; txError.value = ''; formErrors.value = {}; txHash.value = ''; txStatus.value = 'idle';
    const mission = selected.value;
    try {
      let value, uri, form;
      if (!['create', 'fund', 'submit', 'approve', 'refund', 'claim'].includes(kind)) throw new Error('Unknown transaction action.');
      await refreshRewardDecimals();
      if (kind === 'create') {
        const validation = validateMissionForm(missionForm.value, Date.now(), rewardDecimals.value);
        formErrors.value = validation.errors;
        if (Object.keys(validation.errors).length) throw new Error(Object.values(validation.errors)[0]);
        form = validation.values;
      } else if (kind !== 'claim') {
        if (!mission || mission.sample) throw new Error('Select a live mission first.');
        if (kind !== 'refund' && (mission.closed || mission.deadlineTimestamp * 1000 <= Date.now())) throw new Error('This mission is no longer accepting funding, submissions or approvals.');
        if (kind === 'refund' && (mission.closed || mission.deadlineTimestamp * 1000 > Date.now())) throw new Error('Unallocated funds can be refunded once, after the deadline.');
        if (kind === 'fund' || kind === 'approve') {
          try {
            value = parseTokenAmount(kind === 'fund' ? contribution.value : (amount ?? contribution.value), rewardDecimals.value, kind === 'fund' ? 'Funding' : 'Approval amount');
            if (kind === 'approve' && value > asBigInt(mission.availableRewardLamports ?? parseSol(mission.availableReward, 'Reward'))) throw new Error('The approval amount exceeds this mission’s unallocated reward pool.');
          } catch (error) { formErrors.value = { [kind === 'fund' ? 'contribution' : 'approval']: error.message }; throw error; }
          if (kind === 'approve' && (!Number.isSafeInteger(Number(index)) || Number(index) < 0 || Number(index) >= mission.submissions)) throw new Error('Select a valid contribution to approve.');
        }
        if (kind === 'submit') {
          try { uri = validateUri(evidence.value, 'Evidence URI'); }
          catch (error) { formErrors.value = { evidence: error.message }; throw error; }
        }
      }
      txStatus.value = 'wallet';
      if (!account.value && !(await connectWallet())) throw new Error(walletError.value || 'Connect a Solana wallet to continue.');
      if (!correctChain.value && !(await switchNetwork())) throw new Error(walletError.value || `Switch to ${SOLANA_NETWORK_NAME} to continue.`);
      const client = programClient(walletProvider || wallet());
      if (kind === 'create') {
        const validation = validateMissionForm(missionForm.value, Date.now(), rewardDecimals.value);
        formErrors.value = validation.errors;
        if (Object.keys(validation.errors).length) throw new Error(Object.values(validation.errors)[0]);
        form = validation.values;
        const signature = await client.createMission({
          title: form.title, descriptionURI: form.uri, category: form.category,
          deadline: form.deadline, amount: form.reward,
        });
        txHash.value = signature;
      } else if (kind === 'claim') {
        const signatures = await client.claimWalletRewards(account.value);
        if (!signatures.length) throw new Error('There are no approved rewards to claim.');
        txHash.value = signatures.at(-1);
      } else {
        if (!mission || mission.sample) throw new Error('Select a live mission first.');
        if (kind === 'fund') {
          value = parseTokenAmount(contribution.value, rewardDecimals.value, 'Funding');
          txHash.value = await client.fundMission(mission.id, value);
        } else if (kind === 'submit') {
          uri = validateUri(evidence.value, 'Evidence URI');
          txHash.value = await client.submitContribution(mission.id, uri);
        } else if (kind === 'approve') {
          value = parseTokenAmount(amount ?? contribution.value, rewardDecimals.value, 'Approval amount');
          if (value > asBigInt(mission.availableRewardRaw ?? mission.availableRewardLamports)) throw new Error('The approval amount exceeds this mission’s unallocated reward pool.');
          if (!Number.isSafeInteger(Number(index)) || Number(index) < 0 || Number(index) >= mission.submissions) throw new Error('Select a valid contribution to approve.');
          txHash.value = await client.approveContribution(mission.id, index, value);
        } else if (kind === 'refund') {
          txHash.value = await client.refundUnallocated(mission.id);
        }
      }
      txStatus.value = 'confirmed';
      notify('Solana transaction confirmed.', { kind: 'transaction' });
      await Promise.all([refreshMissions(), updateWalletStats()]);
      await loadContributions();
      return true;
    } catch (error) {
      txStatus.value = 'error'; txError.value = errorMessage(error); notify(txError.value, { kind: 'transaction' }); return false;
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
    walletProvider = wallet();
    if (!walletProvider) return;
    walletProvider.on?.('accountChanged', accountsChanged);
    walletProvider.on?.('disconnect', disconnected);
    try {
      // Reading a provider's existing public key does not open a permission prompt.
      const existing = normalisePublicKey(walletProvider.publicKey);
      if (disposed) return;
      if (isSolanaAddress(existing)) {
        account.value = existing;
        chainId.value = SOLANA_CLUSTER;
        await updateWalletStats();
      }
    } catch (error) { walletError.value = `Could not read your Solana wallet connection. ${errorMessage(error)}`; }
  });
  onUnmounted(() => {
    disposed = true; refreshVersion++; contributionsVersion++; statsVersion++;
    dismissNotice(); clearInterval(deadlineTimer);
    walletProvider?.removeListener?.('accountChanged', accountsChanged);
    walletProvider?.removeListener?.('disconnect', disconnected);
  });

  return {
    account, chainId, walletError, connecting, busy, notice, noticeKind, canUndoSavedChange, activeView, search, activeCategory, sortBy,
    selected, createOpen, guideOpen, mobileNav, txHash, txStatus, txError, activeTransaction, formErrors,
    missionForm, evidence, contribution, submissionText, contributions, contributionsLoading, contributionsError,
    claimableAmount, walletBalance, rewardBalance, rewardSymbol, rewardUnitLabel, rewardDecimals,
    statsLoading, statsError, loading, loadError,
    previewSaved, configured, shortAccount, correctChain, topics, missionItems, filtered, savedCount,
    selectedIsCreator, selectedIsOpen, selectedCanRefund, notify, dismissNotice, saveMission, undoSavedChange, isSaved, scrollTo,
    updateWalletStats, refreshRewardDecimals, connectWallet, switchNetwork, openCreate, refreshMissions, loadContributions,
    refreshAll, transact, closeModal, safeExternalUrl, explorerLink, resetFilters,
  };
}
