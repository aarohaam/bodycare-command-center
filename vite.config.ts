import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const localPath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ mode }) => {
  const publicBuild = mode === "public";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "#productRows": localPath(
          publicBuild ? "./src/data/public-empty-rows.json" : "./src/data/sample-product-rows.json",
        ),
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
  };
});
