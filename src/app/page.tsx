import Image from "next/image";

import { UploadDashboard } from "@/components/upload-dashboard";

export default function Home() {
  return (
    <main className="flex-1 bg-[radial-gradient(circle_at_top,#eff6ff_0%,#f5f7fb_38%,#f8fafc_100%)] px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,255,255,0.84))] p-8 shadow-[0_35px_120px_rgba(15,23,42,0.12)] sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200">
                  <Image
                    src="/logo-bokforingstjanst.jpg"
                    alt="Bokföringstjänst AB"
                    width={180}
                    height={48}
                    priority
                  />
                </div>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  KYC Automation
                </span>
              </div>

              <h1 className="mt-8 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-5xl">
                Kundkännedom enligt Lag (2017:630), paketerad för snabb
                handläggning.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
                Ladda upp en kundlista, matcha organisationsnummer mot mockad
                SCB-data och öppna färdiga KYC-rapporter med branschspecifika
                texter från byråns mallbibliotek.
              </p>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-zinc-200 bg-white/80 p-5 text-sm text-zinc-600 sm:grid-cols-3 lg:min-w-[420px]">
              <div>
                <p className="text-2xl font-semibold text-zinc-950">17</p>
                <p>Branschmallar</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950">6</p>
                <p>KYC-sektioner per bolag</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950">PDF</p>
                <p>Export för arkivering</p>
              </div>
            </div>
          </div>
        </section>

        <UploadDashboard />
      </div>
    </main>
  );
}
