import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BizHub — Buy a Business. Build a Business. Sell a Business.",
    template: "%s · BizHub",
  },
  description:
    "Everything you need to start, buy, build and grow a business — businesses, patents and technologies, SaaS and digital assets, partners, experts and suppliers.",
  openGraph: {
    title: "BizHub",
    description:
      "Everything you need to start, buy, build and grow a business.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0f14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
