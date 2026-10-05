import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    svelte({
      onwarn: (warning, handler) => {
        // Silently ignore accessibility warnings
        if (warning.code && warning.code.startsWith("a11y_")) return;
        handler(warning);
      },
    }),
  ],
});
