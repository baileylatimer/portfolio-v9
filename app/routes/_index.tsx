import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Navigation from "~/components/navigation";
import Hero from '~/components/hero';
import HorseshoeModel from '~/components/HorseshoeModel';
import MissionSection from '~/components/mission-section';
import ServicesSection from '~/components/services-section';
import PartnersSection from '~/components/partners-section';

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
    return { services: data.services, partners: data.partners };
  } catch (error: unknown) {
    console.error('Error fetching data:', error);
    return { services: [], partners: [], error: (error as Error).message || 'Failed to fetch data' };
  }
};

interface Service {
  _id: string;
  title: string;
  content: string;
}

interface Partner {
  _id: string;
  name: string;
  logo: {
    asset: {
      _id: string;
      url: string;
    };
  };
}

export default function Index() {
  const { services, partners } = useLoaderData<{
    services: Service[];
    partners: Partner[];
  }>();

  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">3D Horseshoe Model</h2>
        <HorseshoeModel />
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-2">Scroll to rotate the model</h3>
          <p>Scroll down to rotate right, scroll up to rotate left.</p>
        </div>
      </div>
      <MissionSection />
      <ServicesSection services={services} />
      <PartnersSection partners={partners} />
      {/* Add some extra content for scrolling */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Additional Content</h2>
        <p>This is some additional content to allow for more scrolling. As you scroll up and down, you should see the horseshoe model rotating.</p>
        {/* Repeat this paragraph a few times for more content */}
        <p className="mt-4">Keep scrolling to see the full rotation of the model. The rotation is tied to your scroll position, so you can control it by scrolling up and down.</p>
        <p className="mt-4">The 3D model showcases our attention to detail and our ability to create immersive digital experiences. It&apos;s just one example of how we bring creativity and technology together in our projects.</p>
      </div>
    </div>
  );
}
