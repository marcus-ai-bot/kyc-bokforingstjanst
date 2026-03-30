export interface ScbCompany {
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
}

const mockCompanies: ScbCompany[] = [
  {
    organisationsnummer: "556900-2404",
    bolagsnamn: "Bokföringstjänst i Öjebyn AB",
    adress: "Yxgatan 3, 943 32 Öjebyn",
    postadress: "Yxgatan 3, 943 32 Öjebyn",
    sniKod: "70.220",
    sniBeskrivning: "Konsultverksamhet avseende företags organisation",
    anstallda: 2,
    juridiskForm: "Aktiebolag",
    registreringsdatum: "2012-08-08",
    kommun: "Piteå",
  },
  {
    organisationsnummer: "559312-4581",
    bolagsnamn: "Nordkust El & Montage AB",
    adress: "Storgatan 14, 972 38 Luleå",
    postadress: "Box 221, 971 07 Luleå",
    sniKod: "43.211",
    sniBeskrivning: "Elinstallationer",
    anstallda: 8,
    juridiskForm: "Aktiebolag",
    registreringsdatum: "2021-04-19",
    kommun: "Luleå",
  },
  {
    organisationsnummer: "556781-1129",
    bolagsnamn: "Pentry & Bistro Norr AB",
    adress: "Skeppsbrogatan 8, 972 31 Luleå",
    postadress: "Skeppsbrogatan 8, 972 31 Luleå",
    sniKod: "56.100",
    sniBeskrivning: "Restaurangverksamhet",
    anstallda: 14,
    juridiskForm: "Aktiebolag",
    registreringsdatum: "2010-09-02",
    kommun: "Luleå",
  },
  {
    organisationsnummer: "850615-4821",
    bolagsnamn: "Studio Form Frisör",
    adress: "Köpmangatan 21, 931 31 Skellefteå",
    postadress: "Köpmangatan 21, 931 31 Skellefteå",
    sniKod: "96.021",
    sniBeskrivning: "Hårvård",
    anstallda: 1,
    juridiskForm: "Enskild näringsverksamhet",
    registreringsdatum: "2024-02-15",
    kommun: "Skellefteå",
  },
];

export function normaliseraOrgnr(orgnr: string) {
  const digits = orgnr.replace(/\D/g, "");
  const tenDigits = digits.length === 12 ? digits.slice(2) : digits;

  if (!/^\d{10}$/.test(tenDigits)) {
    return null;
  }

  return `${tenDigits.slice(0, 6)}-${tenDigits.slice(6)}`;
}

export function hamtaScbMockBolag(orgnr: string) {
  const normalized = normaliseraOrgnr(orgnr);

  if (!normalized) {
    return null;
  }

  return (
    mockCompanies.find((company) => company.organisationsnummer === normalized) ??
    null
  );
}

export function hamtaAllaScbMockBolag() {
  return mockCompanies;
}
