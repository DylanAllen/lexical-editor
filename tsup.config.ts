import { defineConfig } from "tsup";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020",
  external: ["react", "react-dom"],
  banner: {
    js: '"use client";',
  },
  onSuccess: async () => {
    // Ensure styles.css is copied to dist
    const srcCss = path.resolve(__dirname, "src/styles/editor.css");
    const distCss = path.resolve(__dirname, "dist/styles.css");
    if (fs.existsSync(srcCss)) {
      fs.copyFileSync(srcCss, distCss);
    }
  },
});
