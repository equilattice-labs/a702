# Citeward website

Move questions forward.

A Vue 3 + Vite research workspace for Robinhood Chain testnet. Native ETH is used for escrow rewards; Citeward has no platform token.

## Run and verify

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
npm run check:logic
npm run build:all
npm run check:site
npx playwright install chromium
npm run preview -- --host 127.0.0.1 --port 42702 --strictPort
# In another terminal, while preview is running:
npm run check:ui
```

`npm run build:all` builds this site, synchronizes its public source into `a702/`, then builds that entry point. Both support deployment at a subpath through relative Vite assets. `a702/` is a distribution mirror; edit the parent source and run `npm run sync:mirror` to keep it consistent. Environment files are never copied by that script.

## Configuration

Copy `.env.example` to `.env` and set `VITE_CONTRACT_ADDRESS` to the verified deployed address. The existing public configuration interface remains `VITE_CONTRACT_ADDRESS`, `VITE_CHAIN_ID`, `VITE_RPC_URL`, and `VITE_EXPLORER_URL`. The default chain ID is 46630; verify current Robinhood Chain testnet network documentation before sending transactions.

Without a valid address the app shows clearly labeled sample missions. Once configured, only contract data is shown; RPC failures provide a retry state. No wallet permission is requested until the user connects or begins a transaction. The ABI remains `src/EvidaraEscrow.abi.json` to preserve the deployed contract identity.

## Interface and behavior

- A sticky top navigation opens Explore, Saved, My missions and the contributor guide. On narrow screens, a menu below the header provides navigation, rewards and mission creation.
- A compact ink-colored introduction leads directly into the research workspace. Desktop topic navigation sits beside a single-column list; each mission pairs its research brief with its reward and next action. Mobile screens stack these controls and preserve all filters, search and four sort choices. Saved is local to the device, and My missions shows missions created by the connected wallet.
- Mission drawer with Brief, Contribute, and Review sections; safe public brief/evidence links.
- Two-step mission creation with validation and a downloadable Markdown draft. The draft is not uploaded automatically: publish it and supply its URL. In-memory draft edits remain until the page is left or creation succeeds.
- Funding, evidence submission, creator approval, deadline refunds, and reward claiming use the original contract methods. Approval is only possible before the deadline. Refunded unallocated funds become the creator's claimable balance; additional funders have no individual refund rights.
- Keyboard focus stays inside native dialogs; Escape and focus restoration work. The mobile navigation supports keyboard closing and focus containment. Amount inputs preserve 18-decimal strings.
- Bookmarks migrate from `civiquill-saved` or `proofora-saved` into `citeward-saved`, with separate namespaces for sample and chain/address missions. Invalid or unavailable local storage does not crash the app.
- The page explains the ask, investigate and review workflow, provides a mission-creation call to action, and answers questions about creator review, testnet rewards and unused funds.

## Source and visual identity

`src/composables/useMissions.js` owns wallet, contract, validation, and mission state. `App.vue` owns the page, mission board, forms, and dialogs. The decorative research index uses HTML and CSS. `src/style.css` contains the shared design tokens and responsive components. The DM Sans font, SVG mark and Open Graph preview are served locally; the font license is included in `public/fonts/`.

The design uses cobalt `#2449E8`, ink `#17203A`, paper `#F7F8FC`, citron `#E7F588`, and DM Sans, registered in CSS as `Citeward Sans`, with bold headings and readable interface text. The mark combines open brackets with an arrow moving toward the upper right. The website contains no Twitter/X links or platform-specific sharing metadata. No domain or social account is claimed. After a verified production origin exists, resolve Open Graph image paths to absolute public URLs and set a canonical URL.

## Verification evidence

Current browser captures and reports use the `citeward-` prefix in `output/playwright/`; superseded captures have been removed. See [the current validation report](../RESKIN-VALIDATION.md). `scripts/check-mission-logic.mjs` uses in-memory configuration and wallet/contract mocks, never real credentials or chain transactions. `scripts/citeward-rpc-fixture.cjs` supports isolated browser verification. `check:site` verifies the brand, prohibited outbound links, local resources and exact distribution mirror. Contract verification is recorded in `../contracts/REBRAND-VALIDATION.md`.
