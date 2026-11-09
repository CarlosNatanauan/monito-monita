import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // DB tests need a real database: run them with `npm run test:db`.
    exclude: ["tests/**/*.db.test.ts", "node_modules/**"],
  },
});
