import "server-only";

import https from "node:https";

import { normaliseraOrgnr, orgnrTillTioSiffror } from "@/lib/orgnr";
import { type ScbCompany } from "@/lib/scb-types";

const SCB_URL =
  "https://privateapi.scb.se/nv0101/v1/sokpavar/api/Je/HamtaForetag";

interface ScbApiResponseItem {
  Företagsnamn?: string;
  PostAdress?: string;
  PostNr?: string;
  PostOrt?: string;
  Bransch_1P?: string;
  Bransch_1?: string;
  Storleksklass?: string;
  "Juridisk form"?: string;
  Registreringsdatum?: string;
  Säteskommun?: string;
}

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

  return {
    organisationsnummer: normalized,
    bolagsnamn: result.Företagsnamn?.trim() ?? "",
    adress: byggAdress(result.PostAdress, result.PostNr, result.PostOrt),
    sniKod: result.Bransch_1P?.trim() ?? "",
    sniBeskrivning: result.Bransch_1?.trim() ?? "",
    anstallda: result.Storleksklass?.trim() ?? "",
    juridiskForm: result["Juridisk form"]?.trim() ?? "",
    registreringsdatum: result.Registreringsdatum?.trim() ?? "",
    kommun: result.Säteskommun?.trim() ?? "",
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
