import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.log('dist/index.html not found; building frontend before start...');
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
}
