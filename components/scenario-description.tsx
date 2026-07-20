import { parseScenarioTable } from "@/lib/scenario-table";

export function ScenarioDescription({ value, compact = false }: { value?: string | null; compact?: boolean }) {
  const table = parseScenarioTable(value);

  if (!table) {
    return <p className={`${compact ? "text-xs" : "text-sm leading-6"} whitespace-pre-wrap text-on-surface-variant`}>{value || "No description provided."}</p>;
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
                <td key={cellIndex} className={`px-4 py-3 align-top leading-6 text-on-surface ${cellIndex === 1 ? "font-bold text-[#0A2A72]" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
