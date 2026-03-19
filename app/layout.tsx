import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Nanum_Myeongjo, Plus_Jakarta_Sans } from "next/font/google";

import "@/app/globals.css";

import { DiaryProvider } from "@/components/diary-provider";
import { PWAProvider } from "@/components/pwa-provider";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

const fontHeadline = Nanum_Myeongjo({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-headline"
});

export const metadata: Metadata = {
  title: {
    default: "Yumoo",
    template: "%s • Yumoo"
  },
  description: "A cute, visual food diary that turns meal tracking into a soft little monthly keepsake.",
  applicationName: "Yumoo",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yumoo"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFF1DA"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable} ${fontHeadline.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <DiaryProvider>
          <PWAProvider />
          {children}
        </DiaryProvider>
      </body>
    </html>
  );
}
