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
    { title: "Latimer Design | Custom Shopify & Brand Design Studio LA" },
    { name: "description", content: "Los Angeles-based digital studio crafting bold, custom Shopify experiences and brand identities. We transform innovative ideas into high-converting digital frontiers for ambitious brands." },
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
    return { 
      services: data.services, 
      partners: data.partners,
      heroMedia: data.heroMedia || { mediaUrl: '/images/hero-bg--min.jpg' }, // Fallback to static image
      mission: data.mission || null // Add mission data
    };
  } catch (error: unknown) {
    console.error('Error fetching data:', error);
    return { 
      services: [], 
      partners: [], 
      heroMedia: { mediaUrl: '/images/hero-bg--min.jpg' }, // Fallback to static image
      mission: null,
      error: (error as Error).message || 'Failed to fetch data' 
    };
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

interface HeroMedia {
  mediaUrl: string;
}

interface MarkDef {
  _key: string;
  _type: string;
  href?: string;
}

interface MissionContent {
  _key: string;
  _type: string;
  children: {
    _key: string;
    _type: string;
    marks: string[];
    text: string;
  }[];
  markDefs: MarkDef[];
  style: string;
}

interface Mission {
  _id: string;
  title: string;
  content: MissionContent[];
}

export default function Index() {
  const { services, partners, heroMedia, mission } = useLoaderData<{
    services: Service[];
    partners: Partner[];
    heroMedia: HeroMedia;
    mission: Mission | null;
  }>();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <Hero mediaUrl={heroMedia.mediaUrl} />
      <div className="flex-grow flex mt-24">
        <HorseshoeModel />
      </div>
      <MissionSection mission={mission} />
      <ServicesSection services={services} />
      <PartnersSection partners={partners} />
    </div>
  );
}
