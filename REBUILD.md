# REBUILD INSTRUCTIONS

## Vad som ska ändras

### 1. Ta bort mock-data
- Radera src/lib/scb-mock.ts helt
- Ersätt med src/lib/scb-api.ts som gör RIKTIGA anrop

### 2. SCB Företagsregister API
- Endpoint: https://foretagsregistret.scb.se/api/Foretag/
- mTLS med klient-certifikat
- Certifikat: /home/marcus/.openclaw-privat/credentials/scb-api/client.pem
- Nyckel: /home/marcus/.openclaw-privat/credentials/scb-api/client-key.pem  
- CA: /home/marcus/.openclaw-privat/credentials/scb-api/ca.pem
- Rate limit: max 10 req / 10 sek
- Sök på orgnr: GET /api/Foretag/{orgnr}
- Returnerar: namn, SNI-koder, adress, antal anställda, juridisk form, kommun

### 3. Tre ingångar på startsidan

#### A) Sökfält: Organisationsnummer
- Input med placeholder "NNNNNN-NNNN"
- Knapp: "Sök"
- → SCB-lookup → matcha SNI → visa rapport → knapp "Ladda ner PDF"

#### B) Sökfält: SNI-kod
- Input med placeholder "96.021"
- Knapp: "Sök bransch"
- → Matcha branschmall → visa generisk branschrapport (utan bolagsdata) → PDF

#### C) Filuppladdning: CSV/Excel
- Drag & drop eller filväljare
- Kolumn: organisationsnummer (obligatorisk)
- → För varje rad: SCB-lookup → matcha SNI → generera rapport
- → Visa lista med alla bolag + risknivå
- → Knapp "Ladda ner alla som PDF" (en PDF per bolag, eller en sammanslagen)
- → Individuell "Ladda ner PDF" per bolag

### 4. PDF-generering
- Samma professionella layout som nu
- Logga i header
- Alla 6 KYC-frågor
- Sidfot med datum + lagreferens

### 5. Behåll
- branschmallar.json (17 branscher)
- SNI-matchning (fuzzy)
- PDF-komponent
- Logga
- Tailwind-design

### 6. Miljövariabler (för Vercel)
Eftersom mTLS-cert inte kan användas direkt i Vercel serverless, behöver vi en API-proxy.
ALTERNATIV: Gör SCB-anropet via en Next.js API route som kör server-side med cert.
Men på Vercel serverless har vi inte filsystemet...

LÖSNING: Lagra cert som environment variables (base64-encodade) i Vercel:
- SCB_CLIENT_CERT (base64 av client.pem)
- SCB_CLIENT_KEY (base64 av client-key.pem)  
- SCB_CA_CERT (base64 av ca.pem)

I API-routen: dekoda från env, skapa https agent med cert, gör anropet.
