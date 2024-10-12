import React from 'react';
import SvgCaFlag from './svg-ca-flag';
import SvgStar from './svg-star';
import SvgCoordinates from './svg-coordinates';
import SvgPeaceSign from './svg-peace-sign';
import SvgEmailArrow from './svg-email-arrow';
import CustomButton from './custom-button';

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-cover bg-center py-8" style={{backgroundImage: "url('/images/footer-bg.png')"}}>
      <div className="container mx-auto px-4">
        <div className="desktop hidden md:block">
          <div className="footer-text flex justify-start items-center">
            Hollywood <SvgCoordinates /> Los Angeles <SvgCaFlag />
          </div>
          <div className="footer-text flex justify-start items-center">
            Creative Studio <SvgStar /> Bailey <SvgPeaceSign /> Latimer <SvgEmailArrow /> bailey@latimer.me
          </div>
        </div>

        <div className="mobile md:hidden">
          <div className="footer-text flex justify-start items-center">
            Hollywood <SvgCoordinates />
          </div>
          <div className="footer-text flex justify-start items-center">
            Los Angeles <SvgCaFlag />
          </div>
          <div className="footer-text flex justify-between items-center mt-2 mb-4">
            Creative Studio <SvgStar />
          </div>
          <div className="footer-text flex justify-start items-center">
            Bailey <SvgPeaceSign /> Latimer <SvgEmailArrow /> bailey@latimer.me
          </div>
        </div>

        <div className="mt-8 text-center">
          <CustomButton>LET&apos;S TALK</CustomButton>
        </div>

        <div className="mt-8 text-center">
          <p className="font-accent footer-text">©2024 LATIMER</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
