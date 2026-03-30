/**
 * KYC Checklista — Dynamisk per bolag
 *
 * Varje kategori har items som kan vara:
 * - "universal" = gäller alla bolag
 * - "conditional" = visas baserat på SNI/bolagsfaktorer
 *
 * Elaine kryssar i applicerbara items → påverkar rapport + risknivå
 */

import { type ScbCompany } from "@/lib/scb-types";
import { matchaBranschmall } from "@/lib/sni-matcher";

export type CheckItemStatus = "ja" | "nej" | "ej_aktuellt" | null;

export interface CheckItem {
  id: string;
  text: string;
  hjalptext?: string;
  riskPaverkan: "hojer" | "sanker" | "neutral";
  /** Om "hojer" och besvarad "ja" — hur mycket? */
  riskVikt: number;
  lagrum?: string;
}

export interface CheckCategory {
  id: string;
  titel: string;
  beskrivning: string;
  items: CheckItem[];
}

// ── Kontantintensiva SNI-grupper ───────────────────────────────────
const KONTANTINTENSIVA_SNI = ["56", "96", "47", "93", "49"];
const BYGG_SNI = ["41", "42", "43"];

function arKontantintensiv(sniKod: string): boolean {
  const prefix = sniKod.split(".")[0];
  return KONTANTINTENSIVA_SNI.includes(prefix);
}

function arByggbransch(sniKod: string): boolean {
  const prefix = sniKod.split(".")[0];
  return BYGG_SNI.includes(prefix);
}

function arNystartad(registreringsdatum: string): boolean {
  if (!registreringsdatum) return false;
  const reg = new Date(registreringsdatum);
  const nu = new Date();
  const manader = (nu.getTime() - reg.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return manader < 24;
}

function arEnskildFirma(juridiskForm: string): boolean {
  return (juridiskForm || "").toLowerCase().includes("enskild");
}

function manaderSedanRegistrering(registreringsdatum: string): number | null {
  if (!registreringsdatum) return null;
  const reg = new Date(registreringsdatum);
  const nu = new Date();
  return Math.floor((nu.getTime() - reg.getTime()) / (1000 * 60 * 60 * 24 * 30));
}

// ── Bolagsöversikt (visas direkt efter SCB-lookup) ─────────────────

export interface BolagsOversikt {
  bolagsnamn: string;
  organisationsnummer: string;
  adress: string;
  kommun: string;
  sniKod: string;
  sniBeskrivning: string;
  branschmall: string | null;
  juridiskForm: string;
  storleksklass: string;
  registreringsdatum: string;
  alderManader: number | null;
  arNystartadFlag: boolean;
  arEnskildFirmaFlag: boolean;
  arKontantintensivFlag: boolean;
  arByggbranschFlag: boolean;
  automatiskaRiskfaktorer: string[];
}

export function byggBolagsOversikt(company: ScbCompany): BolagsOversikt {
  const mall = matchaBranschmall(company.sniKod);
  const manader = manaderSedanRegistrering(company.registreringsdatum);
  const nystartad = arNystartad(company.registreringsdatum);
  const enskild = arEnskildFirma(company.juridiskForm);
  const kontant = arKontantintensiv(company.sniKod);
  const bygg = arByggbransch(company.sniKod);

  const faktorer: string[] = [];
  if (nystartad) faktorer.push(`Nystartad verksamhet (${manader} månader sedan registrering)`);
  if (enskild) faktorer.push("Enskild firma — privat och företagets ekonomi ej juridiskt åtskilda");
  if (kontant) faktorer.push("Kontantintensiv bransch enligt Skatteverkets klassificering");
  if (bygg) faktorer.push("Byggbranschen — riskklassificerad av Skatteverket (personalliggare, underentreprenörer)");
  const storlekCheck = (company.anstallda || "").trim().toLowerCase();
  const nollAnstallda = storlekCheck === "" || storlekCheck === "0" || storlekCheck === "0 anställda" || storlekCheck.startsWith("0 ") || storlekCheck === "noll";
  if (nollAnstallda) {
    faktorer.push("Saknar registrerade anställda");
  }

  // Kommunalt bolag
  const bolagNamn = (company.bolagsnamn || "").toLowerCase();
  if (bolagNamn.includes("kommun") || bolagNamn.includes("region") || bolagNamn.includes("landsting")) {
    faktorer.push("Kommunalt/offentligt ägt bolag (lägre risk enl. 2 kap. 4 § p. 1 PTL)");
  }

  return {
    bolagsnamn: company.bolagsnamn,
    organisationsnummer: company.organisationsnummer,
    adress: company.adress,
    kommun: company.kommun,
    sniKod: company.sniKod,
    sniBeskrivning: company.sniBeskrivning,
    branschmall: mall?.namn ?? null,
    juridiskForm: company.juridiskForm,
    storleksklass: company.anstallda,
    registreringsdatum: company.registreringsdatum,
    alderManader: manader,
    arNystartadFlag: nystartad,
    arEnskildFirmaFlag: enskild,
    arKontantintensivFlag: kontant,
    arByggbranschFlag: bygg,
    automatiskaRiskfaktorer: faktorer,
  };
}

// ── Dynamisk checklista ────────────────────────────────────────────

export function byggChecklista(company: ScbCompany): CheckCategory[] {
  const nystartad = arNystartad(company.registreringsdatum);
  const enskild = arEnskildFirma(company.juridiskForm);
  const kontant = arKontantintensiv(company.sniKod);
  const bygg = arByggbransch(company.sniKod);

  const kategorier: CheckCategory[] = [];

  // ─── 1. KUNDIDENTIFIERING ────────────────────────────────────────
  const identItems: CheckItem[] = [
    {
      id: "id_legitimation",
      text: "Legitimationskontroll av firmatecknare/behörig person genomförd",
      hjalptext: "Giltig ID-handling kontrollerad vid fysiskt eller digitalt möte",
      riskPaverkan: "neutral",
      riskVikt: 0,
      lagrum: "3 kap. 7 § PTL",
    },
    {
      id: "id_registreringsbevis",
      text: "Registreringsbevis från Bolagsverket kontrollerat",
      hjalptext: "Bekräftar firmatecknare, styrelse och bolagsform",
      riskPaverkan: "neutral",
      riskVikt: 0,
      lagrum: "3 kap. 7 § PTL",
    },
    {
      id: "id_vhm",
      text: "Verklig huvudman utredd via Bolagsverkets VHM-register",
      hjalptext: "Identifiera person med >25% ägande eller kontroll",
      riskPaverkan: "neutral",
      riskVikt: 0,
      lagrum: "3 kap. 8 § PTL",
    },
    {
      id: "id_pep",
      text: "PEP-screening genomförd (politiskt exponerad person)",
      riskPaverkan: "neutral",
      riskVikt: 0,
      lagrum: "3 kap. 10 § PTL",
    },
    {
      id: "id_pep_positiv",
      text: "Kunden eller VHM är PEP eller närstående till PEP",
      hjalptext: "Om ja: skärpta åtgärder krävs, godkännande av behörig beslutsfattare",
      riskPaverkan: "hojer",
      riskVikt: 2,
      lagrum: "3 kap. 10–14 §§ PTL",
    },
    {
      id: "id_hogriskland",
      text: "Kunden har koppling till EU-listat högrisktredjeland",
      hjalptext: "Kontrollera mot Europeiska kommissionens delegerade förordning",
      riskPaverkan: "hojer",
      riskVikt: 3,
      lagrum: "3 kap. 11 § PTL",
    },
  ];

  if (enskild) {
    identItems.push({
      id: "id_enskild_innehavare",
      text: "Innehavare av enskild firma identifierad (= firmatecknare och VHM)",
      hjalptext: "I enskild firma är innehavaren alltid verklig huvudman",
      riskPaverkan: "neutral",
      riskVikt: 0,
      lagrum: "3 kap. 7–8 §§ PTL",
    });
  }

  kategorier.push({
    id: "kundidentifiering",
    titel: "Kundidentifiering och kontroll",
    beskrivning: "Verifiering av kundens identitet, verklig huvudman, PEP-status och högriskland.",
    items: identItems,
  });

  // ─── 2. VERKSAMHETSRISKER ────────────────────────────────────────
  const verksamhetItems: CheckItem[] = [
    {
      id: "verk_kontant",
      text: "Verksamheten hanterar kontantbetalningar",
      hjalptext: "Kontanthantering försvårar spårbarhet och ökar PT-risk",
      riskPaverkan: "hojer",
      riskVikt: 1.5,
      lagrum: "2 kap. 5 § p. 2 PTL",
    },
    {
      id: "verk_kassaregister",
      text: "Certifierat kassaregister används",
      hjalptext: "Obligatoriskt vid kontantförsäljning. Minskar risken.",
      riskPaverkan: "sanker",
      riskVikt: 0.5,
    },
    {
      id: "verk_komplex_struktur",
      text: "Kunden har komplex ägarstruktur (moderbolag, utlandskoppling, flera lager)",
      hjalptext: "Ovanlig eller alltför komplicerad ägarstruktur = förhöjd risk",
      riskPaverkan: "hojer",
      riskVikt: 2,
      lagrum: "2 kap. 5 § p. 1 PTL",
    },
    {
      id: "verk_branschbyte",
      text: "Bolaget har bytt bransch/SNI-kod sedan registrering",
      hjalptext: "Upprepade branschbyten kan indikera oseriös verksamhet",
      riskPaverkan: "hojer",
      riskVikt: 1,
    },
    {
      id: "verk_internationell",
      text: "Verksamheten har internationella transaktioner eller utländska kunder/leverantörer",
      riskPaverkan: "hojer",
      riskVikt: 1,
      lagrum: "2 kap. 5 § p. 5–8 PTL",
    },
  ];

  if (kontant) {
    verksamhetItems.push(
      {
        id: "verk_personalliggare",
        text: "Personalliggare förs och är tillgänglig",
        hjalptext: "Obligatoriskt i kontantintensiva branscher sedan 2007",
        riskPaverkan: "sanker",
        riskVikt: 0.5,
      },
      {
        id: "verk_svartarbete_risk",
        text: "Indikationer på svart arbetskraft eller oredovisade intäkter",
        riskPaverkan: "hojer",
        riskVikt: 3,
      },
    );
  }

  if (bygg) {
    verksamhetItems.push(
      {
        id: "verk_ue_kedjor",
        text: "Bolaget anlitar underentreprenörer",
        hjalptext: "Komplexa UE-kedjor kan dölja oegentligheter (fakturabedrägerier)",
        riskPaverkan: "hojer",
        riskVikt: 1.5,
      },
      {
        id: "verk_id06",
        text: "ID06-system används på byggarbetsplatser",
        riskPaverkan: "sanker",
        riskVikt: 0.5,
      },
    );
  }

  if (nystartad) {
    verksamhetItems.push({
      id: "verk_nystartad_verifiering",
      text: "Verksamhetens faktiska existens verifierad (besök, webbplats, referens)",
      hjalptext: "Nystartade bolag kan vara skalbolag. Verifiera att verksamhet bedrivs.",
      riskPaverkan: "sanker",
      riskVikt: 0.5,
    });
  }

  kategorier.push({
    id: "verksamhetsrisker",
    titel: "Verksamhetsrisker",
    beskrivning: "Branschspecifika och bolagsspecifika riskfaktorer kopplade till kundens verksamhet.",
    items: verksamhetItems,
  });

  // ─── 3. EKONOMISKA FAKTORER ──────────────────────────────────────
  const ekonomiItems: CheckItem[] = [
    {
      id: "eko_omsattning_rimlig",
      text: "Omsättningen bedöms som rimlig i förhållande till bransch och storlek",
      riskPaverkan: "sanker",
      riskVikt: 0.5,
    },
    {
      id: "eko_avvikande_transaktioner",
      text: "Avvikande transaktionsmönster har observerats",
      hjalptext: "T.ex. ovanligt stora insättningar, betalningar utan tydlig affärsmässig förklaring",
      riskPaverkan: "hojer",
      riskVikt: 2,
      lagrum: "4 kap. 1–2 §§ PTL",
    },
    {
      id: "eko_osanna_fakturor",
      text: "Risk för osanna fakturor bedöms föreligga",
      hjalptext: "Fakturor som inte speglar faktisk vara/tjänst",
      riskPaverkan: "hojer",
      riskVikt: 3,
    },
    {
      id: "eko_laneforhalland",
      text: "Bolaget har lån från fysiska personer eller ovanliga finansieringskällor",
      hjalptext: "Aktieägartillskott, lån utan formellt avtal, kapitaltillskott utan underlag",
      riskPaverkan: "hojer",
      riskVikt: 1.5,
    },
  ];

  if (enskild) {
    ekonomiItems.push({
      id: "eko_privat_blandning",
      text: "Tydlig separation mellan privata och företagets transaktioner",
      hjalptext: "Enskild firma: ej juridiskt åtskild ekonomi. Byrån bör granska noggrant.",
      riskPaverkan: "sanker",
      riskVikt: 0.5,
    });
  }

  kategorier.push({
    id: "ekonomiska_faktorer",
    titel: "Ekonomiska faktorer",
    beskrivning: "Bedömning av transaktionsmönster, omsättning och finansieringsstruktur.",
    items: ekonomiItems,
  });

  // ─── 4. KUNDRELATION OCH KOMMUNIKATION ───────────────────────────
  kategorier.push({
    id: "kundrelation",
    titel: "Kundrelation och kommunikation",
    beskrivning: "Hur kundrelationen är strukturerad, vilka tjänster som levereras och hur kommunikation sker.",
    items: [
      {
        id: "kund_fysiskt_mote",
        text: "Fysiskt möte har genomförts vid kundupptag",
        hjalptext: "Distansrelationer utan fysiskt möte = förhöjd risk (2 kap. 5 § p. 9)",
        riskPaverkan: "sanker",
        riskVikt: 0.5,
        lagrum: "2 kap. 5 § p. 9 PTL",
      },
      {
        id: "kund_distans",
        text: "All kontakt sker på distans (aldrig fysiskt möte)",
        riskPaverkan: "hojer",
        riskVikt: 1,
        lagrum: "2 kap. 5 § p. 9 PTL",
      },
      {
        id: "kund_fullmakt",
        text: "Annan person än firmatecknare levererar underlag (fullmakt krävs)",
        riskPaverkan: "neutral",
        riskVikt: 0,
        lagrum: "3 kap. 7 § tredje stycket PTL",
      },
      {
        id: "kund_bokforing",
        text: "Löpande bokföring ingår i uppdraget",
        riskPaverkan: "neutral",
        riskVikt: 0,
      },
      {
        id: "kund_lon",
        text: "Lönehantering ingår i uppdraget",
        riskPaverkan: "neutral",
        riskVikt: 0,
      },
      {
        id: "kund_arsredovisning",
        text: "Årsredovisning ingår i uppdraget",
        riskPaverkan: "neutral",
        riskVikt: 0,
      },
      {
        id: "kund_deklaration",
        text: "Deklaration ingår i uppdraget",
        riskPaverkan: "neutral",
        riskVikt: 0,
      },
      {
        id: "kund_radgivning",
        text: "Rådgivning/skatteplanering ingår",
        riskPaverkan: "neutral",
        riskVikt: 0,
      },
    ],
  });

  // ─── 5. LÖPANDE ÅTGÄRDER OCH RUTINER ────────────────────────────
  kategorier.push({
    id: "lopande_atgarder",
    titel: "Löpande åtgärder och rutiner",
    beskrivning: "Hur byrån fortlöpande övervakar och följer upp kundrelationen.",
    items: [
      {
        id: "lop_uppfoljning_12mnd",
        text: "Kundkännedom planeras att omprövas inom 12 månader",
        hjalptext: "Hög risk: 6 månader. Normal/Låg: 12 månader.",
        riskPaverkan: "neutral",
        riskVikt: 0,
        lagrum: "2 kap. 3 § tredje stycket PTL",
      },
      {
        id: "lop_kassarapporter",
        text: "Kassarapporter granskas regelbundet (om kontanthantering)",
        riskPaverkan: "sanker",
        riskVikt: 0.5,
      },
      {
        id: "lop_bruttomarginaler",
        text: "Bruttomarginaler och rimlighetsbedömningar genomförs",
        riskPaverkan: "sanker",
        riskVikt: 0.5,
      },
      {
        id: "lop_rapportering_finanspolisen",
        text: "Rutiner finns för rapportering till Finanspolisen vid misstanke",
        riskPaverkan: "neutral",
        riskVikt: 0,
        lagrum: "4 kap. 3 § PTL",
      },
      {
        id: "lop_agarbyte",
        text: "Rutiner finns för ny KYC vid ägarbyte",
        riskPaverkan: "neutral",
        riskVikt: 0,
        lagrum: "3 kap. 13 § PTL",
      },
    ],
  });

  return kategorier;
}
