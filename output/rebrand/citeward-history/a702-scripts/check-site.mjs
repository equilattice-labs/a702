// Release guards for the public Citeward site. No environment files are read.
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
function checkPublicCopy(text, label) {
  const normalized = text.replace(/\\\//g, "/");
  for (const match of normalized.matchAll(/(?:https?:)?\/\/[^\s<>"'`\\)]+/gi)) {
    try {
      const url = new URL(match[0].startsWith("//") ? `https:${match[0]}` : match[0]);
      const host = url.hostname.toLowerCase().replace(/\.$/, "");
      check(!blockedHosts.some(blocked => host === blocked || host.endsWith(`.${blocked}`)), `${label}: prohibited social URL ${match[0]}`);
    } catch { /* Other checks handle local asset references. */ }
  }
  check(!/<meta\b[^>]*(?:name|property)\s*=\s*["']twitter:/i.test(text), `${label}: Twitter metadata must be absent`);
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
  check(/<title>\s*Citeward\b[^<]*<\/title>/i.test(index), `${label}: title must use Citeward`);
  check(/<meta\b[^>]*property=["']og:site_name["'][^>]*content=["']Citeward["']/i.test(index), `${label}: Open Graph site name must be Citeward`);
  check(/aria-label=["']Citeward home["']/.test(app), `${label}: accessible home identity must use Citeward`);
  check(/APP_NAME\s*=\s*["']Citeward["']/.test(config), `${label}: app configuration must use Citeward`);
  check(manifest.name === "citeward", `${label}: package name must be citeward`);
  for (const obsolete of ["meterial.txt", "src/abi.json"]) {
    check(!await exists(path.join(site, obsolete)), `${label}: obsolete material remains: ${obsolete}`);
  }
  for (const asset of ["citeward-mark.svg", "citeward-social.png", "fonts/dm-sans-latin.woff2", "fonts/DM-Sans-OFL.txt"]) {
    check(await exists(path.join(site, "public", asset)), `${label}: required local asset is missing: ${asset}`);
  }
  const tree = {};
  for (const folder of ["src", "public"]) tree[folder] = await listFiles(path.join(site, folder));
  trees.push(tree);
  const publicFiles = ["index.html", ...Object.entries(tree).flatMap(([folder, files]) => files.map(file => path.join(folder, file)))];
  for (const file of publicFiles) {
    if (!textExtensions.has(path.extname(file))) continue;
    const text = await readFile(path.join(site, file), "utf8");
    checkPublicCopy(text, `${label}/${file}`);
    if (!/\.(?:html|vue|js|css)$/.test(file)) continue;
    for (const match of text.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?["'](\.[^"']+)["']/g)) await checkAsset(site, file, match[1], "import");
    for (const match of text.matchAll(/(?<![:\w-])(?:src|href)\s*=\s*["']([^"']+)["']/g)) await checkAsset(site, file, match[1]);
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) await checkAsset(site, file, match[1]);
    for (const match of text.matchAll(/(?:%BASE_URL%|\$\{import\.meta\.env\.BASE_URL\})([^"'`\s<>]+)/g)) await checkAsset(site, file, `%BASE_URL%${match[1]}`);
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
  console.error(`Citeward site guard failed (${failures.length}/${checks} checks):\n${failures.map(message => `- ${message}`).join("\n")}`);
  process.exitCode = 1;
} else console.log(`Citeward site guard passed: ${checks} checks; local assets, branding, social-link policy and mirror consistency verified.`);
