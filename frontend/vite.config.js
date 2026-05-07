import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // target: 'http://localhost:4000',
        target: 'https://lims-5-v4.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
