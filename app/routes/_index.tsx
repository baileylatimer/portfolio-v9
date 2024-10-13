import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Navigation from "~/components/navigation";
import Hero from '~/components/hero';
import MissionSection from '~/components/mission-section';
import ServicesSection from '~/components/services-section';

export const meta: MetaFunction = () => {
  return [
    { title: "Bailey Latimer - Portfolio" },
    { name: "description", content: "Welcome to Bailey Latimer's portfolio, showcasing creative digital solutions." },
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
    const data = await response.json();
    return { projects: data.projects, services: data.services, error: null };
  } catch (error: unknown) {
    console.error('Error fetching data:', error);
    return { projects: [], services: [], error: (error as Error).message || 'Failed to fetch data' };
  }
};

interface Project {
  _id: string;
  title: string;
  description: string;
}

interface Service {
  _id: string;
  title: string;
  content: string;
}

export default function Index() {
  const { projects, services, error } = useLoaderData<{
    projects: Project[];
    services: Service[];
    error: string | null;
  }>();

  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <MissionSection />
      <ServicesSection services={services} />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-4xl font-bold mb-8">Projects</h2>
        {error && <p className="text-red-500">{error}</p>}
        {projects.length === 0 ? (
          <p>No projects found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: Project) => (
              <div key={project._id} className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
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
