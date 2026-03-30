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
  riskfaktorer: string[];
}

// ── Bolagsspecifik riskanalys ──────────────────────────────────────

interface BolagRiskAnalys {
  arNystartad: boolean;
  arUnder2Ar: number | null; // månader sedan registrering
  arEnskildFirma: boolean;
  storleksklass: string;
  faktorer: string[];
  riskjustering: number; // 0 = ingen, +1 = höj en nivå, etc
}

function analyseraBolag(company: ScbCompany): BolagRiskAnalys {
  const faktorer: string[] = [];
  let riskjustering = 0;

  // 1. Nystartad? (< 2 år sedan registrering)
  let arNystartad = false;
  let manaderSedan: number | null = null;
  if (company.registreringsdatum) {
    const regDatum = new Date(company.registreringsdatum);
    const nu = new Date();
    manaderSedan = Math.floor((nu.getTime() - regDatum.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (manaderSedan < 24) {
      arNystartad = true;
      riskjustering += 1;
      faktorer.push(`Nystartad verksamhet (registrerad ${company.registreringsdatum}, ${manaderSedan} månader sedan). Nyregistrerade bolag innebär förhöjd risk enligt 2 kap. 5 § PTL då historisk verksamhetsdata saknas och bolaget kan ha etablerats som brottsverktyg.`);
    }
  }

  // 2. Enskild firma = blandad ekonomi
  const arEnskildFirma = (company.juridiskForm || "").toLowerCase().includes("enskild");
  if (arEnskildFirma) {
    faktorer.push("Enskild näringsverksamhet innebär att privat och företagets ekonomi inte är juridiskt åtskilda, vilket försvårar byråns granskning och ökar risken för sammanblandning.");
    riskjustering += 0.5;
  }

  // 3. Storleksklass — 0 anställda
  const storlek = (company.anstallda || "").toLowerCase();
  if (storlek.includes("0") || storlek.includes("noll") || storlek === "") {
    faktorer.push("Bolaget saknar registrerade anställda. I personalintensiva branscher kan detta indikera svart arbetskraft eller att verksamheten bedrivs genom underleverantörer utan insyn.");
    riskjustering += 0.5;
  }

  return {
    arNystartad,
    arUnder2Ar: manaderSedan,
    arEnskildFirma,
    storleksklass: company.anstallda || "okänd",
    faktorer,
    riskjustering,
  };
}

function justeraRiskniva(basRisk: Riskniva, justering: number): Riskniva {
  const nivaer: Riskniva[] = ["Låg risk", "Normal risk", "Förhöjd risk", "Hög risk"];
  const basIndex = nivaer.indexOf(basRisk);
  const nyttIndex = Math.min(nivaer.length - 1, Math.max(0, basIndex + Math.round(justering)));
  return nivaer[nyttIndex];
}

// ── Anpassa malltexter med bolagsdata ──────────────────────────────

function anpassaMalltext(text: string, company: ScbCompany, analys: BolagRiskAnalys): string {
  let tillagg = "";

  if (analys.arNystartad) {
    tillagg += ` Notera att ${company.bolagsnamn} är nystartad (registrerad ${company.registreringsdatum}), vilket innebär att historiska mönster saknas och tätare uppföljning rekommenderas under de första 24 månaderna.`;
  }

  if (analys.arEnskildFirma) {
    tillagg += ` Då verksamheten bedrivs som enskild firma saknas juridisk åtskillnad mellan privat och företagets ekonomi, vilket kräver särskild uppmärksamhet vid granskning av underlag.`;
  }

  return text + tillagg;
}

// ── Dynamiska sektioner (för branscher utan mall) ──────────────────

function buildDynamicSections(company: ScbCompany, analys: BolagRiskAnalys): KycSection[] {
  const b = company.sniBeskrivning || "denna verksamhetstyp";
  const namn = company.bolagsnamn || "kunden";
  const storlek = company.anstallda || "okänt antal anställda";
  const juridiskForm = company.juridiskForm || "okänd bolagsform";

  const nystartatText = analys.arNystartad
    ? ` Bolaget är nystartad (registrerad ${company.registreringsdatum}), vilket innebär förhöjd risk då historisk verksamhetsdata saknas. Nystartade bolag kan ha etablerats som brottsverktyg och kräver tätare uppföljning under de första 24 månaderna.`
    : "";

  const enskildText = analys.arEnskildFirma
    ? " Verksamhetsformen enskild firma innebär att privat och företagets ekonomi inte är juridiskt åtskilda, vilket försvårar byråns granskning och ökar risken för sammanblandning av medel."
    : "";

  const nollAnstText = analys.faktorer.some(f => f.includes("saknar registrerade anställda"))
    ? " Bolaget saknar registrerade anställda, vilket i kombination med branschens karaktär bör föranleda en bedömning av huruvida detta är rimligt."
    : "";

  const samladRisk = justeraRiskniva("Normal risk", analys.riskjustering);

  return [
    {
      id: 1,
      title: "Riskfaktorer kopplade till verksamheten",
      lagrum: "2 kap. 3 § samt 2 kap. 5 § PTL",
      text: `${namn} (${company.organisationsnummer}) bedriver verksamhet inom ${b}, med säte i ${company.kommun || "okänd kommun"}. Bolaget är registrerat som ${juridiskForm} med storleksklass ${storlek}. Verksamhetsspecifika riskfaktorer bedöms utifrån branschens karaktär avseende kontanthantering, faktureringsstruktur, personalintensitet och regulatorisk exponering.${nystartatText}${enskildText}${nollAnstText} Sannolikhet: ${analys.riskjustering > 0 ? "Medel–Hög" : "Medel"}. Konsekvens: Medel — byrån bör vara uppmärksam på avvikande transaktionsmönster och säkerställa att underlagen speglar faktisk verksamhet.`,
    },
    {
      id: 2,
      title: "Ekonomiska faktorers påverkan på risk",
      lagrum: "2 kap. 3–5 §§ PTL",
      text: `${namn} har storleksklass ${storlek} och juridisk form ${juridiskForm}. Ekonomiska riskfaktorer bedöms utifrån omsättningens rimlighet i förhållande till branschnorm för ${b}, förekomst av ovanliga transaktionsmönster och eventuella avvikelser i kostnadsstruktur.${enskildText} Byrån bör vid kundupptag inhämta information om förväntad omsättning och jämföra mot branschtypiska nivåer.${analys.arNystartad ? " Avsaknad av historisk data kräver mer frekventa rimlighetsbedömningar under uppstartsfasen." : ""} Sannolikhet: ${analys.riskjustering > 0 ? "Medel" : "Låg–Medel"}. Konsekvens: Medel — avvikelser bör föranleda fördjupad granskning.`,
    },
    {
      id: 3,
      title: "Kundrelationens syfte och art",
      lagrum: "3 kap. 12 § PTL",
      text: `${namn} anlitar Bokföringstjänst i Öjebyn AB för löpande bokföring, momsredovisning och deklaration. Beroende på verksamhetens omfattning inom ${b} kan även lönehantering och årsredovisning ingå. Kundrelationen förväntas vara löpande med månatlig eller kvartalsvis leverans. Tjänstleveransens omfattning anpassas efter bolagets verksamhetsvolym (storleksklass ${storlek}).`,
    },
    {
      id: 4,
      title: "Säkerställande av rätt kontaktperson",
      lagrum: "3 kap. 7 § tredje stycket PTL",
      text: `Byrån säkerställer behörighet genom att vid kundupptag identifiera firmatecknare via legitimation och registreringsbevis från Bolagsverket. Verklig huvudman utreds via Bolagsverkets VHM-register (3 kap. 8 § PTL). PEP-screening genomförs (3 kap. 10 § PTL). Kontroll görs avseende om kunden är etablerad i ett av Europeiska kommissionen identifierat högrisktredjeland (3 kap. 11 § PTL). Löpande kommunikation sker via identifierad e-post och telefon. Fullmakter kontrolleras vid behov.${analys.arEnskildFirma ? " Vid enskild firma identifieras innehavaren som både firmatecknare och verklig huvudman." : ""}`,
    },
    {
      id: 5,
      title: "Distributionskanaler och leveranssätt",
      lagrum: "2 kap. 1 § andra stycket PTL",
      text: `Kommunikation med ${namn} sker primärt digitalt via e-post och bokföringsprogram. Fysisk kontakt sker vid behov, framförallt vid kundupptag. Risken med digital leverans bedöms som låg givet att identifiering av behörig person har skett. Geografiskt avstånd beaktas — bolaget har säte i ${company.kommun || "okänd kommun"}. Distansrelationer utan fysiskt möte kan innebära förhöjd risk enligt 2 kap. 5 § p. 9 PTL. Sannolikhet: Låg. Konsekvens: Låg.`,
    },
    {
      id: 6,
      title: "Motiverad samlad risknivå",
      lagrum: "2 kap. 3 § samt 3 kap. 1 § PTL",
      text: `${namn} inom ${b} bedöms sammantaget innebära ${samladRisk.toLowerCase()}. Bedömningen baseras på: verksamhetens karaktär (${b}), bolagets storlek (${storlek}), juridisk form (${juridiskForm}), bolagets ålder (registrerad ${company.registreringsdatum || "okänt datum"})${analys.faktorer.length > 0 ? ", samt identifierade riskfaktorer: " + analys.faktorer.map((_, i) => `(${i + 1}) ${analys.faktorer[i].split(".")[0]}`).join("; ") : ""}. Byrån har inte identifierat koppling till högriskland, komplex ägarstruktur eller PEP-exponering — dessa kontroller ska genomföras vid kundupptag. Om förhöjande omständigheter identifieras ska risknivån omprövas och skärpta åtgärder enligt 3 kap. 7–8 §§ PTL vidtas, inklusive tätare uppföljning och utökad dokumentation.`,
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
  const analys = analyseraBolag(company);

  let sections: KycSection[];
  let riskniva: Riskniva;

  if (mallSections) {
    // Har branschmall — anpassa texterna med bolagsspecifika tillägg
    sections = mallSections.map((section) => ({
      ...section,
      text: section.id === 1 || section.id === 2 || section.id === 6
        ? anpassaMalltext(section.text, company, analys)
        : section.text,
    }));
    riskniva = justeraRiskniva(mall!.samlad_risk, analys.riskjustering);
  } else {
    // Ingen mall — generera helt dynamiska texter
    sections = buildDynamicSections(company, analys);
    riskniva = justeraRiskniva("Normal risk", analys.riskjustering);
  }

  return {
    ...company,
    riskniva,
    branschNamn: mall?.namn ?? (company.sniBeskrivning || "Övrig verksamhet"),
    sections,
    bedomningsdatum,
    riskfaktorer: analys.faktorer,
  };
}

export async function buildGeneriskBranschrapport(sniKod: string) {
  const { mall, mallSections, bedomningsdatum } = buildSections(sniKod);

  // Generisk rapport utan bolagsdata — ingen riskjustering
  const dummyCompany: ScbCompany = {
    organisationsnummer: `SNI ${sniKod}`,
    bolagsnamn: mall?.namn ?? `Branschrapport SNI ${sniKod}`,
    adress: "Ej bolagsspecifik uppgift",
    sniKod,
    sniBeskrivning: mall?.sni_label ?? `SNI ${sniKod}`,
    anstallda: "Ej bolagsspecifik uppgift",
    juridiskForm: "Ej bolagsspecifik uppgift",
    registreringsdatum: "",
    kommun: "Ej bolagsspecifik uppgift",
  };

  const sections = mallSections ?? buildDynamicSections(dummyCompany, {
    arNystartad: false,
    arUnder2Ar: null,
    arEnskildFirma: false,
    storleksklass: "ej specificerat",
    faktorer: [],
    riskjustering: 0,
  });

  return {
    ...dummyCompany,
    riskniva: mall?.samlad_risk ?? ("Normal risk" as Riskniva),
    branschNamn: mall?.namn ?? `Bransch SNI ${sniKod}`,
    sections,
    bedomningsdatum,
    riskfaktorer: [],
  } satisfies KycReport;
}
