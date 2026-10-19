import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startFixture } from "./fixture.js";

const REQUIRED_TOOLS = [
  "browser_accessibility",
  "browser_click",
  "browser_close",
  "browser_console",
  "browser_fill",
  "browser_go_back",
  "browser_hover",
  "browser_navigate",
  "browser_network",
  "browser_page_info",
  "browser_performance",
  "browser_press",
  "browser_screenshot",
  "browser_scroll",
  "browser_set_viewport",
  "browser_snapshot",
  "browser_wait",
] as const;

function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key === "PLAYWRIGHT_BROWSERS_PATH") continue;
    env[key] = value;
  }
  return env;
}

function toolText(result: unknown): string {
  if (!result || typeof result !== "object") return String(result);
  const record = result as { content?: unknown; isError?: boolean };
  if (Array.isArray(record.content)) {
    return record.content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part && typeof (part as { text: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("\n");
  }
  return JSON.stringify(result);
}

function assertOk(result: unknown, label: string): void {
  if (result && typeof result === "object" && "isError" in result && (result as { isError?: boolean }).isError) {
    throw new Error(`${label} failed: ${toolText(result)}`);
  }
}

function refFor(snapshot: string, role: string, name: string): string {
  const match = snapshot.match(new RegExp(`${role} "${name}" \\[ref=([A-Za-z][A-Za-z0-9]*)\\]`));
  if (!match?.[1]) throw new Error(`No ${role} "${name}" in snapshot:\n${snapshot}`);
  return match[1];
}

async function main(): Promise<void> {
  const fixture = await startFixture();
  const home = `http://127.0.0.1:${fixture.port}/`;
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/server.ts"],
    cwd: process.cwd(),
    env: childEnv(),
    stderr: "inherit",
  });
  const client = new Client({ name: "mcp-smoke", version: "1.0.0" });
  await client.connect(transport);
  try {
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name).sort();
    for (const name of REQUIRED_TOOLS) {
      if (!names.includes(name)) throw new Error(`Missing tool ${name}. Got ${names.join(", ")}`);
    }

    const resources = await client.listResources();
    if (!resources.resources.some((resource) => resource.uri === "webpage-audit://checklist")) {
      throw new Error(`Missing checklist resource. Got ${JSON.stringify(resources.resources)}`);
    }
    const checklist = await client.readResource({ uri: "webpage-audit://checklist" });
    const checklistText = JSON.stringify(checklist);
    if (!checklistText.includes("webpage-audit") || !checklistText.includes("reports/website-audit.md")) {
      throw new Error(`Unexpected checklist resource: ${checklistText}`);
    }

    const prompts = await client.listPrompts();
    if (!prompts.prompts.some((prompt) => prompt.name === "audit_website")) {
      throw new Error(`Missing audit_website prompt. Got ${prompts.prompts.map((prompt) => prompt.name).join(", ")}`);
    }
    const audit = await client.getPrompt({
      name: "audit_website",
      arguments: { url: "https://developer.mozilla.org/", instructions: "Check the search box." },
    });
    const promptText = JSON.stringify(audit);
    if (!promptText.includes("https://developer.mozilla.org/")) throw new Error(promptText);
    if (!promptText.includes("Check the search box.")) throw new Error(promptText);

    const navigate = await client.callTool({ name: "browser_navigate", arguments: { url: home } });
    assertOk(navigate, "browser_navigate");
    if (!toolText(navigate).includes("HTTP status: 200") || !toolText(navigate).includes("Context: fresh")) {
      throw new Error(toolText(navigate));
    }

    const blocked = await client.callTool({
      name: "browser_navigate",
      arguments: { url: "file:///etc/passwd" },
    });
    if (!toolText(blocked).includes("Only http and https")) {
      throw new Error(`file URL was not rejected: ${toolText(blocked)}`);
    }

    const wait = await client.callTool({
      name: "browser_wait",
      arguments: { text: "Fixture page" },
    });
    assertOk(wait, "browser_wait");

    const snapshotResult = await client.callTool({ name: "browser_snapshot", arguments: {} });
    assertOk(snapshotResult, "browser_snapshot");
    const snapshot = toolText(snapshotResult);
    const note = refFor(snapshot, "textbox", "Note");
    const details = refFor(snapshot, "button", "Details");
    const learnMore = refFor(snapshot, "link", "Learn more");

    assertOk(await client.callTool({ name: "browser_hover", arguments: { ref: details } }), "browser_hover");
    assertOk(await client.callTool({ name: "browser_press", arguments: { ref: note, key: "Tab" } }), "browser_press");
    assertOk(await client.callTool({ name: "browser_scroll", arguments: { direction: "down" } }), "browser_scroll");
    assertOk(await client.callTool({ name: "browser_fill", arguments: { ref: note, value: "mcp" } }), "browser_fill");
    assertOk(await client.callTool({ name: "browser_set_viewport", arguments: { preset: "mobile" } }), "browser_set_viewport");
    assertOk(await client.callTool({ name: "browser_screenshot", arguments: { fullPage: false } }), "browser_screenshot");
    assertOk(await client.callTool({ name: "browser_set_viewport", arguments: { preset: "desktop" } }), "browser_set_viewport desktop");
    assertOk(await client.callTool({ name: "browser_page_info", arguments: {} }), "browser_page_info");
    assertOk(await client.callTool({ name: "browser_performance", arguments: {} }), "browser_performance");
    assertOk(await client.callTool({ name: "browser_accessibility", arguments: {} }), "browser_accessibility");
    assertOk(await client.callTool({ name: "browser_console", arguments: {} }), "browser_console");
    assertOk(await client.callTool({ name: "browser_network", arguments: {} }), "browser_network");

    const clicked = await client.callTool({ name: "browser_click", arguments: { ref: learnMore } });
    assertOk(clicked, "browser_click");
    if (!toolText(clicked).includes("/next")) throw new Error(toolText(clicked));

    const back = await client.callTool({ name: "browser_go_back", arguments: {} });
    assertOk(back, "browser_go_back");

    assertOk(await client.callTool({ name: "browser_close", arguments: {} }), "browser_close");
    console.log(`mcp ok (${names.length} tools invoked)`);
  } finally {
    await client.close();
    await fixture.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
