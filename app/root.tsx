import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { BulletHoleProvider, BulletHoleContext } from '~/contexts/BulletHoleContext';
import BulletHole from '~/components/BulletHole';
import Footer from '~/components/footer';
import Navigation from '~/components/navigation';
import SecretSection from '~/components/SecretSection';
import { useContext, useRef, useCallback, useState, useEffect } from 'react';
import { sanityClient } from "~/lib/sanity.server";
import type { PortableTextBlock } from '@portabletext/types';

import tailwindStyles from "./styles/tailwind.css?url";
import globalStyles from "./styles/global.css?url";
import filterModalStyles from "./styles/filter-modal.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: globalStyles },
  { rel: "stylesheet", href: filterModalStyles },
  { rel: "icon", type: "image/gif", href: "/images/favicon.gif" },
];

export const meta: MetaFunction = () => {
  const title = "Latimer Design | Custom Shopify & Brand Design Studio LA";
  const description = "Los Angeles-based digital studio crafting bold, custom Shopify experiences and brand identities. We transform innovative ideas into high-converting digital frontiers for ambitious brands.";
  const image = "https://latimer.me/images/social-sharing.jpg";

  return [
    { title },
    { name: "description", content: description },
    
    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://latimer.me" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    
    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
};

interface BulletHole {
  id: number;
  x: number;
  y: number;
}

interface SanityImage {
  asset: {
    _ref: string;
    _type: string;
  };
}

interface TeamMember {
  _id: string;
  name: string;
  image: SanityImage;
  bio: string;
  websiteUrl?: string;
  instagramUrl?: string;
  order: number;
}

interface SecretAboutData {
  title: string;
  content: PortableTextBlock[];
  image: SanityImage;
  tools: string[];
}

export const loader: LoaderFunction = async () => {
  const teamMembersQuery = `*[_type == "teamMember"] | order(order asc) {
    _id,
    name,
    image,
    bio,
    websiteUrl,
    instagramUrl,
    order
  }`;
  
  const secretAboutQuery = `*[_type == "secretAbout"][0] {
    title,
    content,
    image,
    tools
  }`;

  const [teamMembers, secretAboutData] = await Promise.all([
    sanityClient.fetch<TeamMember[]>(teamMembersQuery),
    sanityClient.fetch<SecretAboutData>(secretAboutQuery),
  ]);

  return json({ teamMembers, secretAboutData }); 
};

function AppContent() {
  const { teamMembers, secretAboutData } = useLoaderData<{ teamMembers: TeamMember[], secretAboutData: SecretAboutData }>();
  const { bulletHoles, addBulletHole, addBurstHoles } = useContext(BulletHoleContext) || {};
  const singleShotAudioRef = useRef<HTMLAudioElement>(null);
  const burstAudioRef = useRef<HTMLAudioElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mouseDownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTime = useRef(0);
  const [isSecretSectionOpen, setIsSecretSectionOpen] = useState(false);
  const location = useLocation();

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.target instanceof Element && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('.no-bullet-holes'))) return;
    setIsMouseDown(true);
    mouseDownTimerRef.current = setTimeout(() => {
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      addBurstHoles?.(x, y, e.target as HTMLElement);
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

  const handleClick = useCallback((e: MouseEvent) => {
    if (e.target instanceof Element && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('.no-bullet-holes'))) return;
    const now = Date.now();
    if (!isMouseDown && now - lastClickTime.current > 100) { // 100ms debounce
      lastClickTime.current = now;
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      addBulletHole?.(x, y, e.target as HTMLElement);
      if (singleShotAudioRef.current) {
        singleShotAudioRef.current.currentTime = 0;
        singleShotAudioRef.current.play()
          .then(() => console.log("Single shot audio played successfully"))
          .catch(error => console.error("Single shot audio playback failed:", error));
      }
    }
  }, [isMouseDown, addBulletHole]);

  useEffect(() => {
    document.body.addEventListener('click', handleClick);
    document.body.addEventListener('mousedown', handleMouseDown);
    document.body.addEventListener('mouseup', handleMouseUp);
    document.body.addEventListener('mouseleave', handleMouseUp);

    return () => {
      document.body.removeEventListener('click', handleClick);
      document.body.removeEventListener('mousedown', handleMouseDown);
      document.body.removeEventListener('mouseup', handleMouseUp);
      document.body.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleClick, handleMouseDown, handleMouseUp]);

  const openSecretSection = useCallback(() => {
    console.log("Opening secret section");
    setIsSecretSectionOpen(true);
  }, []);

  const showFooter = location.pathname !== '/contact';

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
      <div className="relative z-10 flex-grow">
        <Navigation />
        <Outlet context={{ openSecretSection }} />
      </div>
      {showFooter && <Footer />}
      {bulletHoles?.map((hole: BulletHole) => (
        <BulletHole key={hole.id} x={hole.x} y={hole.y} />
      ))}
      <SecretSection 
        isOpen={isSecretSectionOpen} 
        onClose={() => setIsSecretSectionOpen(false)} 
        teamMembers={teamMembers}
        secretAboutData={secretAboutData}
      />
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
