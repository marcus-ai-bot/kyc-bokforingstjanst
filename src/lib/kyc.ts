import { type Riskniva } from "@/data/branschmallar";
import { matchaBranschmall } from "@/lib/sni-matcher";
import { hamtaScbMockBolag } from "@/lib/scb-mock";

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
  postadress: string;
  sniKod: string;
  sniBeskrivning: string;
  anstallda: number;
  juridiskForm: string;
  registreringsdatum: string;
  kommun: string;
  riskniva: Riskniva;
  branschNamn: string;
  sections: KycSection[];
  bedomningsdatum: string;
}

const defaultSections: KycSection[] = [
  {
    id: 1,
    title: "Riskfaktorer kopplade till verksamheten",
    lagrum: "2 kap. 3 § PTL",
    text: "Okänd bransch. Manuell bedömning krävs av verksamhetens kontanthantering, faktureringsstruktur och geografiska exponering innan kundrelationen kan riskklassas.",
  },
  {
    id: 2,
    title: "Ekonomiska faktorers påverkan på risk",
    lagrum: "3 kap. 7-8 §§ PTL",
    text: "Okänd bransch. Omsättning, transaktionsmönster och eventuell avvikelse från branschnorm behöver analyseras manuellt.",
  },
  {
    id: 3,
    title: "Kundrelationens syfte och art",
    lagrum: "3 kap. 4 § p. 1 PTL",
    text: "Uppdragets omfattning och förväntade tjänster behöver dokumenteras manuellt innan uppstart.",
  },
  {
    id: 4,
    title: "Säkerställande av rätt kontaktperson",
    lagrum: "3 kap. 4 § p. 3 PTL",
    text: "Firmatecknare, verklig huvudman och eventuell PEP-exponering måste verifieras manuellt.",
  },
  {
    id: 5,
    title: "Distributionskanaler och leveranssätt",
    lagrum: "2 kap. 1 § p. 3 PTL",
    text: "Bedöm om kundkontakten sker på distans, hur underlag levereras och om geografiskt avstånd höjer risken.",
  },
  {
    id: 6,
    title: "Motiverad samlad risknivå",
    lagrum: "3 kap. 1-2 §§ PTL",
    text: "Samlad risknivå kan inte fastställas automatiskt för okänd bransch. Manuell bedömning krävs.",
  },
];

export function getRiskClasses(risk: Riskniva) {
  switch (risk) {
    case "Låg risk":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Normal risk":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Förhöjd risk":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Hög risk":
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

export function buildKycReport(orgnr: string): KycReport | null {
  const company = hamtaScbMockBolag(orgnr);

  if (!company) {
    return null;
  }

  const mall = matchaBranschmall(company.sniKod);
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
    : defaultSections;

  return {
    ...company,
    riskniva: mall?.samlad_risk ?? "Hög risk",
    branschNamn: mall?.namn ?? "Okänd bransch - manuell bedömning krävs",
    sections,
    bedomningsdatum,
  };
}
