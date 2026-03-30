export interface ScbCompany {
  // Grunddata
  organisationsnummer: string;
  bolagsnamn: string;
  adress: string;
  kommun: string;
  lan: string;
  juridiskForm: string;
  registreringsdatum: string;
  startdatum: string;
  
  // Bransch
  sniKod: string;
  sniBeskrivning: string;
  sniAvdelning: string;
  /** Ytterligare SNI-koder (bransch 2-5) */
  ytterligareSni: { kod: string; beskrivning: string }[];
  
  // Storlek & ekonomi
  anstallda: string;
  omsattningsklass: string;
  antalArbetsstallen: string;
  
  // Ägar- och riskdata
  agarkategori: string;
  utlandsktAgande: string;
  agarland: string;
  exportImport: string;
  
  // Registreringsstatus
  arbetsgivarstatus: string;
  momsstatus: string;
  fskattstatus: string;
  bolagsstatus: string;
  foretagsstatus: string;
}
