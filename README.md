# Tessivra website

Make room for discovery.

A Vue 3 + Vite research workspace for Robinhood Chain testnet. Discover funded questions, investigate public sources and submit evidence for creator review. Native testnet ETH is used for escrow rewards; Tessivra has no platform token.

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
npm run check:experience
```

`npm run build:all` builds this site, synchronizes its public source into `a702/`, then builds that entry point. Both support deployment at a subpath through relative Vite assets. `a702/` is a distribution mirror; edit the parent source and run `npm run sync:mirror` to keep it consistent. Environment files are never copied by that script.

The local production preview is available at `http://127.0.0.1:42702/` while the preview command is running.

## Configuration

Copy `.env.example` to `.env` and set `VITE_CONTRACT_ADDRESS` to the verified deployed address. The existing public configuration interface remains `VITE_CONTRACT_ADDRESS`, `VITE_CHAIN_ID`, `VITE_RPC_URL`, and `VITE_EXPLORER_URL`. The default chain ID is 46630; verify current Robinhood Chain testnet network documentation before sending transactions.

Without a valid address the app shows clearly labeled sample missions. Once configured, only contract data is shown; RPC failures provide a retry state. No wallet permission is requested until the user connects or begins a transaction. The ABI remains `src/EvidaraEscrow.abi.json` to preserve the deployed contract identity.

## Interface and behavior

- A horizontal desktop header provides Explore, Saved, My missions, the contributor guide, Your rewards and mission creation. On mobile, navigation opens from the compact header and supports keyboard closing and focus containment.
- The spacious introduction pairs "Make room for discovery." with the Tessivra identity and a featured mission. The featured mission uses the loaded collection independently of list search, topic filters and saved views. Loading, retry and empty-collection states remain explicit.
- "Follow your curiosity." introduces a three-column mission grid on desktop, with responsive cards on smaller screens. Counted topic chips, search and all four sort choices remain available. Clear search restores focus to the input; applied-filter chips remove the topic or query individually or reset both. Saved is local to the device, and My missions shows missions created by the connected wallet.
- Mission details open in a full-height reading panel on the right of the desktop and a bottom sheet on mobile. Semantic Brief, Contribute and Review tabs are linked to their panels. Left / Right arrows cycle through the tabs; Home / End select the first or last tab. Public brief and evidence links retain their URL safety checks and exclude Twitter/X destinations, including dynamic mission content.
- Two-step mission creation with validation and a downloadable Markdown draft. The draft is not uploaded automatically: publish it and supply its URL. In-memory draft edits remain until the page is left or creation succeeds.
- Funding, evidence submission, creator approval, deadline refunds, and reward claiming use the original contract methods. Approval is only possible before the deadline. Refunded unallocated funds become the creator's claimable balance; additional funders have no individual refund rights.
- Keyboard focus stays inside native dialogs; Escape and focus restoration work. The mobile navigation supports keyboard closing and focus containment. Amount inputs preserve 18-decimal strings.
- Bookmarks migrate into `tessivra-saved` from the newest valid previous key: `vercairn-saved`, then `siftlane-saved`, `citeward-saved`, `civiquill-saved` and `proofora-saved`, with separate namespaces for sample and chain/address missions. The current key takes priority; a valid empty list preserves prior removals. Invalid or unavailable local storage does not crash the app.
- Save and remove actions offer a short-lived Undo in the page notification or beside the detail's save control. Undo restores only the affected bookmark and persists it when browser storage permits. Closing, expiring or replacing the notice clears its action; transaction notices never expose bookmark Undo.
- The page explains the ask, investigate and review workflow, provides a mission-creation call to action, and answers questions about creator review, testnet rewards and unused funds.

## Source and visual identity

`src/composables/useMissions.js` owns wallet, contract, validation and mission state. `src/App.vue` coordinates navigation, filters, forms and dialogs. `src/components/ResearchCover.vue` renders the research introduction, visual identity and featured entry; `src/components/MissionCard.vue` renders each mission card and emits open/save actions. These presentation components use the existing mission data contract. `src/utils/format.js` shares amount display formatting between mission entries and rewards; transaction input values retain their original precision.

`src/style.css` imports `src/styles/workspace.css` for shared tokens, typography, page layout, controls and responsive behavior, and `src/styles/dialogs.css` for desktop reading panels, form dialogs and mobile sheets. The DM Sans font, SVG mark and Open Graph preview are served locally; the font license is included in `public/fonts/`.

The design uses warm white `#F7F4EC`, brick orange `#B9472B`, deep ink `#242720` and pale peach `#F2E0D4`. Local DM Sans, registered as `Tessivra Sans`, serves interface text; the system Georgia font adds a distinct editorial voice to headings. Navigation, the mission grid and the reading panel create a new layout while keeping the research and wallet workflows intact.

The website contains no Twitter/X links or Twitter-specific metadata. Its canonical URL and `og:url` use the adopted origin `https://tessivra.xyz/`, and `og:image` uses the absolute address `https://tessivra.xyz/tessivra-social.png`. The image is included in the public build; this metadata does not establish domain registration, ownership or a live deployment. The adopted domain and X identity, with their lookup status, are recorded in [list.txt](../list.txt).

## Verification evidence

Browser captures and reports use the `tessivra-` prefix in `output/playwright/`. See [the current validation report](../RESKIN-VALIDATION.md) for the verified revision, results and scope. `scripts/check-mission-logic.mjs` uses in-memory configuration and wallet/contract mocks, never real credentials or chain transactions. `scripts/tessivra-rpc-fixture.cjs` supports isolated browser verification. `check:site` verifies the brand, prohibited outbound links, local resources and exact distribution mirror. Contract verification is recorded in `../contracts/REBRAND-VALIDATION.md`.
