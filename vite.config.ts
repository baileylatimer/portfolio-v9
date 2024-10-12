import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log('Loaded environment variables:', {
    SANITY_PROJECT_ID: env.SANITY_PROJECT_ID,
    SANITY_DATASET: env.SANITY_DATASET,
  });
  return {
    plugins: [
      remix({
        serverModuleFormat: "cjs",
      }),
      netlifyPlugin(),
      tsconfigPaths()
    ],
    define: {
      'process.env.SANITY_PROJECT_ID': JSON.stringify(env.SANITY_PROJECT_ID),
      'process.env.SANITY_DATASET': JSON.stringify(env.SANITY_DATASET),
    },
  };
});
