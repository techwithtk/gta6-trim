// One-time setup: creates the 6 subscription products in Dodo Payments and writes their IDs to .env.local.
// Usage:  node scripts/dodo-setup.mjs          (reads DODO_PAYMENTS_API_KEY + DODO_PAYMENTS_ENVIRONMENT from .env.local)
// Safe to re-run: products whose ID is already in .env.local are skipped. Never prints secrets.
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import DodoPayments from "dodopayments";

const ENV_FILE = new URL("../.env.local", import.meta.url);
const text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
const env = Object.fromEntries(
  text.split("\n").filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

if (!env.DODO_PAYMENTS_API_KEY) {
  console.error("✗ DODO_PAYMENTS_API_KEY is missing from .env.local");
  process.exit(1);
}
const mode = env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
const client = new DodoPayments({ bearerToken: env.DODO_PAYMENTS_API_KEY, environment: mode });

const PLANS = [
  { id: "STARTER", name: "Starter", monthly: 49, yearly: 39 },
  { id: "PRO", name: "Pro", monthly: 99, yearly: 79 },
  { id: "STUDIO", name: "Studio", monthly: 199, yearly: 159 },
];

const add = {};
for (const p of PLANS) {
  for (const cycle of ["MONTHLY", "YEARLY"]) {
    const key = `DODO_PRODUCT_${p.id}_${cycle}`;
    if (env[key]) {
      console.log(`· ${key} already set, skipping`);
      continue;
    }
    const yearly = cycle === "YEARLY";
    const product = await client.products.create({
      name: `GTA6 Trim ${p.name} (${yearly ? "Yearly" : "Monthly"})`,
      description: `GTA6 Trim ${p.name} plan, billed ${yearly ? "yearly" : "monthly"}.`,
      tax_category: "saas",
      price: {
        type: "recurring_price",
        currency: "USD",
        price: (yearly ? p.yearly * 12 : p.monthly) * 100, // cents
        discount: 0,
        purchasing_power_parity: false,
        payment_frequency_count: 1,
        payment_frequency_interval: yearly ? "Year" : "Month",
        subscription_period_count: yearly ? 10 : 120, // keeps renewing for 10 years
        subscription_period_interval: yearly ? "Year" : "Month",
      },
    });
    add[key] = product.product_id;
    console.log(`✓ created ${key} (${mode})`);
  }
}

if (!env.SESSION_SECRET) add.SESSION_SECRET = randomBytes(32).toString("base64url");

if (Object.keys(add).length) {
  const block = Object.entries(add).map(([k, v]) => `${k}=${v}`).join("\n");
  fs.writeFileSync(ENV_FILE, text.replace(/\n*$/, "\n") + block + "\n");
  console.log(`✓ wrote ${Object.keys(add).length} values to .env.local`);
} else {
  console.log("Nothing to add.");
}
