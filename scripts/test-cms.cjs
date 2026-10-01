/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, "..", relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename; loaded.paths = module.paths; cache.set(filename, loaded);
  const original = loaded.require.bind(loaded);
  loaded.require = name => name.startsWith("@/lib/cms/") ? load(`${name.slice(2)}.ts`) : name === "./cms-provider" ? load("components/cms/cms-provider.tsx") : original(name);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const { safeUrl, documentSchema, emptyDocument, pageIsActive, menuIsVisible, isPublicPath } = load("lib/cms/model.ts");
const { CmsProvider } = load("components/cms/cms-provider.tsx");
const { CmsElement, CmsInstance, CmsLink, CmsImage } = load("components/cms/cms-element.tsx");
const h = React.createElement;
function render(document, children, preview = false) { return renderToStaticMarkup(h(CmsProvider, { path: "/services", initialDocument: documentSchema.parse(document), settings: [], preview }, children)); }
const setting = (id, changes) => ({ id, label: id, active: true, menu_visible: true, sort_order: 0, ...changes });

test("inactive pages block descendants with path boundaries; hidden menus do not block pages", () => {
  const settings = [setting("/services", { active: false }), setting("/blogs", { menu_visible: false })];
  assert.equal(pageIsActive("/services", settings), false);
  assert.equal(pageIsActive("/services/web", settings), false);
  assert.equal(pageIsActive("/services-extra", settings), true);
  assert.equal(pageIsActive("/blogs", settings), true);
  assert.equal(menuIsVisible("/blogs", settings), false);
  assert.equal(menuIsVisible("/services/web", settings), false);
  assert.equal(pageIsActive("/contact", [setting("/", { active: false })]), true);
  assert.equal(pageIsActive("/", [setting("/", { active: false })]), false);
});
test("menu groups and anchors can be disabled independently", () => {
  const settings = [setting("group:learning", { active: false }), setting("/simulations#python", { active: false })];
  assert.equal(menuIsVisible("group:learning", settings), false);
  assert.equal(menuIsVisible("/simulations#python", settings), false);
  assert.equal(pageIsActive("/simulations", settings), true);
});
test("unsafe URLs and unsupported style fields cannot be published", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "//evil.test", "/\\evil.test", "https://a.test\nfoo"]) assert.equal(safeUrl(value), false, value);
  for (const value of ["/contact", "https://example.com/image.jpg", "#overview", "mailto:hello@example.com", "tel:+123", ""]) assert.equal(safeUrl(value), true, value);
  assert.equal(documentSchema.safeParse({ elements: { title: { href: "javascript:alert(1)" } }, blocks: [] }).success, false);
  assert.equal(documentSchema.safeParse({ elements: { title: { style: { fontSize: 1000 } } }, blocks: [] }).success, false);
  assert.deepEqual(documentSchema.parse({ elements: { title: { style: { position: "fixed", color: "#123456" } } }, blocks: [] }).elements.title.style, { color: "#123456" });
});
test("admin and application routes are not publicly editable", () => {
  for (const route of ["/admin", "/admin/pages", "/student/profile", "/login", "/api/test", "/_next/a"]) assert.equal(isPublicPath(route), false);
  assert.equal(isPublicPath("/services/web"), true);
});
test("server output applies text and styles while preserving inline children", () => {
  const doc = emptyDocument(); doc.elements.heading = { texts: { 0: "Edited <script>" }, style: { color: "#123456" } };
  const markup = render(doc, h(CmsElement, { cmsId: "heading", as: "h1" }, "Original", h("strong", null, "Keep icon/inline content")));
  assert.match(markup, /Edited &lt;script&gt;/); assert.match(markup, /<strong>Keep icon\/inline content<\/strong>/);
  assert.match(markup, /color:#123456/); assert.doesNotMatch(markup, /data-cms-id/);
});
test("repeated cards have independent edits and original fields remain intact", () => {
  const doc = emptyDocument(); doc.elements["title/card-a"] = { texts: { 0: "Only A changed" } };
  const markup = render(doc, ["card-a", "card-b"].map(instance => h(CmsInstance, { key: instance, instance }, h(CmsElement, { cmsId: "title", as: "p" }, instance))));
  assert.match(markup, /Only A changed/); assert.match(markup, /<p>card-b<\/p>/);
});
test("hidden elements remain selectable only in authorized preview", () => {
  const doc = emptyDocument(); doc.elements.section = { hidden: true };
  const child = h(CmsElement, { cmsId: "section", as: "section" }, "Hidden section");
  assert.match(render(doc, child), /display:none/);
  const preview = render(doc, child, true); assert.match(preview, /data-cms-id="section"/); assert.doesNotMatch(preview, /display:none/);
});
test("original section ordering preserves other child positions", () => {
  const doc = emptyDocument(); doc.order.main = ["b", "a"];
  const markup = render(doc, h(CmsElement, { cmsId: "main", as: "main" }, h("header", null, "Navigation"), h(CmsElement, { cmsId: "a", as: "section" }, "Alpha"), h(CmsElement, { cmsId: "b", as: "section" }, "Beta")));
  assert.match(markup, /Navigation<\/header><section>Beta<\/section><section>Alpha/);
});
test("image and link wrappers render editable destinations without changing native structure", () => {
  const doc = emptyDocument(); doc.elements.link = { href: "/new", texts: { 0: "New link" } }; doc.elements.image = { src: "/new.png", alt: "New alt" };
  const markup = render(doc, [h(CmsLink, { key: "link", cmsId: "link", href: "/old" }, "Old link"), h(CmsImage, { key: "image", cmsId: "image", src: "/old.png", alt: "Old", width: 100, height: 100 })]);
  assert.match(markup, /href="\/new"/); assert.match(markup, /New link/); assert.match(markup, /src="\/new.png"/); assert.match(markup, /alt="New alt"/);
});
test("new sections render in saved order, escape text and omit hidden sections", () => {
  const doc = emptyDocument();
  const block = (id, title, hidden = false) => ({ id, title, body: "<b>Safe text</b>", image: "", button: "Read more", href: "/contact", position: "after", hidden, style: {} });
  doc.blocks = [block("b", "Second"), block("a", "First"), block("c", "Hidden", true)];
  const markup = render(doc, h("main", null, "Existing page"));
  assert.ok(markup.indexOf("Second") < markup.indexOf("First")); assert.doesNotMatch(markup, /Hidden/); assert.match(markup, /&lt;b&gt;Safe text&lt;\/b&gt;/);
});

function actionHarness(authorized = true) {
  const writes = []; const invalidated = [];
  const filename = path.resolve(__dirname, "../app/admin/pages/actions.ts");
  const loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  const mocks = {
    "@/lib/admin-access": { requireAdminOnly: async () => { if (!authorized) throw new Error("Unauthorized"); return { id: "admin" }; } },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ from: table => ({ upsert: async row => { writes.push({ table, row }); return { error: null }; } }) }) },
    "@/lib/cms/registry": { getPageEntries: async () => [{ id: "/services", href: "/services" }] },
    "@/lib/cms/model": load("lib/cms/model.ts"),
    "next/cache": { revalidatePath: (...args) => invalidated.push(args) },
  };
  loaded.require = name => mocks[name] ?? original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return { actions: loaded.exports, writes, invalidated };
}
test("unauthorized saves never write drafts, publications or activation settings", async () => {
  const { actions, writes } = actionHarness(false);
  assert.equal((await actions.savePageDocument("/services", emptyDocument(), true)).ok, false);
  assert.equal((await actions.savePageSetting(setting("/services", { active: false }))).ok, false);
  assert.deepEqual(writes, []);
});
test("saving a draft cannot change the public document; publishing updates both snapshots", async () => {
  const draft = actionHarness();
  assert.equal((await draft.actions.savePageDocument("/services", emptyDocument(), false)).ok, true);
  assert.deepEqual(draft.writes.map(w => w.table), ["site_page_drafts"]);
  const publish = actionHarness();
  assert.equal((await publish.actions.savePageDocument("/services", emptyDocument(), true)).ok, true);
  assert.deepEqual(publish.writes.map(w => w.table), ["site_page_drafts", "site_page_content"]);
  assert.deepEqual(publish.writes[0].row.document, publish.writes[1].row.document);
  assert.ok(publish.invalidated.some(args => args[0] === "/services"));
});
test("unknown pages and invalid content are rejected before database writes", async () => {
  const { actions, writes } = actionHarness();
  assert.equal((await actions.savePageDocument("/admin", emptyDocument(), true)).ok, false);
  assert.equal((await actions.savePageDocument("/unknown", emptyDocument(), true)).ok, false);
  assert.equal((await actions.savePageSetting(setting("/unknown", {}))).ok, false);
  assert.equal((await actions.savePageDocument("/services", { elements: { title: { href: "javascript:alert(1)" } }, blocks: [] }, true)).ok, false);
  assert.deepEqual(writes, []);
});
