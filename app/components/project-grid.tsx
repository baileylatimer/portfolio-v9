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
        const isFullWidth = project.columns === 4;

        return (
          <Link
            key={project._id}
            to={`/work/${project.slug.current}`}
            className={`relative group project-card ${mobileSpan} ${colSpan} ${isFullWidth ? 'full-width' : 'fixed-height'}`}
          >
            <div className="aspect-w-16 aspect-h-9 relative">
              <div className="plastic-wrap-container w-full h-full">
                <img
                  src={project.mainImage.asset.url}
                  alt={project.title}
                  className="object-cover w-full h-full project-card-img"
                />
                <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-black/50 to-transparent z-10">
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
                    <h3 className="color-bg uppercase mb-0">{project.title}</h3>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {project.industry.map((ind, index) => (
                        <span key={`ind-${index}`} className="color-bg uppercase px-2 py-1 rounded pill">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ProjectGrid;
