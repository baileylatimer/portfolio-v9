import { json } from "@remix-run/node";
import { createClient } from '@sanity/client';

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2023-05-03',
});

export async function loader() {
  try {
    const projectsQuery = `*[_type == "project"]{
      _id,
      title,
      "slug": slug.current,
      excerpt,
      client,
      projectDate,
      technologies,
      industry,
      featured,
      order,
      mainImage {
        asset-> {
          url
        }
      },
      "mainImageUrl": mainImage.asset->url,
      gunreelBackground {
        asset-> {
          url
        }
      }
    }`;

    const servicesQuery = `*[_type == "service"] | order(order asc) {
      _id,
      title,
      content,
      media {
        type,
        alt,
        "image": image.asset->{
          _ref,
          url
        },
        "video": video.asset->{
          _ref,
          url
        }
      }
    }`;

    const partnersQuery = `*[_type == "partner"] | order(order asc) {
      _id,
      name,
      logo {
        asset->{
          _id,
          url
        }
      }
    }`;

    const imageWithTextQuery = `*[_type == "imageWithText"][0] {
      title,
      content,
      image {
        asset-> {
          url
        }
      },
      imageExcerpt
    }`;

    const clientLogosQuery = `*[_type == "clientLogo"] | order(order asc) {
      _id,
      name,
      logo {
        asset-> {
          url
        }
      },
      order
    }`;

    const heroMediaQuery = `*[_type == "heroMedia" && active == true][0] {
      _id,
      title,
      "mediaUrl": media.asset->url
    }`;
    
    const missionQuery = `*[_type == "mission" && active == true] | order(order asc)[0] {
      _id,
      title,
      content
    }`;

    const [projects, services, partners, imageWithText, clientLogos, heroMedia, mission] = await Promise.all([
      sanityClient.fetch(projectsQuery),
      sanityClient.fetch(servicesQuery),
      sanityClient.fetch(partnersQuery),
      sanityClient.fetch(imageWithTextQuery),
      sanityClient.fetch(clientLogosQuery),
      sanityClient.fetch(heroMediaQuery),
      sanityClient.fetch(missionQuery)
    ]);

    return json({ projects, services, partners, imageWithText, clientLogos, heroMedia, mission });
  } catch (error) {
    console.error('Error fetching data:', error);
    return json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
