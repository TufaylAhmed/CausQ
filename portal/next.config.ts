import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for cPanel / Passenger (Node.js app) hosting.
  output: "standalone",
};

export default nextConfig;
