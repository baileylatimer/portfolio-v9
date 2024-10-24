// components/CustomButton.tsx
import React from 'react';

interface CustomButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  fill?: 'on' | 'off';
  className?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({ children, onClick, fill = 'on', className = '' }) => {
  const fillColor = fill === 'off' ? 'rgba(26, 25, 23, 0.01)' : '#1A1917'; // Very slight opacity for 'off' to keep shadow visible

  return (
    <button
      onClick={onClick}
      className={`relative inline-block px-12 py-4 text-[#DCCFBE] transition-transform hover:scale-105 focus:outline-none ${className}`}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 943 350" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_i_5768_366)">
          <path d="M0.662598 76.0603C42.4632 76.0603 76.3493 42.1742 76.3493 0.373535H866.855C866.855 42.1742 900.741 76.0603 942.542 76.0603V273.687C900.741 273.687 866.855 307.573 866.855 349.374H76.3493C76.3493 307.573 42.4632 273.687 0.662598 273.687V76.0603Z" fill={fillColor}/>
        </g>
        <path d="M6.96983 267.619V82.1285C47.2251 79.0663 79.3553 46.9361 82.4176 6.68076H860.787C863.849 46.9361 895.98 79.0662 936.235 82.1285V267.619C895.98 270.681 863.849 302.811 860.787 343.066H82.4176C79.3553 302.811 47.2251 270.681 6.96983 267.619Z" stroke="#DCCFBE" strokeWidth="12.6145"/>
        <defs>
          <filter id="filter0_i_5768_366" x="0.662598" y="0.373535" width="941.879" height="349" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="-42.0482" dy="-4.20482"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0.854902 0 0 0 0 0.792157 0 0 0 0 0.717647 0 0 0 1 0"/>
            <feBlend mode="normal" in2="shape" result="effect1_innerShadow_5768_366"/>
          </filter>
        </defs>
      </svg>
      <span className="relative  whitespace-nowrap uppercase">{children}</span>
    </button>
  );
};

export default CustomButton;
