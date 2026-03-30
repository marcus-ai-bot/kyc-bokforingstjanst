import { type Riskniva } from "@/data/branschmallar";
import { type ScbCompany } from "@/lib/scb-types";
import { matchaBranschmall } from "@/lib/sni-matcher";

export interface KycSection {
  id: number;
  title: string;
  lagrum: string;
  text: string;
}

export interface KycReport {
  organisationsnummer: string;
  bolagsnamn: string;
  adress: string;
  sniKod: string;
  sniBeskrivning: string;
  anstallda: string;
  juridiskForm: string;
  registreringsdatum: string;
  kommun: string;
  riskniva: Riskniva;
  branschNamn: string;
  sections: KycSection[];
  bedomningsdatum: string;
}

function buildDynamicSections(branschBeskrivning: string, bolagsnamn: string, anstallda: string): KycSection[] {
  const b = branschBeskrivning || "denna verksamhetstyp";
  const namn = bolagsnamn || "kunden";
  const storlek = anstallda || "okänt antal anställda";
  
  return [
    {
      id: 1,
      title: "Riskfaktorer kopplade till verksamheten",
      lagrum: "2 kap. 3 § samt 2 kap. 5 § PTL",
      text: `${namn} bedriver verksamhet inom ${b}. Verksamhetsspecifika riskfaktorer bedöms utifrån branschens karaktär avseende kontanthantering, faktureringsstruktur, personalintensitet och regulatorisk exponering. Eventuell förekomst av kontantbetalningar, komplexa leverantörskedjor eller internationella inslag bör utredas vid kundupptag. Sannolikhet: Medel. Konsekvens: Medel — byrån bör vara uppmärksam på avvikande transaktionsmönster och säkerställa att underlagen speglar faktisk verksamhet.`,
    },
    {
      id: 2,
      title: "Ekonomiska faktorers påverkan på risk",
      lagrum: "2 kap. 3–5 §§ PTL",
      text: `${namn} har storleksklass ${storlek}. Ekonomiska riskfaktorer bedöms utifrån omsättningens rimlighet i förhållande till branschnorm, förekomst av ovanliga transaktionsmönster och eventuella avvikelser i kostnadsstruktur. Byrån bör vid kundupptag inhämta information om förväntad omsättning och jämföra mot branschtypiska nivåer. Sannolikhet: Medel. Konsekvens: Medel — avvikelser bör föranleda fördjupad granskning.`,
    },
    {
      id: 3,
      title: "Kundrelationens syfte och art",
      lagrum: "3 kap. 12 § PTL",
      text: `Kunden anlitar Bokföringstjänst i Öjebyn AB för löpande bokföring, momsredovisning och deklaration. Beroende på verksamhetens omfattning kan även lönehantering och årsredovisning ingå. Kundrelationen förväntas vara löpande med månatlig eller kvartalsvis leverans. Tjänstleveransens omfattning anpassas efter ${namn}s verksamhetsvolym.`,
    },
    {
      id: 4,
      title: "Säkerställande av rätt kontaktperson",
      lagrum: "3 kap. 7 § tredje stycket PTL",
      text: `Byrån säkerställer behörighet genom att vid kundupptag identifiera firmatecknare via legitimation och registreringsbevis från Bolagsverket. Verklig huvudman utreds via Bolagsverkets register. Löpande kommunikation sker via identifierad e-post och telefon. Fullmakter kontrolleras vid behov. Vid ägarbyten genomförs ny kundkännedomsprocess.`,
    },
    {
      id: 5,
      title: "Distributionskanaler och leveranssätt",
      lagrum: "2 kap. 1 § andra stycket PTL",
      text: `Kommunikation sker primärt digitalt via e-post och bokföringsprogram. Fysisk kontakt sker vid behov, framförallt vid kundupptag. Risken med digital leverans bedöms som låg givet att identifiering av behörig person har skett. Geografiskt avstånd till kund beaktas — distansrelationer utan fysiskt möte kan innebära förhöjd risk enligt 2 kap. 5 § p. 9. Sannolikhet: Låg. Konsekvens: Låg.`,
    },
    {
      id: 6,
      title: "Motiverad samlad risknivå",
      lagrum: "2 kap. 3 § samt 3 kap. 1 § PTL",
      text: `${namn} inom ${b} bedöms sammantaget innebära normal risk. Bedömningen baseras på verksamhetens karaktär, bolagets storlek (${storlek}), samt avsaknad av identifierade förhöjande faktorer såsom koppling till högriskland, komplex ägarstruktur eller PEP-exponering. Byrån upprätthåller grundläggande kundkännedom och löpande uppföljning. Om förhöjande omständigheter identifieras vid kundupptag eller under löpande relation ska risknivån omprövas och skärpta åtgärder vidtas.`,
    },
  ];
}

export function getRiskClasses(risk: Riskniva) {
  switch (risk) {
    case "Låg risk":
      return "border-transparent bg-transparent text-[#059669]";
    case "Normal risk":
      return "border-transparent bg-transparent text-[#2d5aa0]";
    case "Förhöjd risk":
      return "border-transparent bg-transparent text-[#d97706]";
    case "Hög risk":
      return "border-transparent bg-transparent text-[#dc2626]";
  }
}

function buildSections(sniKod: string) {
  const mall = matchaBranschmall(sniKod);
  const bedomningsdatum = new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "long",
  }).format(new Date());

  const sections = mall
    ? [
        {
          id: 1,
          title: "Riskfaktorer kopplade till verksamheten",
          lagrum: "2 kap. 3 § PTL",
          text: mall.fragor["1_riskfaktorer_verksamhet"],
        },
        {
          id: 2,
          title: "Ekonomiska faktorers påverkan på risk",
          lagrum: "3 kap. 7-8 §§ PTL",
          text: mall.fragor["2_ekonomiska_riskfaktorer"],
        },
        {
          id: 3,
          title: "Kundrelationens syfte och art",
          lagrum: "3 kap. 4 § p. 1 PTL",
          text: mall.fragor["3_syfte_och_art"],
        },
        {
          id: 4,
          title: "Säkerställande av rätt kontaktperson",
          lagrum: "3 kap. 4 § p. 3 PTL",
          text: mall.fragor["4_behorig_person"],
        },
        {
          id: 5,
          title: "Distributionskanaler och leveranssätt",
          lagrum: "2 kap. 1 § p. 3 PTL",
          text: mall.fragor["5_distributionskanaler"],
        },
        {
          id: 6,
          title: "Motiverad samlad risknivå",
          lagrum: "3 kap. 1-2 §§ PTL",
          text: mall.fragor["6_motivering_riskniva"],
        },
      ]
    : null;

  return {
    mall,
    mallSections: sections,
    bedomningsdatum,
  };
}

export async function buildKycReport(
  company: ScbCompany | null,
): Promise<KycReport | null> {
  if (!company) {
    return null;
  }

  const { mall, mallSections, bedomningsdatum } = buildSections(company.sniKod);

  // Use mall sections if matched, otherwise generate dynamic sections from SCB data
  const sections = mallSections ?? buildDynamicSections(
    company.sniBeskrivning,
    company.bolagsnamn,
    company.anstallda,
  );

  return {
    ...company,
    riskniva: mall?.samlad_risk ?? "Normal risk",
    branschNamn: mall?.namn ?? (company.sniBeskrivning || "Övrig verksamhet"),
    sections,
    bedomningsdatum,
  };
}

export async function buildGeneriskBranschrapport(sniKod: string) {
  const { mall, mallSections, bedomningsdatum } = buildSections(sniKod);
  
  const sections = mallSections ?? buildDynamicSections(
    mall?.sni_label ?? `SNI ${sniKod}`,
    "kunden",
    "ej specificerat",
  );

  return {
    organisationsnummer: `SNI ${sniKod}`,
    bolagsnamn: mall?.namn ?? `Branschrapport SNI ${sniKod}`,
    adress: "Ej bolagsspecifik uppgift",
    sniKod,
    sniBeskrivning: mall?.sni_label ?? `SNI ${sniKod}`,
    anstallda: "Ej bolagsspecifik uppgift",
    juridiskForm: "Ej bolagsspecifik uppgift",
    registreringsdatum: "Ej bolagsspecifik uppgift",
    kommun: "Ej bolagsspecifik uppgift",
    riskniva: mall?.samlad_risk ?? "Normal risk",
    branschNamn: mall?.namn ?? `Bransch SNI ${sniKod}`,
    sections,
    bedomningsdatum,
  } satisfies KycReport;
}
