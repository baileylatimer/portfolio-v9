import React from 'react';
import { Link } from '@remix-run/react';

interface Project {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: {
    asset: {
      url: string;
    };
  };
  technologies: string[];
  industry: string[];
  columns: number;
}

interface ProjectGridProps {
  projects: Project[];
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects }) => {
  const getColSpan = (columns: number) => {
    switch (columns) {
      case 1: return 'md:col-span-4'; // 1/3 width
      case 2: return 'md:col-span-6'; // 1/2 width
      case 3: return 'md:col-span-8'; // 2/3 width
      case 4: return 'md:col-span-12'; // full width
      default: return 'md:col-span-4'; // default to 1/3 width
    }
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-12 gap-4 light-section">
      {projects.map((project) => {
        const colSpan = getColSpan(project.columns || 1);
        const mobileSpan = project.columns > 1 ? 'col-span-4' : 'col-span-2';

        return (
          <Link
            key={project._id}
            to={`/work/${project.slug.current}`}
            className={`relative group ${mobileSpan} ${colSpan}`}
          >
            <div className="aspect-w-16 aspect-h-9 mb-2 relative">
              <div className="plastic-wrap-container w-full h-full">
                <img
                  src={project.mainImage.asset.url}
                  alt={project.title}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-1">{project.title}</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {project.technologies.map((tech, index) => (
                <span key={`tech-${index}`} className="text-sm bg-gray-200 px-2 py-1 rounded">
                  {tech}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {project.industry.map((ind, index) => (
                <span key={`ind-${index}`} className="text-sm bg-blue-200 px-2 py-1 rounded">
                  {ind}
                </span>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ProjectGrid;
