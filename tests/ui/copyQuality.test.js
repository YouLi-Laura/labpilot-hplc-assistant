import test from "node:test";
import assert from "node:assert/strict";
import { directionTemplates } from "../../src/ui/diagnosticDirections.js";

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, output));
  }
  return output;
}

test("static direction copy contains no accidental duplicate sentence punctuation", () => {
  const copy = collectStrings(directionTemplates).join("\n");
  assert.doesNotMatch(copy, /。{2,}|．{2,}/);
});
