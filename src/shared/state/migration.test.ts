import { describe, it, expect } from "vitest";
import { migrateToUnifiedStore, type OldStore, type OldOppState } from "./migration";

function makeOldStore(overrides: Partial<OldStore> = {}): OldStore {
  return {
    currentId: "p1",
    order: ["p1"],
    projects: {
      p1: {
        created: 1000,
        updated: 2000,
        data: {
          info: { name: "Test Project", client: "Test Client", outcome: "Write Proposal" },
        },
      },
    },
    ...overrides,
  };
}

describe("migrateToUnifiedStore", () => {
  it("merges a linked opportunity's CRM fields onto its project", () => {
    const oldStore = makeOldStore();
    const oldOpp: OldOppState = {
      year: "2026",
      pendingTarget: 500000,
      projects: [
        {
          _id: "opp1", client: "Test Client", project: "Test Project", status: "Pending Approval",
          potentialFee: 45000, invoiced: 10000, remaining: 35000, chances: 75,
          date: "2026-03-01", fallbackYear: "2026", lostReason: "",
          yearSplits: [], projectNumber: "26-01", projectId: "p1",
        },
      ],
    };

    const result = migrateToUnifiedStore(oldStore, oldOpp);

    expect(result.order).toEqual(["p1"]);
    expect(result.projects.p1.data.pipeline).toEqual({
      status: "Pending Approval",
      potentialFee: 45000,
      invoiced: 10000,
      remaining: 35000,
      chances: 75,
      date: "2026-03-01",
      fallbackYear: "2026",
      lostReason: "",
      yearSplits: [],
      projectNumber: "26-01",
    });
    expect((result.projects.p1.data.info as Record<string, unknown>).outcome).toBeUndefined();
    expect(result.pipelineSettings).toEqual({ year: "2026", pendingTarget: 500000 });
  });

  it("synthesizes a new minimal project for an opportunity that was never promoted", () => {
    const oldStore = makeOldStore();
    const oldOpp: OldOppState = {
      year: "2026",
      pendingTarget: 500000,
      projects: [
        {
          _id: "opp2", client: "Raw Lead Client", project: "Raw Lead Project", status: "New Lead",
          potentialFee: 5000, invoiced: 0, remaining: 5000, chances: 25,
          date: "", fallbackYear: "2026", lostReason: "",
          yearSplits: [], projectNumber: "26-02",
          // no projectId -- never promoted
        },
      ],
    };

    const result = migrateToUnifiedStore(oldStore, oldOpp);

    expect(result.order).toHaveLength(2);
    const newId = result.order.find((id) => id !== "p1")!;
    expect(newId).toBeDefined();
    expect(result.projects[newId].data.info.name).toBe("Raw Lead Project");
    expect(result.projects[newId].data.info.client).toBe("Raw Lead Client");
    expect(result.projects[newId].data.pipeline.potentialFee).toBe(5000);
    expect(result.projects[newId].data.pipeline.projectNumber).toBe("26-02");
  });

  it("falls back to info.outcome for a project with no linked opportunity at all", () => {
    const oldStore = makeOldStore();
    const result = migrateToUnifiedStore(oldStore, null);

    expect(result.projects.p1.data.pipeline.status).toBe("Write Proposal");
    expect(result.projects.p1.data.pipeline.potentialFee).toBe(0);
    expect(result.pipelineSettings.pendingTarget).toBe(500000);
  });

  it("applies legacy status renames during migration", () => {
    const oldStore = makeOldStore({
      projects: {
        p1: { created: 1000, updated: 2000, data: { info: { name: "T", client: "C", outcome: "Pending" } } },
      },
    });
    const result = migrateToUnifiedStore(oldStore, null);
    expect(result.projects.p1.data.pipeline.status).toBe("Pending Approval");
  });

  it("skips order entries with no matching project record", () => {
    const oldStore = makeOldStore({ order: ["p1", "ghost"] });
    const result = migrateToUnifiedStore(oldStore, null);
    expect(result.order).toEqual(["p1"]);
  });
});
