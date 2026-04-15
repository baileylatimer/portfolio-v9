/**
 * LAB — 001: Placeholder
 *
 * This is the template/proof-of-concept experiment.
 * Replace this with your first real experiment design.
 *
 * To create a new experiment:
 * 1. Duplicate this file and rename it (e.g. "lab.kinetic-type.tsx")
 * 2. Add a matching document in Sanity with the same slug
 * 3. Build your experiment inside <ExperimentShell>
 * 4. Each experiment has its own CSS module for isolated styles
 */

import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@sanity/client";
import { ExperimentShell } from "~/routes/lab.$slug";
import type { Experiment } from "~/routes/lab";
import { useEffect, useRef } from "react";

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
    route
  }`;

  const experiments = await sanityClient.fetch<Experiment[]>(experimentsQuery);
  const experiment = experiments.find((e) => e.slug === "001-placeholder") ?? {
    _id: "placeholder",
    title: "Placeholder",
    slug: "001-placeholder",
    number: 1,
    description: "The first experiment. Replace this with something wild.",
    scrollable: false,
  };

  return json({ experiment });
};

export default function Experiment001() {
  const { experiment } = useLoaderData<{ experiment: Experiment }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple animated canvas — proof of concept for isolated experiment rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      // Draw animated grid of dots
      const cols = 40;
      const rows = 25;
      const cellW = w / cols;
      const cellH = h / rows;

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const dist = Math.sqrt(
            Math.pow(x - cols / 2, 2) + Math.pow(y - rows / 2, 2)
          );
          const wave = Math.sin(dist * 0.4 - t * 0.05) * 0.5 + 0.5;
          const size = wave * cellW * 0.35;
          const opacity = wave * 0.8 + 0.1;

          ctx.beginPath();
          ctx.arc(
            x * cellW + cellW / 2,
            y * cellH + cellH / 2,
            size,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.fill();
        }
      }

      // Label
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.textAlign = "center";
      ctx.fillText("001 — PLACEHOLDER", w / 2, h / 2);
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillText("REPLACE WITH YOUR FIRST EXPERIMENT", w / 2, h / 2 + 20);

      t++;
      animId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <ExperimentShell experiment={experiment}>
      {/* Isolated styles — no western theme, no global fonts */}
      <style>{`
        .exp-001 {
          background: #000;
          font-family: monospace;
        }
      `}</style>

      <div className="exp-001 w-full h-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: "block" }}
        />
      </div>
    </ExperimentShell>
  );
}
