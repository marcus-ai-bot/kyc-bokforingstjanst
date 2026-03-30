import { Suspense } from "react";
import { KycArbetsyta } from "@/components/kyc-arbetsyta";
import Image from "next/image";

export default function KycPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-[#e5e7eb] pb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-bokforingstjanst.jpg"
              alt="Bokföringstjänst AB"
              width={130}
              height={35}
              priority
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-[#1a1a2e]">
                Kundkännedom
              </h1>
              <p className="text-xs text-[#1a1a2e]/55">
                Lag (2017:630) om åtgärder mot penningtvätt
              </p>
            </div>
          </div>
          <a
            href="/"
            className="border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1a1a2e] hover:bg-[#fafafa]"
          >
            Tillbaka
          </a>
        </header>

        <Suspense fallback={<div className="mt-8 text-sm text-[#1a1a2e]/60">Laddar...</div>}>
          <KycArbetsyta />
        </Suspense>
      </div>
    </main>
  );
}
