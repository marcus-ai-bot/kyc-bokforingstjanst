import { renderToBuffer } from "@react-pdf/renderer";

import { KycPdfDocument } from "@/components/kyc-pdf-document";
import { buildKycReport } from "@/lib/kyc";
import { hamtaLogoDataUri } from "@/lib/pdf-assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgnr: string }> },
) {
  const { orgnr } = await params;
  const report = buildKycReport(orgnr);

  if (!report) {
    return Response.json({ error: "Bolag hittades inte" }, { status: 404 });
  }

  const logoSrc = await hamtaLogoDataUri();
  const pdfDocument = KycPdfDocument({ report, logoSrc });
  const pdfBuffer = await renderToBuffer(pdfDocument);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="kyc-${report.organisationsnummer}.pdf"`,
    },
  });
}
