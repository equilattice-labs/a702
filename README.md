# Factrelle a702 entry point

This is the distribution mirror of the [main Factrelle website](../README.md). Edit the parent source. From the parent website directory, run `npm run sync:mirror` or `npm run build:all`, then `npm run check:site`. The sync removes obsolete files from the mirror's src/public directories.

Only public source, public assets and fixed build entry points are distributed here. QA scripts, screenshots, reports and rebrand archives belong to the parent workspace and are not mirrored. Run all validation from the parent website directory.

From this directory, use `npm run dev`, `npm run build`, or `npm run preview`. Public asset paths support subpath hosting. Local environment files are independent and never copied by the sync script.

See [brand guidelines](../../BRANDING.md) and [contract integration](../../contracts/INTEGRATION.md). The bundled EvidaraEscrow ABI preserves deployed compatibility.
