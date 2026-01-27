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
import { AsciiModeProvider } from '~/contexts/AsciiModeContext';
import { ShootingModeProvider, useShootingMode } from '~/contexts/ShootingModeContext';
import { DestructionProvider } from '~/contexts/DestructionContext';
import { WeaponProvider } from '~/contexts/WeaponContext';
import { SecretSectionProvider, useSecretSection } from '~/contexts/SecretSectionContext';
import BulletHole from '~/components/BulletHole';
import Footer from '~/components/footer';
import Navigation from '~/components/navigation';
import SecretSection from '~/components/SecretSection';
import Weapon3D from '~/components/Weapon3D';
import WeaponWheel from '~/components/WeaponWheel';
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
  { rel: "preconnect", href: "https://cdn.jsdelivr.net" },
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
  const { bulletHoles } = useContext(BulletHoleContext) || {};
  const { isSecretSectionOpen, openSecretSection, closeSecretSection } = useSecretSection();
  const location = useLocation();
  const singleShotAudioRef = useRef<HTMLAudioElement>(null);
  const burstAudioRef = useRef<HTMLAudioElement>(null);

  const handleMouseDown = useCallback(() => {
    // COMPLETELY DISABLE old bullet hole system - only Revolver creates bullet holes now
    return;
  }, []);

  const handleMouseUp = useCallback(() => {
    // COMPLETELY DISABLE old bullet hole system - only Revolver creates bullet holes now
    return;
  }, []);

  const handleClick = useCallback(() => {
    // COMPLETELY DISABLE old bullet hole system - only Revolver creates bullet holes now
    return;
  }, []);

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

  const showFooter = location.pathname !== '/contact';

  // Initialize GSAP ScrollSmoother
  useEffect(() => {
    const initScrollSmoother = () => {
      if (typeof window !== 'undefined') {
        console.log('🎯 Initializing ScrollSmoother...');
        
        // Load ScrollSmoother from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/ScrollSmoother.min.js';
        script.onload = async () => {
          console.log('✅ ScrollSmoother CDN loaded');
          
          try {
            const { default: gsap } = await import('gsap');
            console.log('✅ GSAP imported');
            
            // @ts-ignore - ScrollSmoother is loaded from CDN
            gsap.registerPlugin(window.ScrollSmoother);
            console.log('✅ ScrollSmoother plugin registered');
            
            // @ts-ignore - ScrollSmoother is loaded from CDN
            const smoother = window.ScrollSmoother.create({
              wrapper: '#smooth-wrapper',
              content: '#smooth-content',
              smooth: 2,
              effects: true,
              normalizeScroll: true,
            });
            
            console.log('🚀 ScrollSmoother created:', smoother);
          } catch (error) {
            console.error('❌ ScrollSmoother initialization failed:', error);
          }
        };
        script.onerror = () => {
          console.error('❌ Failed to load ScrollSmoother CDN');
        };
        document.head.appendChild(script);
      }
    };

    initScrollSmoother();
  }, []);

  return (
    <body
      className="min-h-screen relative flex flex-col"
      style={{
        backgroundImage: `url('/images/bg-texture.jpg')`,
        backgroundRepeat: 'repeat',
      }}
    >
      <div id="smooth-wrapper">
        <div id="smooth-content">
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
        </div>
      </div>
      {bulletHoles?.map((hole: BulletHole) => (
        <BulletHole key={hole.id} x={hole.x} y={hole.y} />
      ))}
      <SecretSection 
        isOpen={isSecretSectionOpen} 
        onClose={closeSecretSection} 
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
        <AsciiModeProvider>
          <ShootingModeProvider>
            <DestructionProvider>
              <WeaponProvider>
                <SecretSectionProvider>
                  <AppContent />
                  <Weapon3D />
                  <WeaponWheel />
                </SecretSectionProvider>
              </WeaponProvider>
            </DestructionProvider>
          </ShootingModeProvider>
        </AsciiModeProvider>
      </BulletHoleProvider>
    </html>
  );
}
