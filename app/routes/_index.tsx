import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { Project } from "~/types/sanity";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App with Sanity" },
    { name: "description", content: "Welcome to Remix with Sanity integration!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/sanity`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const projects = await response.json();
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
