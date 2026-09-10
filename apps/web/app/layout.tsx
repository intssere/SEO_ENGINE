import type { ReactNode } from "react";

export const metadata = {
  title: "SEO Engine",
  description: "AI-native SEO, AIO, and GEO optimization platform",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f7f8fb", color: "#121826" }}>{children}</body>
    </html>
  );
}
