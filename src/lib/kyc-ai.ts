import "server-only";

import { type ScbCompany } from "@/lib/scb-types";
import { type KycSection, type KycReport } from "@/lib/kyc";
import { type Riskniva } from "@/data/branschmallar";
import { matchaBranschmall } from "@/lib/sni-matcher";

interface ChecklistSvar {
  [key: string]: string | null;
}

function byggPrompt(company: ScbCompany, svar: ChecklistSvar): string {
  const mall = matchaBranschmall(company.sniKod);

  // Kategorisera svar
  const jaItems: string[] = [];
  const nejItems: string[] = [];
  const ejAktuellt: string[] = [];

  const labels: Record<string, string> = {
    id_legitimation: "Legitimationskontroll genomförd",
    id_registreringsbevis: "Registreringsbevis kontrollerat",
    id_vhm: "Verklig huvudman utredd via Bolagsverkets VHM-register",
    id_pep: "PEP-screening genomförd",
    id_pep_positiv: "Kunden/VHM är PEP eller närstående till PEP",
    id_hogriskland: "Koppling till EU-listat högrisktredjeland",
    id_enskild_innehavare: "Innehavare av enskild firma identifierad",
    verk_kontant: "Verksamheten hanterar kontantbetalningar",
    verk_kassaregister: "Certifierat kassaregister används",
    verk_komplex_struktur: "Komplex ägarstruktur",
    verk_branschbyte: "Bolaget har bytt bransch sedan registrering",
    verk_internationell: "Internationella transaktioner förekommer",
    verk_personalliggare: "Personalliggare förs",
    verk_svartarbete_risk: "Indikationer på svart arbetskraft / oredovisade intäkter",
    verk_ue_kedjor: "Underentreprenörer anlitas",
    verk_id06: "ID06-system används",
    verk_nystartad_verifiering: "Verksamhetens faktiska existens verifierad",
    eko_omsattning_rimlig: "Omsättningen bedöms rimlig i förhållande till bransch",
    eko_avvikande_transaktioner: "Avvikande transaktionsmönster observerade",
    eko_osanna_fakturor: "Risk för osanna fakturor",
    eko_laneforhalland: "Ovanliga lån/finansieringskällor",
    eko_privat_blandning: "Tydlig separation privat/företag",
    kund_fysiskt_mote: "Fysiskt möte genomfört vid kundupptag",
    kund_distans: "All kontakt sker på distans",
    kund_fullmakt: "Annan person än firmatecknare levererar underlag",
    kund_bokforing: "Löpande bokföring ingår",
    kund_lon: "Lönehantering ingår",
    kund_arsredovisning: "Årsredovisning ingår",
    kund_deklaration: "Deklaration ingår",
    kund_radgivning: "Rådgivning/skatteplanering ingår",
    lop_uppfoljning_12mnd: "Kundkännedom planeras omprövas inom 12 mån",
    lop_kassarapporter: "Kassarapporter granskas regelbundet",
    lop_bruttomarginaler: "Bruttomarginaler och rimlighetsbedömningar genomförs",
    lop_rapportering_finanspolisen: "Rutiner finns för rapportering till Finanspolisen",
    lop_agarbyte: "Rutiner finns för ny KYC vid ägarbyte",
  };

  for (const [key, status] of Object.entries(svar)) {
    const label = labels[key] || key;
    if (status === "ja") jaItems.push(label);
    else if (status === "nej") nejItems.push(label);
    else if (status === "ej_aktuellt") ejAktuellt.push(label);
  }

  return `Du är en expert på penningtvättslagstiftning (Lag 2017:630 om åtgärder mot penningtvätt och finansiering av terrorism, PTL) och arbetar som KYC-specialist åt Bokföringstjänst i Öjebyn AB (en redovisningsbyrå).

Skriv en komplett kundkännedomsrapport för nedanstående bolag baserat på SCB-data och byråns kontroller.

## BOLAGSDATA FRÅN SCB

- Bolagsnamn: ${company.bolagsnamn}
- Organisationsnummer: ${company.organisationsnummer}
- Adress: ${company.adress}
- Kommun: ${company.kommun}
- SNI-kod: ${company.sniKod} — ${company.sniBeskrivning}
- Branschmall: ${mall?.namn ?? "Ingen mall — basera på SNI-beskrivning"}
- Juridisk form: ${company.juridiskForm}
- Storleksklass: ${company.anstallda}
- Registreringsdatum: ${company.registreringsdatum}

## BYRÅNS KONTROLLER (checklistsvar)

Bekräftat (Ja):
${jaItems.length > 0 ? jaItems.map(i => `✓ ${i}`).join("\n") : "Inga punkter bekräftade"}

Ej bekräftat (Nej):
${nejItems.length > 0 ? nejItems.map(i => `✗ ${i}`).join("\n") : "Inga punkter nekade"}

Ej aktuellt:
${ejAktuellt.length > 0 ? ejAktuellt.map(i => `— ${i}`).join("\n") : "Inga punkter markerade ej aktuellt"}

## INSTRUKTIONER

Skriv rapporten uppdelad i exakt 6 sektioner. Varje sektion ska ha:
- Rubrik
- Korrekt lagrumshänvisning
- Professionell, konkret text som en Länsstyrelse-inspektör förväntar sig

Texterna ska:
- Vara specifika för DETTA bolag (nämn bolagsnamnet, orgnr, bransch, adress)
- Referera till konkreta checklistsvar (vad byrån har/inte har kontrollerat)
- Bedöma sannolikhet och konsekvens där relevant
- Vara skrivna ur byråns perspektiv (Bokföringstjänst i Öjebyn AB)
- ALDRIG vara generiska/mallaktiga — varje mening ska tillföra information
- Vara på svenska, professionell ton

Avsluta med en RISKNIVÅ (exakt en av: "Låg risk", "Normal risk", "Förhöjd risk", "Hög risk").

## DE 6 SEKTIONERNA

1. **Riskfaktorer kopplade till kundens verksamhet** (2 kap. 3 § samt 2 kap. 5 § PTL)
   Beskriv verksamhetens riskfaktorer. Ta hänsyn till bransch, kontanthantering, nystartad/ej, storlek, juridisk form.

2. **Ekonomiska faktorers påverkan på risk** (2 kap. 3–5 §§ PTL)
   Bedöm ekonomiska faktorer. Referera till storleksklass, omsättningsrimlighet, transaktionsmönster, eventuella avvikelser.

3. **Kundrelationens syfte och art** (3 kap. 12 § PTL)
   Beskriv vilka tjänster byrån levererar till kunden, uppdragets omfattning och förväntad kundrelation.

4. **Säkerställande av rätt kontaktperson** (3 kap. 7 § tredje stycket, 3 kap. 8 §, 3 kap. 10–11 §§ PTL)
   Beskriv hur byrån har identifierat kunden, kontrollerat VHM, genomfört PEP-screening och högrisklandskontroll.

5. **Distributionskanaler och leveranssätt** (2 kap. 1 § andra stycket PTL)
   Beskriv hur kommunikation och leverans sker. Fysiskt möte eller distans? Geografiskt avstånd?

6. **Motiverad samlad risknivå** (2 kap. 3 § samt 3 kap. 1 § PTL)
   Motivera den samlade risknivån. Knyt samman alla faktorer. Ange konkret uppföljningsintervall.

## SVARSFORMAT

Svara i exakt detta JSON-format (inget annat):
{
  "riskniva": "Normal risk",
  "sections": [
    {"id": 1, "title": "...", "lagrum": "...", "text": "..."},
    {"id": 2, "title": "...", "lagrum": "...", "text": "..."},
    {"id": 3, "title": "...", "lagrum": "...", "text": "..."},
    {"id": 4, "title": "...", "lagrum": "...", "text": "..."},
    {"id": 5, "title": "...", "lagrum": "...", "text": "..."},
    {"id": 6, "title": "...", "lagrum": "...", "text": "..."}
  ]
}`;
}

export async function genereraKycMedAI(
  company: ScbCompany,
  svar: ChecklistSvar,
): Promise<KycReport> {
  const prompt = byggPrompt(company, svar);
  const mall = matchaBranschmall(company.sniKod);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY saknas");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-0-20250514",
      max_tokens: 4096,
      messages: [
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic API error:", errText);
    throw new Error(`Anthropic API: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? "";

  // Parse JSON from response (handle potential markdown wrapping)
  let jsonStr = content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr) as {
    riskniva: Riskniva;
    sections: KycSection[];
  };

  const bedomningsdatum = new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "long",
  }).format(new Date());

  return {
    organisationsnummer: company.organisationsnummer,
    bolagsnamn: company.bolagsnamn,
    adress: company.adress,
    sniKod: company.sniKod,
    sniBeskrivning: company.sniBeskrivning,
    anstallda: company.anstallda,
    juridiskForm: company.juridiskForm,
    registreringsdatum: company.registreringsdatum,
    kommun: company.kommun,
    riskniva: parsed.riskniva,
    branschNamn: mall?.namn ?? (company.sniBeskrivning || "Övrig verksamhet"),
    sections: parsed.sections,
    bedomningsdatum,
    riskfaktorer: [],
  };
}
