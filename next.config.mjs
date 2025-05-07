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
  // Only add rewrites if the backend URL is defined
  async rewrites() {
    if (!process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 
        process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL === 'vercel') {
      return [];
    }
    
    return [
      {
        source: '/api/python/:path*',
        destination: `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
