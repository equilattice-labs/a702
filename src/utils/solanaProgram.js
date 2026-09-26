import { Buffer } from 'buffer';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAX_U64 = (1n << 64n) - 1n;
const MIN_I64 = -(1n << 63n);
const MAX_I64 = (1n << 63n) - 1n;
const DISCRIMINATORS = Object.freeze({
  initialize: Uint8Array.from([175, 175, 109, 31, 13, 152, 155, 237]),
  create_mission: Uint8Array.from([15, 28, 105, 135, 65, 62, 188, 255]),
  fund_mission: Uint8Array.from([31, 13, 246, 29, 47, 205, 235, 39]),
  submit_contribution: Uint8Array.from([123, 132, 230, 253, 141, 22, 214, 91]),
  approve_contribution: Uint8Array.from([202, 161, 21, 234, 88, 85, 197, 7]),
  claim_contribution: Uint8Array.from([11, 90, 115, 25, 98, 101, 84, 68]),
  refund_unallocated: Uint8Array.from([153, 105, 199, 2, 25, 82, 132, 176]),
});
const ACCOUNT_DISCRIMINATORS = Object.freeze({
  Config: Uint8Array.from([155, 12, 170, 224, 30, 250, 204, 130]),
  Mission: Uint8Array.from([170, 56, 116, 75, 24, 11, 109, 12]),
  Contribution: Uint8Array.from([182, 187, 14, 111, 72, 167, 242, 212]),
});

export function encodeBase58(value) {
  const bytes = Uint8Array.from(value);
  let number = 0n;
  for (const byte of bytes) number = (number << 8n) | BigInt(byte);
  let encoded = '';
  while (number > 0n) {
    const remainder = Number(number % 58n);
    number /= 58n;
    encoded = BASE58_ALPHABET[remainder] + encoded;
  }
  let leadingZeroes = 0;
  while (leadingZeroes < bytes.length && bytes[leadingZeroes] === 0) leadingZeroes++;
  return '1'.repeat(leadingZeroes) + encoded;
}

function readBytes(bytes, state, length) {
  const end = state.offset + length;
  if (end > bytes.length) throw new Error('Account data ended before all fields were read.');
  const value = bytes.slice(state.offset, end);
  state.offset = end;
  return value;
}

function u64(value) {
  let number = BigInt(value);
  if (number < 0n || number > MAX_U64) throw new Error('Value is outside the u64 range.');
  const output = new Uint8Array(8);
  for (let index = 0; index < output.length; index++) {
    output[index] = Number(number & 255n);
    number >>= 8n;
  }
  return output;
}

function i64(value) {
  let number = BigInt(value);
  if (number < MIN_I64 || number > MAX_I64) throw new Error('Value is outside the i64 range.');
  if (number < 0n) number += 1n << 64n;
  return u64(number);
}

function u32(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 0xffffffff) throw new Error('Value is outside the u32 range.');
  return Uint8Array.from([number & 255, (number >>> 8) & 255, (number >>> 16) & 255, (number >>> 24) & 255]);
}

function stringValue(value) {
  const bytes = encoder.encode(String(value));
  return concat(u32(bytes.length), bytes);
}

function concat(...parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function readU8(bytes, state) { return readBytes(bytes, state, 1)[0]; }

function readU32(bytes, state) {
  const value = readBytes(bytes, state, 4);
  return (value[0] | value[1] << 8 | value[2] << 16 | value[3] << 24) >>> 0;
}

function readU64(bytes, state) {
  const value = readBytes(bytes, state, 8);
  let result = 0n;
  for (let index = 0; index < 8; index++) result |= BigInt(value[index]) << BigInt(index * 8);
  return result;
}

function readI64(bytes, state) {
  const value = readU64(bytes, state);
  return value >= (1n << 63n) ? value - (1n << 64n) : value;
}

function readPublicKey(bytes, state) { return new PublicKey(readBytes(bytes, state, 32)).toBase58(); }

function readString(bytes, state) {
  const length = readU32(bytes, state);
  try { return decoder.decode(readBytes(bytes, state, length)); }
  catch { throw new Error('Account string is not valid UTF-8.'); }
}

function readBoolean(bytes, state) {
  const value = readU8(bytes, state);
  if (value !== 0 && value !== 1) throw new Error('Account boolean has an invalid value.');
  return value === 1;
}

function base64ToBytes(value) {
  try {
    if (typeof atob === 'function') return Uint8Array.from(atob(value), character => character.charCodeAt(0));
    return Uint8Array.from(Buffer.from(value, 'base64'));
  } catch { throw new Error('Solana account data is not valid base64.'); }
}

export function decodeAccountData(value) {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string') return base64ToBytes(value[0]);
  if (Array.isArray(value) && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) return Uint8Array.from(value);
  if (typeof value === 'string') return base64ToBytes(value);
  throw new Error('Unsupported Solana account encoding.');
}

function assertDiscriminator(bytes, expected, label) {
  if (bytes.length < expected.length || expected.some((byte, index) => bytes[index] !== byte)) {
    throw new Error(`${label} account discriminator is invalid.`);
  }
}

function assertZeroPadding(bytes, offset, label) {
  if (bytes.slice(offset).some(byte => byte !== 0)) throw new Error(`${label} account has unexpected non-zero trailing data.`);
}

function assertOwnedAccount(account, program, label) {
  if (!account?.owner || !new PublicKey(account.owner).equals(program)) throw new Error(`${label} account is owned by a different program.`);
}

export function parseConfig(pubkey, encoded) {
  const bytes = decodeAccountData(encoded);
  assertDiscriminator(bytes, ACCOUNT_DISCRIMINATORS.Config, 'Config');
  const state = { offset: 8 };
  const mint = readPublicKey(bytes, state);
  const nextMissionId = readU64(bytes, state);
  if (state.offset !== bytes.length) throw new Error('Config account has an unexpected size.');
  return { pubkey: new PublicKey(pubkey).toBase58(), mint, nextMissionId };
}

export function parseMission(pubkey, encoded) {
  const bytes = decodeAccountData(encoded);
  assertDiscriminator(bytes, ACCOUNT_DISCRIMINATORS.Mission, 'Mission');
  const state = { offset: 8 };
  const id = readU64(bytes, state);
  const creator = readPublicKey(bytes, state);
  const mint = readPublicKey(bytes, state);
  const title = readString(bytes, state);
  const descriptionURI = readString(bytes, state);
  const category = readString(bytes, state);
  const deadline = readI64(bytes, state);
  const totalEscrowed = readU64(bytes, state);
  const totalAwarded = readU64(bytes, state);
  const totalClaimed = readU64(bytes, state);
  const contributionCount = readU32(bytes, state);
  const closed = readBoolean(bytes, state);
  const bump = readU8(bytes, state);
  assertZeroPadding(bytes, state.offset, 'Mission');
  return {
    pubkey: new PublicKey(pubkey).toBase58(), id, creator, mint, title, descriptionURI, category,
    deadline, totalEscrowed, totalAwarded, totalClaimed, contributionCount, closed, bump,
  };
}

export function parseContribution(pubkey, encoded) {
  const bytes = decodeAccountData(encoded);
  assertDiscriminator(bytes, ACCOUNT_DISCRIMINATORS.Contribution, 'Contribution');
  const state = { offset: 8 };
  const mission = readPublicKey(bytes, state);
  const contributor = readPublicKey(bytes, state);
  const id = readU32(bytes, state);
  const evidenceURI = readString(bytes, state);
  const approvedAmount = readU64(bytes, state);
  const approvedByCreator = readBoolean(bytes, state);
  const claimed = readBoolean(bytes, state);
  const bump = readU8(bytes, state);
  assertZeroPadding(bytes, state.offset, 'Contribution');
  return { pubkey: new PublicKey(pubkey).toBase58(), mission, contributor, id, evidenceURI, approvedAmount, approvedByCreator, claimed, bump };
}

function assertProgramId(value) {
  try { return new PublicKey(value); } catch { throw new Error('The configured Solana program id is invalid.'); }
}

function assertMint(value) {
  try { return new PublicKey(value); } catch { throw new Error('The configured reward mint is invalid.'); }
}

function pda(programId, seeds) { return PublicKey.findProgramAddressSync(seeds, programId)[0]; }
function ata(owner, mint) {
  return pda(ASSOCIATED_TOKEN_PROGRAM_ID, [new PublicKey(owner).toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(mint).toBuffer()]);
}
function configPda(programId, mint) { return pda(programId, [Buffer.from('config'), mint.toBuffer()]); }
function missionPda(programId, mint, id) { return pda(programId, [Buffer.from('mission'), mint.toBuffer(), Buffer.from(u64(id))]); }
function contributionPda(programId, mission, id) { return pda(programId, [Buffer.from('contribution'), mission.toBuffer(), Buffer.from(u32(id))]); }

function accountKeys(entries) {
  return entries.map(([pubkey, isSigner = false, isWritable = false]) => ({ pubkey: new PublicKey(pubkey), isSigner, isWritable }));
}

function instruction(programId, name, keys, data = new Uint8Array()) {
  const discriminator = DISCRIMINATORS[name];
  if (!discriminator) throw new Error(`Unknown Bountelith instruction: ${name}`);
  return new TransactionInstruction({ programId, keys: accountKeys(keys), data: Buffer.from(concat(discriminator, data)) });
}

function associatedTokenInstruction(payer, owner, mint, address) {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: accountKeys([
      [payer, true, true], [address, false, true], [owner], [mint],
      [SystemProgram.programId], [TOKEN_PROGRAM_ID],
    ]),
    // Associated Token Program's CreateIdempotent instruction.
    data: Buffer.from([1]),
  });
}

async function buildTransaction(connection, provider, payer, instructions) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({ feePayer: payer, recentBlockhash: blockhash });
  transaction.add(...instructions);
  if (typeof provider.signTransaction !== 'function') throw new Error('Use a Solana wallet that supports signing transactions for the configured cluster.');
  const signed = await provider.signTransaction(transaction);
  const result = await connection.sendRawTransaction(signed.serialize());
  const signature = typeof result === 'string' ? result : result?.signature;
  if (!signature) throw new Error('The wallet did not return a transaction signature.');
  const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  if (confirmation?.value?.err) throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  return signature;
}

export function createSolanaProgramClient({ rpcUrl, programId, mint, provider, connection: suppliedConnection }) {
  const program = assertProgramId(programId);
  const rewardMint = assertMint(mint);
  if (!provider) throw new Error('A Solana wallet provider is required.');
  if (!rpcUrl && !suppliedConnection) throw new Error('A Solana RPC URL is required.');
  const connection = suppliedConnection || new Connection(rpcUrl, 'confirmed');
  const namespace = configPda(program, rewardMint);

  function payerKey() {
    const value = provider.publicKey?.toBase58?.() || provider.publicKey;
    if (!value) throw new Error('Connect the Solana wallet before signing.');
    try { return new PublicKey(value); } catch { throw new Error('The connected Solana wallet returned an invalid public key.'); }
  }

  async function readConfig() {
    const account = await connection.getAccountInfo(namespace, 'confirmed');
    if (!account) return null;
    assertOwnedAccount(account, program, 'Config');
    const result = parseConfig(namespace, account.data);
    if (result.mint !== rewardMint.toBase58()) throw new Error('Config account is bound to a different reward mint.');
    return result;
  }

  async function mintDecimals() {
    const account = await connection.getAccountInfo(rewardMint, 'confirmed');
    if (!account) throw new Error('The configured reward mint was not found on this cluster.');
    if (!new PublicKey(account.owner).equals(TOKEN_PROGRAM_ID)) throw new Error('The reward mint must use the classic SPL Token Program.');
    const bytes = decodeAccountData(account.data);
    if (bytes.length !== 82 || bytes[45] !== 1) throw new Error('The configured classic SPL reward mint is invalid or uninitialized.');
    return bytes[44];
  }

  async function getWalletTokenBalance(owner) {
    const wallet = new PublicKey(owner);
    const address = ata(wallet, rewardMint);
    const account = await connection.getAccountInfo(address, 'confirmed');
    if (!account) return 0n;
    if (!new PublicKey(account.owner).equals(TOKEN_PROGRAM_ID)) throw new Error('The reward associated token account has an unexpected owner.');
    const bytes = decodeAccountData(account.data);
    if (bytes.length !== 165 || !new PublicKey(bytes.slice(0, 32)).equals(rewardMint) || !new PublicKey(bytes.slice(32, 64)).equals(wallet)) {
      throw new Error('The reward associated token account has invalid data.');
    }
    return readU64(bytes, { offset: 64 });
  }

  async function listMissions() {
    const accounts = await connection.getProgramAccounts(program, {
      commitment: 'confirmed',
      filters: [
        { memcmp: { offset: 0, bytes: encodeBase58(ACCOUNT_DISCRIMINATORS.Mission) } },
        { memcmp: { offset: 48, bytes: rewardMint.toBase58() } },
      ],
    });
    return accounts.map(({ pubkey, account }) => {
      assertOwnedAccount(account, program, 'Mission');
      const mission = parseMission(pubkey, account.data);
      if (mission.mint !== rewardMint.toBase58() || !missionPda(program, rewardMint, mission.id).equals(pubkey)) {
        throw new Error('Mission account does not match its mint-scoped PDA.');
      }
      return mission;
    }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  async function getMission(missionId) {
    const key = missionPda(program, rewardMint, missionId);
    const account = await connection.getAccountInfo(key, 'confirmed');
    if (!account) throw new Error('Mission account was not found.');
    assertOwnedAccount(account, program, 'Mission');
    const mission = parseMission(key, account.data);
    if (mission.id !== BigInt(missionId) || mission.mint !== rewardMint.toBase58()) throw new Error('Mission account does not match the selected id and mint.');
    return mission;
  }

  async function listContributions(mission) {
    const missionKey = new PublicKey(mission.pubkey || mission.key);
    const accounts = await connection.getProgramAccounts(program, {
      commitment: 'confirmed',
      filters: [
        { memcmp: { offset: 0, bytes: encodeBase58(ACCOUNT_DISCRIMINATORS.Contribution) } },
        { memcmp: { offset: 8, bytes: missionKey.toBase58() } },
      ],
    });
    return accounts.map(({ pubkey, account }) => {
      assertOwnedAccount(account, program, 'Contribution');
      const item = parseContribution(pubkey, account.data);
      if (item.mission !== missionKey.toBase58() || !contributionPda(program, missionKey, item.id).equals(pubkey)) {
        throw new Error('Contribution account does not match its mission-scoped PDA.');
      }
      return item;
    }).sort((a, b) => a.id - b.id);
  }

  async function listWalletClaims(owner) {
    const wallet = new PublicKey(owner);
    const missionKeys = new Set((await listMissions()).map(item => item.pubkey));
    const accounts = await connection.getProgramAccounts(program, {
      commitment: 'confirmed',
      filters: [
        { memcmp: { offset: 0, bytes: encodeBase58(ACCOUNT_DISCRIMINATORS.Contribution) } },
        { memcmp: { offset: 40, bytes: wallet.toBase58() } },
      ],
    });
    return accounts.map(({ pubkey, account }) => {
      assertOwnedAccount(account, program, 'Contribution');
      const item = parseContribution(pubkey, account.data);
      if (!contributionPda(program, new PublicKey(item.mission), item.id).equals(pubkey)) throw new Error('Contribution account does not match its mission-scoped PDA.');
      return item;
    }).filter(item => missionKeys.has(item.mission) && item.contributor === wallet.toBase58() && item.approvedByCreator && !item.claimed);
  }

  async function send(name, accounts, data) {
    const payer = payerKey();
    return buildTransaction(connection, provider, payer, [instruction(program, name, accounts, data)]);
  }

  async function initializeNamespace() {
    const payer = payerKey();
    if (await readConfig()) return null;
    return send('initialize', [[rewardMint], [namespace, false, true], [payer, true, true], [SystemProgram.programId]]);
  }

  async function createMission({ title, descriptionURI, category, deadline, amount }) {
    const payer = payerKey();
    const state = await readConfig();
    const id = state?.nextMissionId ?? 0n;
    const mission = missionPda(program, rewardMint, id);
    const creatorTokenAccount = ata(payer, rewardMint);
    const vault = ata(mission, rewardMint);
    const instructions = [];
    if (!state) instructions.push(instruction(program, 'initialize', [[rewardMint], [namespace, false, true], [payer, true, true], [SystemProgram.programId]]));
    instructions.push(associatedTokenInstruction(payer, payer, rewardMint, creatorTokenAccount));
    instructions.push(instruction(program, 'create_mission', [
      [rewardMint], [namespace, false, true], [mission, false, true], [payer, true, true],
      [creatorTokenAccount, false, true], [vault, false, true], [TOKEN_PROGRAM_ID], [ASSOCIATED_TOKEN_PROGRAM_ID], [SystemProgram.programId],
    ], concat(u64(id), stringValue(title), stringValue(descriptionURI), stringValue(category), i64(deadline), u64(amount))));
    return buildTransaction(connection, provider, payer, instructions);
  }

  async function fundMission(missionId, amount) {
    const payer = payerKey();
    const mission = missionPda(program, rewardMint, missionId);
    const funderTokenAccount = ata(payer, rewardMint);
    const vault = ata(mission, rewardMint);
    return buildTransaction(connection, provider, payer, [
      associatedTokenInstruction(payer, payer, rewardMint, funderTokenAccount),
      instruction(program, 'fund_mission', [[mission, false, true], [rewardMint], [vault, false, true], [funderTokenAccount, false, true], [payer, true, true], [TOKEN_PROGRAM_ID]], concat(u64(missionId), u64(amount))),
    ]);
  }

  async function submitContribution(missionId, evidenceURI) {
    const payer = payerKey();
    const parsed = await getMission(missionId);
    const contribution = contributionPda(program, new PublicKey(parsed.pubkey), parsed.contributionCount);
    return send('submit_contribution', [[parsed.pubkey, false, true], [contribution, false, true], [payer, true, true], [SystemProgram.programId]], concat(u64(missionId), stringValue(evidenceURI)));
  }

  async function approveContribution(missionId, contributionId, amount) {
    const payer = payerKey();
    const mission = missionPda(program, rewardMint, missionId);
    const contribution = contributionPda(program, mission, contributionId);
    return send('approve_contribution', [[mission, false, true], [contribution, false, true], [payer, true, false]], concat(u64(missionId), u32(contributionId), u64(amount)));
  }

  async function claimContribution(missionId, contributionId, owner = payerKey().toBase58()) {
    const payer = payerKey();
    const contributor = new PublicKey(owner);
    const mission = missionPda(program, rewardMint, missionId);
    const contribution = contributionPda(program, mission, contributionId);
    const vault = ata(mission, rewardMint);
    const contributorTokenAccount = ata(contributor, rewardMint);
    return send('claim_contribution', [[mission, false, true], [contribution, false, true], [payer, true, true], [rewardMint], [vault, false, true], [contributor], [contributorTokenAccount, false, true], [TOKEN_PROGRAM_ID], [ASSOCIATED_TOKEN_PROGRAM_ID], [SystemProgram.programId]], concat(u64(missionId), u32(contributionId)));
  }

  async function claimWalletRewards(owner = payerKey().toBase58()) {
    const claims = await listWalletClaims(owner);
    const signatures = [];
    for (const claim of claims) {
      const mission = await connection.getAccountInfo(new PublicKey(claim.mission), 'confirmed');
      if (!mission) continue;
      assertOwnedAccount(mission, program, 'Mission');
      const parsedMission = parseMission(claim.mission, mission.data);
      signatures.push(await claimContribution(parsedMission.id, claim.id, claim.contributor));
    }
    return signatures;
  }

  async function refundUnallocated(missionId) {
    const payer = payerKey();
    const mission = missionPda(program, rewardMint, missionId);
    const vault = ata(mission, rewardMint);
    const creatorTokenAccount = ata(payer, rewardMint);
    return send('refund_unallocated', [[mission, false, true], [payer, true, true], [rewardMint], [vault, false, true], [creatorTokenAccount, false, true], [TOKEN_PROGRAM_ID], [ASSOCIATED_TOKEN_PROGRAM_ID], [SystemProgram.programId]], u64(missionId));
  }

  return {
    connection, program, rewardMint, namespace, readConfig, mintDecimals, getWalletTokenBalance,
    listMissions, getMission, listContributions, listWalletClaims, initializeNamespace,
    createMission, fundMission, submitContribution, approveContribution, claimContribution,
    claimWalletRewards, refundUnallocated,
  };
}
