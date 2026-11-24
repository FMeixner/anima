import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// SINGLE=1 baut eine einzelne HTML-Datei (Weitergabe per Datei), sonst die normale Ausgabe mit Service Worker.
const single = process.env.SINGLE === "1";
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  base: "./",
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __SINGLE__: JSON.stringify(single),
  },
  build: { outDir: single ? "dist-single" : "dist", emptyOutDir: true },
  test: { environment: "node", exclude: ["node_modules/**"] },
});
