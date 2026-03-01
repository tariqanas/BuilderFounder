import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT Sniper",
  description: "Premium mission radar for freelance IT experts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
