import { LoaderFunction, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import PageHero from "~/components/page-hero";
import RichTextContent from "~/components/RichTextContent";
import { createClient } from '@sanity/client';
import { PortableTextProps } from '@portabletext/react';

console.log("work.$slug.tsx file is being processed");

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2023-05-03',
});

interface Project {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  client: string;
  projectDate: string;
  technologies: string[];
  industry: string[];
  mainImage: {
    asset: {
      url: string;
    };
  };
  description: string;
  body: PortableTextProps['value'];
}

interface LoaderData {
  project: Project;
}

export const loader: LoaderFunction = async ({ params }) => {
  console.log("Loader function called with params:", params);
  const { slug } = params;
  const query = `*[_type == "project" && slug.current == $slug][0]{
    _id,
    title,
    slug,
    excerpt,
    client,
    projectDate,
    technologies,
    industry,
    mainImage {
      asset-> {
        url
      }
    },
    description,
    body
  }`;
  console.log("Fetching project with slug:", slug);
  const project = await sanityClient.fetch(query, { slug });
  console.log("Fetched project:", project);

  if (!project) {
    console.log("Project not found");
    throw new Response("Not Found", { status: 404 });
  }

  return json({ project });
};

export default function Project() {
  console.log("Project component rendering");
  const { project } = useLoaderData<LoaderData>();

  console.log("Rendering project:", project);

  return (
    <div className="project-page">
      <PageHero
        desktopImageSrc="/images/hero-rip.png"
        mobileImageSrc="/images/hero-rip--mobile.png"
        altText={`${project.title} Hero Image`}
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">{project.title}</h1>
        <p className="text-xl mb-4">{project.excerpt}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img src={project.mainImage.asset.url} alt={project.title} className="w-full h-auto" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Project Details</h2>
            <p><strong>Client:</strong> {project.client}</p>
            <p><strong>Date:</strong> {project.projectDate}</p>
            <h3 className="text-xl font-bold mt-4 mb-2">Technologies Used</h3>
            <ul className="list-disc list-inside">
              {project.technologies.map((tech, index) => (
                <li key={index}>{tech}</li>
              ))}
            </ul>
            <h3 className="text-xl font-bold mt-4 mb-2">Industry</h3>
            <ul className="list-disc list-inside">
              {project.industry.map((ind, index) => (
                <li key={index}>{ind}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Project Description</h2>
          <p>{project.description}</p>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Project Details</h2>
          <RichTextContent content={project.body} />
        </div>
      </div>
    </div>
  );
}
