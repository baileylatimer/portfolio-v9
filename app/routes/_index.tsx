import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { Project } from "~/types/sanity";
import Navigation from "~/components/navigation";
import Hero from '~/components/hero';

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
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Portfolio</h1>
        {error && <p className="text-red-500">{error}</p>}
        {projects.length === 0 ? (
          <p>No projects found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project._id} className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{project.title}</h2>
                  <p className="text-gray-600">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
