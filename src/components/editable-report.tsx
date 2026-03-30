"use client";

import { useState, useCallback } from "react";
import { type KycReport, type KycSection, getRiskClasses } from "@/lib/kyc";
import { matchaBranschmall } from "@/lib/sni-matcher";

interface EditableSectionProps {
  section: KycSection;
  genericText: string | null;
  value: string;
  onChange: (text: string) => void;
}

function EditableSection({ section, genericText, value, onChange }: EditableSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const isEdited = value !== section.text;

  function handleDropdownSelect(text: string) {
    if (isEdited && text !== value) {
      setPendingText(text);
      setShowConfirm(true);
    } else {
      onChange(text);
    }
  }

  function confirmReplace() {
    if (pendingText) onChange(pendingText);
    setShowConfirm(false);
    setPendingText(null);
  }

  function cancelReplace() {
    setShowConfirm(false);
    setPendingText(null);
  }

  return (
    <article className="border-t border-[#e5e7eb] py-5 first:border-t-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1a2e]/55">
            Fråga {section.id}
          </p>
          <h4 className="mt-1 text-lg font-semibold text-[#1a1a2e]">
            {section.title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-[#e5e7eb] px-2.5 py-1 text-sm text-[#1a1a2e]/60">
            {section.lagrum}
          </span>
          {/* Dropdown */}
          <select
            className="border border-[#e5e7eb] bg-white px-2 py-1 text-xs text-[#1a1a2e]/70 outline-none"
            value=""
            onChange={(e) => {
              if (e.target.value) handleDropdownSelect(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Alternativ...</option>
            <option value={section.text}>Bolagsspecifik (original)</option>
            {genericText && <option value={genericText}>Branschgenerisk</option>}
          </select>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-3 w-full resize-y border border-[#e5e7eb] bg-white px-3 py-2 text-[15px] leading-7 text-[#1a1a2e]/78 outline-none transition focus:border-[#2d5aa0]"
      />

      {isEdited && (
        <p className="mt-1 text-xs text-[#2d5aa0]">✎ Redigerad</p>
      )}

      {showConfirm && (
        <div className="mt-2 flex items-center gap-3 border border-[#d97706]/30 bg-[#fffbeb] px-3 py-2 text-sm">
          <span className="text-[#92400e]">Ersätt din redigerade text?</span>
          <button
            onClick={confirmReplace}
            className="border border-[#2d5aa0] bg-[#2d5aa0] px-3 py-1 text-xs font-medium text-white"
          >
            Ja, ersätt
          </button>
          <button
            onClick={cancelReplace}
            className="border border-[#e5e7eb] bg-white px-3 py-1 text-xs font-medium text-[#1a1a2e]"
          >
            Avbryt
          </button>
        </div>
      )}
    </article>
  );
}

export function EditableReport({
  report,
  pdfHref,
  docxHref,
  reportHref,
  onTextsChange,
}: {
  report: KycReport;
  pdfHref: string;
  docxHref?: string;
  reportHref?: string;
  onTextsChange?: (texts: Record<number, string>) => void;
}) {
  // Get generic branch texts for dropdown
  const mall = matchaBranschmall(report.sniKod);
  const genericTexts: Record<number, string | null> = {};
  if (mall) {
    const keyMap: Record<number, string> = {
      1: "1_riskfaktorer_verksamhet",
      2: "2_ekonomiska_riskfaktorer",
      3: "3_syfte_och_art",
      4: "4_behorig_person",
      5: "5_distributionskanaler",
      6: "6_motivering_riskniva",
    };
    for (const [id, key] of Object.entries(keyMap)) {
      genericTexts[Number(id)] = mall.fragor[key as keyof typeof mall.fragor] ?? null;
    }
  }

  const [editedTexts, setEditedTexts] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const s of report.sections) {
      init[s.id] = s.text;
    }
    return init;
  });

  const handleChange = useCallback((sectionId: number, text: string) => {
    setEditedTexts((prev) => {
      const next = { ...prev, [sectionId]: text };
      onTextsChange?.(next);
      return next;
    });
  }, [onTextsChange]);

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
          {reportHref && (
            <a
              href={reportHref}
              className="border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] transition hover:bg-[#fafafa]"
            >
              Öppna rapport
            </a>
          )}
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="border border-[#2d5aa0] bg-[#2d5aa0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244a83]"
          >
            PDF
          </a>
          {docxHref && (
            <a
              href={docxHref}
              target="_blank"
              rel="noreferrer"
              className="border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] transition hover:bg-[#fafafa]"
            >
              Word
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-px border-b border-[#e5e7eb] bg-[#e5e7eb] md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="SNI-kod" value={`${report.sniKod} • ${report.sniBeskrivning}`} />
        <InfoCard label="Branschmall" value={report.branschNamn} />
        <InfoCard label="Adress" value={report.adress} />
        <InfoCard label="Bolagsdata" value={`${report.juridiskForm} • ${report.anstallda}`} />
      </div>

      <div className="px-6 py-2">
        {report.sections.map((section) => (
          <EditableSection
            key={section.id}
            section={section}
            genericText={genericTexts[section.id] ?? null}
            value={editedTexts[section.id] ?? section.text}
            onChange={(text) => handleChange(section.id, text)}
          />
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
