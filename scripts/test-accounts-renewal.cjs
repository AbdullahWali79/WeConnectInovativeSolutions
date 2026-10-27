/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../lib/accounts-renewal.ts"), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const compiled = { exports: {} };
new Function("module", "exports", output)(compiled, compiled.exports);
const { accountStatus, latestClientSubscriptions, renewalSegment } = compiled.exports;

test("account status follows expiry date and banned override", () => {
  const today = "2026-10-27";
  assert.equal(accountStatus({ status: "active", end_date: "2026-10-20" }, today), "expired");
  assert.equal(accountStatus({ status: "active", end_date: "2026-11-03" }, today), "expiring_soon");
  assert.equal(accountStatus({ status: "active", end_date: "2026-11-18" }, today), "active");
  assert.equal(accountStatus({ status: "banned", end_date: "2026-11-18" }, today), "banned");
});

test("lapsed segments use calendar days", () => {
  assert.equal(renewalSegment("2026-10-27", "2026-10-27"), "due_today");
  assert.equal(renewalSegment("2026-10-20", "2026-10-27"), "lapsed_1_7");
  assert.equal(renewalSegment("2026-10-12", "2026-10-27"), "lapsed_8_30");
});

test("latest term identifies who has not bought again", () => {
  const prior = { id: "1", client_id: "client-1", account_id: null, tool_name: "ChatGPT", start_date: "2026-09-01", end_date: "2026-10-01", paid_amount: null, source: "legacy", created_at: "2026-09-01" };
  const renewed = { ...prior, id: "2", end_date: "2026-11-01", source: "manual", created_at: "2026-10-20" };
  assert.equal(latestClientSubscriptions([prior, renewed])[0].id, "2");
});
