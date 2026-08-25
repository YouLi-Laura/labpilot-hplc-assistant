import test from "node:test";
import assert from "node:assert/strict";
import { validateStep2Answers } from "../../src/ui/stepQuestions.js";

const UNKNOWN_LOCATION_CONFLICT =
  "未知峰出现位置已选择明确位置，但同时选择了‘不确定’，两者冲突。请保留明确位置或仅选择‘不确定’。";

test("rejects Unknown combined with any explicit peak location", () => {
  const explicitLocations = ["Blank", "Standard", "Sample", "SST", "RepeatInjection"];

  for (const explicitLocation of explicitLocations) {
    const answers = {
      peakLocations: [explicitLocation, "Unknown"],
      ...(explicitLocation === "Sample" ? { sampleOccurrenceScope: "allSamples" } : {})
    };
    const conflicts = validateStep2Answers(answers);

    assert.ok(
      conflicts.some((conflict) =>
        conflict.fields.length === 1 &&
        conflict.fields[0] === "peakLocations" &&
        conflict.message === UNKNOWN_LOCATION_CONFLICT
      ),
      `Expected Unknown conflict for ${explicitLocation}`
    );
  }

  assert.ok(
    !validateStep2Answers({ peakLocations: ["Unknown"] })
      .some((conflict) => conflict.message === UNKNOWN_LOCATION_CONFLICT)
  );
  assert.ok(
    !validateStep2Answers({ peakLocations: ["Blank"] })
      .some((conflict) => conflict.message === UNKNOWN_LOCATION_CONFLICT)
  );
});
