/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type checking is done separately via `tsc --noEmit`
    ignoreBuildErrors: true,
  },
  eslint: {
    // Linting is done separately via `next lint`
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
