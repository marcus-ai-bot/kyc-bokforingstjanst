import type { Metadata } from "next";
import Image from "next/image";
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
      <body className="min-h-full bg-[#fafafa] text-[#1a1a2e]">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-[#e5e7eb] bg-white">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-8 lg:px-12">
              <Image
                src="/logo-bokforingstjanst.jpg"
                alt="Bokföringstjänst i Öjebyn AB"
                width={140}
                height={36}
                priority
              />
              <p className="text-right text-sm font-medium tracking-[0.08em] text-[#1a1a2e] uppercase">
                KYC Kundkännedom
              </p>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-[#e5e7eb] bg-white">
            <div className="mx-auto max-w-7xl px-6 py-4 text-sm text-[#1a1a2e]/70 sm:px-8 lg:px-12">
              Bokföringstjänst i Öjebyn AB | Kundkännedom enligt Lag (2017:630)
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
