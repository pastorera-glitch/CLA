import type { NextConfig } from "next";

/**
 * The app is a fully client-side tool: the calculation engine runs in the
 * browser and evaluations persist to localStorage, so there is nothing for a
 * server to do. It is therefore exported as static HTML and can be hosted on
 * any static host (GitHub Pages, S3, Netlify drop, Cloudflare Pages).
 *
 * BASE_PATH is for hosts that serve the site from a subdirectory — GitHub
 * Pages project sites live at /<repo>. Leave it unset for a root deployment.
 */
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  // Emits `about/index.html` rather than `about.html`, which every static host
  // serves correctly without custom rewrite rules.
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
