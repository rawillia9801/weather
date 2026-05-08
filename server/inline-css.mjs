import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html not found. Run vite build before inlining CSS.');
}

let html = fs.readFileSync(indexPath, 'utf8');
const linkMatch = html.match(/<link rel="stylesheet" crossorigin href="([^"]+\.css)">/);

if (linkMatch) {
  const cssPath = path.join(dist, linkMatch[1].replace(/^\//, ''));
  if (!fs.existsSync(cssPath)) {
    throw new Error(`CSS file referenced by index.html was not found: ${cssPath}`);
  }

  const css = fs.readFileSync(cssPath, 'utf8');
  html = html.replace(linkMatch[0], `<style data-inline-dashboard-css>${css}</style>`);
  fs.writeFileSync(indexPath, html);
  console.log(`Inlined ${path.relative(root, cssPath)} into dist/index.html`);
}
