import * as xlsx from "xlsx";


export const BLOG_EXCEL_HEADERS = [
  "Title",
  "Slug",
  "Content (Markdown/HTML)",
  "Excerpt",
  "Target Keyword",
  "Tags (comma separated)",
  "Cover Image URL",
  "SEO Title",
  "SEO Description",
  "Display Order",
  "Published (Yes/No)",
  "Featured (Yes/No)",
];

export const BLOG_REQUIRED_COLUMNS = [0, 1, 2]; // Title, Slug, Content are required

export function downloadBlogWorkbook() {
  const wb = xlsx.utils.book_new();

  // Create template row
  const templateRow = [
    "My Awesome Blog Post", // Title
    "my-awesome-blog-post", // Slug
    "<p>Write your HTML or Markdown content here!</p>", // Content
    "This is a short summary of the blog post...", // Excerpt
    "awesome blog", // Target Keyword
    "tech, business, tips", // Tags
    "https://example.com/image.jpg", // Cover Image URL
    "My Awesome Blog Post | SEO Ready", // SEO Title
    "Read this awesome blog post about tech and business.", // SEO Description
    "1", // Display Order
    "Yes", // Published
    "No", // Featured
  ];

  const wsData = [BLOG_EXCEL_HEADERS, templateRow];
  const ws = xlsx.utils.aoa_to_sheet(wsData);

  // Auto-size columns to be readable
  ws["!cols"] = BLOG_EXCEL_HEADERS.map((h, i) => {
    if (i === 2) return { wch: 50 }; // Content
    if (i === 3 || i === 8) return { wch: 40 }; // Excerpts / Descriptions
    return { wch: 25 }; // Default
  });

  xlsx.utils.book_append_sheet(wb, ws, "Blogs");

  // Create instructions sheet
  const instructionData = [
    ["Instructions for Bulk Uploading Blogs"],
    [""],
    ["1. Required Fields:", "Title, Slug, and Content are strictly required."],
    ["2. Content Field:", "You can paste raw HTML (like from an AI tool) or Markdown."],
    ["3. Yes/No Fields:", "Type 'Yes' to enable or 'No' to disable. Blank means 'No'."],
    ["4. Multiple Tags:", "Separate tags using commas (e.g., ai, design, software)."],
    ["5. Slugs:", "Slugs must be unique URL-friendly text (e.g., this-is-my-post)."],
  ];
  
  const instructionWs = xlsx.utils.aoa_to_sheet(instructionData);
  instructionWs["!cols"] = [{ wch: 25 }, { wch: 80 }];
  xlsx.utils.book_append_sheet(wb, instructionWs, "Instructions");

  const bytes = xlsx.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weconnect_blogs_template_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type BlogExcelSheet = {
  name: string;
  headers: string[];
  hasData: boolean;
};

export function inspectBlogWorkbook(bytes: ArrayBuffer): BlogExcelSheet[] {
  const wb = xlsx.read(bytes, { type: "array" });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const data = xlsx.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false });
    return { name, headers: data[0] || [], hasData: data.length > 1 };
  });
}

function parseYesNo(val: string | undefined): boolean {
  if (!val) return false;
  return ["yes", "y", "true", "1"].includes(val.toString().trim().toLowerCase());
}

export function readBlogWorkbook(bytes: ArrayBuffer, sheetName: string): { rows: Record<string, unknown>[]; issues: string[] } {
  const wb = xlsx.read(bytes, { type: "array" });
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("Sheet not found");

  const rawRows = xlsx.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false });
  if (rawRows.length < 2) return { rows: [], issues: ["No data found in sheet"] };

  // Assume first row is header
  const dataRows = rawRows.slice(1);
  const parsedRows: Record<string, unknown>[] = [];
  const issues: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const r = dataRows[i];
    
    const title = (r[0] || "").toString().trim();
    const slug = (r[1] || "").toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const content = (r[2] || "").toString().trim();
    
    if (!title) { issues.push(`Row ${rowNum}: Missing Title`); continue; }
    if (!slug) { issues.push(`Row ${rowNum}: Missing Slug`); continue; }
    if (!content) { issues.push(`Row ${rowNum}: Missing Content`); continue; }

    const tagsStr = (r[5] || "").toString();
    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) : [];

    parsedRows.push({
      title,
      slug,
      content,
      excerpt: (r[3] || "").toString().trim(),
      target_keyword: (r[4] || "").toString().trim(),
      tags,
      cover_image_url: (r[6] || "").toString().trim(),
      seo_title: (r[7] || "").toString().trim(),
      seo_description: (r[8] || "").toString().trim(),
      display_order: parseInt((r[9] || "1").toString().trim(), 10) || 1,
      published: parseYesNo(r[10]),
      featured: parseYesNo(r[11]),
    });
  }

  return { rows: parsedRows, issues };
}
