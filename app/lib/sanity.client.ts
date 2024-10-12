import { createClient } from '@sanity/client';

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2023-05-03', // use current date (YYYY-MM-DD) to target the latest API version
});

export async function fetchSanity<T>(query: string): Promise<T> {
  try {
    return await sanityClient.fetch<T>(query);
  } catch (error) {
    console.error('Error fetching from Sanity:', error);
    throw error;
  }
}

export { sanityClient };
