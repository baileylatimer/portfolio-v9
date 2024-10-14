import PageHero from '~/components/page-hero';

export const loader = async () => {
  // You can add any data fetching logic here if needed
  return {};
};

export default function About() {
  return (
    <div className="about-page">
      <PageHero imageSrc="/images/hero-rip.png" altText="Hero Rip" />
      {/* Add other sections here */}
    </div>
  );
}
