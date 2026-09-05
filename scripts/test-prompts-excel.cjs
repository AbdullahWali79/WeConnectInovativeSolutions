// Run: node --test scripts/test-prompts.cjs scripts/test-prompts-excel.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const XLSX = require('xlsx');

function loadTs(relative, mocks = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  cache.set(filename, loaded);
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const local = name.startsWith('@/') ? path.resolve(__dirname, '..', name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (fs.existsSync(`${local}.ts`)) return loadTs(`${local}.ts`, mocks, cache);
    }
    return originalRequire(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return loaded.exports;
}

const { createPromptWorkbook, readPromptWorkbook } = loadTs('lib/prompt-excel.ts');
const { parsePromptImportPayload } = loadTs('lib/prompt-import.ts');
const valid = { title: 'Campaign prompt', description: 'Create a complete campaign for a business.', category: 'Marketing', model: 'ChatGPT', template: 'Write ads for {{BusinessName}}.\nOffer: {{Offer}} — اردو', price: 0, purchase_url: '', media_urls: ['https://drive.google.com/file/d/abcdefghijk123/view'] };
const bytes = (workbook) => XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

test('Excel export/import round-trip preserves variables, Unicode, newlines, media and paid prices', () => {
  const paid = { ...valid, title: 'Premium prompt', price: 1250.5, purchase_url: 'https://example.com/buy', media_urls: [...valid.media_urls, 'https://drive.google.com/file/d/abcdefghijk456/view'] };
  const result = readPromptWorkbook(bytes(createPromptWorkbook([valid, paid])));
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.rows, [valid, paid]);
});
test('empty template does not accidentally import the example sheet', () => {
  const workbook = createPromptWorkbook();
  assert.ok(workbook.Sheets.Instructions);
  assert.ok(workbook.Sheets['Example (do not import)']);
  const result = readPromptWorkbook(bytes(workbook));
  assert.equal(result.rows.length, 0);
  assert.match(result.issues[0].message, /between 1 and 100/);
});
test('validation preserves Excel row numbers and rejects the whole batch', () => {
  const workbook = createPromptWorkbook([valid, { ...valid, title: 'Second prompt', price: 50 }]);
  const result = readPromptWorkbook(bytes(workbook));
  assert.equal(result.rows.length, 0);
  assert.ok(result.issues.some((issue) => issue.row === 3 && /purchase/.test(issue.message)));
});
test('wrong headings, formula cells, oversized files and too many rows are rejected', () => {
  const wrong = createPromptWorkbook([valid]);
  wrong.Sheets.Prompts.A1.v = 'Wrong';
  assert.throws(() => readPromptWorkbook(bytes(wrong)), /headings/);
  const formula = createPromptWorkbook([valid]);
  formula.Sheets.Prompts.A2 = { t: 's', v: 'Campaign prompt', f: 'CONCAT("Campaign", "prompt")' };
  assert.throws(() => readPromptWorkbook(bytes(formula)), /plain value/);
  assert.throws(() => readPromptWorkbook(new ArrayBuffer(2 * 1024 * 1024 + 1)), /2 MB/);
  const tooMany = createPromptWorkbook(Array.from({ length: 101 }, (_, i) => ({ ...valid, title: `Prompt ${i}` })));
  assert.throws(() => readPromptWorkbook(bytes(tooMany)), /100/);
});
test('formula-looking user text exports as plain strings; duplicate rows are rejected', () => {
  const text = { ...valid, title: '=HYPERLINK("https://example.com")' };
  const workbook = createPromptWorkbook([text]);
  assert.equal(workbook.Sheets.Prompts.A2.t, 's');
  assert.equal(workbook.Sheets.Prompts.A2.f, undefined);
  assert.equal(readPromptWorkbook(bytes(workbook)).rows[0].title, text.title);
  assert.match(readPromptWorkbook(bytes(createPromptWorkbook([valid, valid]))).issues[0].message, /Duplicate/);
});
test('server validation rejects invalid data and strips spreadsheet permission/ownership fields', () => {
  assert.throws(() => parsePromptImportPayload('not json'), /Invalid import/);
  assert.throws(() => parsePromptImportPayload(JSON.stringify([{ ...valid, media_urls: [] }])), /Row 2/);
  assert.deepEqual(parsePromptImportPayload(JSON.stringify([{ ...valid, status: 'approved', contributor_id: 'someone-else', admin_note: 'override' }])), [valid]);
});

function actionMocks({ contributor = null, isAdmin = true, dbError = null } = {}) {
  const inserts = [];
  const mocks = {
    'next/cache': { revalidatePath() {} },
    '@/lib/admin-access': { async requireAdminOnly() { if (!isAdmin) throw new Error('Unauthorized'); } },
    '@/lib/prompts-server': {
      async currentContributor() { return contributor; }, async limitPromptAction() {},
      promptDb() { return { from() { return { async insert(rows) { inserts.push(rows); return { error: dbError }; } }; } }; },
    },
  };
  return { mocks, inserts };
}
test('admin import checks authorization before writing and inserts valid rows in one batch', async () => {
  const denied = actionMocks({ isAdmin: false });
  const deniedActions = loadTs('app/admin/prompts/actions.ts', denied.mocks);
  assert.equal((await deniedActions.importAdminPrompts(JSON.stringify([valid]), 'approved')).ok, false);
  assert.equal(denied.inserts.length, 0);
  const allowed = actionMocks();
  const actions = loadTs('app/admin/prompts/actions.ts', allowed.mocks);
  assert.equal((await actions.importAdminPrompts(JSON.stringify([valid, { ...valid, title: 'Second prompt' }]), 'approved')).ok, true);
  assert.equal(allowed.inserts.length, 1);
  assert.equal(allowed.inserts[0].length, 2);
  assert.equal(allowed.inserts[0][0].contributor_id, null);
  assert.equal(allowed.inserts[0][0].status, 'approved');
});
test('contributor bulk imports enforce account status, ownership and direct-publishing permission', async () => {
  for (const status of ['pending', 'rejected']) {
    const denied = actionMocks({ contributor: { id: 'owner', status } });
    const result = await loadTs('app/prompts/actions.ts', denied.mocks).importContributorPrompts(JSON.stringify([valid]));
    assert.equal(result.ok, false); assert.equal(denied.inserts.length, 0);
  }
  for (const auto_publish of [false, true]) {
    const allowed = actionMocks({ contributor: { id: 'owner', status: 'approved', auto_publish } });
    const result = await loadTs('app/prompts/actions.ts', allowed.mocks).importContributorPrompts(JSON.stringify([{ ...valid, contributor_id: 'victim', status: 'approved' }]));
    assert.equal(result.ok, true);
    assert.equal(allowed.inserts[0][0].contributor_id, 'owner');
    assert.equal(allowed.inserts[0][0].status, auto_publish ? 'approved' : 'pending');
  }
});
test('invalid rows do not reach the database and database failure is reported', async () => {
  const invalid = actionMocks();
  const actions = loadTs('app/admin/prompts/actions.ts', invalid.mocks);
  assert.equal((await actions.importAdminPrompts(JSON.stringify([valid, { ...valid, title: '' }]), 'pending')).ok, false);
  assert.equal(invalid.inserts.length, 0);
  const failure = actionMocks({ dbError: { message: 'database error' } });
  const result = await loadTs('app/admin/prompts/actions.ts', failure.mocks).importAdminPrompts(JSON.stringify([valid]), 'pending');
  assert.equal(result.ok, false); assert.match(result.message, /No prompts were saved/);
});
