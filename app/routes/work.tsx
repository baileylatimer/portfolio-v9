import type { MetaFunction } from "@remix-run/node";
import PageHero from "~/components/page-hero";

export const meta: MetaFunction = () => {
  return [
    { title: "Work | Latimer Design" },
    { name: "description", content: "Explore our work at Latimer Design" },
  ];
};

export default function Work() {
  return (
    <div className="work-page">
      <PageHero
        desktopImageSrc="/images/hero-rip.png"
        mobileImageSrc="/images/hero-rip--mobile.png"
        altText="Our Work Hero Image"
      />
      {/* Add more content here in future tasks */}
    </div>
  );
}
