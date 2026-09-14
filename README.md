# Proofora website configuration

Copy `.env.example` to `.env` and set `VITE_CONTRACT_ADDRESS` after deployment. The ABI is bundled in `src/EvidaraEscrow.abi.json`; the filename follows the deployed contract identifier for compatibility. Chain ID 46630 and RPC URL follow the deployment template in `contracts/hardhat.config.cjs`; verify current Robinhood Chain testnet documentation before sending transactions.
