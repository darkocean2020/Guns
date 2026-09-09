import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'HARBOR / ZERO — 东京港区',
  description: '东京港口俯视角搜打撤，搜索、交火、活着离港。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
