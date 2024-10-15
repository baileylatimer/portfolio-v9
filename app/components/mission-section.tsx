import React from 'react';
import { useOutletContext } from '@remix-run/react';
import SvgTarget from './svg-target';

interface OutletContextType {
  openSecretSection: () => void;
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

const MissionSection: React.FC = () => {
  const { openSecretSection } = useOutletContext<OutletContextType>();

  const handleTargetClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    e.stopPropagation();
    console.log("Target in mission section clicked");
    openSecretSection();
  };

  return (
    <section className="light-section py-16 px-4 md:px-8 lg:px-16">
      <div className="mx-auto">
        <h2 className="font-accent eyebrow mb-8">ABOUT</h2>
        <div className=" leading-tight relative">
          <div className="float-left mr-0 lg:mr-4 mt-2 lg:mt-4 scale-75 md:scale-100 origin-top-left">
            <SmallGrid />
          </div>
          <p className='font-secondary'>
            Design and code are only tools of expression. What sets us and our work apart is people. We&apos;re a small group of creative thinkers who craft bespoke digital-first brand identities and experiences, tailor-made for you and your audience.
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
