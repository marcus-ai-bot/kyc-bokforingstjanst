import { readFile } from "node:fs/promises";
import path from "node:path";

export async function hamtaLogoDataUri() {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "logo-bokforingstjanst.jpg",
  );
  const file = await readFile(logoPath);
  return `data:image/jpeg;base64,${file.toString("base64")}`;
}
