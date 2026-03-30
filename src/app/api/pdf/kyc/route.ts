import { renderToBuffer } from "@react-pdf/renderer";

import { KycPdfDocument } from "@/components/kyc-pdf-document";
import { genereraKycMedAI } from "@/lib/kyc-ai";
import { hamtaLogoDataUri } from "@/lib/pdf-assets";
import { hamtaScbBolag } from "@/lib/scb";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // Opus analyserar checklistsvaren och skriver rapporten
    const report = await genereraKycMedAI(company, svar || {});

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
    return Response.json(
      { error: "Kunde inte generera rapport. Försök igen." },
      { status: 500 },
    );
  }
}
