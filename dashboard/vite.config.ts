import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const previewHosts = ['localhost', '.vusercontent.net', '.vercel.app', '.vercel.run'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: previewHosts
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: previewHosts
  }
});
