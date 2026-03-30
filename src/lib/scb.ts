import "server-only";

import https from "node:https";

import { normaliseraOrgnr, orgnrTillTioSiffror } from "@/lib/orgnr";
import { type ScbCompany } from "@/lib/scb-types";

const SCB_URL =
  "https://privateapi.scb.se/nv0101/v1/sokpavar/api/Je/HamtaForetag";

// SCB field names have inconsistent casing/spacing — we use index access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScbApiResponseItem = Record<string, any>;

function getClientCredentials() {
  const certB64 = process.env.SCB_CERT_B64;
  const keyB64 = process.env.SCB_KEY_B64;

  if (!certB64 || !keyB64) {
    throw new Error("SCB_CERT_B64 och SCB_KEY_B64 måste vara satta.");
  }

  return {
    cert: Buffer.from(certB64, "base64").toString("utf8"),
    key: Buffer.from(keyB64, "base64").toString("utf8"),
  };
}

function byggAdress(postAdress?: string, postNr?: string, postOrt?: string) {
  return [postAdress, [postNr, postOrt].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

function mapScbCompany(
  orgnr: string,
  result: ScbApiResponseItem,
): ScbCompany | null {
  const normalized = normaliseraOrgnr(orgnr);

  if (!normalized) {
    return null;
  }

  // SCB returns field names like "Bransch_1P, kod" with comma+space
  const sniKod = (result["Bransch_1P, kod"] ?? result["Bransch_1P"] ?? "").toString().trim();
  const sniBeskrivning = (result["Bransch_1"] ?? "").toString().trim();
  const storleksklass = (result["Storleksklass"] ?? result["Stkl, kod"] ?? "").toString().trim();
  
  return {
    organisationsnummer: normalized,
    bolagsnamn: (result["Företagsnamn"] ?? "").toString().trim(),
    adress: byggAdress(
      (result["PostAdress"] ?? "").toString(),
      (result["PostNr"] ?? "").toString(),
      (result["PostOrt"] ?? "").toString(),
    ),
    sniKod,
    sniBeskrivning,
    anstallda: (result["Storleksklass"] ?? storleksklass ?? "").toString().trim(),
    juridiskForm: (result["Juridisk form"] ?? "").toString().trim(),
    registreringsdatum: (result["Registreringsdatum"] ?? "").toString().trim(),
    kommun: (result["Säteskommun"] ?? "").toString().trim(),
    agarkategori: (result["Ägarkategori"] ?? "").toString().trim(),
  };
}

export async function hamtaScbBolag(orgnr: string) {
  const orgnrTio = orgnrTillTioSiffror(orgnr);

  if (!orgnrTio) {
    return null;
  }

  const { cert, key } = getClientCredentials();
  const agent = new https.Agent({
    cert,
    key,
  });

  const body = JSON.stringify({
    Företagsstatus: "1",
    Registreringsstatus: "1",
    variabler: [
      {
        Variabel: "OrgNr (10 siffror)",
        Operator: "ArLikaMed",
        Varde1: orgnrTio,
        Varde2: "",
      },
    ],
  });

  const responseBody = await new Promise<string>((resolve, reject) => {
    const request = https.request(
      SCB_URL,
      {
        method: "POST",
        agent,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");

          if (
            response.statusCode &&
            (response.statusCode < 200 || response.statusCode >= 300)
          ) {
            reject(
              new Error(
                `SCB API svarade med ${response.statusCode}: ${text.slice(0, 300)}`,
              ),
            );
            return;
          }

          resolve(text);
        });
      },
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });

  const parsed = JSON.parse(responseBody) as ScbApiResponseItem[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return null;
  }

  return mapScbCompany(orgnr, parsed[0]);
}
