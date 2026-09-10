import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "SEO ENGINE — AI SEO Command Center",
  description: "AI-native SEO, AIO, GEO optimization, verification, experiments and learning",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
