import { createClient, SanityClient } from '@sanity/client';

declare global {
  interface Window {
    ENV: {
      SANITY_PROJECT_ID: string;
      SANITY_DATASET: string;
    };
  }
}

const isBrowser = typeof window !== 'undefined';

console.log('Environment:', {
  isBrowser,
  NODE_ENV: process.env.NODE_ENV,
  SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
  SANITY_DATASET: process.env.SANITY_DATASET,
});

function createSanityClient(): SanityClient {
  const projectId = isBrowser ? window.ENV?.SANITY_PROJECT_ID : process.env.SANITY_PROJECT_ID;
  const dataset = isBrowser ? window.ENV?.SANITY_DATASET : process.env.SANITY_DATASET;

  console.log('Sanity client initialization:', { projectId, dataset });

  if (!projectId || !dataset) {
    throw new Error('Sanity project ID or dataset is missing. Check your environment variables.');
  }

  return createClient({
    projectId,
    dataset,
    useCdn: process.env.NODE_ENV === 'production',
    apiVersion: '2023-05-03', // use current date (YYYY-MM-DD) to target the latest API version
  });
}

let sanityClient: SanityClient | null = null;

// Wrapper function to handle potential undefined client
export async function fetchSanity<T>(query: string): Promise<T> {
  if (!sanityClient) {
    try {
      sanityClient = createSanityClient();
      console.log('Sanity client created successfully');
    } catch (error) {
      console.error('Error creating Sanity client:', error);
      throw error;
    }
  }

  try {
    return await sanityClient.fetch<T>(query);
  } catch (error) {
    console.error('Error fetching from Sanity:', error);
    throw error;
  }
}
