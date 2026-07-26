import { describe, it, expect } from "vitest";
import * as sharedPackageEntryPoint from "./index";

// This is deliberately not a business-logic test — there's no business
// logic in this package yet (see index.ts). It exists to prove the testing
// infrastructure itself works end to end (Vitest running a TypeScript,
// ESM-imported module) before any real milestone starts depending on it.
describe("@platform/shared entry point", () => {
  it("loads without throwing", () => {
    expect(sharedPackageEntryPoint).toBeDefined();
  });
});
