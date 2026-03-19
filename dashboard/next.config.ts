import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dashboardDir = path.dirname(__filename);

const nextConfig: NextConfig = {
  turbopack: {
    root: dashboardDir,
  },
};

export default nextConfig;
