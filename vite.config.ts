/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// Relative base ("./") makes the built site work no matter what sub-path
// GitHub Pages serves it from (user site, project site, or a nested folder).
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    outDir: "dist",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
