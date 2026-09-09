import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { englishPage } from './scripts/english-page';

// GitHub Pages serves the game as a standalone browser app under /Guns/.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [...(mode === 'english' ? [englishPage()] : []), react()],
  publicDir: mode === 'english' ? false : 'public',
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: mode === 'english' ? 'dist-pages-en' : 'dist-pages',
    rollupOptions: { input: mode === 'english' ? 'en.html' : 'index.html' },
  },
}));
