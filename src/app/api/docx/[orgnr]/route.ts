import { buildKycReport } from "@/lib/kyc";
import { genereraDocx } from "@/lib/kyc-docx";
import { hamtaScbBolag } from "@/lib/scb";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgnr: string }> },
) {
  const { orgnr } = await params;
  const company = await hamtaScbBolag(orgnr);
  const report = await buildKycReport(company);

  if (!report) {
    return Response.json({ error: "Bolag hittades inte" }, { status: 404 });
  }

  const buffer = await genereraDocx(report);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="KYC-${report.organisationsnummer}.docx"`,
    },
  });
}
