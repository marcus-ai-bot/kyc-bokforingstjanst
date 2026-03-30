import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buildKycReport, getRiskClasses } from "@/lib/kyc";
import { type ScbCompany } from "@/lib/scb-types";
import { getServerBaseUrl } from "@/lib/server-base-url";

export default async function RapportPage({
  params,
}: {
  params: Promise<{ orgnr: string }>;
}) {
  const { orgnr } = await params;
  const baseUrl = await getServerBaseUrl();
  const response = await fetch(`${baseUrl}/api/scb/${encodeURIComponent(orgnr)}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return (
      <main className="px-6 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl border border-[#e5e7eb] bg-white p-8">
          <Link
            href="/"
            className="inline-flex border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] transition hover:bg-[#fafafa]"
          >
            Till startsidan
          </Link>
          <h1 className="mt-8 text-3xl font-semibold tracking-[-0.02em] text-[#1a1a2e]">
            Bolaget hittades inte
          </h1>
          <p className="mt-4 text-base leading-7 text-[#1a1a2e]/70">
            SCB returnerade inget resultat för organisationsnumret {orgnr}.
          </p>
        </div>
      </main>
    );
  }

  if (!response.ok) {
    notFound();
  }

  const company = (await response.json()) as ScbCompany;
  const report = await buildKycReport(company);

  if (!report) {
    notFound();
  }

  return (
    <main className="px-6 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] transition hover:bg-[#fafafa]"
          >
            Till startsidan
          </Link>
          <a
            href={`/api/pdf/${report.organisationsnummer}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex border border-[#2d5aa0] bg-[#2d5aa0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244a83]"
          >
            Exportera PDF
          </a>
        </div>

        <section className="overflow-hidden border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#e5e7eb] px-8 py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div>
                  <Image
                    src="/logo-bokforingstjanst.jpg"
                    alt="Bokföringstjänst AB"
                    width={150}
                    height={40}
                    priority
                  />
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
                  Kundkännedom enligt Lag (2017:630)
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#1a1a2e]">
                  {report.bolagsnamn}
                </h1>
                <p className="mt-2 text-base text-[#1a1a2e]/70">
                  {report.organisationsnummer}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 text-sm font-semibold ${getRiskClasses(report.riskniva)}`}
                >
                  {report.riskniva}
                </span>
                <p className="text-sm text-[#1a1a2e]/55">
                  Bedömd {report.bedomningsdatum}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-px bg-[#e5e7eb] md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="SNI-kod" value={`${report.sniKod} • ${report.sniBeskrivning}`} />
              <InfoCard label="Branschmall" value={report.branschNamn} />
              <InfoCard label="Adress" value={report.adress} />
              <InfoCard
                label="Bolagsdata"
                value={`${report.juridiskForm} • ${report.anstallda}`}
              />
            </div>
          </div>

          <div className="px-8 py-2">
            {report.sections.map((section) => (
              <article
                key={section.id}
                className="border-t border-[#e5e7eb] py-6 first:border-t-0"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
                      Fråga {section.id}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-[#1a1a2e]">
                      {section.title}
                    </h2>
                  </div>
                  <span className="border border-[#e5e7eb] px-2.5 py-1 text-sm text-[#1a1a2e]/60">
                    {section.lagrum}
                  </span>
                </div>
                <p className="mt-5 max-w-none text-[15px] leading-7 text-[#1a1a2e]/78">
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
    <div className="bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#1a1a2e]/78">{value}</p>
    </div>
  );
}
