import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [remix(), netlifyPlugin(), tsconfigPaths()],
    define: {
      'process.env.SANITY_PROJECT_ID': JSON.stringify(env.SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID),
      'process.env.SANITY_DATASET': JSON.stringify(env.SANITY_DATASET || process.env.SANITY_DATASET),
    },
  };
});
