function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return escapeHtml(trimmed);

  try {
    const url = new URL(trimmed);
    if (["http:", "https:", "mailto:"].includes(url.protocol)) {
      return escapeHtml(url.toString());
    }
  } catch {
    return "#";
  }

  return "#";
}

function renderInline(value: string) {
  let html = escapeHtml(value);

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => {
    return `<img src="${safeUrl(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    return `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  });

  return html;
}

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let inList = false;
  let inBlockquote = false;
  let listType: "ul" | "ol" | null = null;

  function flushParagraph() {
    if (paragraph.length > 0) {
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (inList && listType) {
      html.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  }

  function renderTable(rows: string[][]) {
    if (!rows.length) return;
    const [header, ...body] = rows;
    html.push('<div class="rich-table-scroll"><table><thead><tr>');
    header.forEach((cell) => html.push(`<th>${renderInline(cell.trim())}</th>`));
    html.push("</tr></thead><tbody>");
    body.forEach((row) => {
      html.push("<tr>");
      header.forEach((_cell, index) => html.push(`<td>${renderInline((row[index] ?? "").trim())}</td>`));
      html.push("</tr>");
    });
    html.push("</tbody></table></div>");
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html.push("</blockquote>");
      inBlockquote = false;
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trimEnd();

    const nextLine = lines[lineIndex + 1]?.trim() ?? "";
    const isMarkdownTable = line.includes("|") && /^\|?\s*:?-{3,}/.test(nextLine);
    const isTabTable = line.split("\t").length >= 2 && nextLine.split("\t").length >= 2;
    if (!inCode && (isMarkdownTable || isTabTable)) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const rows: string[][] = [];
      const splitRow = (value: string) => isTabTable ? value.split("\t") : value.replace(/^\||\|$/g, "").split("|");
      rows.push(splitRow(line));
      if (isMarkdownTable) lineIndex += 1;
      while (lineIndex + 1 < lines.length) {
        const candidate = lines[lineIndex + 1].trim();
        if (!candidate || (isTabTable ? !candidate.includes("\t") : !candidate.includes("|"))) break;
        rows.push(splitRow(candidate));
        lineIndex += 1;
      }
      renderTable(rows);
      continue;
    }

    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        closeList();
        closeBlockquote();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      closeBlockquote();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      closeBlockquote();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const unorderedItem = /^[-*]\s+(.+)$/.exec(line);
    const orderedItem = /^\d+[.)]\s+(.+)$/.exec(line);
    const listItem = unorderedItem ?? orderedItem;
    if (listItem) {
      flushParagraph();
      closeBlockquote();
      const nextListType = orderedItem ? "ol" : "ul";
      if (inList && listType !== nextListType) closeList();
      if (!inList) {
        html.push(`<${nextListType}>`);
        inList = true;
        listType = nextListType;
      }
      html.push(`<li>${renderInline(listItem[1])}</li>`);
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      if (!inBlockquote) {
        html.push("<blockquote>");
        inBlockquote = true;
      }
      html.push(`<p>${renderInline(quote[1])}</p>`);
      continue;
    }

    closeList();
    closeBlockquote();
    paragraph.push(line.trim());
  }

  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  flushParagraph();
  closeList();
  closeBlockquote();

  return html.join("\n");
}
