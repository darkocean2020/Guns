import { cpSync } from 'node:fs';
cpSync('dist-pages-en/en.html', 'dist-pages/en.html');
cpSync('dist-pages-en/assets', 'dist-pages/assets', { recursive: true });
