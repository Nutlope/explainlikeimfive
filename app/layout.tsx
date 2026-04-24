import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "r/explainlikeim5",
  description: "A Reddit-inspired ELI5 board where multiple Together AI models answer your questions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
