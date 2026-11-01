import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const appPackage = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // GitHub Pages hosts this project below /<repository>/; locally and on a root domain use /.
  base: process.env.GITHUB_ACTIONS === 'true'
    ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'old-ma-noodle-arcade'}/`
    : '/',
  define: { __APP_VERSION__: JSON.stringify(appPackage.version) },
});
