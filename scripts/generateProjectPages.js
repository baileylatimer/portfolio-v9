import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@sanity/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = createClient({
  projectId: 'hv36fjce',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function generateProjectPages() {
  const query = `*[_type == "project"]{
    _id,
    title,
    "slug": slug.current
  }`;

  try {
    const projects = await client.fetch(query);
    
    projects.forEach((project) => {
      const filePath = path.join(__dirname, '..', 'app', 'routes', 'work', `${project.slug}.tsx`);
      const fileContent = `
import { LoaderFunction } from "@remix-run/node";
import ProjectPage from './$slug';

export const loader: LoaderFunction = async ({ params }) => {
  // The loader from $slug.tsx will handle the data fetching
  return null;
};

export default ProjectPage;
      `;

      fs.writeFileSync(filePath, fileContent.trim());
      console.log(`Generated static file for project: ${project.title}`);
    });

    console.log('All project pages generated successfully.');
  } catch (error) {
    console.error('Error generating project pages:', error);
  }
}

generateProjectPages();
