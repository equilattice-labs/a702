/**
 * Solana runtime configuration.
 *
 * Until the Solana program schema and token mint are verified, the UI stays in preview mode and never
 * attempts to sign or submit a transaction. Keep all deployment values in the
 * environment rather than committing addresses or private keys.
 */

const CLUSTER_DEFAULTS = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localhost: 'http://127.0.0.1:8899',
};

const requestedCluster = String(import.meta.env.VITE_SOLANA_CLUSTER || 'testnet').trim();
export const SOLANA_CLUSTER = Object.prototype.hasOwnProperty.call(CLUSTER_DEFAULTS, requestedCluster) ? requestedCluster : 'testnet';
export const SOLANA_NETWORK_NAME =
  SOLANA_CLUSTER === 'mainnet-beta' ? 'Solana Mainnet' :
    SOLANA_CLUSTER === 'testnet' ? 'Solana Testnet' :
      SOLANA_CLUSTER === 'localhost' ? 'Solana Localnet' : 'Solana Devnet';
export const SOLANA_RPC_URL = String(
  import.meta.env.VITE_SOLANA_RPC_URL || CLUSTER_DEFAULTS[SOLANA_CLUSTER] || CLUSTER_DEFAULTS.devnet,
).trim();
export const SOLANA_EXPLORER_URL = String(
  import.meta.env.VITE_SOLANA_EXPLORER_URL || 'https://explorer.solana.com',
).trim();

// Keep writes disabled until the deployed program schema and reward mint are verified.
export const SOLANA_PROGRAM_ID = String(import.meta.env.VITE_SOLANA_PROGRAM_ID || '').trim();
export const SOLANA_PROGRAM_READY = /^true$/i.test(String(import.meta.env.VITE_SOLANA_PROGRAM_READY || '').trim());
export const SOLANA_TOKEN_MINT = String(import.meta.env.VITE_SOLANA_TOKEN_MINT || '').trim();
const requestedTokenSymbol = String(import.meta.env.VITE_SOLANA_TOKEN_SYMBOL || '').trim().toUpperCase();
export const SOLANA_TOKEN_SYMBOL = /^[A-Z0-9]{2,10}$/.test(requestedTokenSymbol) ? requestedTokenSymbol : 'TOKEN';

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const APP_NAME = 'EvidaLume';
