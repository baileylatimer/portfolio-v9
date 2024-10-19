import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Outlet, useLocation } from "@remix-run/react";
import { json } from "@remix-run/node";
import PageHero from "~/components/page-hero";
import ProjectGrid from "~/components/project-grid";
import { createClient } from '@sanity/client';

console.log("work.tsx is being processed");

export const meta: MetaFunction = () => {
  return [
    { title: "Work | Latimer Design" },
    { name: "description", content: "Explore our work at Latimer Design" },
  ];
};

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2023-05-03',
});

export const loader: LoaderFunction = async () => {
  try {
    const projectsQuery = `*[_type == "project"] | order(order asc) {
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
      columns
    }`;

    const projects = await sanityClient.fetch(projectsQuery);
    return json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
};

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
  columns?: number;
}

export default function Work() {
  const { projects } = useLoaderData<{ projects: Project[] }>();
  const location = useLocation();

  const isMainWorkPage = location.pathname === "/work";

  return (
    <div className="work-page">
      {isMainWorkPage ? (
        <>
          <PageHero
            desktopImageSrc="/images/hero-rip.png"
            mobileImageSrc="/images/hero-rip--mobile.png"
            altText="Our Work Hero Image"
          />
          <div className=" mx-auto px-2 pt-6 pb-12 lg:py-12">
            <ProjectGrid projects={projects} />
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
