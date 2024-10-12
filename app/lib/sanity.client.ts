import { createClient } from '@sanity/client';

declare global {
  interface Window {
    ENV: {
      SANITY_PROJECT_ID: string;
      SANITY_DATASET: string;
    };
  }
}

export function getSanityClient() {
  const isBrowser = typeof window !== 'undefined';

  console.log('Environment:', {
    isBrowser,
    NODE_ENV: process.env.NODE_ENV,
    SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
    SANITY_DATASET: process.env.SANITY_DATASET,
  });

  const projectId = isBrowser ? window.ENV?.SANITY_PROJECT_ID : process.env.SANITY_PROJECT_ID;
  const dataset = isBrowser ? window.ENV?.SANITY_DATASET : process.env.SANITY_DATASET;

  console.log('Sanity client initialization:', { projectId, dataset });

  if (!projectId || !dataset) {
    console.error('Sanity project ID or dataset is missing. Check your environment variables.');
    throw new Error('Sanity project ID or dataset is missing. Check your environment variables.');
  }

  const client = createClient({
    projectId,
    dataset,
    useCdn: process.env.NODE_ENV === 'production',
    apiVersion: '2023-05-03', // use current date (YYYY-MM-DD) to target the latest API version
  });

  console.log('Sanity client created successfully');

  return client;
}
