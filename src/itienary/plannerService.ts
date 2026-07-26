import { plannerSnapshotMock } from "./mockData";
import { PlannerSnapshot } from "./types";

const NETWORK_DELAY_MS = 350;

function cloneSnapshot(source: PlannerSnapshot): PlannerSnapshot {
  return JSON.parse(JSON.stringify(source)) as PlannerSnapshot;
}

export async function getPlannerSnapshot(): Promise<PlannerSnapshot> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(cloneSnapshot(plannerSnapshotMock)), NETWORK_DELAY_MS);
  });
}

export async function regenerateSummaryMock(
  current: PlannerSnapshot,
): Promise<PlannerSnapshot> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const next = cloneSnapshot(current);
      next.summary.version += 1;
      next.summary.generatedAtIso = new Date().toISOString();
      next.summary.status = "generated";
      next.summary.model = "gpt-5.3-codex-mock-refresh";
      next.summary.highlights = [
        ...next.summary.highlights,
        "Summary regenerated from mock service.",
      ];

      resolve(next);
    }, NETWORK_DELAY_MS);
  });
}
