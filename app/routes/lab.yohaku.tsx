/**
 * LAB — 余白 (Yohaku / White Space)
 *
 * Autonomous kinetic poster. Dense brutalist editorial body copy (EN + JP)
 * about typography and negative space. Giant kanji are painted stroke-by-stroke
 * onto the canvas; the body text reflows around the ink silhouette in real-time
 * using pretext's variable-width line layout. When the ink dries, it fades and
 * the text fills back in. Then the next character appears.
 *
 * Characters: 活 → 字 → 余 → 白 (loop)
 * No interaction required — autonomous kinetic poster.
 */

import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@sanity/client";
import { ExperimentShell } from "~/routes/lab.$slug";
import type { Experiment } from "~/routes/lab";
import { lazy, Suspense } from "react";

const Yohaku = lazy(() => import("~/components/lab/yohaku/Yohaku"));

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
    route,
    songName,
    songFile { asset-> { url } }
  }`;

  const experiments = await sanityClient.fetch<Experiment[]>(experimentsQuery);
  const experiment = experiments.find((e) => e.slug === "yohaku") ?? {
    _id: "yohaku",
    title: "余白",
    slug: "yohaku",
    number: 3,
    description:
      "An autonomous kinetic poster. Giant kanji are painted onto a field of dense editorial text, which reflows around the ink in real-time. When the ink dries, the text returns.",
    scrollable: false,
  };

  return json({ experiment });
};

export default function YohakuRoute() {
  const { experiment } = useLoaderData<{ experiment: Experiment }>();

  return (
    <ExperimentShell experiment={experiment}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--color-bg, #DCCFBE)",
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
                background: "var(--color-bg, #DCCFBE)",
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
                余白...
              </span>
            </div>
          }
        >
          <Yohaku />
        </Suspense>
      </div>
    </ExperimentShell>
  );
}
