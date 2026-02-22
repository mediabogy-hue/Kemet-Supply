/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is a workaround for a known issue in Next.js with webpack's file-based cache
  // causing "ENOENT" errors in development. Disabling it for dev stabilizes the server.
  // This does not affect production builds.
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // In development on the client, disable the filesystem cache.
      config.cache = false;
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "files.easy-orders.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.taager.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.amazon.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
