import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startFixture } from "./fixture.js";

function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key === "PLAYWRIGHT_BROWSERS_PATH") continue;
    env[key] = value;
  }
  return env;
}

async function main(): Promise<void> {
  const fixture = await startFixture();
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
    const required = [
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
    ];
    for (const name of required) {
      if (!names.includes(name)) throw new Error(`Missing tool ${name}. Got ${names.join(", ")}`);
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

    const result = await client.callTool({
      name: "browser_navigate",
      arguments: { url: `http://127.0.0.1:${fixture.port}/` },
    });
    const text = JSON.stringify(result);
    if (!text.includes("HTTP status: 200") || !text.includes("Context: fresh")) throw new Error(text);

    const blocked = await client.callTool({
      name: "browser_navigate",
      arguments: { url: "file:///etc/passwd" },
    });
    if (!JSON.stringify(blocked).includes("Only http and https")) {
      throw new Error(`file URL was not rejected: ${JSON.stringify(blocked)}`);
    }
    await client.callTool({ name: "browser_close", arguments: {} });
    console.log(`mcp ok (${names.length} tools)`);
  } finally {
    await client.close();
    await fixture.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
