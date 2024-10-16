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

const ProjectInfoShape: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  }}>
    <svg width="100%" height="100%" viewBox="0 0 335 226" fill="none" xmlns="http://www.w3.org/2000/svg" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 1,
    }}>
      <path d="M0 29.494C16.2891 29.494 29.494 16.2891 29.494 0H304.771C304.771 16.2891 317.976 29.494 334.265 29.494V196.506C317.976 196.506 304.771 209.711 304.771 226H29.494C29.494 209.711 16.2891 196.506 0 196.506V29.494Z" fill="#1A1917" fillOpacity="0.01"/>
      <path d="M1.5 195.042V30.9583C17.4238 30.1995 30.1995 17.4238 30.9583 1.5H303.307C304.066 17.4238 316.841 30.1995 332.765 30.9583V195.042C316.841 195.8 304.066 208.576 303.307 224.5H30.9583C30.1995 208.576 17.4238 195.8 1.5 195.042Z" stroke="#DCCFBE" strokeWidth="3"/>
    </svg>
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backdropFilter: 'blur(7px)',
      WebkitBackdropFilter: 'blur(7px)',
      zIndex: 0,
    }}></div>
    <div style={{
      position: 'relative',
      zIndex: 2,
      padding: '2rem',
      color: 'white',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    }}>
      {children}
    </div>
  </div>
);

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
          <div className="absolute bottom-8 left-8">
            <h1 className="uppercase project-title color-bg">{project.title}</h1>
          </div>
          <div className="absolute bottom-8 right-8 w-1/3 h-auto" style={{ aspectRatio: '335 / 226' }}>
            <ProjectInfoShape>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
              }}>Project Info</h3>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>Technologies</h4>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
                  {project.technologies.map((tech, index) => (
                    <li key={index}>{tech}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>Industry</h4>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
                  {project.industry.map((ind, index) => (
                    <li key={index}>{ind}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ fontWeight: 'bold' }}>Date</h4>
                <p>{project.projectDate}</p>
              </div>
            </ProjectInfoShape>
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
      </div>
    </div>
  );
}
