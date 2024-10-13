import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [remix(), netlifyPlugin(), tsconfigPaths()],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
    // Disable CSS module
    modules: {
      generateScopedName: '[local]',
    },
  },
  optimizeDeps: {
    include: ['@sanity/client'],
  },
  build: {
    cssMinify: true,
  },
});
