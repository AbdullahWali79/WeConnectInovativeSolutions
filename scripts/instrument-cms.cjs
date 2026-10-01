/* eslint-disable @typescript-eslint/no-require-imports */
/* One-time, source-preserving migration. Existing cmsId values must never be regenerated.
 * Run after adding a public page to annotate only new JSX elements.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const roots = ["app/page.tsx", ...["talent", "services", "study-abroad", "research-consultancy", "courses", "internships", "trainees", "completed-students", "apply", "simulations", "team", "mous", "products", "videos", "testimonials", "ai-tools", "prompts", "blogs", "news", "contact", "feedback", "privacy-policy", "terms"].flatMap(name => {
  function pages(dir) {
    return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? pages(`${dir}/${e.name}`) : e.name === "page.tsx" ? [`${dir}/${e.name}`] : []) : [];
  }
  return pages(`app/${name}`);
})];
const excluded = /(?:public-header|chatbot|protected-simulation|promo-popup|certificate-page-client)\.tsx$/;
const files = new Set();
function collect(file) {
  if (files.has(file) || excluded.test(file) || !fs.existsSync(file)) return;
  files.add(file);
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/from\s+["'](@\/components\/(?:public|ai-tools|prompts)\/[^"']+)["']/g)) collect(match[1].replace("@/", "") + ".tsx");
  for (const match of source.matchAll(/from\s+["'](\.\/[^"']+)["']/g)) {
    const target = path.posix.join(path.posix.dirname(file), match[1]) + ".tsx";
    if (!/actions|admin/.test(target)) collect(target);
  }
}
roots.forEach(collect);
const tags = new Set("main section article aside div p h1 h2 h3 h4 h5 h6 span a img button label ul ol li footer header nav table thead tbody tr td th blockquote strong small figure figcaption".split(" "));
let total = 0;
for (const file of files) {
  let source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const used = new Set();
  const prefix = crypto.createHash("sha1").update(file).digest("hex").slice(0, 8);
  const existing = [...source.matchAll(/cmsId="[^"]*-(\d+)"/g)].map(m => Number(m[1]));
  let count = existing.length ? Math.max(...existing) + 1 : 0;
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const open = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = open.tagName.getText(ast);
      if (["svg", "script", "style", "pre", "code"].includes(tag)) return;
      const key = open.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(ast) === "key");
      const keyValue = key?.initializer && (ts.isJsxExpression(key.initializer) ? key.initializer.expression?.getText(ast) : key.initializer.getText(ast));
      const isCms = /^Cms/.test(tag);
      if (tags.has(tag) || tag === "Link" || tag === "Image") {
        const replacement = tag === "Link" ? "CmsLink" : tag === "Image" ? "CmsImage" : "CmsElement";
        used.add(replacement);
        edits.push({ start: open.tagName.getStart(ast), end: open.tagName.end, text: `${replacement} cmsId="${prefix}-${count++}"${replacement === "CmsElement" ? ` as="${tag}"` : ""}${keyValue ? ` instance={String(${keyValue})}` : ""}` });
        if (ts.isJsxElement(node)) edits.push({ start: node.closingElement.tagName.getStart(ast), end: node.closingElement.tagName.end, text: replacement });
      } else if (!isCms && keyValue && (/^[A-Z]/.test(tag) || tag.startsWith("motion.")) && !(ts.isJsxElement(node.parent) && node.parent.openingElement.tagName.getText(ast) === "CmsInstance")) {
        used.add("CmsInstance");
        edits.push({ start: node.getStart(ast), end: node.getStart(ast), text: `<CmsInstance key={${keyValue}} instance={String(${keyValue})}>` });
        edits.push({ start: node.end, end: node.end, text: "</CmsInstance>" });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!edits.length) continue;
  for (const edit of edits.sort((a,b) => b.start - a.start || b.end - a.end)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  const importText = `import { ${[...used].join(", ")} } from "@/components/cms/cms-element";\n`;
  const existingImport = /import \{ ([^}]+) \} from "@\/components\/cms\/cms-element";\r?\n/;
  if (existingImport.test(source)) source = source.replace(existingImport, (_, names) => `import { ${[...new Set([...names.split(", "), ...used])].join(", ")} } from "@/components/cms/cms-element";\n`);
  else {
    const directive = ast.statements.find(statement => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === "use client");
    const offset = directive ? directive.end : 0;
    source = source.slice(0, offset) + importText + source.slice(offset);
  }
  // Replaced components no longer need their original imports.
  if (!/<Link[\s/>]/.test(source)) source = source.replace(/import Link from ["']next\/link["'];?\r?\n/, "");
  if (!/<Image[\s/>]/.test(source)) source = source.replace(/import Image from ["']next\/image["'];?\r?\n/, "");
  fs.writeFileSync(file, source);
  total++;
}
console.log(`Connected ${total} public page/component files to the visual editor.`);
