import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const localPath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "#productRows": localPath("./src/data/sample-product-rows.json"),
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
  };
});
