import { createRequestHandler } from "@netlify/remix-adapter";
import * as build from "@remix-run/dev/server-build";

export const handler = createRequestHandler({
  build,
  // eslint-disable-next-line no-undef
  mode: process.env.NODE_ENV || "production",
});
