import { createClient } from '@sanity/client';

declare global {
  interface Window {
    ENV: {
      SANITY_PROJECT_ID: string;
      SANITY_DATASET: string;
    };
  }
}

const isBrowser = typeof window !== 'undefined';

const projectId = isBrowser ? window.ENV?.SANITY_PROJECT_ID : process.env.SANITY_PROJECT_ID;
const dataset = isBrowser ? window.ENV?.SANITY_DATASET : process.env.SANITY_DATASET;

if (!projectId || !dataset) {
  console.error('Sanity project ID or dataset is missing. Check your environment variables.');
  throw new Error('Sanity project ID or dataset is missing. Check your environment variables.');
}

export const sanityClient = createClient({
  projectId,
  dataset,
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2023-05-03', // use current date (YYYY-MM-DD) to target the latest API version
});

console.log('Sanity client created successfully');
