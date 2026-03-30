export function normaliseraOrgnr(orgnr: string) {
  const digits = orgnr.replace(/\D/g, "");
  const tenDigits = digits.length === 12 ? digits.slice(2) : digits;

  if (!/^\d{10}$/.test(tenDigits)) {
    return null;
  }

  return `${tenDigits.slice(0, 6)}-${tenDigits.slice(6)}`;
}

export function orgnrTillTioSiffror(orgnr: string) {
  const normalized = normaliseraOrgnr(orgnr);

  if (!normalized) {
    return null;
  }

  return normalized.replace("-", "");
}
