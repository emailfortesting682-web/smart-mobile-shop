import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Mobile Shop",
  description: "Online multi-branch mobile shop management platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
