import { branschmallar, type Branschmall } from "@/data/branschmallar";

function normalizeSniKod(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function matchScore(input: string, pattern: string) {
  if (input === pattern) {
    return 100;
  }

  if (pattern.includes("xxx")) {
    const prefix = pattern.split("xxx")[0];

    if (input.startsWith(prefix)) {
      return prefix.length;
    }
  }

  const inputParts = input.split(".");
  const patternParts = pattern.split(".");

  if (inputParts.length === 2 && patternParts.length === 2) {
    const [inputMajor, inputMinor] = inputParts;
    const [patternMajor, patternMinor] = patternParts;

    if (inputMajor === patternMajor && patternMinor.endsWith("xx")) {
      const prefix = patternMinor.slice(0, -2);
      if (inputMinor.startsWith(prefix)) {
        return 50 + prefix.length;
      }
    }

    if (inputMajor === patternMajor && patternMinor.endsWith("x")) {
      const prefix = patternMinor.slice(0, -1);
      if (inputMinor.startsWith(prefix)) {
        return 70 + prefix.length;
      }
    }
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
