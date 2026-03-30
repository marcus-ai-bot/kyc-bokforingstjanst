import "server-only";

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
  ImageRun,
} from "docx";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { type KycReport } from "@/lib/kyc";

async function getLogo(): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "public", "logo-bokforingstjanst.jpg");
  return readFile(logoPath);
}

function riskColor(risk: string): string {
  if (risk.includes("Hög")) return "DC2626";
  if (risk.includes("Förhöjd")) return "D97706";
  if (risk.includes("Normal")) return "2D5AA0";
  return "059669"; // Låg
}

export async function genereraDocx(report: KycReport): Promise<Buffer> {
  const logo = await getLogo();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1200, bottom: 1000, left: 1200 },
          },
        },
        children: [
          // Logo
          new Paragraph({
            children: [
              new ImageRun({
                data: logo,
                transformation: { width: 160, height: 43 },
                type: "jpg",
              }),
            ],
            spacing: { after: 200 },
          }),

          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "Kundkännedom enligt Lag (2017:630)",
                bold: true,
                size: 32,
                color: "1A1A2E",
              }),
            ],
            spacing: { after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "Genererad rapport för arkivering och uppföljning",
                size: 18,
                color: "6B7280",
                italics: true,
              }),
            ],
            spacing: { after: 300 },
          }),

          // Bolagsdata table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            },
            rows: [
              tableRow("Bolag", report.bolagsnamn),
              tableRow("Organisationsnummer", report.organisationsnummer),
              tableRow("SNI-kod", `${report.sniKod} — ${report.sniBeskrivning}`),
              tableRow("Branschmall", report.branschNamn),
              tableRow("Adress", report.adress),
              tableRow("Juridisk form", report.juridiskForm),
              tableRow("Storleksklass", report.anstallda),
              tableRow("Registreringsdatum", report.registreringsdatum),
              tableRow("Bedömningsdatum", report.bedomningsdatum),
              tableRow("Samlad risknivå", report.riskniva, riskColor(report.riskniva)),
            ],
          }),

          new Paragraph({ spacing: { after: 300 }, children: [] }),

          // Sections
          ...report.sections.flatMap((section) => [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: `${section.id}. ${section.title}`,
                  bold: true,
                  size: 24,
                  color: "1A1A2E",
                }),
              ],
              spacing: { before: 300, after: 80 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: section.lagrum,
                  size: 18,
                  color: "6B7280",
                  italics: true,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: section.text,
                  size: 22,
                  color: "374151",
                }),
              ],
              spacing: { after: 200 },
            }),
          ]),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: `Genererad ${report.bedomningsdatum} | Lag (2017:630) om åtgärder mot penningtvätt och finansiering av terrorism`,
                size: 16,
                color: "9CA3AF",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function tableRow(label: string, value: string, valueColor?: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: 20,
                color: "6B7280",
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value,
                size: 20,
                color: valueColor ?? "1A1A2E",
                bold: !!valueColor,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
