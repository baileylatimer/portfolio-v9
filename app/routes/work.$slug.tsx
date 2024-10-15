import { LoaderFunction, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createClient } from '@sanity/client';
import { PortableTextProps } from '@portabletext/react';
import RichTextContent from "~/components/RichTextContent";
import PageHero from "~/components/page-hero";

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
    <div className="project-page relative">
      <PageHero
        desktopImageSrc="/images/hero-rip.png"
        mobileImageSrc="/images/hero-rip--mobile.png"
        altText="Our Work Hero Image"
      />
      <div className="project-hero-container">
        <div className="project-hero">
          <img 
            src={project.mainImage.asset.url} 
            alt={project.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 p-8">
            <h1 className="uppercase project-title color-bg">{project.title}</h1>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12 flex">
        <div className="w-2/3 pr-8">
          <h2 className="text-2xl font-bold mb-4">Project Description</h2>
          <p>{project.description || project.excerpt}</p>
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Project Details</h2>
            <RichTextContent content={project.body} />
          </div>
        </div>
        <div className="w-1/3">
          <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Project Info</h3>
            <div className="mb-4">
              <h4 className="font-bold">Technologies</h4>
              <ul className="list-disc list-inside">
                {project.technologies.map((tech, index) => (
                  <li key={index}>{tech}</li>
                ))}
              </ul>
            </div>
            <div className="mb-4">
              <h4 className="font-bold">Industry</h4>
              <ul className="list-disc list-inside">
                {project.industry.map((ind, index) => (
                  <li key={index}>{ind}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold">Date</h4>
              <p>{project.projectDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
