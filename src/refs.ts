import type { Page } from "playwright";

const MAX_SNAPSHOT_CHARS = 40_000;
const DEPTH_LIMITS = [8, 6, 4];

export function parseRefs(snapshot: string): string[] {
  return [...new Set([...snapshot.matchAll(/\[ref=([A-Za-z][A-Za-z0-9]{0,31})\]/g)].map((match) => match[1]).filter((ref): ref is string => ref !== undefined))];
}

export async function takeSnapshot(page: Page): Promise<{ body: string; refs: string[] }> {
  let text = await page.ariaSnapshot({ mode: "ai", timeout: 15_000 });
  let depthLimited = false;

  for (const depth of DEPTH_LIMITS) {
    if (text.length <= MAX_SNAPSHOT_CHARS) break;
    text = await page.ariaSnapshot({ mode: "ai", timeout: 15_000, depth });
    depthLimited = true;
  }

  let note = "";
  if (text.length > MAX_SNAPSHOT_CHARS) {
    const cut = text.lastIndexOf("\n", MAX_SNAPSHOT_CHARS);
    text = `${text.slice(0, cut > 0 ? cut : MAX_SNAPSHOT_CHARS)}\n[snapshot truncated]`;
    note = "Snapshot truncated to 40000 characters. Scroll and call browser_snapshot again for content that was cut off.";
  } else if (depthLimited) {
    note = "Snapshot depth was limited because the full accessibility tree exceeded 40000 characters.";
  }

  const title = await page.title();
  const header = [`URL: ${page.url()}`, `Title: ${title}`, note].filter(Boolean).join("\n");
  return { body: `${header}\n${text}`, refs: parseRefs(text) };
}
