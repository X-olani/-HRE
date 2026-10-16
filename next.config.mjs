/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // better-sqlite3 is a native module — keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3", "exceljs", "bcryptjs", "playwright", "playwright-core"],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "exceljs", "bcryptjs", "playwright", "playwright-core"],
    serverActions: {
      bodySizeLimit: "12mb"
    }
  }
};

export default nextConfig;
