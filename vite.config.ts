import { defineConfig } from 'vite';

// base: './' にしておくと、GitHub Pages のリポジトリ名が何でも相対パスで読める
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
