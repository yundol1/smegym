import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workout - Attendance Tracking",
  description: "Track your daily workout attendance with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
