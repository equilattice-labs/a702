import abi from './EvidaraEscrow.abi.json';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 46630);
export const RPC_URL = import.meta.env.VITE_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
export const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || "https://explorer.testnet.chain.robinhood.com";
export const CONTRACT_ABI = abi;
export const APP_NAME = "Tessivra";
