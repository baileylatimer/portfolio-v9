import React from 'react';
import SvgCaFlag from './svg-ca-flag';
import SvgStar from './svg-star';
import SvgCoordinates from './svg-coordinates';
import SvgPeaceSign from './svg-peace-sign';
import SvgEmailArrow from './svg-email-arrow';
import CustomButton from './custom-button';

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-cover bg-bottom pt-48 py-8 overflow-hidden" style={{backgroundImage: "url('/images/footer-bg.png')"}}>
      <div className="container mx-auto px-4 footer-content pb-24">
        <div className="desktop hidden md:block font-secondary ">
          <div className="flex justify-start items-center whitespace-nowrap footer-row">
           <SvgStar />Hollywood <span className='mx-4'><SvgCoordinates /></span> Los Angeles <span className='ml-4'><SvgCaFlag width={200} height={180}/></span>
          </div>
          <div className="flex justify-start items-center whitespace-nowrap footer-row">
            Creative Studio <span className='font-default mx-4'>by</span> Bailey Latimer <span className='block mx-4'><SvgPeaceSign /></span>  bailey <SvgEmailArrow />latimer.me
          </div>
        </div>

        <div className="mobile md:hidden font-secondary">
          <div className="flex justify-start items-center">
          <SvgStar /> Hollywood <SvgCoordinates />
          </div>
          <div className="flex justify-start items-center">
            Los Angeles <SvgCaFlag />
          </div>
          <div className="flex justify-between items-center mt-2 mb-4 whitespace-nowrap">
            Creative Studio <span className='font-default'>by</span>
          </div>
          <div className="flex justify-start items-center">
            Bailey Latimer <SvgPeaceSign /> bailey <SvgEmailArrow />latimer.me
          </div>
        </div>

        <div className="mt-8 text-center">
          <CustomButton>LET&apos;S TALK</CustomButton>
        </div>




      </div>
      <p className="font-accent footer-text">LATIMER</p>
    </footer>
  );
};

export default Footer;
