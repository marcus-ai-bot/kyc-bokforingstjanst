"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  type CheckCategory,
  type CheckItemStatus,
  type BolagsOversikt,
  byggBolagsOversikt,
  byggChecklista,
} from "@/lib/checklist";
import { getRiskClasses } from "@/lib/kyc";
import { type ScbCompany } from "@/lib/scb-types";
import { normaliseraOrgnr } from "@/lib/orgnr";
import { type Riskniva } from "@/data/branschmallar";

async function fetchScbCompany(orgnr: string): Promise<ScbCompany | null> {
  const res = await fetch(`/api/scb/${encodeURIComponent(orgnr)}`);
  if (!res.ok) return null;
  return res.json();
}

function beraknaRiskniva(
  oversikt: BolagsOversikt,
  svar: Record<string, CheckItemStatus>,
  kategorier: CheckCategory[],
): Riskniva {
  let score = 0;

  // Bas från automatiska faktorer
  if (oversikt.arNystartadFlag) score += 1;
  if (oversikt.arEnskildFirmaFlag) score += 0.5;
  if (oversikt.arKontantintensivFlag) score += 1;
  if (oversikt.arByggbranschFlag) score += 0.5;

  // Från checkboxar
  for (const kat of kategorier) {
    for (const item of kat.items) {
      const s = svar[item.id];
      if (s === "ja" && item.riskPaverkan === "hojer") score += item.riskVikt;
      if (s === "ja" && item.riskPaverkan === "sanker") score -= item.riskVikt;
      if (s === "nej" && item.riskPaverkan === "sanker") score += 0.25; // borde sänka men gör det inte
    }
  }

  if (score >= 4) return "Hög risk";
  if (score >= 2) return "Förhöjd risk";
  if (score <= -1) return "Låg risk";
  return "Normal risk";
}

export function KycArbetsyta() {
  const searchParams = useSearchParams();
  const [orgnrInput, setOrgnrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSearched, setAutoSearched] = useState(false);

  // Steg 2: Bolagsdata + checklista
  const [company, setCompany] = useState<ScbCompany | null>(null);
  const [oversikt, setOversikt] = useState<BolagsOversikt | null>(null);
  const [kategorier, setKategorier] = useState<CheckCategory[]>([]);
  const [svar, setSvar] = useState<Record<string, CheckItemStatus>>({});

  // Auto-sök om ?orgnr= finns i URL
  useEffect(() => {
    const orgnrParam = searchParams.get("orgnr");
    if (orgnrParam && !autoSearched) {
      setAutoSearched(true);
      setOrgnrInput(orgnrParam);
      // Trigger search
      const norm = normaliseraOrgnr(orgnrParam);
      if (norm) {
        setLoading(true);
        fetchScbCompany(norm).then((c) => {
          if (c) {
            setCompany(c);
            setOversikt(byggBolagsOversikt(c));
            const kat = byggChecklista(c);
            setKategorier(kat);
            const init: Record<string, CheckItemStatus> = {};
            for (const k of kat) {
              for (const item of k.items) {
                init[item.id] = null;
              }
            }
            setSvar(init);
          } else {
            setError("Bolaget hittades inte i SCB:s register.");
          }
        }).catch(() => {
          setError("Kunde inte hämta bolagsdata.");
        }).finally(() => {
          setLoading(false);
        });
      }
    }
  }, [searchParams, autoSearched]);

  async function handleSok(e: React.FormEvent) {
    e.preventDefault();
    const norm = normaliseraOrgnr(orgnrInput);
    if (!norm) {
      setError("Ange ett giltigt organisationsnummer (NNNNNN-NNNN)");
      return;
    }

    setLoading(true);
    setError(null);
    setCompany(null);
    setOversikt(null);

    try {
      const c = await fetchScbCompany(norm);
      if (!c) {
        setError("Bolaget hittades inte i SCB:s register.");
        return;
      }
      setCompany(c);
      setOversikt(byggBolagsOversikt(c));
      const kat = byggChecklista(c);
      setKategorier(kat);

      // Init svar
      const init: Record<string, CheckItemStatus> = {};
      for (const k of kat) {
        for (const item of k.items) {
          init[item.id] = null;
        }
      }
      setSvar(init);
    } catch {
      setError("Kunde inte hämta bolagsdata. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  function handleSvarChange(itemId: string, status: CheckItemStatus) {
    setSvar((prev) => ({ ...prev, [itemId]: status }));
  }

  const riskniva = oversikt ? beraknaRiskniva(oversikt, svar, kategorier) : null;

  const [pdfLoading, setPdfLoading] = useState(false);

  const obesvarade = Object.values(svar).filter((s) => s === null).length;
  const totalt = Object.keys(svar).length;

  async function handleGenereraPdf() {
    if (!company) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationsnummer: company.organisationsnummer,
          svar,
        }),
      });
      if (!res.ok) throw new Error("PDF-generering misslyckades");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `KYC-${company.organisationsnummer}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Kunde inte generera PDF. Försök igen.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* ─── Steg 1: Sök ──────────────────────────────── */}
      <section className="border border-[#e5e7eb] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#1a1a2e]">
          Steg 1 — Slå upp bolag
        </h2>
        <p className="mt-1 text-sm text-[#1a1a2e]/60">
          Skriv in organisationsnummer med eller utan bindestreck
        </p>
        <form onSubmit={handleSok} className="mt-4 flex gap-3">
          <input
            value={orgnrInput}
            onChange={(e) => setOrgnrInput(e.target.value)}
            placeholder="556900-2404"
            className="w-64 border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#1a1a2e] outline-none transition focus:border-[#2d5aa0]"
          />
          <button
            type="submit"
            disabled={loading}
            className="border border-[#2d5aa0] bg-[#2d5aa0] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#244a83] disabled:bg-[#9ca3af]"
          >
            {loading ? "Söker..." : "Slå upp"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-[#dc2626]">{error}</p>
        )}
      </section>

      {/* ─── Bolagsöversikt ──────────────────────────── */}
      {oversikt && (
        <section className="border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#e5e7eb] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#1a1a2e]">
                  {oversikt.bolagsnamn}
                </h2>
                <p className="mt-1 text-sm text-[#1a1a2e]/60">
                  {oversikt.organisationsnummer}
                </p>
              </div>
              {riskniva && (
                <span className={`inline-flex items-center border px-3 py-1.5 text-sm font-semibold ${getRiskClasses(riskniva)}`}>
                  {riskniva}
                </span>
              )}
            </div>
          </div>

          {/* Bolagsdata grid */}
          <div className="grid gap-px border-b border-[#e5e7eb] bg-[#e5e7eb] sm:grid-cols-2 lg:grid-cols-4">
            <InfoCell label="SNI-kod" value={`${oversikt.sniKod} — ${oversikt.sniBeskrivning}`} />
            <InfoCell label="Branschmall" value={oversikt.branschmall ?? "Dynamisk (ingen mall)"} />
            <InfoCell label="Adress" value={`${oversikt.adress}, ${oversikt.kommun}`} />
            <InfoCell label="Juridisk form" value={oversikt.juridiskForm} />
            <InfoCell label="Storleksklass" value={oversikt.storleksklass} />
            <InfoCell
              label="Registrerad"
              value={`${oversikt.registreringsdatum}${oversikt.alderManader !== null ? ` (${oversikt.alderManader} mån)` : ""}`}
            />
            <InfoCell
              label="Nystartad"
              value={oversikt.arNystartadFlag ? "⚠️ Ja (<24 mån)" : "Nej"}
            />
            <InfoCell
              label="Kontantintensiv"
              value={oversikt.arKontantintensivFlag ? "⚠️ Ja" : "Nej"}
            />
          </div>

          {/* Automatiska riskfaktorer */}
          {oversikt.automatiskaRiskfaktorer.length > 0 && (
            <div className="border-b border-[#e5e7eb] px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d97706]">
                Automatiskt identifierade riskfaktorer
              </p>
              <ul className="mt-2 space-y-1">
                {oversikt.automatiskaRiskfaktorer.map((f, i) => (
                  <li key={i} className="text-sm text-[#1a1a2e]/80">
                    ⚠️ {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ─── Steg 2: Checklista ─────────────────────── */}
      {kategorier.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a2e]">
                Steg 2 — Kundkännedom checklista
              </h2>
              <p className="mt-1 text-sm text-[#1a1a2e]/60">
                Kryssa i det som gäller för denna kund. {obesvarade} av {totalt} obesvarade.
              </p>
            </div>
            {riskniva && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
                  Beräknad risk
                </p>
                <span className={`mt-1 inline-flex items-center border px-3 py-1.5 text-sm font-semibold ${getRiskClasses(riskniva)}`}>
                  {riskniva}
                </span>
              </div>
            )}
          </div>

          {kategorier.map((kat) => (
            <div key={kat.id} className="border border-[#e5e7eb] bg-white">
              <div className="border-b border-[#e5e7eb] px-6 py-4">
                <h3 className="text-base font-semibold text-[#1a1a2e]">
                  {kat.titel}
                </h3>
                <p className="mt-0.5 text-sm text-[#1a1a2e]/60">
                  {kat.beskrivning}
                </p>
              </div>
              <div>
                {kat.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 px-6 py-4 ${idx < kat.items.length - 1 ? "border-b border-[#e5e7eb]" : ""}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-[#1a1a2e]">
                        {item.text}
                        {item.riskPaverkan === "hojer" && (
                          <span className="ml-2 text-xs text-[#dc2626]">↑ risk</span>
                        )}
                        {item.riskPaverkan === "sanker" && (
                          <span className="ml-2 text-xs text-[#059669]">↓ risk</span>
                        )}
                      </p>
                      {item.hjalptext && (
                        <p className="mt-0.5 text-xs text-[#1a1a2e]/50">
                          {item.hjalptext}
                        </p>
                      )}
                      {item.lagrum && (
                        <p className="mt-0.5 text-xs text-[#2d5aa0]/70">
                          {item.lagrum}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {(["ja", "nej", "ej_aktuellt"] as CheckItemStatus[]).map((val) => (
                        <button
                          key={val}
                          onClick={() => handleSvarChange(item.id, svar[item.id] === val ? null : val)}
                          className={`border px-2.5 py-1 text-xs font-medium transition ${
                            svar[item.id] === val
                              ? val === "ja"
                                ? item.riskPaverkan === "hojer"
                                  ? "border-[#dc2626] bg-[#dc2626] text-white"
                                  : item.riskPaverkan === "sanker"
                                    ? "border-[#059669] bg-[#059669] text-white"
                                    : "border-[#2d5aa0] bg-[#2d5aa0] text-white"
                                : val === "nej"
                                  ? "border-[#1a1a2e]/30 bg-[#1a1a2e]/10 text-[#1a1a2e]"
                                  : "border-[#1a1a2e]/20 bg-[#1a1a2e]/5 text-[#1a1a2e]/60"
                              : "border-[#e5e7eb] bg-white text-[#1a1a2e]/50 hover:bg-[#fafafa]"
                          }`}
                        >
                          {val === "ja" ? "Ja" : val === "nej" ? "Nej" : "Ej aktuellt"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ─── Steg 3: Generera rapport ──────────────── */}
          <div className="flex items-center justify-between border border-[#e5e7eb] bg-white px-6 py-5">
            <div>
              <h3 className="text-base font-semibold text-[#1a1a2e]">
                Steg 3 — Generera rapport
              </h3>
              <p className="mt-0.5 text-sm text-[#1a1a2e]/60">
                {obesvarade === 0
                  ? "Alla kontroller besvarade. Redo att generera."
                  : `${obesvarade} kontroller kvar att besvara.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleGenereraPdf}
                disabled={pdfLoading}
                className="border border-[#2d5aa0] bg-[#2d5aa0] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#244a83] disabled:bg-[#9ca3af]"
              >
                {pdfLoading ? "Genererar..." : "Ladda ner PDF med svar"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1a1a2e]/55">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#1a1a2e]/80">{value}</p>
    </div>
  );
}
