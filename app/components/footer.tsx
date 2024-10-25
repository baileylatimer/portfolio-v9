import React from 'react';
import { useNavigate } from '@remix-run/react';
import SvgCaFlag from './svg-ca-flag';
import SvgStar from './svg-star';
import SvgCoordinates from './svg-coordinates';
import SvgPeaceSign from './svg-peace-sign';
import SvgEmailArrow from './svg-email-arrow';
import CustomButton from './custom-button';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="relative bg-cover bg-top lg:bg-top pt-36 lg:pt-48 md:bg-[url('/images/footer-bg-extended.png')] bg-[url('/images/footer-bg-mobile.png')]">
      <div className='overflow-hidden relative'>
        <div className="container mx-auto px-4 footer-content pb-24 lg:pb-36 xl:pb-64">
          <div className='flex flex-col lg:flex-row justify-center items-center lg:justify-between w-full pb-16'>
          <h4 className='eyebrow mix-blend-difference text-center lg:text-left mb-4 lg:mb-0 lg:block hidden'>Take your site to the next level</h4>
          <h4 className='eyebrow mix-blend-difference text-center lg:text-left mb-8 lg:mb-0 lg:hidden block mobile-eyebrow'>Take your site to <br /> the next level</h4>
          <CustomButton onClick={() => navigate('/contact')}>LET&apos;S TALK</CustomButton>
          </div>
  
          <div className="desktop hidden md:block font-secondary pb-24">
            <div className="flex justify-start items-center whitespace-nowrap footer-row  mix-blend-difference">
            <SvgStar />Hollywood <span className='mx-4'><SvgCoordinates /></span> Los Angeles <span className='ml-4'><SvgCaFlag width={200} height={180}/></span>
            </div>
            <div className="flex justify-start items-center whitespace-nowrap footer-row  mix-blend-difference">
              Creative Studio <span className='font-default mx-4'>by</span> Bailey Latimer <span className='block mx-4'><SvgPeaceSign /></span>  bailey <SvgEmailArrow />latimer.me
            </div>
          </div>

          <div className="mobile md:hidden font-secondary">
            <div className="flex justify-start items-center  mix-blend-difference footer-row ">
            
            <span className="inline-block align-middle scale-50 md:scale-100 mln-10"><SvgStar /></span> Hollywood <span className='inline-block align-middle scale-75 md:scale-100 ml-1'><SvgCoordinates /></span>
            </div>
            <div className="flex justify-start items-center  mix-blend-difference footer-row ">
              Los Angeles <span className='ml-4'><SvgCaFlag width={100} height={100} /></span>
            </div>
            <div className="flex items-center mt-2 mb-4 whitespace-nowrap  mix-blend-difference footer-row ">
              Creative Studio <span className='font-default mx-4'>by</span> Bailey <span className='inline-block align-middle scale-75 md:scale-100 ml-2'> <SvgPeaceSign /></span>
            </div>
            <div className="flex justify-start items-center  mix-blend-difference footer-row ">
               bailey <SvgEmailArrow />latimer.me
            </div>
          </div>

          <div className='flex justify-between w-full mix-blend-difference md:flex hidden'> 
           <span>©{currentYear}</span>

            <div className='flex gap-4 uppercase'>
              <a href="https://www.instagram.com/latimer2k/" target="_blank" rel="noopener noreferrer">Instagram,</a>
              <a href="https://dribbble.com/latimer" target="_blank" rel="noopener noreferrer">Dribbble,</a>
              <a href="https://twitter.com/latimer2k" target="_blank" rel="noopener noreferrer">X,</a>
              <a href="https://www.linkedin.com/in/baileylatimer/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
        </div>
        <p className="font-accent footer-text">LATIMER</p>
      </div>
    </footer>
  );
};

export default Footer;
