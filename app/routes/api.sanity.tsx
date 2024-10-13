import { json } from "@remix-run/node";
import { createClient } from '@sanity/client';

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2023-05-03',
});

export async function loader() {
  try {
    const projectsQuery = `*[_type == "project"]{
      _id,
      title,
      "slug": slug.current,
      excerpt,
      client,
      projectDate,
      technologies,
      "mainImageUrl": mainImage.asset->url
    }`;

    const servicesQuery = `*[_type == "service"] | order(order asc) {
      _id,
      title,
      content
    }`;
    
    const [projects, services] = await Promise.all([
      sanityClient.fetch(projectsQuery),
      sanityClient.fetch(servicesQuery)
    ]);

    return json({ projects, services });
  } catch (error) {
    console.error('Error fetching data:', error);
    return json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
