# Civiquill website

Good questions. Public knowledge.

A Vue 3 + Vite research workspace for Robinhood Chain testnet. Native ETH is used for escrow rewards; Civiquill has no platform token.

## Run and verify

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
npm run check:logic
npm run build:all
```

`npm run build:all` builds this site, synchronizes its public source into `a702/`, then builds that entry point. Both support deployment at a subpath through relative Vite assets. `a702/` is a distribution mirror; edit the parent source and run `npm run sync:mirror` to keep it consistent. Environment files are never copied by that script.

## Configuration

Copy `.env.example` to `.env` and set `VITE_CONTRACT_ADDRESS` to the verified deployed address. The existing public configuration interface remains `VITE_CONTRACT_ADDRESS`, `VITE_CHAIN_ID`, `VITE_RPC_URL`, and `VITE_EXPLORER_URL`. The default chain ID is 46630; verify current Robinhood Chain testnet network documentation before sending transactions.

Without a valid address the app shows clearly labeled sample missions. Once configured, only contract data is shown; RPC failures provide a retry state. No wallet permission is requested until the user connects or begins a transaction. The ABI remains `src/EvidaraEscrow.abi.json` to preserve the deployed contract identity.

## Interface and behavior

- Persistent workspace navigation, searchable topic filters, four sort choices, saved briefs, and wallet-created missions.
- Mission drawer with Brief, Contribute, and Review sections; safe public brief/evidence links.
- Two-step mission creation with validation and a downloadable Markdown draft. The draft is not uploaded automatically: publish it and supply its URL. In-memory draft edits remain until the page is left or creation succeeds.
- Funding, evidence submission, creator approval, deadline refunds, and reward claiming use the original contract methods. Approval is only possible before the deadline. Refunded unallocated funds become the creator's claimable balance; additional funders have no individual refund rights.
- Keyboard focus stays inside native dialogs; Escape and focus restoration work. The mobile navigation supports keyboard closing and focus containment. Amount inputs preserve 18-decimal strings.
- Bookmarks migrate from the earlier storage key into `civiquill-saved`, with separate namespaces for sample and chain/address missions. Invalid or unavailable local storage does not crash the app.

## Source and visual identity

`src/composables/useMissions.js` owns wallet, contract, validation, and mission state. `App.vue` owns the workspace, forms, and dialogs. `src/style.css` contains the shared design tokens and responsive components. All fonts, the SVG mark, and social preview image are served locally; font licenses are included in `public/fonts/`.

The design uses pine green, paper white, lime accents, DM Sans, and Instrument Serif. Brand assets originate from `../twitter/generate_assets.py`. No new domain or social account is claimed. After a verified production origin exists, resolve Open Graph image paths to absolute public URLs and set a canonical URL.

## Verification evidence and history

Browser captures and reports are in `output/playwright/`. The pre-change interface/source snapshot is in `output/rebrand-before/`; old screenshots explicitly named `baseline-*` are intentional historical evidence. `scripts/check-mission-logic.mjs` uses in-memory configuration and wallet/contract mocks, never real credentials or chain transactions. Contract verification is recorded in `../contracts/REBRAND-VALIDATION.md`.
