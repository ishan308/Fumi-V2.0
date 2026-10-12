import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Baloo_2 } from "next/font/google";
import "./globals.css";

const displayFont = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// A bold, rounded, kid-friendly display face — used only for each game's
// hero wordmark on its carved-wood title banner (not general UI text).
// Replaces an earlier cursive script to match the reference app's own
// title treatment.
const titleFont = Baloo_2({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FUMI",
  description: "FUMI — your child's digital mentor.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07061C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${titleFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
