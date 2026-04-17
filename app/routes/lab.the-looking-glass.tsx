/**
 * LAB — The Looking Glass
 *
 * Single portrait image → faceted grid overlay → moving reveal square → page curl.
 * Built with Three.js + GSAP. No video, no ML, no DOM sync issues.
 *
 * Assets:
 *   public/images/lab/the-looking-glass/portrait.jpg
 *
 * To swap the portrait: replace the image file above.
 * To tune the effect: edit app/components/lab/looking-glass/config.ts
 */

import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@sanity/client";
import { ExperimentShell } from "~/routes/lab.$slug";
import type { Experiment } from "~/routes/lab";
import { lazy, Suspense } from "react";
import { IMAGE_SRC } from "~/components/lab/looking-glass/config";

// Lazy-load the Three.js component — keeps the route bundle lean
const LookingGlass = lazy(
  () => import("~/components/lab/looking-glass/LookingGlass")
);

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === "production",
  apiVersion: "2023-05-03",
});

export const loader: LoaderFunction = async () => {
  const experimentsQuery = `*[_type == "experiment"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    number,
    description,
    thumbnail { asset-> { url } },
    tags,
    date,
    order,
    scrollable,
    uiTheme,
    route,
    songName,
    songFile { asset-> { url } }
  }`;

  const experiments = await sanityClient.fetch<Experiment[]>(experimentsQuery);
  const experiment = experiments.find(
    (e) => e.slug === "the-looking-glass"
  ) ?? {
    _id: "the-looking-glass",
    title: "The Looking Glass",
    slug: "the-looking-glass",
    number: 2,
    description:
      "A single portrait seen through a faceted grid. A moving window reveals what lies beneath.",
    scrollable: false,
  };

  return json({ experiment });
};

export default function TheLookingGlass() {
  const { experiment } = useLoaderData<{ experiment: Experiment }>();

  return (
    <ExperimentShell experiment={experiment}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#d1cbc0",
          overflow: "hidden",
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#d1cbc0",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: "rgba(0,0,0,0.3)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Loading...
              </span>
            </div>
          }
        >
          <LookingGlass imageSrc={IMAGE_SRC} />
        </Suspense>
      </div>
    </ExperimentShell>
  );
}
