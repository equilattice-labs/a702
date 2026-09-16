// Release guards for the public Tessivra site. No environment files are read.
import { access, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const failures = [];
let checks = 0;
function check(condition, message) {
  checks++;
  if (!condition) failures.push(message);
}
async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}
async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(directory, relative));
    else if (entry.isFile()) files.push(relative);
    else check(false, `Unexpected linked or special public file: ${path.join(directory, relative)}`);
  }
  return files.sort();
}
const textExtensions = new Set([".html", ".vue", ".js", ".css", ".json", ".svg", ".txt"]);
const blockedHosts = ["twitter.com", "x.com", "t.co"];
const previousIdentity = /vercairn|siftlane|citeward|civiquill|proofora|evidara/i;
const withoutDeployedIdentity = text => text.replace(/\bEvidaraEscrow\b|\bEvidara:/g, 'deployed-contract-identity');
function checkPublicCopy(text, label) {
  const displayCopy = withoutDeployedIdentity(text).replace(/(["'`])(?:vercairn|siftlane|citeward|civiquill|proofora)-saved\1/g, '"legacy-bookmarks"');
  check(!previousIdentity.test(displayCopy), `${label}: obsolete brand remains outside bookmark migration keys`);
  const normalized = text.replace(/\\\//g, "/");
  for (const match of normalized.matchAll(/(?:https?:)?\/\/[^\s<>"'`\\)]+/gi)) {
    try {
      const url = new URL(match[0].startsWith("//") ? `https:${match[0]}` : match[0]);
      const host = url.hostname.toLowerCase().replace(/\.+$/, "");
      check(!blockedHosts.some(blocked => host === blocked || host.endsWith(`.${blocked}`)), `${label}: prohibited social URL ${match[0]}`);
    } catch { /* Other checks handle local asset references. */ }
  }
  check(!/<meta\b[^>]*(?:name|property)\s*=\s*["']twitter:/i.test(text), `${label}: Twitter metadata must be absent`);
}
async function checkDynamicLinks(site, label) {
  // Load the real exported URL guard without mounting Vue or reading local env.
  const source = (await readFile(path.join(site, "src/composables/useMissions.js"), "utf8"))
    .replace("from 'vue'", `from '${import.meta.resolve('vue')}'`)
    .replace("from 'ethers'", `from '${import.meta.resolve('ethers')}'`)
    .replace(/^import \{ CONTRACT_ADDRESS[^\n]+$/m, "const CONTRACT_ADDRESS = '', CHAIN_ID = 46630, RPC_URL = '', EXPLORER_URL = '', CONTRACT_ABI = [];");
  const { safeExternalUrl } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  for (const host of blockedHosts) {
    for (const uri of [`https://${host}/brief`, `http://sub.${host.toUpperCase()}./evidence`, `https://explorer.${host}../tx/0x123`]) {
      check(safeExternalUrl(uri) === "", `${label}: dynamic social destination allowed: ${uri}`);
    }
  }
  for (const uri of ["https://example.org/research", "https://x.com.example.org/brief", "ipfs://Qm123456789abc/evidence.json"]) {
    check(Boolean(safeExternalUrl(uri)), `${label}: legal research destination rejected: ${uri}`);
  }
}
async function checkAsset(site, relativeFile, reference, kind = "asset") {
  const value = reference.trim();
  if (!value || value.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value) || value.includes("${")) return;
  let resolved;
  if (value.startsWith("%BASE_URL%")) resolved = path.join(site, "public", value.slice(10));
  else if (value.startsWith("/src/")) resolved = path.join(site, value.slice(1));
  else if (value.startsWith("/")) resolved = path.join(site, "public", value.slice(1));
  else resolved = path.resolve(site, path.dirname(relativeFile), value.split(/[?#]/)[0]);
  const candidates = kind === "import" ? [resolved, `${resolved}.js`, `${resolved}.vue`, `${resolved}.json`] : [resolved];
  check((await Promise.all(candidates.map(exists))).some(Boolean), `${path.relative(root, site) || "main"}/${relativeFile}: missing ${kind} ${value}`);
}

const trees = [];
for (const site of [root, path.join(root, "a702")]) {
  const label = path.relative(root, site) || "main";
  const index = await readFile(path.join(site, "index.html"), "utf8");
  const app = await readFile(path.join(site, "src", "App.vue"), "utf8");
  const config = await readFile(path.join(site, "src", "config.js"), "utf8");
  const manifest = JSON.parse(await readFile(path.join(site, "package.json"), "utf8"));
  check(/<title>\s*Tessivra\b[^<]*<\/title>/i.test(index), `${label}: title must use Tessivra`);
  check(/<meta\b[^>]*property=["']og:site_name["'][^>]*content=["']Tessivra["']/i.test(index), `${label}: Open Graph site name must be Tessivra`);
  check(/aria-label=["']Tessivra home["']/.test(app), `${label}: accessible home identity must use Tessivra`);
  check(/APP_NAME\s*=\s*["']Tessivra["']/.test(config), `${label}: app configuration must use Tessivra`);
  check(manifest.name === "tessivra", `${label}: package name must be tessivra`);
  for (const obsolete of ["meterial.txt", "src/abi.json"]) {
    check(!await exists(path.join(site, obsolete)), `${label}: obsolete material remains: ${obsolete}`);
  }
  for (const asset of ["tessivra-mark.svg", "tessivra-social.png", "fonts/dm-sans-latin.woff2", "fonts/DM-Sans-OFL.txt"]) {
    check(await exists(path.join(site, "public", asset)), `${label}: required local asset is missing: ${asset}`);
  }
  const tree = {};
  for (const folder of ["src", "public"]) tree[folder] = await listFiles(path.join(site, folder));
  trees.push(tree);
  const publicFiles = ["index.html", ...Object.entries(tree).flatMap(([folder, files]) => files.map(file => path.join(folder, file)))];
  for (const file of publicFiles) {
    check(!previousIdentity.test(withoutDeployedIdentity(file)), `${label}: obsolete branded source or public filename: ${file}`);
    if (!textExtensions.has(path.extname(file))) continue;
    const text = await readFile(path.join(site, file), "utf8");
    checkPublicCopy(text, `${label}/${file}`);
    if (!/\.(?:html|vue|js|css)$/.test(file)) continue;
    for (const match of text.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?["'](\.[^"']+)["']/g)) await checkAsset(site, file, match[1], "import");
    for (const match of text.matchAll(/(?<![:\w-])(?:src|href)\s*=\s*["']([^"']+)["']/g)) await checkAsset(site, file, match[1]);
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) await checkAsset(site, file, match[1]);
    for (const match of text.matchAll(/(?:%BASE_URL%|\$\{import\.meta\.env\.BASE_URL\})([^"'`\s<>]+)/g)) await checkAsset(site, file, `%BASE_URL%${match[1]}`);
  }
  await checkDynamicLinks(site, label);
  const distribution = path.join(site, "dist");
  check(await exists(path.join(distribution, "index.html")), `${label}: production build is missing`);
  if (await exists(distribution)) {
    for (const file of await listFiles(distribution)) {
      check(!previousIdentity.test(withoutDeployedIdentity(file)), `${label}/dist: obsolete branded filename: ${file}`);
      check(!/(?:^|[\\/])(?:\.env(?:\.|$)|key\.txt$|node_modules(?:[\\/]|$)|scripts(?:[\\/]|$)|output(?:[\\/]|$))|\.(?:psd|ai|fig|sketch|xcf|zip|bak|blend)$/i.test(file), `${label}/dist: non-public original or local material: ${file}`);
      if (textExtensions.has(path.extname(file))) checkPublicCopy(await readFile(path.join(distribution, file), "utf8"), `${label}/dist/${file}`);
    }
  }
}
for (const folder of ["src", "public"]) {
  const mainFiles = trees[0][folder], mirrorFiles = trees[1][folder];
  check(JSON.stringify(mainFiles) === JSON.stringify(mirrorFiles), `${folder}: mirror file inventory differs; run npm run sync:mirror`);
  for (const file of mainFiles.filter(file => mirrorFiles.includes(file))) {
    const [main, mirror] = await Promise.all([root, path.join(root, "a702")].map(site => readFile(path.join(site, folder, file))));
    check(main.equals(mirror), `${folder}/${file}: mirror content differs; run npm run sync:mirror`);
  }
}
for (const file of ["index.html", "vite.config.js", "package-lock.json"]) {
  const [main, mirror] = await Promise.all([root, path.join(root, "a702")].map(site => readFile(path.join(site, file))));
  check(main.equals(mirror), `${file}: mirror content differs; run npm run sync:mirror`);
}
if (failures.length) {
  console.error(`Tessivra site guard failed (${failures.length}/${checks} checks):\n${failures.map(message => `- ${message}`).join("\n")}`);
  process.exitCode = 1;
} else console.log(`Tessivra site guard passed: ${checks} checks; source/build branding, local assets, dynamic social-link policy and mirror consistency verified.`);
