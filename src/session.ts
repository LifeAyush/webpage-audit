import {
  chromium,
  type Browser,
  type BrowserContext,
  type ConsoleMessage,
  type Dialog,
  type Page,
  type Request,
  type Response,
} from "playwright";

export type ConsoleEntry = {
  type: string;
  text: string;
  location: string;
};

export type NetworkEntry = {
  url: string;
  method: string;
  status: number | null;
  failure: string | null;
  resourceType: string;
};

const MAX_BUFFER = 100;
const DESKTOP = { width: 1440, height: 900 };
// tsx/esbuild injects __name inside page.evaluate callbacks. Define it in the page
// before those callbacks run. The expression is a string so the bundler does not rewrite it.
const NAME_HELPER = "globalThis.__name = (target) => target";

export class BrowserSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly attached = new WeakSet<Page>();
  private consoleEntries: ConsoleEntry[] = [];
  private networkEntries: NetworkEntry[] = [];
  private refIds = new Set<string>();
  private lastDocumentUrl = "";
  private closing = false;

  async getPage(): Promise<Page> {
    if (this.page && !this.page.isClosed()) return this.page;
    await this.openContext(DESKTOP);
    if (!this.page) throw new Error("Browser failed to start");
    await this.prepare(this.page);
    return this.page;
  }

  async replaceContext(): Promise<Page> {
    const viewport = this.page?.viewportSize() ?? DESKTOP;
    await this.openContext(viewport);
    if (!this.page) throw new Error("Browser failed to start");
    await this.prepare(this.page);
    return this.page;
  }

  async setViewport(width: number, height: number): Promise<void> {
    const page = await this.getPage();
    await page.setViewportSize({ width, height });
  }

  pages(): Page[] {
    return this.context?.pages() ?? [];
  }

  adopt(page: Page): void {
    if (this.page === page) return;
    this.page = page;
    this.attach(page);
    this.resetBuffers();
  }

  resetBuffers(): void {
    this.consoleEntries = [];
    this.networkEntries = [];
    this.refIds.clear();
  }

  getConsole(): ConsoleEntry[] {
    return [...this.consoleEntries];
  }

  getNetwork(): NetworkEntry[] {
    return [...this.networkEntries];
  }

  setRefs(ids: string[]): void {
    this.refIds = new Set(ids);
  }

  hasRef(ref: string): boolean {
    return this.refIds.has(ref);
  }

  async close(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    const context = this.context;
    const browser = this.browser;
    this.context = null;
    this.browser = null;
    this.page = null;
    this.resetBuffers();
    try {
      await context?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    } finally {
      this.closing = false;
    }
  }

  private async openContext(viewport: { width: number; height: number }): Promise<void> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({ headless: process.env.HEADED !== "1" });
    }
    if (this.context) {
      await this.context.close().catch(() => undefined);
    }
    this.context = await this.browser.newContext({
      viewport,
      locale: "en-US",
    });
    await this.context.addInitScript({ content: NAME_HELPER });
    this.context.setDefaultTimeout(15_000);
    this.context.setDefaultNavigationTimeout(30_000);
    this.page = await this.context.newPage();
    this.lastDocumentUrl = "";
    this.resetBuffers();
    this.attach(this.page);
  }

  private attach(page: Page): void {
    if (this.attached.has(page)) return;
    this.attached.add(page);

    page.on("console", (message: ConsoleMessage) => {
      const type = message.type();
      if (type !== "error" && type !== "warning") return;
      const location = message.location();
      const where = location.url ? `${location.url}:${location.lineNumber ?? 0}` : "";
      this.pushConsole({
        type,
        text: message.text().slice(0, 500),
        location: where,
      });
    });

    page.on("pageerror", (error: Error) => {
      this.pushConsole({
        type: "error",
        text: error.message.slice(0, 500),
        location: "pageerror",
      });
    });

    page.on("dialog", (dialog: Dialog) => {
      this.pushConsole({
        type: "warning",
        text: `Dismissed ${dialog.type()} dialog: ${dialog.message().slice(0, 300)}`,
        location: page.url(),
      });
      void dialog.dismiss().catch(() => undefined);
    });

    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      const next = frame.url();
      if (this.sameDocument(this.lastDocumentUrl, next)) {
        this.lastDocumentUrl = next;
        return;
      }
      this.lastDocumentUrl = next;
      this.resetBuffers();
    });

    page.on("requestfailed", (request: Request) => {
      this.pushNetwork({
        url: request.url().slice(0, 500),
        method: request.method(),
        status: null,
        failure: request.failure()?.errorText ?? "request failed",
        resourceType: request.resourceType(),
      });
    });

    page.on("response", (response: Response) => {
      if (response.status() < 400) return;
      const request = response.request();
      this.pushNetwork({
        url: response.url().slice(0, 500),
        method: request.method(),
        status: response.status(),
        failure: null,
        resourceType: request.resourceType(),
      });
    });
  }

  private async prepare(page: Page): Promise<void> {
    const client = await page.context().newCDPSession(page);
    try {
      await client.send("Runtime.evaluate", { expression: NAME_HELPER });
    } finally {
      await client.detach();
    }
  }

  private sameDocument(previous: string, next: string): boolean {
    if (!previous || previous === next) return previous === next;
    try {
      const prevUrl = new URL(previous);
      const nextUrl = new URL(next);
      prevUrl.hash = "";
      nextUrl.hash = "";
      return prevUrl.toString() === nextUrl.toString();
    } catch {
      return false;
    }
  }

  private pushConsole(entry: ConsoleEntry): void {
    this.consoleEntries.push(entry);
    if (this.consoleEntries.length > MAX_BUFFER) this.consoleEntries.shift();
  }

  private pushNetwork(entry: NetworkEntry): void {
    this.networkEntries.push(entry);
    if (this.networkEntries.length > MAX_BUFFER) this.networkEntries.shift();
  }
}

export const session = new BrowserSession();
