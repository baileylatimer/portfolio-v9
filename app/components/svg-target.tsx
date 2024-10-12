// app/components/TargetSvg.tsx

interface TargetSvgProps {
  width?: number;
  height?: number;
}

export default function SvgTarget({ width = 71, height = 71 }: TargetSvgProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35.375" cy="36.3857" r="12.1286" stroke="white"/>
      <path d="M35.375 22.2357V0" stroke="white"/>
      <path d="M48.5143 35.375L70.75 35.375" stroke="white"/>
      <path d="M35.375 70.75V48.5143" stroke="white"/>
      <path d="M3.33786e-06 35.375L22.2357 35.375" stroke="white"/>
      <circle cx="35.3751" cy="36.3857" r="20.2143" stroke="white"/>
    </svg>
  );
}