import type { NextConfig } from "next";

// 모든 화면이 쿠키 게스트 세션을 읽는 개인화 화면이라 Cache Components는 쓰지 않는다
const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;
