import "server-only";

import { headers } from "next/headers";

export async function getServerBaseUrl() {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  if (!host) {
    throw new Error("Kunde inte avgöra aktuell host.");
  }

  return `${protocol}://${host}`;
}
