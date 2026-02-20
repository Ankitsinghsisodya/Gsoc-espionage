import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// Handle __dirname in ESM
const __dirname = path.resolve();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@types": path.resolve(__dirname, "./src/types"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries into separate cached chunks.
        // Users who revisit don't re-download react/recharts when only app code changes.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/react-helmet-async/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('/recharts/') || id.includes('/d3-')) {
              return 'chart-vendor';
            }
            if (id.includes('/lucide-react/')) {
              return 'icons';
            }
          }
        },
      },
    },
  },
});
