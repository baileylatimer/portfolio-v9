import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Outlet, useLocation } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useState, useCallback, useMemo } from "react";
import PageHero from "~/components/page-hero";
import ProjectGrid from "~/components/project-grid";
import FilterModal from "~/components/filter-modal";
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

interface SanityProject {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  client: string;
  projectDate: string;
  technologies: string[];
  services: string[];
  industry: string[];
  mainImage: {
    asset: {
      url: string;
    };
  };
  columns?: number;
}

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
      services,
      industry,
      mainImage {
        asset-> {
          url
        }
      },
      columns
    }`;

    const projects = await sanityClient.fetch<SanityProject[]>(projectsQuery);
    
    // Extract unique industries and services
    const industries = [...new Set(projects.flatMap((p: SanityProject) => p.industry || []))];
    const services = [...new Set(projects.flatMap((p: SanityProject) => p.services || []))];

    return json({ projects, industries, services });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
};

type Project = SanityProject;

export default function Work() {
  const { projects, industries, services } = useLoaderData<{ 
    projects: Project[],
    industries: string[],
    services: string[]
  }>();
  const location = useLocation();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects);

  const totalFiltersSelected = useMemo(() => 
    selectedIndustries.length + selectedServices.length
  , [selectedIndustries, selectedServices]);

  const isMainWorkPage = location.pathname === "/work";

  const handleIndustryToggle = useCallback((industry: string) => {
    if (industry === 'all') {
      setSelectedIndustries([]);
      return;
    }
    setSelectedIndustries(prev => 
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  }, []);

  const handleServiceToggle = useCallback((service: string) => {
    if (service === 'all') {
      setSelectedServices([]);
      return;
    }
    setSelectedServices(prev => 
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = projects;

    if (selectedIndustries.length > 0) {
      filtered = filtered.filter(project => 
        project.industry.some(i => selectedIndustries.includes(i))
      );
    }

    if (selectedServices.length > 0) {
      filtered = filtered.filter(project => 
        project.services.some(s => selectedServices.includes(s))
      );
    }

    setFilteredProjects(filtered);
    setIsFilterModalOpen(false);
  }, [projects, selectedIndustries, selectedServices]);

  const clearFilters = useCallback(() => {
    setSelectedIndustries([]);
    setSelectedServices([]);
    setFilteredProjects(projects);
  }, [projects]);

  return (
    <div className="work-page">
      {isMainWorkPage ? (
        <>
          <PageHero
            desktopImageSrc="/images/hero-rip.png"
            mobileImageSrc="/images/hero-rip--mobile.png"
            altText="Our Work Hero Image"
          />
          <div className="mx-auto px-2 pt-6 pb-12 lg:py-12">
            <div className="px-d mx-auto flex justify-end mb-6">
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className="filter-button no-bullet-holes"
                aria-label="Open filter options"
              >
                Filter {totalFiltersSelected > 0 && `(${totalFiltersSelected})`} ▼
              </button>
            </div>
            <ProjectGrid projects={filteredProjects} />
          </div>

          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            industries={industries}
            services={services}
            selectedIndustries={selectedIndustries}
            selectedServices={selectedServices}
            onIndustryToggle={handleIndustryToggle}
            onServiceToggle={handleServiceToggle}
            onApply={applyFilters}
            onClear={clearFilters}
          />
        </>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
