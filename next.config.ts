import type { NextConfig } from "next";

// 모든 화면이 쿠키 게스트 세션을 읽는 개인화 화면이라 Cache Components는 쓰지 않는다
const nextConfig: NextConfig = {
  devIndicators: false,
  // 실제 폰의 앱 껍데기가 맥의 IP(예: 192.168.0.10)로 개발 서버를 열 때 개발용 파일 요청을 허용한다. 쉼표로 여러 개
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? "").split(",").map((h) => h.trim()).filter(Boolean),
};

export default nextConfig;
