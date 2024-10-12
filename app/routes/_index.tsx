import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { fetchSanity } from "~/lib/sanity.client";
import type { Project } from "~/types/sanity";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async () => {
  console.log('Environment variables:', {
    SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
    SANITY_DATASET: process.env.SANITY_DATASET,
  });

  try {
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
    
    const projects = await fetchSanity<Project[]>(query);
    return { projects, error: null };
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    return { projects: [], error: (error as Error).message || 'Failed to fetch projects' };
  }
};

export default function Index() {
  const { projects, error } = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix with Sanity Integration</h1>
      {error && <p>Error: {error}</p>}
      <ul>
        {projects.map((project: Project) => (
          <li key={project._id}>
            <h2>{project.title}</h2>
            <p>{project.excerpt}</p>
          </li>
        ))}
      </ul>
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
    </div>
  );
}
