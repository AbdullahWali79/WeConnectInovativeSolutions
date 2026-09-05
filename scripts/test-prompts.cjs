// Run with: node --test scripts/test-prompts.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../lib/prompts.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { promptVariables, fillPrompt, drivePreview, promptSchema } = loaded.exports;

test('variables match the actual template and repeated placeholders produce one input', () => {
  assert.deepEqual(promptVariables('{{BusinessName}} {{ TargetAudience }} {{BusinessName}} {{CTA}}'), ['BusinessName', 'TargetAudience', 'CTA']);
  assert.deepEqual(promptVariables('{{bad-key}} {{}} {{1invalid}}'), []);
});
test('substitution treats dollar sequences and nested braces literally', () => {
  assert.equal(fillPrompt('{{Offer}} for {{Name}} / {{Offer}}', { Offer: '$& $1 {{Name}}', Name: 'Acme' }), '$& $1 {{Name}} for Acme / $& $1 {{Name}}');
  assert.equal(fillPrompt('{{Name}} {{constructor}}', {}), '{{Name}} {{constructor}}');
  assert.equal(fillPrompt('{{Name}}', { Name: '  ' }), '{{Name}}');
});
test('Drive previews reject arbitrary hosts and unsafe protocols', () => {
  assert.equal(drivePreview('https://drive.google.com/file/d/abcdefghijk123/view?usp=sharing'), 'https://drive.google.com/file/d/abcdefghijk123/preview');
  assert.equal(drivePreview('https://drive.google.com/open?id=abcdefghijk123'), 'https://drive.google.com/file/d/abcdefghijk123/preview');
  for (const url of ['javascript:alert(1)', 'https://drive.google.com.evil.test/file/d/abcdefghijk123/view', 'http://drive.google.com/file/d/abcdefghijk123/view', 'https://drive.google.com/drive/folders/abcdefghijk123']) assert.equal(drivePreview(url), null);
});
const valid = { title: 'Facebook campaign', description: 'Generate campaign copy for your business.', category: 'Marketing', model: 'ChatGPT', template: 'Write three ads for {{BusinessName}}.', media_urls: ['https://drive.google.com/file/d/abcdefghijk123/view'], price: 0, purchase_url: '' };
test('paid prompts require a safe purchase link and nonnegative price', () => {
  assert.equal(promptSchema.safeParse(valid).success, true);
  assert.equal(promptSchema.safeParse({ ...valid, price: 500 }).success, false);
  assert.equal(promptSchema.safeParse({ ...valid, price: 500, purchase_url: 'https://example.com/buy' }).success, true);
  assert.equal(promptSchema.safeParse({ ...valid, price: -1 }).success, false);
  assert.equal(promptSchema.safeParse({ ...valid, price: 500, purchase_url: 'javascript:alert(1)' }).success, false);
});
test('at least one and at most six Drive output previews are required', () => {
  assert.equal(promptSchema.safeParse({ ...valid, media_urls: [] }).success, false);
  assert.equal(promptSchema.safeParse({ ...valid, media_urls: Array(7).fill(valid.media_urls[0]) }).success, false);
  assert.equal(promptSchema.safeParse({ ...valid, media_urls: ['https://example.com/image.png'] }).success, false);
});
