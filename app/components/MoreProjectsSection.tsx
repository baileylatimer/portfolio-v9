import { useState, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import PixelizeImage, { PixelizeImageRef } from './PixelizeImage';
import ScrambleText from './ScrambleText';

interface Project {
  _id: string;
  title: string;
  slug: { current: string };
  projectDate: string;
  services: string[];
  industry: string[];
  mainImage: {
    asset: {
      url: string;
    };
  };
}

interface MoreProjectsSectionProps {
  projects: Project[];
  currentProjectId?: string;
}

export default function MoreProjectsSection({ projects, currentProjectId }: MoreProjectsSectionProps) {
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [hoverCount, setHoverCount] = useState(0);
  const [pixelizeKey, setPixelizeKey] = useState(0);
  const pixelizeRef = useRef<PixelizeImageRef>(null);
  const navigate = useNavigate();

  // Filter out current project
  const otherProjects = projects.filter(project => project._id !== currentProjectId);

  const extractYear = (dateString: string): string => {
    return new Date(dateString).getFullYear().toString();
  };

  const handleProjectHover = (project: Project) => {
    console.log('🎯 Hover triggered:', project.title, 'Previous:', hoveredProject?.title || 'none');
    setHoverCount(c => c + 1);
    setHoveredProject(project);
    console.log('🎯 Hover count incremented to:', hoverCount + 1);

    // Pixelization effect - increment key to force fresh pixelated mount
    const newKey = pixelizeKey + 1;
    console.log('🎨 Setting new pixelizeKey:', newKey);
    setPixelizeKey(newKey);

    // After component mounts pixelated, trigger depixelize animation
    setTimeout(() => {
      console.log('🎨 pixelizeRef after timeout:', pixelizeRef.current ? 'exists' : 'null');
      if (pixelizeRef.current) {
        console.log('🎨 Calling triggerDepixelize() method');
        pixelizeRef.current.triggerDepixelize();
      } else {
        console.log('🎨 ERROR: pixelizeRef.current is null after timeout');
      }
    }, 200);
  };

  const handleProjectLeave = () => {
    console.log('🎯 Mouse leave - clearing hover');
    setHoveredProject(null);
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/work/${project.slug.current}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, project: Project) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleProjectClick(project);
    }
  };

  return (
    <section className="more-projects-section py-8 md:py-16">
      <div className="px-2">
        
        {/* Mobile Layout - Simple List */}
        <div className="block md:hidden">
          <h2 className="text-lg uppercase color-contrast mb-8 font-bold">MORE PROJECTS</h2>
          
          {/* Mobile Project List */}
          <div className="space-y-0">
            {otherProjects.map((project, index) => (
              <div
                key={project._id}
                className="project-row cursor-pointer py-3 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                onClick={() => handleProjectClick(project)}
                onKeyDown={(e) => handleKeyDown(e, project)}
                role="button"
                tabIndex={0}
                aria-label={`View project: ${project.title}`}
                style={index < otherProjects.length - 1 
                  ? { borderBottom: '1px solid var(--color-contrast-higher)' } 
                  : undefined
                }
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  
                  {/* Project Name */}
                  <div className="col-span-4">
                    <span className="inline-block px-2 text-xs uppercase color-contrast">
                      {project.title}
                    </span>
                  </div>
                  
                  {/* Year */}
                  <div className="col-span-2">
                    <span className="inline-block px-2 text-xs color-contrast">
                      {extractYear(project.projectDate)}
                    </span>
                  </div>
                  
                  {/* Industry */}
                  <div className="col-span-6 text-right">
                    <span className="inline-block px-2 color-contrast">
                      {project.industry.map((ind, index) => (
                        <span key={index} className="text-xs uppercase">
                          [{ind}]{index < project.industry.length - 1 ? ' ' : ''}
                        </span>
                      ))}
                    </span>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Layout - Full Width with Positioned Image */}
        <div className="hidden md:block relative">
          
          {/* Project List Container */}
          <div className="relative">
            
            {/* Top Label - aligned with first project */}
            <div className="absolute top-3 left-0">
              <h2 className="text-base uppercase color-contrast">MORE PROJECTS</h2>
            </div>
            
            {/* Projects List */}
            <div className="space-y-0 ml-[300px]">
              {otherProjects.map((project, index) => (
                <div
                  key={project._id}
                  className="project-row cursor-pointer py-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  onMouseEnter={() => handleProjectHover(project)}
                  onMouseLeave={handleProjectLeave}
                  onClick={() => handleProjectClick(project)}
                  onKeyDown={(e) => handleKeyDown(e, project)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View project: ${project.title}`}
                  style={index < otherProjects.length - 1 
                    ? { borderBottom: '1px solid var(--color-contrast-higher)' } 
                    : undefined
                  }
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    
                    {/* Project Name */}
                    <div className="col-span-4">
                      <span className={`inline-block px-2 text-base uppercase transition-all duration-150 ${
                        hoveredProject?._id === project._id 
                          ? 'color-bg' 
                          : 'color-contrast'
                      }`}
                      style={hoveredProject?._id === project._id 
                        ? { backgroundColor: 'var(--color-contrast-higher)' } 
                        : undefined
                      }>
                        <ScrambleText isActive={hoveredProject?._id === project._id}>
                          {project.title}
                        </ScrambleText>
                      </span>
                    </div>
                    
                    {/* Year */}
                    <div className="col-span-2">
                      <span className={`inline-block px-2 text-base transition-all duration-150 ${
                        hoveredProject?._id === project._id 
                          ? 'color-bg' 
                          : 'color-contrast'
                      }`}
                      style={hoveredProject?._id === project._id 
                        ? { backgroundColor: 'var(--color-contrast-higher)' } 
                        : undefined
                      }>
                        <ScrambleText isActive={hoveredProject?._id === project._id}>
                          {extractYear(project.projectDate)}
                        </ScrambleText>
                      </span>
                    </div>
                    
                    {/* Industry */}
                    <div className="col-span-6 text-right">
                      <span className={`inline-block px-2 transition-all duration-150 ${
                        hoveredProject?._id === project._id 
                          ? 'color-bg' 
                          : 'color-contrast'
                      }`}
                      style={hoveredProject?._id === project._id 
                        ? { backgroundColor: 'var(--color-contrast-higher)' } 
                        : undefined
                      }>
                        {project.industry.map((ind, index) => (
                          <span key={index} className="text-sm uppercase">
                            <ScrambleText isActive={hoveredProject?._id === project._id}>
                              [{ind}]
                            </ScrambleText>
                            {index < project.industry.length - 1 ? ' ' : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                    
                  </div>
                </div>
              ))}
            </div>
            
            {/* Bottom Left Positioned Image */}
            <div className="absolute bottom-0 left-0 w-[245px] h-[245px] bg-transparent">
              {hoveredProject ? (
                <PixelizeImage
                  key={pixelizeKey}
                  ref={pixelizeRef}
                  src={hoveredProject.mainImage.asset.url}
                  alt={hoveredProject.title}
                  className="w-full h-full object-cover"
                  manualTrigger={true}
                  disableEffect={false}
                  duration={0.1}
                />
              ) : (
                <div className="w-full h-full bg-transparent" />
              )}
            </div>
            
          </div>
        </div>
        
      </div>
    </section>
  );
}
