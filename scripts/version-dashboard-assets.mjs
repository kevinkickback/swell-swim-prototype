import { readFile, writeFile } from 'node:fs/promises';

const revision = process.argv[2];
if (!revision || !/^[a-f0-9]{40}$/i.test(revision)) {
  throw new Error('Pass the full Git commit SHA to version dashboard assets.');
}

const publicRoot = new URL('../public/', import.meta.url);
const pages = ['admin-dashboard', 'pool-deck', 'shift-log'].map(theme => `prototypes/${theme}/index.html`);
const modules = [
  'prototypes/admin-dashboard/dashboard.js',
  'assets/pool-deck.js',
  'assets/shift-log.js',
  'assets/admin-workflows.js',
  'assets/enrollment-data.js',
  'assets/enrollment-workflows.js',
];

// An HTML page and its imported modules must come from the same release.
async function versionLinks(path, pattern) {
  const file = new URL(path, publicRoot);
  const source = await readFile(file, 'utf8');
  const versioned = source.replace(pattern, `$1?v=${revision}$2`);
  if (source === versioned) throw new Error(`No dashboard asset links found in ${path}`);
  await writeFile(file, versioned);
}

await Promise.all([
  ...pages.map(path => versionLinks(path, /((?:src|href)="[^"?]+\.(?:js|css))(")/g)),
  ...modules.map(path => versionLinks(path, /(from ['"]\.{1,2}\/[^'"]+\.js)(['"])/g)),
]);
