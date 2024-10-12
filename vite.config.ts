import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { netlifyPlugin } from "@netlify/remix-adapter/plugin";
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const sanityProjectId = env.SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
  const sanityDataset = env.SANITY_DATASET || process.env.SANITY_DATASET;

  console.log('Loaded environment variables:', {
    SANITY_PROJECT_ID: sanityProjectId,
    SANITY_DATASET: sanityDataset,
  });

  if (!sanityProjectId || !sanityDataset) {
    console.warn('WARNING: Sanity environment variables are not set. This may cause issues with your build.');
  }

  return {
    plugins: [
      remix({
        serverModuleFormat: "cjs",
      }),
      netlifyPlugin(),
      tsconfigPaths()
    ],
    define: {
      'process.env.SANITY_PROJECT_ID': JSON.stringify(sanityProjectId),
      'process.env.SANITY_DATASET': JSON.stringify(sanityDataset),
    },
  };
});
