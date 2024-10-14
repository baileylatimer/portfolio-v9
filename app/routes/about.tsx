import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import PageHero from '~/components/page-hero';
import ImageWithText from '~/components/image-with-text';
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

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/sanity`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { imageWithText: data.imageWithText };
  } catch (error) {
    console.error('Error fetching data:', error);
    return { imageWithText: null };
  }
};

export default function About() {
  const { imageWithText } = useLoaderData<{ imageWithText: ImageWithTextData | null }>();

  return (
    <div className="about-page">
      <PageHero imageSrc="/images/hero-rip.png" altText="Hero Rip" />
      {imageWithText && (
        <ImageWithText
          title={imageWithText.title}
          content={imageWithText.content}
          image={imageWithText.image}
          imageExcerpt={imageWithText.imageExcerpt}
        />
      )}
      {/* Add other sections here */}
    </div>
  );
}
