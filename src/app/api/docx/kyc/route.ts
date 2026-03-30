import { genereraKycMedAI } from "@/lib/kyc-ai";
import { genereraDocx } from "@/lib/kyc-docx";
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

    const report = await genereraKycMedAI(company, svar || {});

    const buffer = await genereraDocx(report);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="KYC-${company.organisationsnummer}.docx"`,
      },
    });
  } catch (err) {
    console.error("DOCX generation error:", err);
    return Response.json({ error: "Internt fel" }, { status: 500 });
  }
}
