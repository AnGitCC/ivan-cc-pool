import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const srcPath = fileURLToPath(new URL("./src/", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["tests/e2e/**", "**/node_modules/**", "**/.next/**"],
  },
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: `${srcPath}$1` }],
  },
});
