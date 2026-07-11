"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Icon } from "@/components/icon";
import { InternshipLetterPDF } from "@/components/admin/internship-letter-pdf";
import {
  buildInternshipLetterParagraphs,
  formatLetterDate,
  internshipLetterCompany,
  sanitizePdfFileName,
  type InternshipLetterData,
} from "@/lib/internship-letter-template";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminSignatureSettings, BrandingSettingsSnapshot, SoftwareHouse } from "@/lib/supabase/types";
import { useBranding } from "@/components/branding-provider";

// Helper to resolve company info — use selectedHouse if provided, otherwise fall back to WeConnect defaults
function resolveCompany(house: SoftwareHouse | null) {
  if (!house) return internshipLetterCompany;
  return {
    name: house.name,
    displayName: house.name,
    tagline: house.tagline ?? "",
    phone: [house.phone, house.phone2].filter(Boolean).join(" | "),
    email: house.email ?? "",
    address: house.address ?? "",
  };
}

export function LetterPreview({
  data,
  selectedHouse,
  onDownload,
}: {
  data: InternshipLetterData;
  selectedHouse?: SoftwareHouse | null;
  onDownload: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [sigSettings, setSigSettings] = useState<AdminSignatureSettings | null>(null);
  const branding = useBranding().settings;
  const company = resolveCompany(selectedHouse ?? null);

  // Override paragraphs with selected house name
  const overriddenData: InternshipLetterData = {
    ...data,
    hr_manager_name: data.hr_manager_name || selectedHouse?.hr_manager_name || "HR Manager",
    ceo_name: data.ceo_name || selectedHouse?.ceo_name || "CEO",
  };

  const paragraphs = buildInternshipLetterParagraphs({
    ...overriddenData,
    // inject company name into paragraphs
    __companyDisplayName: company.name,
  } as InternshipLetterData & { __companyDisplayName?: string });

  useEffect(() => {
    async function loadSig() {
      const { data: s } = await supabase
        .from("admin_signature_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (s) setSigSettings(s as AdminSignatureSettings);
    }
    void loadSig();
  }, [supabase]);

  const logoUrl = selectedHouse?.logo_url || branding.logo_url || null;
  const watermarkUrl = selectedHouse?.watermark_url || null;
  const color1 = selectedHouse?.header_color1 ?? branding.primary_color;
  const color2 = selectedHouse?.header_color2 ?? branding.secondary_color;

  return (
    <section className="wc-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-outline-variant/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="wc-label">Preview Letter</p>
          <h2 className="mt-1 text-base font-bold text-on-surface">
            {selectedHouse ? selectedHouse.name : "WeConnect"} — Official Completion Letter
          </h2>
        </div>
        <DownloadPDFButton
          data={overriddenData}
          selectedHouse={selectedHouse ?? null}
          sigSettings={sigSettings}
          branding={branding}
          onDownload={onDownload}
        />
      </div>

      <div className="overflow-x-auto bg-surface-container p-3 md:p-5">
        <article className="relative mx-auto min-w-[720px] max-w-[820px] overflow-hidden bg-white px-8 py-6 font-serif text-[12px] leading-[1.35] text-slate-950 shadow-card">
          {/* Watermark */}
          {watermarkUrl && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">
              <div className="relative h-80 w-80">
                <Image src={watermarkUrl} alt="" fill className="object-contain" unoptimized />
              </div>
            </div>
          )}

          {/* Colored Header Bar */}
          <div className="mb-4 h-2 w-full rounded-sm" style={{ background: `linear-gradient(to right, ${color1}, ${color2}, ${color1})` }} />

          <header className="border-b border-slate-900 pb-2 text-center">
            {logoUrl ? (
              <div className="mx-auto mb-2 flex h-14 w-28 items-center justify-center">
                <div className="relative h-14 w-28">
                  <Image src={logoUrl} alt={company.name} fill className="object-contain" unoptimized />
                </div>
              </div>
            ) : (
              <div className="mx-auto mb-1 flex h-10 w-20 items-center justify-center">
                <Image src={branding.logo_url ?? "/logo.jpeg"} alt="" width={80} height={40} className="max-h-10 w-auto object-contain" unoptimized />
              </div>
            )}
            <h3 className="text-2xl font-bold leading-tight">{company.name}</h3>
            {company.tagline && <p className="text-xs">{company.tagline}</p>}
          </header>

          <div className="mt-3 flex items-center justify-between gap-6 font-bold">
            <p>Employee ID #: {data.student_id || "Not set"}</p>
            <p>Date: {formatLetterDate(data.letter_date)}</p>
          </div>

          <h4 className="my-3 text-center text-sm font-bold underline">TO WHOM IT MAY CONCERN</h4>

          <div className="space-y-2 text-justify">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <section className="mt-3">
            <h5 className="mb-1 font-bold">Internship Evaluation Summary</h5>
            <table className="w-full border border-slate-950 text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-950">
                  <th className="w-[14%] border-r border-slate-950 px-2 py-1">Sr. No.</th>
                  <th className="w-[58%] border-r border-slate-950 px-2 py-1">Component</th>
                  <th className="w-[28%] px-2 py-1">Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-950">
                  <td className="border-r border-slate-950 px-2 py-1">1.</td>
                  <td className="border-r border-slate-950 px-2 py-1">Joining Date</td>
                  <td className="px-2 py-1">{formatLetterDate(data.joining_date)}</td>
                </tr>
                <tr className="border-b border-slate-950">
                  <td className="border-r border-slate-950 px-2 py-1">2.</td>
                  <td className="border-r border-slate-950 px-2 py-1">Attendance, Behavior and Interest</td>
                  <td className="px-2 py-1">{data.attendance_marks}/5</td>
                </tr>
                <tr className="border-b border-slate-950">
                  <td className="border-r border-slate-950 px-2 py-1">3.</td>
                  <td className="border-r border-slate-950 px-2 py-1">Practical Evaluation and Technical Performance</td>
                  <td className="px-2 py-1">{data.technical_marks}/20</td>
                </tr>
                <tr>
                  <td className="border-r border-slate-950 px-2 py-1"></td>
                  <td className="border-r border-slate-950 px-2 py-1 font-bold">Total Marks</td>
                  <td className="px-2 py-1 font-bold">{data.total_marks}/25</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer className="mt-6">
            <div className="grid grid-cols-3 items-end gap-8 text-center text-[11px]">
              {/* HR Signature */}
              <div>
                {sigSettings?.hr_signature_url ? (
                  <div className="relative mb-1 mx-auto h-14 w-28">
                    <Image src={sigSettings.hr_signature_url} alt="HR Signature" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="mb-1 h-10" />
                )}
                <p className="border-b border-slate-950 pb-1 font-bold">{overriddenData.hr_manager_name || "HR Manager"}</p>
                <p className="mt-1">HR Manager</p>
              </div>

              {/* Stamp */}
              <div className="mx-auto flex h-14 w-20 items-center justify-center">
                {sigSettings?.stamp_url ? (
                  <div className="relative h-14 w-20">
                    <Image src={sigSettings.stamp_url} alt="Company Stamp" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-14 w-20 items-center justify-center border border-dashed border-slate-950 text-[10px]">
                    <span>{selectedHouse?.name?.split(" ")[0] ?? "Company"}</span>
                  </div>
                )}
              </div>

              {/* CEO Signature */}
              <div>
                {sigSettings?.signature_url ? (
                  <div className="relative mb-1 mx-auto h-14 w-28">
                    <Image src={sigSettings.signature_url} alt="CEO Signature" fill className="object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="mb-1 h-10" />
                )}
                <p className="border-b border-slate-950 pb-1 font-bold">{overriddenData.ceo_name || "CEO"}</p>
                <p className="mt-1">Chief Executive Officer</p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-950 pt-1 text-center text-[10px] leading-5">
              <p>{company.phone} | {company.email}</p>
              <p>{company.address}</p>
            </div>
          </footer>

          {/* Bottom Color Bar */}
          <div className="mt-4 h-2 w-full rounded-sm" style={{ background: `linear-gradient(to right, ${color1}, ${color2}, ${color1})` }} />
        </article>
      </div>
    </section>
  );
}

function DownloadPDFButton({
  data,
  selectedHouse,
  sigSettings,
  branding,
  onDownload,
}: {
  data: InternshipLetterData;
  selectedHouse: SoftwareHouse | null;
  sigSettings: AdminSignatureSettings | null;
  branding: BrandingSettingsSnapshot;
  onDownload: () => void;
}) {
  return (
    <PDFDownloadLink
      document={<InternshipLetterPDF data={data} selectedHouse={selectedHouse} sigSettings={sigSettings} branding={branding} />}
      fileName={sanitizePdfFileName(data.student_name)}
      className="wc-primary-btn px-4 py-2 text-sm"
      onClick={onDownload}
    >
      {({ loading }) => (
        <>
          <Icon name="download" className="text-base" />
          {loading ? "Preparing PDF..." : "Download PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
