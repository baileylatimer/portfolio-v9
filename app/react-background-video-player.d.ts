declare module 'react-background-video-player' {
  import React from 'react';

  interface BackgroundVideoProps {
    src: string;
    containerWidth: number;
    containerHeight: number;
    muted?: boolean;
    autoPlay?: boolean;
    loop?: boolean;
  }

  const BackgroundVideo: React.FC<BackgroundVideoProps>;

  export default BackgroundVideo;
}
