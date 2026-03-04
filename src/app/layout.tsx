import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Header } from "./components/Header";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sport Club Points",
  description: "Manage points and view leaderboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${exo2.variable}`}>
      <body className="min-h-screen font-body">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
