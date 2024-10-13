import React from 'react';
import SvgCaFlag from './svg-ca-flag';
import SvgStar from './svg-star';
import SvgCoordinates from './svg-coordinates';
import SvgPeaceSign from './svg-peace-sign';
import SvgEmailArrow from './svg-email-arrow';
import CustomButton from './custom-button';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="relative bg-cover bg-bottom pt-36 " style={{backgroundImage: "url('/images/footer-bg.png')"}}>
      <div className='overflow-hidden relative'>
        <div className="container mx-auto px-4 footer-content pb-36">
          <div className='flex justify-between w-full pb-12'>
          <h4 className='eyebrow mix-blend-difference'>Take your site to the next level</h4>
          <CustomButton>LET&apos;S TALK</CustomButton>
          </div>
  
          <div className="desktop hidden md:block font-secondary pb-8">
            <div className="flex justify-start items-center whitespace-nowrap footer-row  mix-blend-difference">
            <SvgStar />Hollywood <span className='mx-4'><SvgCoordinates /></span> Los Angeles <span className='ml-4'><SvgCaFlag width={200} height={180}/></span>
            </div>
            <div className="flex justify-start items-center whitespace-nowrap footer-row  mix-blend-difference">
              Creative Studio <span className='font-default mx-4'>by</span> Bailey Latimer <span className='block mx-4'><SvgPeaceSign /></span>  bailey <SvgEmailArrow />latimer.me
            </div>
          </div>

          <div className="mobile md:hidden font-secondary">
            <div className="flex justify-start items-center  mix-blend-difference">
            <SvgStar /> Hollywood <SvgCoordinates />
            </div>
            <div className="flex justify-start items-center  mix-blend-difference">
              Los Angeles <SvgCaFlag />
            </div>
            <div className="flex justify-between items-center mt-2 mb-4 whitespace-nowrap  mix-blend-difference">
              Creative Studio <span className='font-default'>by</span>
            </div>
            <div className="flex justify-start items-center  mix-blend-difference">
              Bailey Latimer <SvgPeaceSign /> bailey <SvgEmailArrow />latimer.me
            </div>
          </div>

          <div className='flex justify-between w-full mix-blend-difference'> 
          <span>©{currentYear}</span>
          <div className='flex gap-4'>
            <a href="https://www.instagram.com/latimer2k/">Instagram,</a>
          </div>
          </div>
        </div>
        <p className="font-accent footer-text">LATIMER</p>
      </div>
    </footer>
  );
};

export default Footer;
