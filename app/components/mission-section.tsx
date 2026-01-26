import React from 'react';
import { useOutletContext } from '@remix-run/react';
import SvgTarget from './svg-target';
import ShatterableText from './ShatterableText';

interface OutletContextType {
  openSecretSection: () => void;
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

interface MissionSectionProps {
  mission: Mission | null;
}

const SmallGrid = () => (
  <svg width="147" height="41" viewBox="0 0 147 41" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="26.5909" height="26.5909" transform="matrix(1 0 0 -1 12.4102 28.0625)" stroke="var(--color-contrast-higher)" strokeWidth="2.69"/>
    <path d="M12.4102 31.608V40.4717" stroke="var(--color-contrast-higher)" strokeWidth="2.69"/>
    <path d="M-0.000355005 28.0625L8.86328 28.0625" stroke="var(--color-contrast-higher)" strokeWidth="2.69"/>
    <rect width="26.5909" height="26.5909" transform="matrix(1 0 0 -1 39 28.0625)" stroke="var(--color-contrast-higher)" strokeWidth="2.69"/>
    <rect width="26.5909" height="26.5909" transform="matrix(1 0 0 -1 65.5898 28.0625)" stroke="var(--color-contrast-higher)" strokeWidth="2.69"/>
    <rect width="26.5909" height="26.5909" transform="matrix(1 0 0 -1 92.1836 28.0625)" stroke="var(--color-contrast-higher)" strokeWidth="2.69"/>
    <rect width="26.5909" height="26.5909" transform="matrix(1 0 0 -1 118.773 28.0625)" stroke="var(--color-contrast-higher)" strokeWidth="2.69"/>
  </svg>
);

// Helper function to render rich text content from Sanity
const renderRichText = (content: MissionContent[]) => {
  if (!content || content.length === 0) return null;
  
  return content.map((block) => {
    if (block._type !== 'block') return null;
    
    // For simplicity, we're just concatenating all the text in the block
    const text = block.children
      .map(child => child.text)
      .join('');
    
    return text;
  }).join(' ');
};

const MissionSection: React.FC<MissionSectionProps> = ({ mission }) => {
  const { openSecretSection } = useOutletContext<OutletContextType>();

  const handleTargetClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    e.stopPropagation();
    console.log("Target in mission section clicked");
    openSecretSection();
  };

  // Default content if no mission data is available
  const defaultContent = "Design and code are only tools of expression. What sets us and our work apart is people. We're a small group of creative thinkers who craft bespoke digital-first brand identities and experiences, tailor-made for you and your audience.";
  
  // Use mission data if available, otherwise use default content
  const title = mission?.title || "ABOUT";
  const content = mission?.content ? renderRichText(mission.content) || defaultContent : defaultContent;

  return (
    <section className="light-section py-16 px-4 md:px-8 lg:px-16">
      <div className="mx-auto">
        <h2 className="font-accent eyebrow mb-8">{title}</h2>
        <div className="leading-tight relative">
          <div className="float-left mr-0 lg:mr-4 mt-2 lg:mt-4 scale-75 md:scale-100 origin-top-left">
            <SmallGrid />
          </div>
          <p className='font-secondary'>
            <ShatterableText
              text={content}
              id="mission"
              className="inline"
            />
            <span className="inline-block align-middle ml-2 scale-75 md:scale-100">
              <SvgTarget 
                color="var(--color-contrast-higher)" 
                width={60} 
                height={60} 
                onClick={handleTargetClick}
              />
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
