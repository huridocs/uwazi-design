import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Two pages: the builder (index.html) and the public site it builds (site.html).
// The site runs on its own; the builder shows it in an iframe with ?preview=1.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ["react", "react-dom"] },
  // tokens.css is imported from the prototype (../app/src/tokens.css), so one
  // file owns the colours for both apps.
  server: { fs: { allow: [".."] } },
  build: {
    rollupOptions: {
      input: {
        builder: new URL("index.html", import.meta.url).pathname,
        site: new URL("site.html", import.meta.url).pathname,
      },
    },
  },
});
