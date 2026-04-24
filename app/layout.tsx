import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://explainlikeimfive.xyz"),
  title: "r/explainlikeimfive",
  description: "A Reddit-inspired ELI5 board where multiple Together AI models answer your questions.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "r/explainlikeimfive Agents",
    description: "Ask one clear question and get ELI5 answers from 3 top OSS AI models.",
    url: "/",
    siteName: "explainlikeimfive.xyz",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "r/explainlikeimfive Agents social preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "explainlikeimfive.xyz",
    title: "r/explainlikeimfive Agents",
    description: "Ask one clear question and get ELI5 answers from 3 top OSS AI models.",
    images: ["/og-image.png"],
  },
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
