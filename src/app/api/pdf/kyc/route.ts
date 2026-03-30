import { renderToBuffer } from "@react-pdf/renderer";

import { KycPdfDocument } from "@/components/kyc-pdf-document";
import { buildKycReportWithChecklist } from "@/lib/kyc";
import { hamtaLogoDataUri } from "@/lib/pdf-assets";
import { hamtaScbBolag } from "@/lib/scb";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organisationsnummer, svar } = body as {
      organisationsnummer: string;
      svar: Record<string, string | null>;
    };

    if (!organisationsnummer) {
      return Response.json({ error: "Orgnr krävs" }, { status: 400 });
    }

    const company = await hamtaScbBolag(organisationsnummer);
    if (!company) {
      return Response.json({ error: "Bolaget hittades inte" }, { status: 404 });
    }

    const report = await buildKycReportWithChecklist(company, svar || {});
    if (!report) {
      return Response.json({ error: "Rapport kunde inte skapas" }, { status: 500 });
    }

    const logoSrc = await hamtaLogoDataUri();
    const pdfDocument = KycPdfDocument({ report, logoSrc });
    const pdfBuffer = await renderToBuffer(pdfDocument);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="KYC-${company.organisationsnummer}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return Response.json({ error: "Internt fel" }, { status: 500 });
  }
}
