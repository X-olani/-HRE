/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["exceljs", "bcryptjs", "playwright", "playwright-core"],
    serverActions: {
      bodySizeLimit: "12mb"
    }
  }
};

export default nextConfig;
