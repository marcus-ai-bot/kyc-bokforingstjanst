import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KYC Kundkännedom | Bokföringstjänst AB",
  description: "Automatiserad kundkännedom med branschmallar och PDF-export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-950">{children}</body>
    </html>
  );
}
