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

const { createPromptWorkbook, readPromptWorkbook, inspectPromptWorkbook, suggestPromptColumns } = loadTs('lib/prompt-excel.ts');
const { parsePromptImportPayload } = loadTs('lib/prompt-import.ts');
const valid = { title: 'Campaign prompt', description: 'Create a complete campaign for a business.', category: 'Marketing', model: 'ChatGPT', template: 'Write ads for {{BusinessName}}.\nOffer: {{Offer}} — اردو', price: 0, purchase_url: '', media_urls: ['https://drive.google.com/file/d/abcdefghijk123/view'] };
const bytes = (workbook) => XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

test('Google Form sheet matches reordered question headings and ignores timestamp/email columns', () => {
  const workbook = XLSX.utils.book_new();
  const headers = ['Timestamp', 'Email Address', 'Prompt title', 'AI model / tool', 'Category', 'Description / what this prompt creates', 'Prompt template', 'Google Drive links'];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ['2026-09-05', 'someone@example.com', valid.title, valid.model, valid.category, valid.description, valid.template, `${valid.media_urls[0]}, https://drive.google.com/file/d/abcdefghijk456/view`]]), 'Form Responses 1');
  const file = bytes(workbook);
  assert.equal(inspectPromptWorkbook(file)[0].name, 'Form Responses 1');
  const result = readPromptWorkbook(file, { sheetName: 'Form Responses 1', columns: suggestPromptColumns(headers) });
  assert.deepEqual(result.issues, []);
  assert.equal(result.rows[0].title, valid.title);
  assert.equal(result.rows[0].price, 0);
  assert.equal(result.rows[0].media_urls.length, 2);
  assert.equal(result.rows[0].email, undefined);
});
test('manual column mapping supports custom questions and rejects missing or reused required columns', () => {
  const workbook = XLSX.utils.book_new();
  const headers = ['نام', 'تفصیل', 'قسم', 'ماڈل', 'پرامپٹ', 'تصویر'];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, [valid.title, valid.description, valid.category, valid.model, valid.template, valid.media_urls[0]]]), 'Responses');
  const file = bytes(workbook);
  const columns = [0, 1, 2, 3, 4, -1, -1, 5, -1, -1, -1, -1, -1];
  assert.deepEqual(readPromptWorkbook(file, { sheetName: 'Responses', columns }).rows, [valid]);
  assert.throws(() => readPromptWorkbook(file, { sheetName: 'Responses', columns: suggestPromptColumns(headers) }), /required columns/);
  assert.throws(() => readPromptWorkbook(file, { sheetName: 'Responses', columns: [0, 0, ...columns.slice(2)] }), /different source column/);
});

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

test('student response headings map both output images and identify the populated sheet', () => {
  const workbook = createPromptWorkbook();
  const headers = ['Timestamp', 'Title', 'Description', 'Category', 'AI Model', 'Prompt Template', 'Price (PKR)', 'Purchase URL', 'OutPut Image 01', 'OutPut Image 02 Optional', 'Import Status', 'Import Errors', 'Added to Prompts At'];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ['', valid.title, valid.description, 'Option 1', valid.model, valid.template, 0, '', valid.media_urls[0], valid.media_urls[0], 'Needs Fix', 'Old script error', '']]), 'Form Responses 1');
  const file = bytes(workbook);
  const sheets = inspectPromptWorkbook(file);
  assert.equal(sheets.find(s => s.name === 'Prompts').hasData, false);
  assert.equal(sheets.find(s => s.name === 'Form Responses 1').hasData, true);
  const columns = suggestPromptColumns(headers);
  assert.equal(columns[7], 8); assert.equal(columns[8], 9);
  const parsed = readPromptWorkbook(file, { sheetName: 'Form Responses 1', columns });
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].media_urls.length, 2);
  assert.equal(parsed.rows[0].status, undefined);
});

test('correction preview retains invalid and missing values without making them importable', () => {
  const invalid = { ...valid, title: 'A'.repeat(435), description: 'Logo', price: 1000, media_urls: [] };
  const file = bytes(createPromptWorkbook([invalid]));
  const columns = Array.from({ length: 13 }, (_, i) => i);
  columns[2] = -1;
  const parsed = readPromptWorkbook(file, { sheetName: 'Prompts', columns, allowCorrections: true });
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.drafts[0].title, invalid.title);
  assert.equal(parsed.drafts[0].category, '');
  assert.ok(parsed.issues.some(i => /description/.test(i.message)));
  assert.ok(parsed.issues.some(i => /purchase_url/.test(i.message)));
  assert.throws(() => parsePromptImportPayload(JSON.stringify(parsed.drafts)), /Row 2/);
  assert.deepEqual(parsePromptImportPayload(JSON.stringify([valid])), [valid]);
});

if (process.env.PROMPT_TEST_WORKBOOK) test('provided student workbook retains all 13 submissions and maps image columns', () => {
  const workbook = XLSX.readFile(process.env.PROMPT_TEST_WORKBOOK);
  const file = bytes(workbook);
  const selected = inspectPromptWorkbook(file).find(s => s.hasData);
  assert.equal(selected.name, 'Form Responses 1');
  const parsed = readPromptWorkbook(file, { sheetName: selected.name, columns: suggestPromptColumns(selected.headers), allowCorrections: true });
  assert.equal(parsed.drafts.length, 13);
  assert.ok(parsed.drafts.every(row => row.media_urls.length >= 1));
  assert.equal(parsed.rows.length, 0);
  assert.deepEqual([...new Set(parsed.issues.map(i => i.row))], [10, 11]);
});

test('admin can edit an existing prompt while preserving its ownership', async () => {
  const updates = [];
  const mocks = actionMocks().mocks;
  mocks['@/lib/prompts-server'].promptDb = () => ({ from(table) {
    assert.equal(table, 'prompt_library');
    return { update(payload) { return { eq(field, id) {
      updates.push({ payload, field, id });
      return { select() { return { async single() { return { error: null }; } }; } };
    } }; } };
  } });
  const form = new FormData();
  for (const [key, value] of Object.entries(valid)) form.set(key, key === 'media_urls' ? value.join('\n') : String(value));
  form.set('operation', 'save');
  form.set('id', '123e4567-e89b-42d3-a456-426614174000');
  form.set('status', 'pending');
  form.set('admin_note', 'Corrected missing details');
  const result = await loadTs('app/admin/prompts/actions.ts', mocks).managePrompt(form);
  assert.equal(result.ok, true);
  assert.equal(updates[0].id, form.get('id'));
  assert.equal(updates[0].payload.title, valid.title);
  assert.equal(updates[0].payload.status, 'pending');
  assert.equal(updates[0].payload.contributor_id, undefined);
  const denied = actionMocks({ isAdmin: false });
  assert.equal((await loadTs('app/admin/prompts/actions.ts', denied.mocks).managePrompt(form)).ok, false);
});
