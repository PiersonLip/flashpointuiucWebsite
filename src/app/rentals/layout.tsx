import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Flashpoint Equipment Rentals",
  description:
    "Borrow camera bodies and kits from Flashpoint Photography Club at UIUC.",
  metadataBase: new URL("https://rentals.flashpointuiuc.com"),
};

export default function RentalsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="rental-app sky">
      <div className="sky-stars" aria-hidden />
      <SiteNav />
      {children}
    </div>
  );
}
