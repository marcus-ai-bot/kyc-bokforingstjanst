import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buildKycReport, getRiskClasses } from "@/lib/kyc";

export default async function RapportPage({
  params,
}: {
  params: Promise<{ orgnr: string }>;
}) {
  const { orgnr } = await params;
  const report = buildKycReport(orgnr);

  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Till startsidan
          </Link>
          <a
            href={`/api/pdf/${report.organisationsnummer}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Exportera PDF
          </a>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div className="border-b border-zinc-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] px-8 py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
                  <Image
                    src="/logo-bokforingstjanst.jpg"
                    alt="Bokföringstjänst AB"
                    width={190}
                    height={50}
                    priority
                  />
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
                  Kundkännedom enligt Lag (2017:630)
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
                  {report.bolagsnamn}
                </h1>
                <p className="mt-2 text-base text-zinc-600">
                  {report.organisationsnummer}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <span
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${getRiskClasses(report.riskniva)}`}
                >
                  {report.riskniva}
                </span>
                <p className="text-sm text-zinc-500">
                  Bedömd {report.bedomningsdatum}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="SNI-kod" value={`${report.sniKod} • ${report.sniBeskrivning}`} />
              <InfoCard label="Branschmall" value={report.branschNamn} />
              <InfoCard label="Adress" value={report.adress} />
              <InfoCard
                label="Bolagsdata"
                value={`${report.juridiskForm} • ${report.anstallda} anställda`}
              />
            </div>
          </div>

          <div className="grid gap-5 px-8 py-8">
            {report.sections.map((section) => (
              <article
                key={section.id}
                className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-6"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Fråga {section.id}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                      {section.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm text-zinc-500 ring-1 ring-zinc-200">
                    {section.lagrum}
                  </span>
                </div>
                <p className="mt-5 max-w-none text-[15px] leading-7 text-zinc-700">
                  {section.text}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-zinc-200 bg-white/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{value}</p>
    </div>
  );
}
