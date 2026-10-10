import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configurazione minima per build statica (Netlify / qualsiasi hosting statico).
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
