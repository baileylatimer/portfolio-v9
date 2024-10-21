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
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <Hero />
      <div className="flex-grow flex items-center justify-center mt-24">
        <HorseshoeModel />
      </div>
      <MissionSection />
      <ServicesSection services={services} />
      <PartnersSection partners={partners} />
    </div>
  );
}
