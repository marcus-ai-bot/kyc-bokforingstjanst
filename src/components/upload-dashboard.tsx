"use client";

import Link from "next/link";
import { useState } from "react";
import * as XLSX from "xlsx";

import {
  buildGeneriskBranschrapport,
  buildKycReport,
  getRiskClasses,
  type KycReport,
} from "@/lib/kyc";
import { normaliseraOrgnr } from "@/lib/orgnr";
import { type ScbCompany } from "@/lib/scb-types";

interface BatchCompany {
  organisationsnummer: string;
  bolagsnamn: string;
  riskniva?: KycReport["riskniva"];
  branschNamn?: string;
  sniKod?: string;
  status: "matchad" | "saknas" | "fel";
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRows(fileName: string, data: ArrayBuffer) {
  const workbook = XLSX.read(data, {
    type: "array",
    raw: false,
    codepage: 65001,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  }).map((row) => {
    const entries = Object.entries(row).map(([key, value]) => [
      normalizeHeader(key),
      value,
    ]);
    const normalizedRow = Object.fromEntries(entries);

    return {
      organisationsnummer:
        normaliseraOrgnr(
          String(
            normalizedRow.organisationsnummer ??
              normalizedRow.orgnr ??
              normalizedRow.organizationnumber ??
              "",
          ),
        ) ?? "",
      bolagsnamn: String(normalizedRow.bolagsnamn ?? normalizedRow.namn ?? ""),
      _source: fileName,
    };
  });
}

async function fetchScbCompany(orgnr: string) {
  const response = await fetch(`/api/scb/${encodeURIComponent(orgnr)}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "SCB-uppslag misslyckades");
  }

  return (await response.json()) as ScbCompany;
}

function ReportPreview({
  report,
  pdfHref,
  reportHref,
}: {
  report: KycReport;
  pdfHref: string;
  reportHref?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Rapport
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {report.bolagsnamn}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {report.organisationsnummer}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${getRiskClasses(report.riskniva)}`}
          >
            {report.riskniva}
          </span>
          {reportHref ? (
            <Link
              href={reportHref}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Öppna rapport
            </Link>
          ) : null}
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Ladda ner PDF
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="SNI-kod" value={`${report.sniKod} • ${report.sniBeskrivning}`} />
        <InfoCard label="Branschmall" value={report.branschNamn} />
        <InfoCard label="Adress" value={report.adress} />
        <InfoCard
          label="Bolagsdata"
          value={`${report.juridiskForm} • ${report.anstallda}`}
        />
      </div>

      <div className="mt-6 grid gap-4">
        {report.sections.map((section) => (
          <article
            key={section.id}
            className="rounded-[1.35rem] border border-zinc-200 bg-zinc-50 p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Fråga {section.id}
                </p>
                <h4 className="mt-1 text-lg font-semibold text-zinc-950">
                  {section.title}
                </h4>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm text-zinc-500 ring-1 ring-zinc-200">
                {section.lagrum}
              </span>
            </div>
            <p className="mt-4 text-[15px] leading-7 text-zinc-700">
              {section.text}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{value}</p>
    </div>
  );
}

export function UploadDashboard() {
  const [orgnrInput, setOrgnrInput] = useState("");
  const [orgnrReport, setOrgnrReport] = useState<KycReport | null>(null);
  const [orgnrError, setOrgnrError] = useState<string | null>(null);
  const [orgnrLoading, setOrgnrLoading] = useState(false);

  const [sniInput, setSniInput] = useState("");
  const [sniReport, setSniReport] = useState<KycReport | null>(null);
  const [sniError, setSniError] = useState<string | null>(null);
  const [sniLoading, setSniLoading] = useState(false);

  const [companies, setCompanies] = useState<BatchCompany[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleOrgnrSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = normaliseraOrgnr(orgnrInput);

    if (!normalized) {
      setOrgnrError("Ange ett giltigt organisationsnummer i formatet NNNNNN-NNNN.");
      setOrgnrReport(null);
      return;
    }

    setOrgnrLoading(true);
    setOrgnrError(null);

    try {
      const company = await fetchScbCompany(normalized);

      if (!company) {
        setOrgnrReport(null);
        setOrgnrError("Bolaget hittades inte.");
        return;
      }

      setOrgnrReport(await buildKycReport(company));
    } catch (error) {
      setOrgnrReport(null);
      setOrgnrError(
        error instanceof Error ? error.message : "SCB-uppslag misslyckades.",
      );
    } finally {
      setOrgnrLoading(false);
    }
  }

  async function handleSniSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = sniInput.trim();

    if (!trimmed) {
      setSniError("Ange en SNI-kod.");
      setSniReport(null);
      return;
    }

    setSniLoading(true);
    setSniError(null);

    try {
      setSniReport(await buildGeneriskBranschrapport(trimmed));
    } catch {
      setSniReport(null);
      setSniError("Branschrapporten kunde inte skapas.");
    } finally {
      setSniLoading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBatchLoading(true);
    setBatchError(null);
    setCompanies([]);
    setFileName(file.name);

    try {
      const rows = extractRows(file.name, await file.arrayBuffer()).filter(
        (row) => row.organisationsnummer,
      );

      if (rows.length === 0) {
        setBatchError(
          "Ingen giltig kolumn med organisationsnummer hittades. Förväntat format: NNNNNN-NNNN.",
        );
        return;
      }

      const nextCompanies: BatchCompany[] = [];

      for (const [index, row] of rows.entries()) {
        try {
          const company = await fetchScbCompany(row.organisationsnummer);

          if (!company) {
            nextCompanies.push({
              organisationsnummer: row.organisationsnummer,
              bolagsnamn: row.bolagsnamn || "Okänt bolag",
              status: "saknas",
            });
          } else {
            const report = await buildKycReport(company);

            nextCompanies.push({
              organisationsnummer: company.organisationsnummer,
              bolagsnamn: company.bolagsnamn,
              riskniva: report?.riskniva,
              branschNamn: report?.branschNamn,
              sniKod: company.sniKod,
              status: report ? "matchad" : "fel",
            });
          }
        } catch {
          nextCompanies.push({
            organisationsnummer: row.organisationsnummer,
            bolagsnamn: row.bolagsnamn || "Okänt bolag",
            status: "fel",
          });
        }

        setCompanies([...nextCompanies]);

        if (index < rows.length - 1) {
          await delay(1000);
        }
      }
    } catch {
      setBatchError("Filen kunde inte läsas. Ladda upp en CSV-, XLS- eller XLSX-fil.");
    } finally {
      setBatchLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Orgnr-sök
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
            Hämta bolag från SCB
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Slå upp ett organisationsnummer direkt, bygg rapporten och exportera
            PDF från samma flöde.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleOrgnrSearch}>
            <input
              value={orgnrInput}
              onChange={(event) => setOrgnrInput(event.target.value)}
              placeholder="556900-2404"
              className="w-full rounded-[1.2rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={orgnrLoading}
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {orgnrLoading ? "Söker..." : "Sök bolag"}
            </button>
          </form>

          {orgnrError ? (
            <p className="mt-4 rounded-[1rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {orgnrError}
            </p>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            SNI-sök
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
            Matcha branschmall direkt
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Ange en SNI-kod för att skapa en generell branschrapport utan
            bolagsuppslag.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSniSearch}>
            <input
              value={sniInput}
              onChange={(event) => setSniInput(event.target.value)}
              placeholder="69.201"
              className="w-full rounded-[1.2rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={sniLoading}
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {sniLoading ? "Söker..." : "Sök bransch"}
            </button>
          </form>

          {sniError ? (
            <p className="mt-4 rounded-[1rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {sniError}
            </p>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-[linear-gradient(180deg,#fbfdff_0%,#eef4ff_100%)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            CSV / Excel
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
            Batcha flera bolag
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Behåll filimporten. Varje organisationsnummer slås upp mot SCB med
            en sekunds mellanrum.
          </p>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-zinc-300 bg-white/80 px-6 py-12 text-center transition hover:border-zinc-400 hover:bg-white">
            <span className="text-sm font-medium text-zinc-900">
              Välj CSV-, XLS- eller XLSX-fil
            </span>
            <span className="mt-2 text-sm text-zinc-500">
              Minst kolumnen `organisationsnummer`
            </span>
            <input
              className="sr-only"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {fileName ? (
              <span className="rounded-full bg-white px-3 py-1 text-zinc-700">
                Fil: {fileName}
              </span>
            ) : null}
            {batchLoading ? (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                Hämtar bolag...
              </span>
            ) : null}
          </div>

          {batchError ? (
            <p className="mt-4 rounded-[1rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {batchError}
            </p>
          ) : null}
        </section>
      </section>

      {orgnrReport ? (
        <ReportPreview
          report={orgnrReport}
          pdfHref={`/api/pdf/${encodeURIComponent(orgnrReport.organisationsnummer)}`}
          reportHref={`/rapport/${encodeURIComponent(orgnrReport.organisationsnummer)}`}
        />
      ) : null}

      {sniReport ? (
        <ReportPreview
          report={sniReport}
          pdfHref={`/api/pdf/sni/${encodeURIComponent(sniReport.sniKod)}`}
        />
      ) : null}

      <section className="rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Resultat
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Uppladdade bolag
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Varje rad hämtas från SCB, matchas mot rätt branschmall och får en
            separat PDF-länk.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {companies.length > 0 ? (
            companies.map((company) => (
              <div
                key={`${company.organisationsnummer}-${company.bolagsnamn}`}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-zinc-950">
                    {company.bolagsnamn}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {company.organisationsnummer}
                  </p>
                  {company.status === "matchad" ? (
                    <p className="mt-2 text-sm text-zinc-600">
                      {company.sniKod} • {company.branschNamn}
                    </p>
                  ) : company.status === "saknas" ? (
                    <p className="mt-2 text-sm text-rose-600">
                      Bolaget hittades inte i SCB
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-rose-600">
                      Uppslaget misslyckades
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {company.riskniva ? (
                    <span
                      className={`rounded-full border px-3 py-1 text-sm font-medium ${getRiskClasses(company.riskniva)}`}
                    >
                      {company.riskniva}
                    </span>
                  ) : null}
                  <a
                    href={
                      company.status === "matchad"
                        ? `/api/pdf/${encodeURIComponent(company.organisationsnummer)}`
                        : undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      company.status === "matchad"
                        ? "bg-zinc-950 text-white hover:bg-zinc-800"
                        : "pointer-events-none bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    Ladda ner PDF
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
              Inga bolag inlästa ännu. Ladda upp en fil för att köra sekventiella
              SCB-uppslag och få risknivå per bolag.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
