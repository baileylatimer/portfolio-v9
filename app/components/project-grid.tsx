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
  columns: number;
}

interface ProjectGridProps {
  projects: Project[];
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {projects.map((project, index) => {
        const colSpan = project.columns || 1;
        const mobileRowPattern = ['col-span-1', 'col-span-1', 'col-span-1', 'col-span-2', 'col-span-1', 'col-span-2'];
        const mobileSpan = mobileRowPattern[index % mobileRowPattern.length];

        return (
          <Link
            key={project._id}
            to={`/work/${project.slug.current}`}
            className={`relative group ${mobileSpan} md:col-span-${colSpan}`}
          >
            <div className="aspect-w-16 aspect-h-9 mb-2">
              <img
                src={project.mainImage.asset.url}
                alt={project.title}
                className="object-cover w-full h-full"
              />
            </div>
            <h3 className="text-lg font-bold mb-1">{project.title}</h3>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech, index) => (
                <span key={index} className="text-sm bg-gray-200 px-2 py-1 rounded">
                  {tech}
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
