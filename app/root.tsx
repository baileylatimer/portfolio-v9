import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { BulletHoleProvider, BulletHoleContext } from '~/contexts/BulletHoleContext';
import BulletHole from '~/components/BulletHole';
import Footer from '~/components/footer';
import Navigation from '~/components/navigation';
import { useContext, useRef, useCallback, useState } from 'react';

import tailwindStyles from "./styles/tailwind.css?url";
import globalStyles from "./styles/global.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: globalStyles },
];

interface BulletHole {
  id: number;
  x: number;
  y: number;
}

function AppContent() {
  const { bulletHoles, addBulletHole, addBurstHoles } = useContext(BulletHoleContext) || {};
  const singleShotAudioRef = useRef<HTMLAudioElement>(null);
  const burstAudioRef = useRef<HTMLAudioElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mouseDownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTime = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsMouseDown(true);
    mouseDownTimerRef.current = setTimeout(() => {
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      addBurstHoles?.(x, y);
      if (burstAudioRef.current) {
        burstAudioRef.current.currentTime = 0;
        burstAudioRef.current.play().catch(error => console.error("Burst audio playback failed:", error));
      }
    }, 200);
  }, [addBurstHoles]);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
    if (mouseDownTimerRef.current) {
      clearTimeout(mouseDownTimerRef.current);
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (!isMouseDown && now - lastClickTime.current > 100) { // 100ms debounce
      lastClickTime.current = now;
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      addBulletHole?.(x, y);
      if (singleShotAudioRef.current) {
        singleShotAudioRef.current.currentTime = 0;
        singleShotAudioRef.current.play()
          .then(() => console.log("Single shot audio played successfully"))
          .catch(error => console.error("Single shot audio playback failed:", error));
      }
    }
  }, [isMouseDown, addBulletHole]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // For keyboard events, we'll use the center of the viewport
      const x = window.innerWidth / 2 + window.scrollX;
      const y = window.innerHeight / 2 + window.scrollY;
      addBulletHole?.(x, y);
      if (singleShotAudioRef.current) {
        singleShotAudioRef.current.currentTime = 0;
        singleShotAudioRef.current.play()
          .then(() => console.log("Single shot audio played successfully"))
          .catch(error => console.error("Single shot audio playback failed:", error));
      }
    }
  }, [addBulletHole]);

  return (
    <body
      className="min-h-screen relative flex flex-col"
      style={{
        backgroundImage: `url('/images/bg-texture.jpg')`,
        backgroundRepeat: 'repeat',
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,0.1) 39px, rgba(0,0,0,0.1) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,0,0,0.1) 39px, rgba(0,0,0,0.1) 40px)
          `,
          zIndex: -1,
        }} 
      />
      <div 
        className="absolute inset-0 z-50"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Click or press Enter to shoot"
      />
      <div className="relative z-10 flex-grow">
        <Navigation />
        <Outlet />
      </div>
      <Footer />
      {bulletHoles?.map((hole: BulletHole) => (
        <BulletHole key={hole.id} x={hole.x} y={hole.y} />
      ))}
      <audio ref={singleShotAudioRef} src="/sounds/gunshot.wav" preload="auto">
        <track kind="captions" />
      </audio>
      <audio ref={burstAudioRef} src="/sounds/burst-fire.wav" preload="auto">
        <track kind="captions" />
      </audio>
      <ScrollRestoration />
      <Scripts />
    </body>
  );
}

export default function App() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <BulletHoleProvider>
        <AppContent />
      </BulletHoleProvider>
    </html>
  );
}
