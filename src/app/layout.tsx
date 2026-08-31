import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Flashpoint Photography Club | UIUC",
  description:
    "Flashpoint Photography Club at UIUC — workshops, excursions, socials, and collabs. $20/year membership. Join our community of photographers.",
  metadataBase: new URL("https://flashpointuiuc.com"),
  openGraph: {
    title: "Flashpoint Photography Club | UIUC",
    description:
      "Workshops, excursions, socials, and collabs for photographers of every skill level at the University of Illinois.",
    url: "https://flashpointuiuc.com",
    siteName: "Flashpoint Photography Club",
    images: [{ url: "/logo.webp", width: 480, height: 140, alt: "Flashpoint Photography Club" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flashpoint Photography Club | UIUC",
    description:
      "Workshops, excursions, socials, and collabs for photographers of every skill level.",
    images: ["/logo.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full font-body">
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
