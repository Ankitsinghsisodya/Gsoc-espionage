import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
// Handle __dirname in ESM
var __dirname = path.resolve();
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
        // Proxy removed as backend is no longer used
    },
});
