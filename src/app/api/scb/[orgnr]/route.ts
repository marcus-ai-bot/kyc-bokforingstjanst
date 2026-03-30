import { hamtaScbBolag } from "@/lib/scb";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgnr: string }> },
) {
  try {
    const { orgnr } = await params;
    const company = await hamtaScbBolag(orgnr);

    if (!company) {
      return Response.json({ error: "Bolaget hittades inte" }, { status: 404 });
    }

    return Response.json(company);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SCB-uppslag misslyckades";

    return Response.json({ error: message }, { status: 500 });
  }
}
