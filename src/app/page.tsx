import { UploadDashboard } from "@/components/upload-dashboard";

export default function Home() {
  return (
    <main className="px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[#e5e7eb] pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2d5aa0]">
              Kundkännedom
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#1a1a2e] sm:text-4xl">
              Professionell handläggning av KYC-underlag och branschbedömning.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#1a1a2e]/70">
              Sök ett bolag via SCB, skapa generell branschrapport från SNI-kod
              eller behandla kundlista via CSV och Excel. Samma mallar,
              risknivåer och PDF-export används i hela flödet.
            </p>
            <a
              href="/kyc"
              className="mt-6 inline-flex border border-[#2d5aa0] bg-[#2d5aa0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#244a83]"
            >
              Interaktiv KYC-arbetsyta →
            </a>
          </div>
        </section>
        <UploadDashboard />
      </div>
    </main>
  );
}
