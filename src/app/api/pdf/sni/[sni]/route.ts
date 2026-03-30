import { renderToBuffer } from "@react-pdf/renderer";

import { KycPdfDocument } from "@/components/kyc-pdf-document";
import { buildGeneriskBranschrapport } from "@/lib/kyc";
import { hamtaLogoDataUri } from "@/lib/pdf-assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sni: string }> },
) {
  const { sni } = await params;
  const report = await buildGeneriskBranschrapport(sni);
  const logoSrc = await hamtaLogoDataUri();
  const pdfDocument = KycPdfDocument({ report, logoSrc });
  const pdfBuffer = await renderToBuffer(pdfDocument);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="kyc-sni-${report.sniKod}.pdf"`,
    },
  });
}
