import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": "/src" },
  },
  // Ensure wagmi/viem's BigInt serialization works correctly
  optimizeDeps: {
    include: ["wagmi", "viem", "@rainbow-me/rainbowkit"],
  },
});
