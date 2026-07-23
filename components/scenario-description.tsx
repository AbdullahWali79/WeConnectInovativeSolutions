import { parseScenarioTable } from "@/lib/scenario-table";

const scenarioUrlPattern = /(https?:\/\/[^\s<>]+)/gi;

function LinkifiedText({ value }: { value: string }) {
  return value.split(scenarioUrlPattern).map((part, index) => {
    if (!/^https?:\/\//i.test(part)) return part;

    const trailingPunctuation = part.match(/[.,;:!?]+$/)?.[0] ?? "";
    const href = trailingPunctuation ? part.slice(0, -trailingPunctuation.length) : part;
    return (
      <span key={`${href}-${index}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:text-primary/80"
          title="Open link in a new tab"
        >
          {href}
        </a>
        {trailingPunctuation}
      </span>
    );
  });
}

export function ScenarioDescription({ value, compact = false }: { value?: string | null; compact?: boolean }) {
  const table = parseScenarioTable(value);

  if (!table) {
    return (
      <p className={`${compact ? "text-xs" : "text-sm leading-6"} whitespace-pre-wrap text-on-surface-variant`}>
        <LinkifiedText value={value || "No description provided."} />
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
      <table className={`w-full min-w-[680px] border-collapse text-left ${compact ? "text-xs" : "text-sm"}`}>
        <thead className="bg-[#EEF4FF] text-[#0A2A72]">
          <tr>
            {table.headers.map((header, index) => (
              <th key={`${header}-${index}`} className="border-b border-outline-variant px-4 py-3 font-black">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-outline-variant/70 last:border-b-0 hover:bg-[#F8FAFF]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`px-4 py-3 align-top leading-6 text-on-surface ${cellIndex === 1 ? "font-bold text-[#0A2A72]" : ""}`}>
                  <LinkifiedText value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
