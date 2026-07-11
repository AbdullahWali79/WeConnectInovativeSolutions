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

  function flushParagraph() {
    if (paragraph.length > 0) {
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html.push("</blockquote>");
      inBlockquote = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

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

    const listItem = /^[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      flushParagraph();
      closeBlockquote();
      if (!inList) {
        html.push("<ul>");
        inList = true;
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
