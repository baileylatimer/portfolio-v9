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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Welcome to Remix with Sanity Integration</h1>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: Project) => (
          <li key={project._id} className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-2">{project.title}</h2>
            <p className="text-gray-600">{project.excerpt}</p>
          </li>
        ))}
      </ul>
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Useful Links</h2>
        <ul className="space-y-2">
          <li>
            <a
              className="text-blue-500 hover:underline"
              target="_blank"
              href="https://remix.run/tutorials/blog"
              rel="noreferrer"
            >
              15m Quickstart Blog Tutorial
            </a>
          </li>
          <li>
            <a
              className="text-blue-500 hover:underline"
              target="_blank"
              href="https://remix.run/tutorials/jokes"
              rel="noreferrer"
            >
              Deep Dive Jokes App Tutorial
            </a>
          </li>
          <li>
            <a 
              className="text-blue-500 hover:underline"
              target="_blank" 
              href="https://remix.run/docs" 
              rel="noreferrer"
            >
              Remix Docs
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
