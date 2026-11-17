import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Express app has no CORS middleware, so in dev we proxy /api to it.
// Change the target if your backend runs on a different port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
