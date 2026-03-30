"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { buildKycReport, getRiskClasses } from "@/lib/kyc";
import { hamtaAllaScbMockBolag, normaliseraOrgnr } from "@/lib/scb-mock";

interface ParsedCompany {
  organisationsnummer: string;
  bolagsnamn?: string;
  status: "matchad" | "saknas";
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
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

    const organisationsnummer =
      normaliseraOrgnr(
        String(
          normalizedRow.organisationsnummer ??
            normalizedRow.orgnr ??
            normalizedRow.organizationnumber ??
            "",
        ),
      ) ?? "";

    return {
      organisationsnummer,
      bolagsnamn: String(normalizedRow.bolagsnamn ?? normalizedRow.namn ?? ""),
      _source: fileName,
    };
  });
}

export function UploadDashboard() {
  const [companies, setCompanies] = useState<ParsedCompany[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const examples = useMemo(() => hamtaAllaScbMockBolag(), []);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const rows = extractRows(file.name, await file.arrayBuffer());
      const parsed = rows
        .filter((row) => row.organisationsnummer)
        .map((row) => {
          const report = buildKycReport(row.organisationsnummer);
          return {
            organisationsnummer: row.organisationsnummer,
            bolagsnamn: report?.bolagsnamn || row.bolagsnamn || "Okänt bolag",
            status: report ? "matchad" : "saknas",
          } satisfies ParsedCompany;
        });

      if (parsed.length === 0) {
        setError(
          "Ingen giltig kolumn med organisationsnummer hittades. Förväntat format: NNNNNN-NNNN.",
        );
        setCompanies([]);
        setFileName(file.name);
        return;
      }

      setCompanies(parsed);
      setFileName(file.name);
      setError(null);
    } catch {
      setError("Filen kunde inte läsas. Ladda upp en CSV-, XLS- eller XLSX-fil.");
      setCompanies([]);
      setFileName(file.name);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-zinc-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Import
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Ladda upp kundlista
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Läs in CSV eller Excel med kolumnen{" "}
            <span className="font-semibold text-zinc-900">
              organisationsnummer
            </span>
            . Appen matchar SNI-kod mot rätt branschmall och skapar en
            rapportlänk för varje bolag som finns i mockregistret.
          </p>
        </div>

        <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center transition hover:border-zinc-400 hover:bg-white">
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

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          {fileName ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
              Fil: {fileName}
            </span>
          ) : null}
          {error ? (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
              {error}
            </span>
          ) : null}
        </div>

        <div className="mt-8 space-y-4">
          {companies.length > 0 ? (
            companies.map((company) => {
              const report = buildKycReport(company.organisationsnummer);

              return (
                <div
                  key={company.organisationsnummer}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-zinc-950">
                      {company.bolagsnamn}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {company.organisationsnummer}
                    </p>
                    {report ? (
                      <p className="mt-2 text-sm text-zinc-600">
                        {report.sniKod} • {report.branschNamn}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-rose-600">
                        Saknas i mockad SCB-datakälla
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {report ? (
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-medium ${getRiskClasses(report.riskniva)}`}
                      >
                        {report.riskniva}
                      </span>
                    ) : null}
                    <Link
                      href={`/rapport/${company.organisationsnummer}`}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        company.status === "matchad"
                          ? "bg-zinc-950 text-white hover:bg-zinc-800"
                          : "bg-zinc-200 text-zinc-500 pointer-events-none"
                      }`}
                    >
                      Öppna rapport
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
              Inga bolag inlästa ännu. Ladda upp en fil eller använd exemplen i
              panelen till höger.
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-[2rem] border border-zinc-200 bg-[linear-gradient(180deg,#fbfdff_0%,#eef4ff_100%)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Mockdata
        </span>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
          Testbolag för snabbkontroll
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Dessa organisationsnummer finns hårdkodade i den mockade SCB-sökningen
          och fungerar direkt på rapportsidorna.
        </p>

        <div className="mt-6 space-y-3">
          {examples.map((company) => {
            const report = buildKycReport(company.organisationsnummer);

            return (
              <Link
                key={company.organisationsnummer}
                href={`/rapport/${company.organisationsnummer}`}
                className="block rounded-[1.5rem] border border-white/80 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-zinc-950">
                      {company.bolagsnamn}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {company.organisationsnummer}
                    </p>
                  </div>
                  {report ? (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskClasses(report.riskniva)}`}
                    >
                      {report.riskniva}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-zinc-600">
                  {company.sniKod} • {company.sniBeskrivning}
                </p>
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
