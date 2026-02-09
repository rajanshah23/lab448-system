/**
 * Relational/configuration charge values (not stored in DB).
 * Edit backend/charges.json to change amounts without code or migration.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHARGES_PATH = join(__dirname, "..", "charges.json");

let cached = null;

function loadCharges() {
  if (cached !== null) return cached;
  try {
    const raw = readFileSync(CHARGES_PATH, "utf8");
    cached = JSON.parse(raw);
    return cached;
  } catch (err) {
    cached = { frontdeskCharge: 100 };
    return cached;
  }
}

/** Front desk charge (₹) added on every intake. Default 100 if not set. */
export function getFrontdeskCharge() {
  const charges = loadCharges();
  const value = Number(charges.frontdeskCharge);
  return Number.isFinite(value) && value >= 0 ? value : 100;
}
