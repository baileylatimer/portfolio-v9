import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createClient } from '@sanity/client';
import PageHero from "~/components/page-hero";
import SvgLink from "~/components/svg-link";
import { useState } from 'react';

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
  client: string;
  projectDate: string;
  technologies: string[];
  industry: string[];
  mainImage: {
    asset: {
      url: string;
    };
  };
  challenge: string;
  solution: string;
  websiteUrl?: string;
  columns: number;
  featured: boolean;
  order: number;
}

interface LoaderData {
  project: Project;
}

export const loader: LoaderFunction = async ({ params }) => {
  const { slug } = params;
  const query = `*[_type == "project" && slug.current == $slug][0]{
    _id,
    title,
    slug,
    client,
    projectDate,
    technologies,
    industry,
    mainImage {
      asset-> {
        url
      }
    },
    challenge,
    solution,
    websiteUrl,
    columns,
    featured,
    order
  }`;
  const project = await sanityClient.fetch(query, { slug });

  if (!project) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ project });
};

export default function Project() {
  const { project } = useLoaderData<LoaderData>();
  const [showProjectInfo, setShowProjectInfo] = useState(false);

  const projectYear = new Date(project.projectDate).getFullYear();

  const toggleProjectInfo = () => setShowProjectInfo(!showProjectInfo);

  return (
    <div className="project-page relative">
      <PageHero
        desktopImageSrc="/images/hero-rip.png"
        mobileImageSrc="/images/hero-rip--mobile.png"
        altText="Our Work Hero Image"
      />
      <div className="project-hero-container">
        <div className="project-hero relative">
          <img 
            src={project.mainImage.asset.url} 
            alt={project.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-8 left-8">
            <h1 className="uppercase project-title color-bg">{project.title}</h1>
          </div>
          <div className="absolute bottom-8 right-8">
            <button
              onClick={toggleProjectInfo}
              className="bg-white text-black px-4 py-2 rounded-full shadow-md"
            >
              Project Info
            </button>
          </div>
        </div>
      </div>
      {showProjectInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-[27px] z-40 overflow-y-auto">
          <div className="container mx-auto px-4 py-12">
            <button
              onClick={toggleProjectInfo}
              className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-4xl font-bold text-white mb-8">{project.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
              <div>
                <h3 className="text-2xl font-bold mb-4">Challenge</h3>
                <p>{project.challenge}</p>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Solution</h3>
                <p>{project.solution}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-8 text-white">
              <div>
                <h4 className="font-bold mb-2">Tools</h4>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <span key={index} className="bg-white bg-opacity-20 px-2 py-1 rounded">{tech}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-2">Industry</h4>
                <div className="flex flex-wrap gap-2">
                  {project.industry.map((ind, index) => (
                    <span key={index} className="bg-white bg-opacity-20 px-2 py-1 rounded">{ind}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-2">Year</h4>
                <p>{projectYear}</p>
              </div>
              {project.websiteUrl && (
                <div>
                  <h4 className="font-bold mb-2">Website</h4>
                  <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-white hover:text-gray-300">
                    <SvgLink /> <span className="ml-2">View Live Site</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
