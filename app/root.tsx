import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
// import styles from "~/styles/tailwind.css";

export function links() {
  return [
    // { rel: "stylesheet", href: styles }
  ];
}

export async function loader() {
  return json({
    ENV: {
      SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
      SANITY_DATASET: process.env.SANITY_DATASET,
    },
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
          }}
        />
      </body>
    </html>
  );
}
