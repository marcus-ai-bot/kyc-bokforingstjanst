# PRD: KYC Kundkännedom — Bokföringstjänst AB

**Version:** 1.1
**Datum:** 2026-03-30
**Kund:** Bokföringstjänst i Öjebyn AB (bokforingstjanst.eu)
**Stack:** Next.js 15 + Tailwind CSS + Vercel
**Repo:** GitHub → Vercel auto-deploy

---

## 0. Kunduppgifter — Bokföringstjänst i Öjebyn AB

| Fält | Värde |
|------|-------|
| Juridiskt namn | Bokföringstjänst i Öjebyn AB |
| Organisationsnummer | 556900-2404 |
| Registreringsdatum | 2012-08-08 |
| Bolagsform | Aktiebolag |
| Antal anställda | 2 |
| Adress | Yxgatan 3, 943 32 Öjebyn |
| Verksamhet | Konsulttjänster inom bokföring och administration. Försäljning inom kosmetik. |
| Ledamot | Gunvor Mona Elaine Holm |
| Registrerad för | Moms, F-skatt, Arbetsgivaravgift |
| Omsättning (2025) | 2 377 tkr |
| Resultat (2025) | 537 tkr |
| Soliditet | 79,4% |
| Webb | bokforingstjanst.eu |

**Logga:** `logo-bokforingstjanst.jpg` (bock-symbol + "Bokföringstjänst AB", mörk text, vit/transparent bakgrund)

---

## 1. Bakgrund & Syfte

Bokföringsbyråer är verksamhetsutövare enligt **Lag (2017:630) om åtgärder mot penningtvätt och finansiering av terrorism** (PTL). De är skyldiga att:

1. Göra en **allmän riskbedömning** av sin verksamhet (2 kap. 1–2 §§)
2. Utföra **kundkännedom** (KYC) för varje kund (3 kap.)
3. **Dokumentera** och arkivera i 5 år efter avslutad affärsförbindelse (5 kap. 3 §)
4. **Löpande följa upp** kundrelationer och uppdatera riskbedömningar (3 kap. 4 §)

Bokföringstjänst AB hanterar kunder i 17+ branscher. Idag görs KYC-arbetet manuellt. Denna app automatiserar det.

### Tillsynsmyndighet
Länsstyrelserna i Stockholm, Skåne och Västra Götaland. De kräver verksamhetsanpassade (inte generiska) riskbedömningar.

### Vägledning som styr innehållet
- **SIMPT** — Grundläggande vägledning om kundkännedom (7:e uppl. nov 2024)
- **SIMPT** — Grundläggande vägledning om allmän riskbedömning (4:e uppl.)
- **Polismyndigheten/Samordningsfunktionen** — Vägledning till redovisningskonsulter och skatterådgivare
- **Ekobrottsmyndigheten** — Guide för redovisningskonsulter (uppdaterad 2025)
- **FAR / Srf konsulterna** — Branschvägledning AML/CTF

---

## 1b. Branschmallar (referensdokument)

Filen `reference-branschmallar.docx` innehåller färdiga KYC-texter för 17 branscher, skrivna av Claude. **Dessa mallar SKA användas som bas** i appen. Varje mall innehåller svar på alla 6 frågor med branschspecifika riskbedömningar.

Mallarna täcker: Frisörsalonger, Restauranger, Hudvård, Tatuerare, Åkerier, Elektriker, VVS, Fotvårdare, Hantverkare, Konsulter, Butiker, Bowling, Körskola, Plåtslagare, Musiker, Friskola, Domare.

**Viktigt:**
- Fler branscher kan tillkomma → appen behöver stödja tillägg av nya branschmallar
- Branschmapping sker via SNI-kod → branschkategori
- Om ett bolags SNI-kod inte matchar någon mall → visa "Okänd bransch — manuell bedömning krävs"

---

## 2. Användare

**Primär:** Bokföringstjänst AB:s personal
**Sekundär:** Potentiellt andra småbyråer (framtida SaaS-potential)

---

## 3. Funktioner

### 3.1 CSV/Excel-upload

**Input:** Fil med minst kolumnen `organisationsnummer`. Valfritt: `bolagsnamn`, `kontaktperson`, `epost`, `telefon`.

**Process:**
1. Parsea filen (xlsx, csv)
2. Validera orgnr-format (NNNNNN-NNNN)
3. Slå upp varje bolag via **SCB Företagsregister** (mTLS):
   - Bolagsnamn
   - SNI-kod(er) + klartext
   - Adress (besöks- och postadress)
   - Antal anställda
   - Juridisk form
   - Registreringsdatum
   - Kommun
4. Matcha SNI-kod mot branschkategori (se 3.4)
5. Generera KYC-bedömning per bolag

### 3.2 Bolagssida (per kund)

Varje bolag får en unik sida med:

**Header:**
- Bokföringstjänst AB:s logga
- Rubrik: "Kundkännedom enligt Lag (2017:630)"
- Bolagsnamn, organisationsnummer
- SNI-kod + branschbeskrivning
- Adress
- Antal anställda, juridisk form
- Datum för bedömning

**KYC-sektioner (enligt PTL 3 kap.):**

#### Fråga 1: Riskfaktorer kopplade till kundens verksamhet
*Laggrund: 2 kap. 3 § PTL — riskbedömning av enskild kund*

Bedömning baserad på:
- **Branschrisk** — kontantintensitet, faktureringsstruktur, regelkomplexitet
- **Bolaget specifikt** — storlek (anställda/omsättning), ålder, geografisk exponering
- **Sannolikhet** — Låg / Medel / Hög
- **Konsekvens** — Låg / Medel / Hög

#### Fråga 2: Ekonomiska faktorers påverkan på risk
*Laggrund: 3 kap. 7–8 §§ PTL — skärpta/förenklade åtgärder*

Bedömning baserad på:
- Omsättningsintervall vs branschnorm
- Kontanthantering i branschen
- Typiska transaktionsmönster
- Komplex bolagsstruktur (moderbolag, utlandskoppling)
- **Sannolikhet + Konsekvens**

#### Fråga 3: Kundrelationens syfte och art
*Laggrund: 3 kap. 4 § p. 1 PTL — inhämta information om affärsförbindelsens syfte och art*

Malltext per tjänstetyp:
- Löpande bokföring
- Bokslut & årsredovisning
- Lön & personaladministration
- Deklaration & skatteplanering
- Rådgivning

Förväntat uppdragsomfång baserat på bolagsstorlek.

#### Fråga 4: Säkerställande av rätt kontaktperson
*Laggrund: 3 kap. 4 § p. 3 PTL — kontroll av kundens identitet*

Standardrutin:
- Legitimationskontroll av firmatecknare/behörig person
- Kontroll mot Bolagsverkets registrering (firmatecknare)
- Verifiering av verklig huvudman (VHM) via Bolagsverkets VHM-register
- PEP-kontroll (Politiskt Exponerad Person) — 3 kap. 10–14 §§
- Kommunikationskanal: e-post/telefon till registrerad kontaktperson

#### Fråga 5: Distributionskanaler och leveranssätt
*Laggrund: 2 kap. 1 § p. 3 PTL — distributionskanaler som riskfaktor*

Bedömning av:
- Fysiskt möte vs distans (distans = högre risk enl. SIMPT)
- Digital leverans av underlag (e-post, molntjänst)
- Typ av underlag byrån tar emot (original/kopior/digitalt)
- Geografiskt avstånd till kund
- **Sannolikhet + Konsekvens**

#### Fråga 6: Motiverad samlad risknivå
*Laggrund: 3 kap. 1–2 §§ PTL — riskprofil*

Aggregerad bedömning:
- **Låg risk** → förenklade åtgärder tillåtna (3 kap. 5 §)
- **Normal risk** → grundläggande åtgärder
- **Hög risk** → skärpta åtgärder krävs (3 kap. 7 §), t.ex.:
  - Tätare uppföljning
  - Fler kontroller av transaktioner
  - Utökad dokumentation
  - Eventuell PEP-screening

Motivering som knyter samman fråga 1–5.

### 3.3 PDF-export

Varje bolagssida genereras som PDF med:
- Bokföringstjänst AB:s logga i header
- Alla sektioner ovan
- Sidfot: "Genererad [datum] | Lag (2017:630) om åtgärder mot penningtvätt och finansiering av terrorism"
- Lämplig för utskrift och arkivering (5-årskrav)

### 3.4 Branschklassificering & Riskmatriser

Varje bransch mappas mot SNI-kod(er) och tilldelas en **basrisknivå**:

| Bransch | SNI-koder (primära) | Basrisk | Motivering |
|---------|---------------------|---------|------------|
| Frisörsalonger | 96.021 | **Hög** | Kontantintensiv, vanligt upplägg för osanna fakturor |
| Restauranger | 56.1xx | **Hög** | Kontantintensiv, hög omsättning av anställda, Finanspolisen flaggar |
| Hudvård | 96.022 | **Medel-Hög** | Delvis kontantintensiv |
| Tatuerare | 96.091 | **Medel-Hög** | Ofta kontantbetalning |
| Åkerier | 49.4xx | **Hög** | Transportbranschen flaggad av Finanspolisen, fakturabedrägerier |
| Elektriker | 43.21x | **Medel** | Projektbaserad, ROT-avdrag kan ge spårbarhet |
| VVS | 43.22x | **Medel** | Projektbaserad, ROT-avdrag |
| Fotvårdare | 86.909 | **Medel** | Kontantbetalning förekommer |
| Hantverkare | 43.xxx | **Medel** | Blandad, ROT ger viss spårbarhet |
| Konsulter | 70.2xx | **Låg** | Fakturering bank-till-bank, låg kontanthantering |
| Butiker | 47.xxx | **Medel-Hög** | Kontanthantering beroende på typ |
| Bowling | 93.11x | **Medel** | Kontant + kort blandat |
| Körskola | 85.53x | **Medel** | Blandad betalning |
| Plåtslagare | 43.91x | **Medel** | Projektbaserad |
| Musiker | 90.01x | **Låg-Medel** | Små belopp, ofta projektbaserat |
| Friskola | 85.xxx | **Låg** | Offentlig finansiering, hög transparens |
| Domare | 84.23x / 69.1xx | **Låg** | Offentlig anställning eller reglerad profession |

**Risk-score beräkning:**
```
Samlad risk = Branschrisk × Bolagsfaktorer × Distributionsfaktorer
```

Bolagsfaktorer som höjer risken:
- Nystartad (<2 år): +1 nivå
- Saknar anställda (enmansbolag i normalt arbetsintensiv bransch): +1
- Koppling till högriskland (EU:s lista): +2
- PEP som VHM: +1
- Upprepade branschbyten: +1
- Omsättning avvikande från branschnorm: +1

### 3.5 Startsida

- Bokföringstjänst AB:s logga
- Kort beskrivning: "Verktyg för kundkännedom enligt penningtvättslagen (2017:630)"
- Uploadyta för CSV/Excel
- Status på senaste körning
- Lista på genererade rapporter

### 3.6 Manuell sökning (bonus, prio 2)

Enkel sökfunktion:
- Skriv in orgnr → slå upp → generera rapport
- Alternativt: välj bransch → få generisk riskprofil

---

## 4. Lagkrav-checklista

Appen ska säkerställa att varje rapport uppfyller:

| PTL-krav | Paragraf | Implementering |
|----------|----------|----------------|
| Identifiera kund | 3:4 p.3 | SCB-lookup + VHM-notering |
| Kontrollera identitet | 3:4 p.3 | Påminnelse om leg.kontroll |
| Utreda verklig huvudman | 3:4 p.4 | VHM-referens i rapport |
| Syfte och art | 3:4 p.1 | Malltext + tjänsteval |
| Löpande uppföljning | 3:4 p.2 | Datum + påminnelse vid förnyelse |
| Riskbedömning | 3:1–2 | Automatisk per bransch + manuell justering |
| Skärpta åtgärder vid hög risk | 3:7–8 | Flagga + rekommendation |
| PEP-kontroll | 3:10–14 | Checkbox + fält |
| Dokumentation 5 år | 5:3 | PDF-arkivering |

---

## 5. Teknik

| Komponent | Val | Motivering |
|-----------|-----|-----------|
| Frontend | Next.js 15 + App Router | Standard, snabb, Vercel-native |
| Styling | Tailwind CSS | Snabbt, rent |
| File parsing | SheetJS (xlsx) | CSV + Excel-stöd |
| Bolagsdata | SCB Företagsregister (mTLS) | Redan uppsatt, gratis, 60+ fält |
| PDF | @react-pdf/renderer | Server-side PDF, bra typografi |
| Deploy | Vercel | Auto-deploy från GitHub |
| Auth | Ingen (v1) | Intern byrå-tool, ej publikt |

### API-flöde
```
Upload CSV → Parse → Validera orgnr → SCB lookup (batch, max 10 req/10s) 
→ Matcha SNI → Beräkna risk → Generera rapportsidor → Erbjud PDF-export
```

### SCB Rate limits
- Max 10 requests per 10 sekunder
- Batch-strategi: köa med 1s delay mellan anrop
- Cache SCB-svar lokalt (sessionStorage eller serverside cache)

---

## 6. Designprinciper

- **Bokföringstjänst AB:s logga** i header på alla sidor
- Professionellt, avskalat — detta är ett compliance-verktyg
- Färgkodad risk: 🟢 Låg, 🟡 Normal, 🟠 Medel-Hög, 🔴 Hög
- PDF ska se ut som ett professionellt dokument, inte en screenshot av webben
- Responsivt men primärt desktop (byråanvändning)

---

## 7. Scope & Faser

### Fas 1 (MVP)
- [x] CSV-upload + parsing
- [x] SCB-lookup per orgnr
- [x] Branschmapping (SNI → riskkategori)
- [x] Generera rapportsida per bolag
- [x] PDF-export per bolag
- [x] Startsida med logga

### Fas 2
- [ ] Manuell orgnr-sökning
- [ ] Batch-PDF (alla bolag i en körning)
- [ ] Fält för manuella tillägg (kontaktperson, VHM, PEP-status)
- [ ] Spara historik (localStorage eller Supabase)

### Fas 3 (SaaS-potential)
- [ ] Auth (byrå-login)
- [ ] Kundregister med löpande uppföljning
- [ ] Påminnelser (årlig uppdatering)
- [ ] PEP-screening via API
- [ ] VHM-lookup via Bolagsverket API

---

## 8. Icke-funktionella krav

- Ingen kunddata skickas till tredje part (förutom SCB-lookup)
- Inga cookies/tracking
- PDF ska vara GDPR-kompatibel (byrån äger data)
- Laddtid: <3s för en rapport med 50 bolag

---

## 9. Öppna frågor

1. **AI-genererade texter vs mallar?** PRD:n utgår från branschmallar. Om Marcus vill ha AI (GPT/Claude) som formulerar svaren per bolag kan vi lägga till det som option.
2. **Domännamn?** Subdomän under bokforingstjanst.eu eller eget?
3. **Bolagsverket VHM-API** — har vi tillgång? Annars blir VHM-fältet manuellt.
4. **PEP-screening** — kräver extern tjänst (Trapets, Pliance, etc). Fas 1 = manuell checkbox.

---

*Lagkällor: SFS 2017:630, SIMPT vägledningar, Länsstyrelsernas föreskrifter, Finanspolisens rapporter, Ekobrottsmyndighetens guide för redovisningskonsulter (2025).*
