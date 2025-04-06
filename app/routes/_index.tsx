import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Navigation from "~/components/navigation";
import Hero from '~/components/hero';
import HorseshoeModel from '~/components/HorseshoeModel';
import MissionSection from '~/components/mission-section';
import ServicesSection from '~/components/services-section';
import PartnersSection from '~/components/partners-section';
import GunBarrelReel from '~/components/GunBarrelReel';

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
    
    // Filter featured projects (limit to 5)
    const featuredProjects = (data.projects || [])
      .filter((project: { featured: boolean }) => project.featured)
      .slice(0, 5);
    
    return { 
      services: data.services, 
      partners: data.partners,
      heroMedia: data.heroMedia || { mediaUrl: '/images/hero-bg--min.jpg' }, // Fallback to static image
      mission: data.mission || null, // Add mission data
      featuredProjects // Add featured projects
    };
  } catch (error: unknown) {
    console.error('Error fetching data:', error);
    return { 
      services: [], 
      partners: [], 
      heroMedia: { mediaUrl: '/images/hero-bg--min.jpg' }, // Fallback to static image
      mission: null,
      featuredProjects: [],
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

interface Project {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: {
    asset: {
      url: string;
    };
  };
  featured: boolean;
}

export default function Index() {
  const { services, partners, heroMedia, mission, featuredProjects } = useLoaderData<{
    services: Service[];
    partners: Partner[];
    heroMedia: HeroMedia;
    mission: Mission | null;
    featuredProjects: Project[];
  }>();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <Hero mediaUrl={heroMedia.mediaUrl} />
      <MissionSection mission={mission} />
      
      {/* Gun Barrel Reel for featured projects */}
      {featuredProjects.length > 0 && (
        <div className="py-16 relative">
          <div className="absolute top-16 left-8">
            <h2 className="font-accent eyebrow mb-8">PROJECTS</h2>
          </div>
          <GunBarrelReel projects={featuredProjects} />
        </div>
      )}

<div className="flex-grow flex mt-24">
        <HorseshoeModel />
      </div>
      

      <ServicesSection services={services} />
      <PartnersSection partners={partners} />
    </div>
  );
}
