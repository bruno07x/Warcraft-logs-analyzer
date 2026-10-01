import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.rpglogs.com",
        pathname: "/img/warcraft/abilities/**",
      },
    ],
  },
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
