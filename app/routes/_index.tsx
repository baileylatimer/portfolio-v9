import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createClient } from '@sanity/client';
import { Project } from "~/types/sanity";

function getSanityClient() {
  return createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    useCdn: process.env.NODE_ENV === 'production',
    apiVersion: '2023-05-03',
  });
}

export const loader = async () => {
  console.log('Loader function started');
  const client = getSanityClient();
  console.log('Sanity client created:', client);
  
  const query = `*[_type == "project"]{
    _id,
    title,
    "slug": slug.current,
    excerpt,
    client,
    projectDate,
    technologies,
    "mainImageUrl": mainImage.asset->url
  }`;
  
  try {
    console.log('Fetching projects from Sanity');
    const projects = await client.fetch(query);
    console.log('Fetched projects:', JSON.stringify(projects, null, 2));
    return json({ projects, error: null });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return json({ projects: [], error: 'Failed to fetch projects' });
  }
};

export default function Index() {
  const { projects, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>My Projects</h1>
      {projects.length === 0 ? (
        <p>No projects found.</p>
      ) : (
        <ul>
          {projects.map((project: Project) => (
            <li key={project._id}>
              <h2>{project.title}</h2>
              {project.slug && <p>Slug: {project.slug}</p>}
              {project.excerpt && <p>{project.excerpt}</p>}
              {project.client && <p>Client: {project.client}</p>}
              {project.projectDate && <p>Date: {project.projectDate}</p>}
              {project.technologies && (
                <p>Technologies: {project.technologies.join(', ')}</p>
              )}
              {project.mainImage && (
                <img src={project.mainImage.asset.url} alt={project.title} style={{maxWidth: '300px'}} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
