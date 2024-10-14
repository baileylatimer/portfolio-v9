import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import PageHero from '~/components/page-hero';
import ImageWithText from '~/components/image-with-text';
import ClientLogoSection from '~/components/client-logo-section';
import { PortableTextBlock } from '@portabletext/react';

interface ImageWithTextData {
  title: string;
  content: PortableTextBlock[];
  image: {
    asset: {
      url: string;
    };
  };
  imageExcerpt: string;
}

interface ClientLogo {
  _id: string;
  name: string;
  logo: {
    asset: {
      url: string;
    };
  };
  order: number;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/sanity`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { imageWithText: data.imageWithText, clientLogos: data.clientLogos };
  } catch (error) {
    console.error('Error fetching data:', error);
    return { imageWithText: null, clientLogos: [] };
  }
};

export default function About() {
  const { imageWithText, clientLogos } = useLoaderData<{ 
    imageWithText: ImageWithTextData | null,
    clientLogos: ClientLogo[]
  }>();

  return (
    <div className="about-page">
      <PageHero 
        desktopImageSrc="/images/hero-rip.png"
        mobileImageSrc="/images/hero-rip--mobile.png"
        altText="Hero Rip"
      />
      {imageWithText && (
        <ImageWithText
          title={imageWithText.title}
          content={imageWithText.content}
          image={imageWithText.image}
          imageExcerpt={imageWithText.imageExcerpt}
        />
      )}
      <ClientLogoSection logos={clientLogos} />
      {/* Add other sections here */}
    </div>
  );
}
