import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": "/src" },
  },
  // Ensure wagmi/viem's BigInt serialization works correctly during dev
  optimizeDeps: {
    include: ["wagmi", "viem", "@rainbow-me/rainbowkit"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Wallet stack — split into its own chunk so it loads in parallel
          // with the main bundle and is cached independently.
          if (
            id.includes("node_modules/wagmi") ||
            id.includes("node_modules/viem") ||
            id.includes("node_modules/@rainbow-me") ||
            id.includes("node_modules/@wagmi") ||
            id.includes("node_modules/@walletconnect")
          ) {
            return "vendor-wallet";
          }
          // React core — tiny but cached across all pages
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/react-router/")
          ) {
            return "vendor-react";
          }
          // TanStack Query
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-tanstack";
          }
        },
      },
    },
  },
});
