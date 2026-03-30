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
  storleksklass?: string;
  registreringsdatum?: string;
  alderManader?: number | null;
  status: "matchad" | "saknas" | "fel";
}

function beraknaAlderManader(regDatum: string): number | null {
  if (!regDatum) return null;
  const reg = new Date(regDatum);
  const nu = new Date();
  return Math.floor((nu.getTime() - reg.getTime()) / (1000 * 60 * 60 * 24 * 30));
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
    <div className="border border-[#e5e7eb] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#e5e7eb] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
            Rapport
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1a2e]">
            {report.bolagsnamn}
          </h3>
          <p className="mt-1 text-sm text-[#1a1a2e]/60">
            {report.organisationsnummer}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center border px-2.5 py-1 text-sm font-medium ${getRiskClasses(report.riskniva)}`}
          >
            {report.riskniva}
          </span>
          {reportHref ? (
            <Link
              href={reportHref}
              className="border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] transition hover:bg-[#fafafa]"
            >
              Öppna rapport
            </Link>
          ) : null}
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="border border-[#2d5aa0] bg-[#2d5aa0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244a83]"
          >
            Ladda ner PDF
          </a>
        </div>
      </div>

      <div className="grid gap-px border-b border-[#e5e7eb] bg-[#e5e7eb] md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="SNI-kod" value={`${report.sniKod} • ${report.sniBeskrivning}`} />
        <InfoCard label="Branschmall" value={report.branschNamn} />
        <InfoCard label="Adress" value={report.adress} />
        <InfoCard
          label="Bolagsdata"
          value={`${report.juridiskForm} • ${report.anstallda}`}
        />
      </div>

      <div className="px-6 py-2">
        {report.sections.map((section) => (
          <article
            key={section.id}
            className="border-t border-[#e5e7eb] py-5 first:border-t-0"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
                  Fråga {section.id}
                </p>
                <h4 className="mt-1 text-lg font-semibold text-[#1a1a2e]">
                  {section.title}
                </h4>
              </div>
              <span className="border border-[#e5e7eb] px-2.5 py-1 text-sm text-[#1a1a2e]/60">
                {section.lagrum}
              </span>
            </div>
            <p className="mt-4 text-[15px] leading-7 text-[#1a1a2e]/78">
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
    <div className="bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#1a1a2e]/78">{value}</p>
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
              storleksklass: company.anstallda,
              registreringsdatum: company.registreringsdatum,
              alderManader: beraknaAlderManader(company.registreringsdatum),
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
    <div className="grid gap-10 py-8">
      <section className="grid gap-px border border-[#e5e7eb] bg-[#e5e7eb] xl:grid-cols-3">
        <section className="bg-white p-6 sm:p-7">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
            Orgnr-sök
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#1a1a2e]">
            Hämta bolag från SCB
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#1a1a2e]/70">
            Slå upp ett organisationsnummer direkt, bygg rapporten och exportera
            PDF från samma flöde.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleOrgnrSearch}>
            <input
              value={orgnrInput}
              onChange={(event) => setOrgnrInput(event.target.value)}
              placeholder="556900-2404"
              className="w-full border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#1a1a2e] outline-none transition focus:border-[#2d5aa0]"
            />
            <button
              type="submit"
              disabled={orgnrLoading}
              className="border border-[#2d5aa0] bg-[#2d5aa0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244a83] disabled:cursor-not-allowed disabled:border-[#9ca3af] disabled:bg-[#9ca3af]"
            >
              {orgnrLoading ? "Söker..." : "Sök bolag"}
            </button>
          </form>

          {orgnrError ? (
            <p className="mt-4 border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-sm text-[#dc2626]">
              {orgnrError}
            </p>
          ) : null}
        </section>

        <section className="bg-white p-6 sm:p-7">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
            SNI-sök
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#1a1a2e]">
            Matcha branschmall direkt
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#1a1a2e]/70">
            Ange en SNI-kod för att skapa en generell branschrapport utan
            bolagsuppslag.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSniSearch}>
            <input
              value={sniInput}
              onChange={(event) => setSniInput(event.target.value)}
              placeholder="69.201"
              className="w-full border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#1a1a2e] outline-none transition focus:border-[#2d5aa0]"
            />
            <button
              type="submit"
              disabled={sniLoading}
              className="border border-[#2d5aa0] bg-[#2d5aa0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244a83] disabled:cursor-not-allowed disabled:border-[#9ca3af] disabled:bg-[#9ca3af]"
            >
              {sniLoading ? "Söker..." : "Sök bransch"}
            </button>
          </form>

          {sniError ? (
            <p className="mt-4 border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-sm text-[#dc2626]">
              {sniError}
            </p>
          ) : null}
        </section>

        <section className="bg-white p-6 sm:p-7">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
            CSV / Excel
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#1a1a2e]">
            Batcha flera bolag
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#1a1a2e]/70">
            Behåll filimporten. Varje organisationsnummer slås upp mot SCB med
            en sekunds mellanrum.
          </p>

          <label className="mt-6 flex cursor-pointer flex-col items-start justify-center border border-dashed border-[#cbd5e1] bg-[#fafafa] px-5 py-6 text-left transition hover:border-[#2d5aa0] hover:bg-white">
            <span className="text-sm font-medium text-[#1a1a2e]">
              Välj CSV-, XLS- eller XLSX-fil
            </span>
            <span className="mt-1 text-sm text-[#1a1a2e]/60">
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
              <span className="border border-[#e5e7eb] bg-white px-3 py-1 text-[#1a1a2e]/75">
                Fil: {fileName}
              </span>
            ) : null}
            {batchLoading ? (
              <span className="border border-[#e5e7eb] bg-white px-3 py-1 text-[#2d5aa0]">
                Hämtar bolag...
              </span>
            ) : null}
          </div>

          {batchError ? (
            <p className="mt-4 border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-sm text-[#dc2626]">
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

      <section className="border border-[#e5e7eb] bg-white">
        <div className="flex flex-col gap-3">
          <span className="px-6 pt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
            Resultat
          </span>
          <h2 className="px-6 text-2xl font-semibold tracking-tight text-[#1a1a2e]">
            Uppladdade bolag
          </h2>
          <p className="max-w-2xl px-6 pb-4 text-sm leading-6 text-[#1a1a2e]/70">
            Varje rad hämtas från SCB, matchas mot rätt branschmall och får en
            separat PDF-länk.
          </p>
        </div>

        <div className="overflow-x-auto border-t border-[#e5e7eb]">
          {companies.length > 0 ? (
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#fafafa] text-left">
                  <th className="border-b border-[#e5e7eb] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                    Bolag
                  </th>
                  <th className="border-b border-[#e5e7eb] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                    Orgnr
                  </th>
                  <th className="border-b border-[#e5e7eb] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                    SNI
                  </th>
                  <th className="border-b border-[#e5e7eb] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                    Storlek
                  </th>
                  <th className="border-b border-[#e5e7eb] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                    Ålder
                  </th>
                  <th className="border-b border-[#e5e7eb] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                    Risk
                  </th>
                  <th className="border-b border-[#e5e7eb] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                    Åtgärd
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={`${company.organisationsnummer}-${company.bolagsnamn}`}
                    className="align-top"
                  >
                    <td className="border-b border-[#e5e7eb] px-6 py-4 text-sm text-[#1a1a2e]">
                      <div className="font-medium">{company.bolagsnamn}</div>
                      {company.status === "matchad" ? (
                        <div className="mt-1 text-xs text-[#1a1a2e]/60">
                          {company.branschNamn}
                        </div>
                      ) : company.status === "saknas" ? (
                        <div className="mt-1 text-xs text-[#dc2626]">
                          Bolaget hittades inte i SCB
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-[#dc2626]">
                          Uppslaget misslyckades
                        </div>
                      )}
                    </td>
                    <td className="border-b border-[#e5e7eb] px-6 py-4 text-sm text-[#1a1a2e]/75">
                      {company.organisationsnummer}
                    </td>
                    <td className="border-b border-[#e5e7eb] px-6 py-4 text-sm text-[#1a1a2e]/75">
                      {company.sniKod ?? "—"}
                    </td>
                    <td className="border-b border-[#e5e7eb] px-6 py-4 text-sm text-[#1a1a2e]/75">
                      {company.storleksklass ?? "—"}
                    </td>
                    <td className="border-b border-[#e5e7eb] px-6 py-4 text-sm text-[#1a1a2e]/75">
                      {company.alderManader !== undefined && company.alderManader !== null ? (
                        <span className={company.alderManader < 24 ? "font-medium text-[#d97706]" : ""}>
                          {company.alderManader < 24
                            ? `⚠️ ${company.alderManader} mån`
                            : `${Math.floor(company.alderManader / 12)} år`}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="border-b border-[#e5e7eb] px-6 py-4 text-sm">
                      {company.riskniva ? (
                        <span
                          className={`inline-flex items-center border px-2.5 py-1 font-medium ${getRiskClasses(company.riskniva)}`}
                        >
                          {company.riskniva}
                        </span>
                      ) : (
                        <span className="text-[#1a1a2e]/45">—</span>
                      )}
                    </td>
                    <td className="border-b border-[#e5e7eb] px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={
                            company.status === "matchad"
                              ? `/kyc?orgnr=${encodeURIComponent(company.organisationsnummer)}`
                              : "#"
                          }
                          className={`inline-flex border px-3 py-2 font-medium transition ${
                            company.status === "matchad"
                              ? "border-[#2d5aa0] bg-[#2d5aa0] text-white hover:bg-[#244a83]"
                              : "pointer-events-none border-[#e5e7eb] bg-[#fafafa] text-[#1a1a2e]/45"
                          }`}
                        >
                          KYC
                        </Link>
                        <a
                          href={
                            company.status === "matchad"
                              ? `/api/pdf/${encodeURIComponent(company.organisationsnummer)}`
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex border px-3 py-2 font-medium transition ${
                            company.status === "matchad"
                              ? "border-[#e5e7eb] bg-white text-[#1a1a2e] hover:bg-[#fafafa]"
                              : "pointer-events-none border-[#e5e7eb] bg-[#fafafa] text-[#1a1a2e]/45"
                          }`}
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-5 text-sm leading-6 text-[#1a1a2e]/70">
              Inga bolag inlästa ännu. Ladda upp en fil för att köra sekventiella
              SCB-uppslag och få risknivå per bolag.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
