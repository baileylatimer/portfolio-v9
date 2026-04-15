import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { createClient } from "@sanity/client";
import { useEffect, useRef, useState } from "react";
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
    route,
    songName,
    songFile {
      asset-> {
        url
      }
    }
  }`;

  const experiments = await sanityClient.fetch<Experiment[]>(experimentsQuery);
  const experiment = experiments.find((e) => e.slug === slug);

  if (!experiment) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ experiment, experiments });
};

// ─── Music Player ─────────────────────────────────────────────────────────────

function MusicPlayer({
  songName,
  songUrl,
}: {
  songName: string;
  songUrl: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Format display: "Midnight Drive" → "MIDNIGHT_DRIVE.MP3"
  const displayName =
    songName.toUpperCase().replace(/\s+/g, "_") + ".MP3";

  useEffect(() => {
    const audio = new Audio(songUrl);
    audio.loop = true;
    audioRef.current = audio;

    // Attempt autoplay
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Autoplay blocked — user must interact first
        setIsPlaying(false);
      });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [songUrl]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 no-bullet-holes color-bg"
      style={{
        fontFamily: "'Neue Montreal', sans-serif",
        fontSize: "11px",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
      aria-label={isPlaying ? "Pause music" : "Play music"}
    >
      <span className="text-xs uppercase tracking-widest">
        {displayName}
      </span>
      {/* Play / Pause icon */}
      {isPlaying ? (
        // Pause: two vertical bars
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="3" height="12" fill="var(--color-bg)" />
          <rect x="7" y="0" width="3" height="12" fill="var(--color-bg)" />
        </svg>
      ) : (
        // Play: triangle
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="0,0 10,6 0,12" fill="var(--color-bg)" />
        </svg>
      )}
    </button>
  );
}

/**
 * ExperimentShell wraps each experiment with:
 * - Full-screen or scrollable layout (based on `scrollable` field)
 * - A minimal back button overlay
 * - Optional music player (if experiment has songName + songFile)
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
  const hasSong = !!(experiment.songName && experiment.songFile?.asset?.url);

  return (
    <div
      className={`experiment-shell relative ${
        isScrollable ? "min-h-screen" : "h-screen w-screen overflow-hidden"
      }`}
    >
      {/* Back button — always visible, minimal */}
      <Link
        to="/lab"
        className="fixed top-4 left-4 z-[9999] uppercase tracking-widest no-bullet-holes color-bg"
        style={{
          fontFamily: "'Neue Montreal', sans-serif",
          fontSize: "11px",
          pointerEvents: "auto",
        }}
      >
        ← LAB
      </Link>

      {/* Music player — centered, only if song is set */}
      {hasSong && (
        <MusicPlayer
          songName={experiment.songName!}
          songUrl={experiment.songFile!.asset.url}
        />
      )}

      {/* Experiment number badge */}
      <div
        className="fixed top-4 right-4 z-[9999] no-bullet-holes color-bg"
        style={{ fontFamily: "'Neue Montreal', sans-serif", fontSize: "11px" }}
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
