// app/components/GridSvg.tsx

interface GridSvgProps {
  width?: number;
  height?: number;
}

export default function SvgGrid({ width = 40, height = 306 }: GridSvgProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 306" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 12.4091)" stroke="#DCCFBE"/>
      <path d="M8.86364 12.4091L0 12.4091" stroke="#DCCFBE"/>
      <path d="M12.4092 1.12057e-05V8.86365" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 39)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 65.5909)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 92.1818)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 118.773)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 145.364)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 171.955)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 198.545)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 225.136)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 251.727)" stroke="#DCCFBE"/>
      <rect width="26.5909" height="26.5909" transform="matrix(-4.37114e-08 1 1 4.37114e-08 12.4092 278.318)" stroke="#DCCFBE"/>
    </svg>
  );
}