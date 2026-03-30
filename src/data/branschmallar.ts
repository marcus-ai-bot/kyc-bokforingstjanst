import branschmallarJson from "../../branschmallar.json";

export type Riskniva = "Låg risk" | "Normal risk" | "Förhöjd risk" | "Hög risk";

export type BranschfragaNyckel =
  | "1_riskfaktorer_verksamhet"
  | "2_ekonomiska_riskfaktorer"
  | "3_syfte_och_art"
  | "4_behorig_person"
  | "5_distributionskanaler"
  | "6_motivering_riskniva";

export interface Branschmall {
  namn: string;
  sni_label: string;
  samlad_risk: Riskniva;
  sni_kod: string;
  fragor: Record<BranschfragaNyckel, string>;
}

export const branschmallar = branschmallarJson as Branschmall[];
