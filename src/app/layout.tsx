import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SME 운동 관리 - 출석 체크",
  description: "오늘의 운동을 기록하고 습관을 만드세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
