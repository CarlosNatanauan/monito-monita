/**
 * The `test` every spec uses: Playwright's, plus closing every browser
 * context the test opened, even when it fails.
 *
 * The specs open a context per person ("phone") from the worker's shared
 * browser. Playwright doesn't close those, and specs of one project run in
 * the same worker, so without this they pile up: by flow-4 on WebKit there
 * were ~45 left-over pages from flow-1 to flow-3 (light strings animating,
 * pages reloading on every dev-server HMR reload), and every action in the
 * reveal spec took ~1 s, so it ran past its timeout in full runs while
 * passing on its own.
 */
import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

export const test = base.extend<{ _closeOwnContexts: void }>({
  _closeOwnContexts: [
    async ({ browser }, use) => {
      const before = new Set(browser.contexts());
      await use();
      const opened = browser.contexts().filter((context) => !before.has(context));
      await Promise.all(opened.map((context) => context.close().catch(() => {})));
    },
    { auto: true },
  ],
});
