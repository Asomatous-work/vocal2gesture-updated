/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost', 'your-deployed-backend-domain.com'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/python/:path*',
        destination: process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL + '/:path*',
      },
    ];
  },
};

export default nextConfig;
