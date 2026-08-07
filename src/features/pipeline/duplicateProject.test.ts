import { describe, it, expect } from "vitest";
import { defaultData } from "../../shared/state/defaultData";
import { duplicateProjectData } from "./duplicateProject";

describe("duplicateProjectData", () => {
  it("clones settings, calc, and proposal from the source", () => {
    const source = defaultData();
    source.settings.team[0].rate = 999;
    source.calc.reimb = 1234;
    source.proposal.clarifications = "custom text";

    const result = duplicateProjectData(source, "26-05");

    expect(result.settings.team[0].rate).toBe(999);
    expect(result.calc.reimb).toBe(1234);
    expect(result.proposal.clarifications).toBe("custom text");
  });

  it("does not share references with the source (deep clone, not shallow)", () => {
    const source = defaultData();
    const result = duplicateProjectData(source, "26-05");
    result.settings.team[0].rate = 1;
    expect(source.settings.team[0].rate).not.toBe(1);
  });

  it("clears client/project identity fields", () => {
    const source = defaultData();
    source.info.name = "Old Project";
    source.info.client = "Old Client";
    source.info.clientCompany = "Old Co";
    source.info.clientAddr = "123 Main St";
    source.info.clientEmail = "old@example.com";

    const result = duplicateProjectData(source, "26-05");

    expect(result.info.name).toBe("");
    expect(result.info.client).toBe("");
    expect(result.info.clientCompany).toBe("");
    expect(result.info.clientAddr).toBe("");
    expect(result.info.clientEmail).toBe("");
  });

  it("clears project areas", () => {
    const source = defaultData();
    source.info.areas = [{ area: "Suite 100", useType: "Office Upfit", sf: "5000", selPct: 10, selSF: 11 }];
    const result = duplicateProjectData(source, "26-05");
    expect(result.info.areas).toEqual(defaultData().info.areas);
  });

  it("resets pipeline to New Lead with today's date and the given project number", () => {
    const source = defaultData();
    source.pipeline.status = "Won / In Process";
    source.pipeline.potentialFee = 90000;

    const result = duplicateProjectData(source, "26-07");

    expect(result.pipeline.status).toBe("New Lead");
    expect(result.pipeline.chances).toBe(25);
    expect(result.pipeline.potentialFee).toBe(0);
    expect(result.pipeline.projectNumber).toBe("26-07");
    expect(result.pipeline.date).toBe(new Date().toISOString().slice(0, 10));
  });
});
