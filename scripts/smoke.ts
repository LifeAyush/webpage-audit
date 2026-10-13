import { existsSync, statSync } from "node:fs";
import { startFixture } from "./fixture.js";
import {
  assertHttpUrl,
  browserAccessibility,
  browserClick,
  browserClose,
  browserConsole,
  browserFill,
  browserGoBack,
  browserNavigate,
  browserNetwork,
  browserPageInfo,
  browserPerformance,
  browserScreenshot,
  browserSetViewport,
  browserSnapshot,
  browserWait,
} from "../src/tools.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function expectThrow(fn: () => Promise<unknown> | unknown, label: string): Promise<void> {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(`Expected ${label} to throw`);
}

function refFor(snapshot: string, role: string, name: string): string {
  const match = snapshot.match(new RegExp(`${role} "${name}" \\[ref=([A-Za-z][A-Za-z0-9]*)\\]`));
  if (!match?.[1]) throw new Error(`No ${role} "${name}" in snapshot:\n${snapshot}`);
  return match[1];
}

async function main(): Promise<void> {
  await expectThrow(() => assertHttpUrl("file:///etc/passwd"), "file URL");
  await expectThrow(() => assertHttpUrl("https://user:secret@example.com"), "credential URL");

  const fixture = await startFixture();
  const ipv4 = `http://127.0.0.1:${fixture.port}/`;
  const local = `http://localhost:${fixture.port}/`;
  const next = `http://localhost:${fixture.port}/next`;

  try {
    process.env.ALLOWED_HOSTS = "example.com";
    await expectThrow(() => browserNavigate(ipv4), "allowed host");
    delete process.env.ALLOWED_HOSTS;

    const first = await browserNavigate(ipv4);
    assert(first.includes("HTTP status: 200"), first);
    assert(first.includes("Context: fresh"), first);
    assert(!first.includes("host changed"), first);

    const changed = await browserNavigate(local);
    assert(changed.includes("Context: fresh (host changed from 127.0.0.1 to localhost)"), changed);

    const reused = await browserNavigate(next);
    assert(reused.includes("Context: reused"), reused);
    assert(reused.includes("/next"), reused);

    const back = await browserGoBack();
    assert(back.includes(`http://localhost:${fixture.port}/`), back);
    assert(!back.includes("/next"), back);

    const waited = await browserWait({ text: "Fixture page" });
    assert(waited.includes("Fixture page"), waited);
    await expectThrow(() => browserWait({}), "wait with no target");

    const snapshot = await browserSnapshot();
    assert(snapshot.includes("[ref="), snapshot);
    assert(snapshot.includes("\n  -") || snapshot.includes("\n- "), snapshot);
    const learnMore = refFor(snapshot, "link", "Learn more");
    const password = refFor(snapshot, "textbox", "Password");
    const note = refFor(snapshot, "textbox", "Note");
    const pay = refFor(snapshot, "button", "Pay");

    const info = await browserPageInfo();
    assert(info.includes("Fixture page"), info);
    assert(info.includes("Meta description:"), info);
    assert(info.includes("Local audit fixture"), info);

    const shot = await browserScreenshot(false);
    assert(existsSync(shot.filePath), shot.filePath);
    assert(statSync(shot.filePath).size > 1000, "screenshot too small");
    await browserSetViewport("mobile");
    const mobile = await browserScreenshot(false);
    assert(mobile.text.includes("390x844"), mobile.text);
    await browserSetViewport("desktop");

    const performance = await browserPerformance();
    assert(performance.includes("domContentLoadedMs:"), performance);
    const accessibility = await browserAccessibility();
    assert(accessibility.includes("Violations:"), accessibility);
    const consoleLog = await browserConsole();
    assert(consoleLog.includes("fixture console error"), consoleLog);
    const network = await browserNetwork();
    assert(network.includes("missing.png"), network);

    await expectThrow(() => browserFill(password, "secret"), "password fill");
    await expectThrow(() => browserClick(pay), "pay button");
    const filled = await browserFill(note, "hello");
    assert(filled.includes(note), filled);

    const clicked = await browserClick(learnMore);
    assert(clicked.includes("/next"), clicked);

    console.log("smoke ok");
    console.log(shot.filePath);
    console.log(mobile.filePath);
  } finally {
    delete process.env.ALLOWED_HOSTS;
    await fixture.close();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browserClose();
  });
