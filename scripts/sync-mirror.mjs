import { cp, lstat, mkdir, readFile, readdir, realpath, rmdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The a702 entry point is a public distribution mirror. Copy src/public and the
// fixed entry points below; never copy QA scripts, reports, archives or local env.
const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const mirror = path.join(root, "a702");
await mkdir(mirror, { recursive: true });

function assertWithin(parent, target) {
  const relative = path.relative(parent, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Mirror path must stay inside ${parent}: ${target}`);
  }
}

if ((await lstat(mirror)).isSymbolicLink()) throw new Error("The mirror must be a local directory, not a link.");
assertWithin(root, await realpath(mirror));

async function inventory(directory, entries = new Map(), prefix = "") {
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (/^\.env(?:\.|$)|^key\.txt$/i.test(entry.name)) {
      throw new Error(`Local configuration cannot enter public source synchronization: ${relative}`);
    }
    if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
      throw new Error(`Only regular public source files and directories may be mirrored: ${relative}`);
    }
    entries.set(relative, entry.isDirectory() ? "directory" : "file");
    if (entry.isDirectory()) await inventory(directory, entries, relative);
  }
  return entries;
}

// Fixed mirror outputs must also be ordinary files; never follow a local link
// while copying a public entry point or writing its generated manifest/README.
for (const name of ["index.html", "vite.config.js", "package.json", "package-lock.json", "README.md"]) {
  const target = path.join(mirror, name);
  assertWithin(mirror, target);
  const existing = await lstat(target).catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (existing && !existing.isFile()) throw new Error(`Mirror output must be a regular file: ${target}`);
}

for (const name of ["src", "public"]) {
  const source = path.join(root, name), destination = path.join(mirror, name);
  await mkdir(destination, { recursive: true });
  for (const [parent, directory] of [[root, source], [mirror, destination]]) {
    if ((await lstat(directory)).isSymbolicLink()) throw new Error(`Refusing to synchronize a linked directory: ${directory}`);
    assertWithin(parent, await realpath(directory));
  }
  // Inspect both trees before removing anything. Environment files outside these
  // two public source directories are never enumerated or copied.
  const sourceEntries = await inventory(source), mirrorEntries = await inventory(destination);
  for (const [relative, kind] of [...mirrorEntries].sort(([left], [right]) => right.split(path.sep).length - left.split(path.sep).length)) {
    if (sourceEntries.get(relative) === kind) continue;
    const obsolete = path.resolve(destination, relative);
    assertWithin(destination, obsolete);
    if (kind === "directory") await rmdir(obsolete);
    else await unlink(obsolete);
  }
  await cp(source, destination, { recursive: true, force: true });
}
for (const name of ["index.html", "vite.config.js"]) {
  await cp(path.join(root, name), path.join(mirror, name), { force: true });
}
const manifest = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
manifest.scripts = {
  dev: "vite",
  build: "vite build",
  preview: "vite preview",
};
await writeFile(
  path.join(mirror, "package.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
await cp(
  path.join(root, "package-lock.json"),
  path.join(mirror, "package-lock.json"),
);
await writeFile(
  path.join(mirror, "README.md"),
  "# Vercairn a702 entry point\n\nThis is the distribution mirror of the [main Vercairn website](../README.md). Edit the parent source. From the parent website directory, run `npm run sync:mirror` or `npm run build:all`, then `npm run check:site`. The sync removes obsolete files from the mirror's src/public directories.\n\nOnly public source, public assets and fixed build entry points are distributed here. QA scripts, screenshots, reports and rebrand archives belong to the parent workspace and are not mirrored. Run all validation from the parent website directory.\n\nFrom this directory, use `npm run dev`, `npm run build`, or `npm run preview`. Public asset paths support subpath hosting. Local environment files are independent and never copied by the sync script.\n\nSee [brand guidelines](../../BRANDING.md) and [contract integration](../../contracts/INTEGRATION.md). The bundled EvidaraEscrow ABI preserves deployed compatibility.\n",
);
console.log(
  "Vercairn a702 mirror synchronized; environment files remain local.",
);
