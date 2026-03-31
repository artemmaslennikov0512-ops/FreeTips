import assert from "node:assert/strict";
import { test } from "node:test";
import { isCabinetM5CompetitionTheme, m5SplitDisplayName } from "../../config/cabinet-theme-logins";

test("m5SplitDisplayName splits first token and remainder", () => {
  assert.deepEqual(m5SplitDisplayName("Ахмед M5F90"), { first: "Ахмед", rest: "M5F90" });
  assert.deepEqual(m5SplitDisplayName("  Ахмед   M5F90  "), { first: "Ахмед", rest: "M5F90" });
  assert.deepEqual(m5SplitDisplayName("Single"), { first: "Single", rest: null });
  assert.deepEqual(m5SplitDisplayName(""), { first: "Пользователь", rest: null });
});

test("isCabinetM5CompetitionTheme matches configured logins case-insensitively", () => {
  assert.equal(isCabinetM5CompetitionTheme("ahmedm5f90"), true);
  assert.equal(isCabinetM5CompetitionTheme("AhmedM5F98"), true);
  assert.equal(isCabinetM5CompetitionTheme("other"), false);
  assert.equal(isCabinetM5CompetitionTheme(null), false);
});
