import { branschmallar, type Branschmall } from "@/data/branschmallar";

function normalizeSniKod(value: string) {
  // Strip whitespace
  let v = value.replace(/\s+/g, "").trim().toLowerCase();
  
  // If no dot and length >= 4, insert dot after first 2 digits
  // e.g. "56110" → "56.110", "96021" → "96.021", "43210" → "43.210"
  if (!v.includes(".") && /^\d{4,}$/.test(v)) {
    v = v.slice(0, 2) + "." + v.slice(2);
  }
  
  return v;
}

function matchScore(input: string, pattern: string) {
  // Exact match
  if (input === pattern) {
    return 100;
  }

  // Wildcard patterns (xxx, xx, x)
  if (pattern.includes("xxx")) {
    const prefix = pattern.split("xxx")[0];
    if (input.startsWith(prefix)) {
      return 30 + prefix.length;
    }
  }

  const inputParts = input.split(".");
  const patternParts = pattern.split(".");

  if (inputParts.length === 2 && patternParts.length === 2) {
    const [inputMajor, inputMinor] = inputParts;
    const [patternMajor, patternMinor] = patternParts;

    if (inputMajor !== patternMajor) {
      return -1;
    }

    // Wildcard: 43.xxx, 47.xxx etc
    if (patternMinor.endsWith("xx")) {
      const prefix = patternMinor.slice(0, -2);
      if (prefix === "" || inputMinor.startsWith(prefix)) {
        return 40 + prefix.length;
      }
    }

    if (patternMinor.endsWith("x")) {
      const prefix = patternMinor.slice(0, -1);
      if (inputMinor.startsWith(prefix)) {
        return 60 + prefix.length;
      }
    }

    // FUZZY: same major group (e.g. 56.110 vs 56.100)
    // Match on first digit of minor part (56.1xx = same sub-group)
    if (inputMinor.length > 0 && patternMinor.length > 0 && 
        inputMinor[0] === patternMinor[0]) {
      return 80; // Strong match — same sub-group
    }

    // Same major code at all = weak match
    return 20;
  }

  return -1;
}

export function matchaBranschmall(sniKod: string): Branschmall | null {
  const normalizedInput = normalizeSniKod(sniKod);
  let bestMatch: Branschmall | null = null;
  let bestScore = -1;

  for (const mall of branschmallar) {
    const score = matchScore(normalizedInput, normalizeSniKod(mall.sni_kod));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = mall;
    }
  }

  return bestScore >= 0 ? bestMatch : null;
}
