import type { Locator } from "playwright";

const BLOCKED_BUTTON = [
  /\bpay\b/i,
  /\bpurchase\b/i,
  /\bplace order\b/i,
  /\bdonate\b/i,
  /\bbuy\b/i,
  /\bsubscribe\b/i,
  /\bcheckout\b/i,
  /\bcheck out\b/i,
  /\bsign in\b/i,
  /\blog in\b/i,
  /\blogin\b/i,
  /\bsign up\b/i,
  /\bsignup\b/i,
  /\bcreate account\b/i,
  /\bregister\b/i,
];

const SENSITIVE_FIELD = /\b(password|passwd|cvv|cvc|cardnumber|card-number|credit-card|creditcard)\b/i;

type FieldInfo = {
  tag: string;
  type: string;
  role: string;
  autocomplete: string;
  name: string;
  id: string;
  placeholder: string;
  label: string;
};

export function assertAllowedHost(url: string): void {
  const raw = process.env.ALLOWED_HOSTS;
  if (!raw?.trim()) return;
  const host = new URL(url).hostname.toLowerCase();
  const allowed = new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!allowed.has(host)) {
    throw new Error(`Host "${host}" is not in ALLOWED_HOSTS.`);
  }
}

export async function assertFillAllowed(locator: Locator, allowSensitive: boolean): Promise<void> {
  if (allowSensitive) return;
  const info = await readField(locator);
  const autocomplete = info.autocomplete.toLowerCase();
  const blob = `${info.type} ${autocomplete} ${info.name} ${info.id} ${info.placeholder} ${info.label}`;
  const sensitive =
    info.type === "password" ||
    autocomplete.includes("cc-") ||
    SENSITIVE_FIELD.test(blob);
  if (!sensitive) return;
  throw new Error(
    "Refusing to fill a password or payment field. Set allowSensitive only when the user explicitly asked to enter that value.",
  );
}

export async function assertActivationAllowed(locator: Locator): Promise<void> {
  const info = await readField(locator);
  const isLink = info.tag === "a" || info.role === "link";
  if (isLink) return;
  const isButton =
    info.tag === "button" ||
    info.role === "button" ||
    (info.tag === "input" && (info.type === "submit" || info.type === "button" || info.type === "image"));
  if (!isButton) return;
  const name = info.label.replace(/\s+/g, " ").trim();
  if (!name || !BLOCKED_BUTTON.some((pattern) => pattern.test(name))) return;
  throw new Error(
    `Refusing to activate a payment or account button ("${name}"). A link with this name can still be opened for inspection.`,
  );
}

async function readField(locator: Locator): Promise<FieldInfo> {
  return locator.evaluate((el) => {
    const aria = el.getAttribute("aria-label")?.trim() ?? "";
    const value = el instanceof HTMLInputElement ? el.value || el.getAttribute("value") || "" : "";
    const text = "innerText" in el ? (el as HTMLElement).innerText : el.textContent || "";
    return {
      tag: el.tagName.toLowerCase(),
      type: (el.getAttribute("type") || "").toLowerCase(),
      role: (el.getAttribute("role") || "").toLowerCase(),
      autocomplete: (el.getAttribute("autocomplete") || "").toLowerCase(),
      name: (el.getAttribute("name") || "").toLowerCase(),
      id: (el.id || "").toLowerCase(),
      placeholder: (el.getAttribute("placeholder") || "").toLowerCase(),
      label: aria || value || text,
    };
  });
}
