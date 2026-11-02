import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything this app does - picks in localStorage, schedule and odds from
  // ESPN - happens in the browser, so it exports as plain files for any static
  // host. `pnpm build` writes them to `out/`.
  output: "export",
  // The static export has no server to resize images, and the only ones here
  // are the local team logos in /public/teams.
  images: { unoptimized: true },
};

export default nextConfig;
