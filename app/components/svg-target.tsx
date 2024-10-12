// app/components/svg-target.tsx

interface TargetSvgProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function SvgTarget({ width = 71, height = 72, color = "#1A1917" }: TargetSvgProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 71 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35.3747" cy="36.8576" r="12.1286" stroke={color} strokeWidth="2.69"/>
      <path d="M35.375 22.7074V0.47168" stroke={color} strokeWidth="2.69"/>
      <path d="M48.5143 35.8467L70.75 35.8467" stroke={color} strokeWidth="2.69"/>
      <path d="M35.375 71.2216V48.9858" stroke={color} strokeWidth="2.69"/>
      <path d="M-0.00133944 35.8467L22.2344 35.8467" stroke={color} strokeWidth="2.69"/>
      <circle cx="35.3744" cy="36.8574" r="20.2143" stroke={color} strokeWidth="2.69"/>
    </svg>
  );
}
