import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "专注番茄钟",
  description: "保持心流，适时休息，成就更多",
  manifest: "/manifest.json", // 👈 关键：添加这一行引用 PWA 配置
  appleWebApp: { // 👈 针对苹果设备的额外优化
    capable: true,
    statusBarStyle: "default",
    title: "专注番茄钟",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
