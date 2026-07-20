export type ScenarioTableData = {
  headers: string[];
  rows: string[][];
};

function parseDelimitedLine(line: string, delimiter: string) {
  if (delimiter !== ",") {
    return line.split(delimiter).map((cell) => cell.trim()).filter(Boolean);
  }

  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseScenarioTable(value?: string | null): ScenarioTableData | null {
  const lines = (value ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  let parsed: string[][];
  if (lines[0].includes("\t")) {
    parsed = lines.map((line) => parseDelimitedLine(line, "\t"));
  } else if (lines[0].includes("|")) {
    parsed = lines.map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
    parsed = parsed.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
  } else if (lines[0].includes(",")) {
    parsed = lines.map((line) => parseDelimitedLine(line, ","));
  } else if (/\s{2,}/.test(lines[0])) {
    parsed = lines.map((line) => line.split(/\s{2,}/).map((cell) => cell.trim()));
  } else {
    return null;
  }

  const columnCount = parsed[0]?.length ?? 0;
  if (columnCount < 2 || parsed.length < 2) return null;

  const rows = parsed.slice(1).filter((row) => row.some(Boolean));
  if (!rows.length || rows.some((row) => row.length !== columnCount)) return null;

  return { headers: parsed[0], rows };
}
