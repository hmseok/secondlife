import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // 🐳 도커 배포 필수 설정

  // 1. 빌드 에러 무시 (TypeScript는 아직 여기서 지원합니다)
  typescript: {
    ignoreBuildErrors: true,
  },

  // 2. 업로드 용량 제한 해제
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // 3. 개발모드 인디케이터 비활성화 (좌측하단 떠다니는 N 아이콘)
  devIndicators: false,
};

export default nextConfig;