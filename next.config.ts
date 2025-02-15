import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 정적 파일 제공 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
  
  // FastAPI 서버로의 프록시 설정
  async rewrites() {
    return [
      {
        source: '/api/python/:path*',
        destination: 'http://localhost:8001/:path*',
      },
    ];
  },
};

export default nextConfig;
