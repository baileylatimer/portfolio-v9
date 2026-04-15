import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createClient } from "@sanity/client";
import type { Experiment } from "./lab";

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === "production",
  apiVersion: "2023-05-03",
});

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.experiment) {
    return [{ title: "Experiment | Latimer Design" }];
  }
  return [
    { title: `${data.experiment.title} | Lab | Latimer Design` },
    {
      name: "description",
      content: data.experiment.description ?? "An experiment by Latimer Design.",
    },
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  const slug = params.slug;

  const experimentsQuery = `*[_type == "experiment"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    number,
    description,
    thumbnail {
      asset-> {
        url
      }
    },
    tags,
    date,
    order,
    scrollable,
    route
  }`;

  const experiments = await sanityClient.fetch<Experiment[]>(experimentsQuery);
  const experiment = experiments.find((e) => e.slug === slug);

  if (!experiment) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ experiment, experiments });
};

/**
 * ExperimentShell wraps each experiment with:
 * - Full-screen or scrollable layout (based on `scrollable` field)
 * - A minimal back button overlay
 * - Passes children (the actual experiment content)
 */
export function ExperimentShell({
  experiment,
  children,
}: {
  experiment: Experiment;
  children: React.ReactNode;
}) {
  const isScrollable = experiment.scrollable ?? false;

  return (
    <div
      className={`experiment-shell relative ${
        isScrollable ? "min-h-screen" : "h-screen w-screen overflow-hidden"
      }`}
    >
      {/* Back button — always visible, minimal */}
      <Link
        to="/lab"
        className="fixed top-4 left-4 z-[9999] font-mono text-xs uppercase tracking-widest no-bullet-holes"
        style={{
          mixBlendMode: "difference",
          color: "white",
          pointerEvents: "auto",
        }}
      >
        ← LAB
      </Link>

      {/* Experiment number badge */}
      <div
        className="fixed top-4 right-4 z-[9999] font-mono text-xs opacity-40 no-bullet-holes"
        style={{ mixBlendMode: "difference", color: "white" }}
      >
        {String(experiment.number).padStart(3, "0")}
      </div>

      {/* Experiment content */}
      {children}
    </div>
  );
}

/**
 * Default export: renders the experiment by its slug.
 * Each experiment is a hardcoded route in app/routes/lab/[slug].tsx
 * that imports and uses ExperimentShell.
 *
 * This fallback renders a "coming soon" state for experiments
 * that exist in Sanity but don't have a route file yet.
 */
export default function LabSlug() {
  const { experiment } = useLoaderData<{ experiment: Experiment }>();

  return (
    <ExperimentShell experiment={experiment}>
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black">
        <p className="font-mono text-xs text-white/30 uppercase tracking-widest mb-4">
          {String(experiment.number).padStart(3, "0")}
        </p>
        <h1 className="font-mono text-2xl text-white uppercase tracking-tight mb-6">
          {experiment.title}
        </h1>
        {experiment.description && (
          <p className="font-mono text-sm text-white/50 max-w-sm text-center leading-relaxed">
            {experiment.description}
          </p>
        )}
        <p className="font-mono text-xs text-white/20 uppercase tracking-widest mt-12">
          Coming soon
        </p>
      </div>
    </ExperimentShell>
  );
}
