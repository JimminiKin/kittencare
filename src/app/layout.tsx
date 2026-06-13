import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Easy Kitty Care",
  description: "Track health and care for foster kittens",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Easy Kitty Care",
  },
  openGraph: {
    title: "Easy Kitty Care",
    description: "Track health and care for foster kittens",
    siteName: "Easy Kitty Care",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Easy Kitty Care",
    description: "Track health and care for foster kittens",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
