import test from "node:test";
import assert from "node:assert/strict";
import { visibleAnomalies } from "../../src/ui/productScope.js";

test("the V1 demo only exposes the validated unknown-peak scenario", () => {
  assert.deepEqual(visibleAnomalies, [
    { key: "unknown_impurity_peak", label: "未知杂峰" },
  ]);
});
