# Archived browser and verification evidence

This directory preserves the previous identity QA evidence before the current UI delivery. These files describe a superseded state and do not validate the active site. Archived scripts are not current commands to execute.

## Directory inventory

| Archive location | Contents | Count |
| --- | --- | --- |
| Root `vercairn-*` files | Previous main-site browser captures and results, moved from `website/output/playwright/` | 22 |
| `a702-output/` | Previous mirror browser captures and results, moved from `website/a702/output/playwright/` | 22 |
| `a702-scripts/` | Former mirror scripts directory, moved intact from `website/a702/scripts/` | 7 |
| `RESKIN-VALIDATION.md` | Previous root validation report, copied before rewrite | 1 |

All move sources and destinations were checked as absolute paths within the workspace. Moves used native PowerShell `Move-Item`; no source was deleted. SHA256 was recorded before the operations and checked against all 52 resulting files. Current `tessivra-*` outputs were excluded from the moves.

The mirror distributes the current application source and public assets through the main-site synchronization command. The old mirror-local scripts were not synchronized and are retained here solely as history.

[archive-manifest.json](archive-manifest.json) records source, destination, operation, size and SHA256 for every file.

## File inventory

| Operation | Original workspace path | Archived relative path | Bytes |
| --- | --- | --- | --- |
| move | `website/output/playwright/vercairn-1024.png` | [vercairn-1024.png](vercairn-1024.png) | 129807 |
| move | `website/output/playwright/vercairn-1440.png` | [vercairn-1440.png](vercairn-1440.png) | 140017 |
| move | `website/output/playwright/vercairn-1920.png` | [vercairn-1920.png](vercairn-1920.png) | 138243 |
| move | `website/output/playwright/vercairn-320.png` | [vercairn-320.png](vercairn-320.png) | 44335 |
| move | `website/output/playwright/vercairn-390.png` | [vercairn-390.png](vercairn-390.png) | 51698 |
| move | `website/output/playwright/vercairn-768.png` | [vercairn-768.png](vercairn-768.png) | 97836 |
| move | `website/output/playwright/vercairn-create-mobile.png` | [vercairn-create-mobile.png](vercairn-create-mobile.png) | 50548 |
| move | `website/output/playwright/vercairn-creator-review.png` | [vercairn-creator-review.png](vercairn-creator-review.png) | 172056 |
| move | `website/output/playwright/vercairn-desktop-first.png` | [vercairn-desktop-first.png](vercairn-desktop-first.png) | 139825 |
| move | `website/output/playwright/vercairn-detail-desktop.png` | [vercairn-detail-desktop.png](vercairn-detail-desktop.png) | 175212 |
| move | `website/output/playwright/vercairn-detail-mobile.png` | [vercairn-detail-mobile.png](vercairn-detail-mobile.png) | 61683 |
| move | `website/output/playwright/vercairn-experience.json` | [vercairn-experience.json](vercairn-experience.json) | 11022 |
| move | `website/output/playwright/vercairn-forced-colors.png` | [vercairn-forced-colors.png](vercairn-forced-colors.png) | 244072 |
| move | `website/output/playwright/vercairn-full-desktop.png` | [vercairn-full-desktop.png](vercairn-full-desktop.png) | 308729 |
| move | `website/output/playwright/vercairn-live-results.json` | [vercairn-live-results.json](vercairn-live-results.json) | 1158 |
| move | `website/output/playwright/vercairn-rpc-error.png` | [vercairn-rpc-error.png](vercairn-rpc-error.png) | 123879 |
| move | `website/output/playwright/vercairn-synthetic-long-card.png` | [vercairn-synthetic-long-card.png](vercairn-synthetic-long-card.png) | 77556 |
| move | `website/output/playwright/vercairn-synthetic-long-detail.png` | [vercairn-synthetic-long-detail.png](vercairn-synthetic-long-detail.png) | 105180 |
| move | `website/output/playwright/vercairn-synthetic-long-filter.png` | [vercairn-synthetic-long-filter.png](vercairn-synthetic-long-filter.png) | 50256 |
| move | `website/output/playwright/vercairn-touch-detail.png` | [vercairn-touch-detail.png](vercairn-touch-detail.png) | 61335 |
| move | `website/output/playwright/vercairn-touch-review.png` | [vercairn-touch-review.png](vercairn-touch-review.png) | 57445 |
| move | `website/output/playwright/vercairn-ui-results.json` | [vercairn-ui-results.json](vercairn-ui-results.json) | 2634 |
| move | `website/a702/output/playwright/vercairn-1024.png` | [a702-output/vercairn-1024.png](a702-output/vercairn-1024.png) | 129807 |
| move | `website/a702/output/playwright/vercairn-1440.png` | [a702-output/vercairn-1440.png](a702-output/vercairn-1440.png) | 140017 |
| move | `website/a702/output/playwright/vercairn-1920.png` | [a702-output/vercairn-1920.png](a702-output/vercairn-1920.png) | 138243 |
| move | `website/a702/output/playwright/vercairn-320.png` | [a702-output/vercairn-320.png](a702-output/vercairn-320.png) | 44335 |
| move | `website/a702/output/playwright/vercairn-390.png` | [a702-output/vercairn-390.png](a702-output/vercairn-390.png) | 51698 |
| move | `website/a702/output/playwright/vercairn-768.png` | [a702-output/vercairn-768.png](a702-output/vercairn-768.png) | 97836 |
| move | `website/a702/output/playwright/vercairn-create-mobile.png` | [a702-output/vercairn-create-mobile.png](a702-output/vercairn-create-mobile.png) | 50548 |
| move | `website/a702/output/playwright/vercairn-creator-review.png` | [a702-output/vercairn-creator-review.png](a702-output/vercairn-creator-review.png) | 172056 |
| move | `website/a702/output/playwright/vercairn-desktop-first.png` | [a702-output/vercairn-desktop-first.png](a702-output/vercairn-desktop-first.png) | 139825 |
| move | `website/a702/output/playwright/vercairn-detail-desktop.png` | [a702-output/vercairn-detail-desktop.png](a702-output/vercairn-detail-desktop.png) | 175212 |
| move | `website/a702/output/playwright/vercairn-detail-mobile.png` | [a702-output/vercairn-detail-mobile.png](a702-output/vercairn-detail-mobile.png) | 61683 |
| move | `website/a702/output/playwright/vercairn-experience.json` | [a702-output/vercairn-experience.json](a702-output/vercairn-experience.json) | 11022 |
| move | `website/a702/output/playwright/vercairn-forced-colors.png` | [a702-output/vercairn-forced-colors.png](a702-output/vercairn-forced-colors.png) | 244072 |
| move | `website/a702/output/playwright/vercairn-full-desktop.png` | [a702-output/vercairn-full-desktop.png](a702-output/vercairn-full-desktop.png) | 308729 |
| move | `website/a702/output/playwright/vercairn-live-results.json` | [a702-output/vercairn-live-results.json](a702-output/vercairn-live-results.json) | 1158 |
| move | `website/a702/output/playwright/vercairn-rpc-error.png` | [a702-output/vercairn-rpc-error.png](a702-output/vercairn-rpc-error.png) | 123879 |
| move | `website/a702/output/playwright/vercairn-synthetic-long-card.png` | [a702-output/vercairn-synthetic-long-card.png](a702-output/vercairn-synthetic-long-card.png) | 77556 |
| move | `website/a702/output/playwright/vercairn-synthetic-long-detail.png` | [a702-output/vercairn-synthetic-long-detail.png](a702-output/vercairn-synthetic-long-detail.png) | 105180 |
| move | `website/a702/output/playwright/vercairn-synthetic-long-filter.png` | [a702-output/vercairn-synthetic-long-filter.png](a702-output/vercairn-synthetic-long-filter.png) | 50256 |
| move | `website/a702/output/playwright/vercairn-touch-detail.png` | [a702-output/vercairn-touch-detail.png](a702-output/vercairn-touch-detail.png) | 61335 |
| move | `website/a702/output/playwright/vercairn-touch-review.png` | [a702-output/vercairn-touch-review.png](a702-output/vercairn-touch-review.png) | 57445 |
| move | `website/a702/output/playwright/vercairn-ui-results.json` | [a702-output/vercairn-ui-results.json](a702-output/vercairn-ui-results.json) | 2634 |
| move | `website/a702/scripts/check-experience.mjs` | [a702-scripts/check-experience.mjs](a702-scripts/check-experience.mjs) | 18995 |
| move | `website/a702/scripts/check-live-ui.mjs` | [a702-scripts/check-live-ui.mjs](a702-scripts/check-live-ui.mjs) | 12302 |
| move | `website/a702/scripts/check-mission-logic.mjs` | [a702-scripts/check-mission-logic.mjs](a702-scripts/check-mission-logic.mjs) | 25802 |
| move | `website/a702/scripts/check-site.mjs` | [a702-scripts/check-site.mjs](a702-scripts/check-site.mjs) | 8829 |
| move | `website/a702/scripts/check-ui.mjs` | [a702-scripts/check-ui.mjs](a702-scripts/check-ui.mjs) | 19608 |
| move | `website/a702/scripts/sync-mirror.mjs` | [a702-scripts/sync-mirror.mjs](a702-scripts/sync-mirror.mjs) | 5083 |
| move | `website/a702/scripts/vercairn-rpc-fixture.cjs` | [a702-scripts/vercairn-rpc-fixture.cjs](a702-scripts/vercairn-rpc-fixture.cjs) | 9822 |
| copy | `RESKIN-VALIDATION.md` | [RESKIN-VALIDATION.md](RESKIN-VALIDATION.md) | 7350 |
