import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getSanityClient } from "~/lib/sanity.client";
import { Project } from "~/types/sanity";

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
    return json({ 
      projects, 
      error: null,
      sanityProjectId: process.env.SANITY_PROJECT_ID,
      sanityDataset: process.env.SANITY_DATASET
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return json({ 
      projects: [], 
      error: 'Failed to fetch projects',
      sanityProjectId: process.env.SANITY_PROJECT_ID,
      sanityDataset: process.env.SANITY_DATASET
    });
  }
};

export default function Index() {
  const { projects, error, sanityProjectId, sanityDataset } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error}</p>
        <p>Sanity Project ID: {sanityProjectId}</p>
        <p>Sanity Dataset: {sanityDataset}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-4xl font-bold my-8">My Projects</h1>
      <p>Sanity Project ID: {sanityProjectId}</p>
      <p>Sanity Dataset: {sanityDataset}</p>
      {projects.length === 0 ? (
        <p>No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project: Project) => (
            <div key={project._id} className="border rounded-lg overflow-hidden shadow-lg">
              {project.mainImageUrl && (
                <img src={project.mainImageUrl} alt={project.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{project.title}</h2>
                {project.excerpt && <p className="text-gray-700 mb-4">{project.excerpt}</p>}
                {project.client && <p><strong>Client:</strong> {project.client}</p>}
                {project.projectDate && <p><strong>Date:</strong> {new Date(project.projectDate).toLocaleDateString()}</p>}
                {project.technologies && (
                  <p><strong>Technologies:</strong> {project.technologies.join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
