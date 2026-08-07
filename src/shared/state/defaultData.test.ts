import { describe, it, expect } from "vitest";
import { defaultData } from "./defaultData";

describe("defaultData", () => {
  it("includes a pipeline block with New Lead status", () => {
    const d = defaultData();
    expect(d.pipeline.status).toBe("New Lead");
    expect(d.pipeline.chances).toBe(25);
    expect(d.pipeline.yearSplits).toEqual([]);
  });

  it("does not include the old info.outcome field", () => {
    const d = defaultData();
    expect((d.info as unknown as Record<string, unknown>).outcome).toBeUndefined();
  });
});
