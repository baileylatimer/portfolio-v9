import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Outlet, useLocation, Link } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useState, useRef } from "react";
import { createClient } from "@sanity/client";
import PixelizeImage, { PixelizeImageRef } from "~/components/PixelizeImage";
import ScrambleText from "~/components/ScrambleText";
import PageHero from "~/components/page-hero";

export const meta: MetaFunction = () => {
  return [
    { title: "Lab | Latimer Design" },
    {
      name: "description",
      content:
        "Experiments, explorations, and creative code by Latimer Design.",
    },
  ];
};

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: process.env.NODE_ENV === "production",
  apiVersion: "2023-05-03",
});

export interface Experiment {
  _id: string;
  title: string;
  slug: string;
  number: number;
  description?: string;
  thumbnail?: {
    asset: {
      url: string;
    };
  };
  tags?: string[];
  date?: string;
  order?: number;
  scrollable?: boolean;
  route?: string;
  songName?: string;
  songFile?: {
    asset: {
      url: string;
    };
  };
}

export const loader: LoaderFunction = async () => {
  try {
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
    return json({ experiments });
  } catch (error) {
    console.error("Error fetching experiments:", error);
    return json({ error: "Failed to fetch experiments" }, { status: 500 });
  }
};

// ─── Grid View ───────────────────────────────────────────────────────────────

function ExperimentGrid({ experiments }: { experiments: Experiment[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {experiments.map((experiment) => (
        <Link
          key={experiment._id}
          to={`/lab/${experiment.slug}`}
          className="group relative block overflow-hidden"
        >
          {/* Thumbnail */}
          <div className="aspect-square relative overflow-hidden bg-black/10">
            {experiment.thumbnail?.asset?.url ? (
              <PixelizeImage
                src={experiment.thumbnail.asset.url}
                alt={experiment.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/20">
                <span className="font-mono text-xs opacity-40 color-contrast">
                  {String(experiment.number).padStart(3, "0")}
                </span>
              </div>
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
              <span className="font-mono text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 uppercase tracking-widest">
                VIEW →
              </span>
            </div>
          </div>

          {/* Meta below image */}
          <div className="pt-2 pb-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs color-contrast opacity-50">
                {String(experiment.number).padStart(3, "0")}
              </span>
              {experiment.tags && experiment.tags.length > 0 && (
                <span className="font-mono text-xs color-contrast opacity-40 truncate text-right">
                  [{experiment.tags[0]}]
                </span>
              )}
            </div>
            <h3 className="font-mono text-sm uppercase color-contrast mt-0.5 leading-tight">
              {experiment.title}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ExperimentList({ experiments }: { experiments: Experiment[] }) {
  const [hoveredExperiment, setHoveredExperiment] =
    useState<Experiment | null>(null);
  const [pixelizeKey, setPixelizeKey] = useState(0);
  const pixelizeRef = useRef<PixelizeImageRef>(null);

  const extractYear = (dateString: string): string => {
    return new Date(dateString).getFullYear().toString();
  };

  const handleHover = (experiment: Experiment) => {
    setHoveredExperiment(experiment);
    const newKey = pixelizeKey + 1;
    setPixelizeKey(newKey);
    setTimeout(() => {
      if (pixelizeRef.current) {
        pixelizeRef.current.triggerDepixelize();
      }
    }, 200);
  };

  const handleLeave = () => {
    setHoveredExperiment(null);
  };

  return (
    <div className="relative">
      {/* Mobile Layout */}
      <div className="block md:hidden">
        <div className="space-y-0">
          {experiments.map((experiment, index) => (
            <Link
              key={experiment._id}
              to={`/lab/${experiment.slug}`}
              className="block py-3 focus:outline-none"
              style={
                index < experiments.length - 1
                  ? { borderBottom: "1px solid var(--color-contrast-higher)" }
                  : undefined
              }
            >
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1">
                  <span className="font-mono text-xs color-contrast opacity-50">
                    {String(experiment.number).padStart(3, "0")}
                  </span>
                </div>
                <div className="col-span-5">
                  <span className="text-xs uppercase color-contrast">
                    {experiment.title}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs color-contrast opacity-60">
                    {experiment.date ? extractYear(experiment.date) : "—"}
                  </span>
                </div>
                <div className="col-span-4 text-right">
                  {experiment.tags?.slice(0, 1).map((tag, i) => (
                    <span key={i} className="text-xs uppercase color-contrast opacity-60">
                      [{tag}]
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block relative">
        {/* Projects list offset to make room for image */}
        <div className="space-y-0 ml-[300px]">
          {experiments.map((experiment, index) => (
            <Link
              key={experiment._id}
              to={`/lab/${experiment.slug}`}
              className="block py-3 transition-all duration-150 focus:outline-none"
              onMouseEnter={() => handleHover(experiment)}
              onMouseLeave={handleLeave}
              style={
                index < experiments.length - 1
                  ? { borderBottom: "1px solid var(--color-contrast-higher)" }
                  : undefined
              }
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Number */}
                <div className="col-span-1">
                  <span
                    className={`inline-block px-1 font-mono text-sm transition-all duration-150 ${
                      hoveredExperiment?._id === experiment._id
                        ? "color-bg"
                        : "color-contrast opacity-50"
                    }`}
                    style={
                      hoveredExperiment?._id === experiment._id
                        ? { backgroundColor: "var(--color-contrast-higher)" }
                        : undefined
                    }
                  >
                    {String(experiment.number).padStart(3, "0")}
                  </span>
                </div>

                {/* Title */}
                <div className="col-span-5">
                  <span
                    className={`inline-block px-2 text-base uppercase transition-all duration-150 ${
                      hoveredExperiment?._id === experiment._id
                        ? "color-bg"
                        : "color-contrast"
                    }`}
                    style={
                      hoveredExperiment?._id === experiment._id
                        ? { backgroundColor: "var(--color-contrast-higher)" }
                        : undefined
                    }
                  >
                    <ScrambleText
                      isActive={hoveredExperiment?._id === experiment._id}
                    >
                      {experiment.title}
                    </ScrambleText>
                  </span>
                </div>

                {/* Year */}
                <div className="col-span-2">
                  <span
                    className={`inline-block px-2 text-base transition-all duration-150 ${
                      hoveredExperiment?._id === experiment._id
                        ? "color-bg"
                        : "color-contrast"
                    }`}
                    style={
                      hoveredExperiment?._id === experiment._id
                        ? { backgroundColor: "var(--color-contrast-higher)" }
                        : undefined
                    }
                  >
                    <ScrambleText
                      isActive={hoveredExperiment?._id === experiment._id}
                    >
                      {experiment.date ? extractYear(experiment.date) : "—"}
                    </ScrambleText>
                  </span>
                </div>

                {/* Tags */}
                <div className="col-span-4 text-right">
                  <span
                    className={`inline-block px-2 transition-all duration-150 ${
                      hoveredExperiment?._id === experiment._id
                        ? "color-bg"
                        : "color-contrast"
                    }`}
                    style={
                      hoveredExperiment?._id === experiment._id
                        ? { backgroundColor: "var(--color-contrast-higher)" }
                        : undefined
                    }
                  >
                    {experiment.tags?.map((tag, i) => (
                      <span key={i} className="text-sm uppercase">
                        <ScrambleText
                          isActive={hoveredExperiment?._id === experiment._id}
                        >
                          [{tag}]
                        </ScrambleText>
                        {i < (experiment.tags?.length ?? 0) - 1 ? " " : ""}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Hover image — bottom left */}
        <div className="absolute bottom-0 left-0 w-[245px] h-[245px] bg-transparent pointer-events-none">
          {hoveredExperiment?.thumbnail?.asset?.url ? (
            <PixelizeImage
              key={pixelizeKey}
              ref={pixelizeRef}
              src={hoveredExperiment.thumbnail.asset.url}
              alt={hoveredExperiment.title}
              className="w-full h-full object-cover"
              manualTrigger={true}
              disableEffect={false}
              duration={0.1}
            />
          ) : (
            <div className="w-full h-full bg-transparent" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Lab Page ────────────────────────────────────────────────────────────

export default function Lab() {
  const { experiments } = useLoaderData<{ experiments: Experiment[] }>();
  const location = useLocation();
  const [view, setView] = useState<"grid" | "list">("grid");

  const isMainLabPage = location.pathname === "/lab";

  return (
    <div className="lab-page">
      {isMainLabPage ? (
        <>
          <PageHero
            desktopImageSrc="/images/hero-rip.png"
            mobileImageSrc="/images/hero-rip--mobile.png"
            altText="Lab Hero Image"
          />
          <div className="mx-auto px-2 pt-6 pb-12 lg:py-12">
            {/* Header row */}
            <div className="px-d mx-auto flex justify-between items-center mb-6">
              <div>
                <h1 className="font-mono text-xs uppercase color-contrast opacity-60 tracking-widest">
                  LAB — {experiments?.length ?? 0} EXPERIMENTS
                </h1>
              </div>

              {/* Grid / List toggle */}
              <div className="flex items-center gap-3 no-bullet-holes">
                <button
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  className={`transition-opacity duration-150 ${
                    view === "grid" ? "opacity-100" : "opacity-30 hover:opacity-60"
                  }`}
                >
                  {/* Grid icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="1"
                      y="1"
                      width="6"
                      height="6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="11"
                      y="1"
                      width="6"
                      height="6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="1"
                      y="11"
                      width="6"
                      height="6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="11"
                      y="11"
                      width="6"
                      height="6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => setView("list")}
                  aria-label="List view"
                  className={`transition-opacity duration-150 ${
                    view === "list" ? "opacity-100" : "opacity-30 hover:opacity-60"
                  }`}
                >
                  {/* List icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="1"
                      y1="4"
                      x2="17"
                      y2="4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="1"
                      y1="9"
                      x2="17"
                      y2="9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="1"
                      y1="14"
                      x2="17"
                      y2="14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            {!experiments || experiments.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-mono text-sm color-contrast opacity-40 uppercase tracking-widest">
                  Experiments loading...
                </p>
              </div>
            ) : view === "grid" ? (
              <ExperimentGrid experiments={experiments} />
            ) : (
              <ExperimentList experiments={experiments} />
            )}
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
