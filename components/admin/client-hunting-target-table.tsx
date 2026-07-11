"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import { Icon } from "@/components/icon";
import { LoadingState } from "@/components/loading-state";
import { StatusPill } from "@/components/status-pill";
import { Toast, type ToastState } from "@/components/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getMissingProfileLinks, isStudentProfileComplete } from "@/lib/profile-links";
import type { Profile } from "@/lib/supabase/types";

type StudentTargetDrafts = Record<string, string>;
type StudentStatusFilter = "approved" | "pending";

export function ClientHuntingTargetTable() {
  const supabase = createSupabaseBrowserClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [targetSavingId, setTargetSavingId] = useState<string | null>(null);
  const [globalTargetDraft, setGlobalTargetDraft] = useState("3");
  const [studentTargetDrafts, setStudentTargetDrafts] = useState<StudentTargetDrafts>({});
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("approved");
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .in("status", ["approved", "pending"])
      .order("full_name");

    if (error) {
      setToast({ type: "error", message: error.message });
    }

    setProfiles(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo(() => {
    return profiles.map((profile) => {
      const dailyTarget = Math.max(profile.client_hunting_daily_target ?? 3, 1);
      const profileComplete = isStudentProfileComplete(profile);
      const missingLinks = getMissingProfileLinks(profile).length;

      return {
        profile,
        dailyTarget,
        profileComplete,
        missingLinks,
      };
    });
  }, [profiles]);

  const visibleRows = useMemo(
    () => rows.filter(({ profile }) => profile.status === statusFilter),
    [rows, statusFilter],
  );
  const incompleteVisibleRows = useMemo(
    () =>
      visibleRows
        .filter(({ profileComplete }) => !profileComplete)
        .sort((a, b) => {
          if (b.missingLinks !== a.missingLinks) return b.missingLinks - a.missingLinks;
          return (a.profile.full_name ?? a.profile.email ?? "").localeCompare(b.profile.full_name ?? b.profile.email ?? "");
        }),
    [visibleRows],
  );

  const statusLabel = statusFilter === "approved" ? "approved students" : "pending students";

  function patchStudentTargetDraft(studentId: string, value: string) {
    setStudentTargetDrafts((current) => ({ ...current, [studentId]: value }));
  }

  async function saveStudentTarget(studentId: string, value: string) {
    const target = Math.max(1, Number(value || 3));
    setTargetSavingId(studentId);
    const { error } = await supabase
      .from("profiles")
      .update({ client_hunting_daily_target: target })
      .eq("id", studentId)
      .eq("role", "student");
    setTargetSavingId(null);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Student client hunting range updated." });
    setStudentTargetDrafts((current) => ({ ...current, [studentId]: String(target) }));
    await loadData();
  }

  async function applyGlobalTarget() {
    const target = Math.max(1, Number(globalTargetDraft || 3));
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ client_hunting_daily_target: target })
      .eq("role", "student")
      .eq("status", "approved");
    setSaving(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Overall client hunting range applied to all approved students." });
    setStudentTargetDrafts({});
    await loadData();
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadIncompleteProfilesPdf() {
    setExportingPdf(true);

    try {
      const blob = await pdf(
        <IncompleteProfilesPdfReport
          rows={incompleteVisibleRows}
          statusFilter={statusFilter}
          generatedAt={new Date().toISOString()}
        />,
      ).toBlob();

      downloadBlob(blob, `incomplete-profile-report-${statusFilter}-${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast({ type: "success", message: "Incomplete profile PDF downloaded." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Failed to generate PDF report." });
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) return <LoadingState label="Loading client hunting ranges..." />;

  return (
    <div className="space-y-4">
      <Toast toast={toast} onClear={() => setToast(null)} />

      <div className="wc-card flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Overall range</p>
          <h3 className="mt-2 text-lg font-black text-on-surface">Set range for all students</h3>
          <p className="mt-1 text-sm text-on-surface-variant">This updates the client hunting range for every approved student in one action.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="sr-only">Overall client hunting range</span>
            <input
              className="wc-input w-32"
              type="number"
              min="1"
              value={globalTargetDraft}
              onChange={(event) => setGlobalTargetDraft(event.target.value)}
            />
          </label>
          <button type="button" onClick={applyGlobalTarget} disabled={saving} className="wc-primary-btn">
            <Icon name="done_all" />
            {saving ? "Applying..." : "Apply to all"}
          </button>
        </div>
      </div>

      <div className="wc-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Student ranges</p>
            <h3 className="mt-1 text-lg font-black text-on-surface">Edit each student client hunting range</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void downloadIncompleteProfilesPdf()}
              disabled={exportingPdf || visibleRows.length === 0}
              className="wc-secondary-btn whitespace-nowrap text-sm disabled:opacity-60"
            >
              <Icon name="picture_as_pdf" />
              {exportingPdf ? "Preparing PDF..." : "Download PDF"}
            </button>
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="whitespace-nowrap font-medium">Status</span>
              <select
                className="wc-input min-w-[150px] px-3 py-2"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StudentStatusFilter)}
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <p className="text-sm text-on-surface-variant">{visibleRows.length} {statusLabel}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse">
            <thead className="bg-surface-container-low text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Profile</th>
                <th className="px-5 py-3">Current range</th>
                <th className="px-5 py-3">Update range</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-white">
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-5 text-sm text-on-surface-variant" colSpan={6}>
                    No {statusLabel} found.
                  </td>
                </tr>
              ) : (
                visibleRows.map(({ profile, dailyTarget, profileComplete, missingLinks }) => (
                  <tr key={profile.id}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-on-surface">{profile.full_name ?? profile.email ?? "Student"}</p>
                      <p className="text-xs text-on-surface-variant">{profile.email ?? "No email"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${profileComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {profileComplete ? "Complete" : `${missingLinks} missing`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-on-surface">{dailyTarget} per day</p>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        className="wc-input w-24 px-2 py-1 text-right text-sm"
                        type="number"
                        min="1"
                        value={studentTargetDrafts[profile.id] ?? String(profile.client_hunting_daily_target ?? 3)}
                        onChange={(event) => patchStudentTargetDraft(profile.id, event.target.value)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill value={profile.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void saveStudentTarget(profile.id, studentTargetDrafts[profile.id] ?? String(profile.client_hunting_daily_target ?? 3))}
                          disabled={targetSavingId === profile.id}
                          className="wc-secondary-btn text-xs"
                        >
                          {targetSavingId === profile.id ? "Saving..." : "Save range"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const profilePdfStyles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 26,
    paddingHorizontal: 16,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#172033",
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#08265f",
    color: "#ffffff",
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#f5c542",
    marginBottom: 6,
    fontWeight: 700,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 9.5,
    color: "#dbe7ff",
    lineHeight: 1.35,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  metaChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#103c90",
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d8e0ef",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eef4ff",
    borderBottomWidth: 1,
    borderBottomColor: "#d8e0ef",
  },
  th: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 7.5,
    fontWeight: 700,
    color: "#08265f",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#edf2fb",
    minHeight: 32,
    alignItems: "stretch",
  },
  rowAlt: {
    backgroundColor: "#fafcff",
  },
  td: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8,
    lineHeight: 1.35,
    color: "#172033",
  },
  status: {
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 8,
    textAlign: "center",
  },
  approved: {
    backgroundColor: "#dcfce7",
    color: "#087f3f",
  },
  pending: {
    backgroundColor: "#ffedd5",
    color: "#b45309",
  },
  empty: {
    padding: 14,
    fontSize: 9,
    color: "#64748b",
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#d8e0ef",
    fontSize: 8,
    color: "#64748b",
  },
});

function IncompleteProfilesPdfReport({
  rows,
  statusFilter,
  generatedAt,
}: {
  rows: Array<{
    profile: Profile;
    dailyTarget: number;
    profileComplete: boolean;
    missingLinks: number;
  }>;
  statusFilter: StudentStatusFilter;
  generatedAt: string;
}) {
  const totalMissingLinks = rows.reduce((sum, row) => sum + row.missingLinks, 0);
  const title = statusFilter === "approved" ? "Approved Students" : "Pending Students";

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={profilePdfStyles.page}>
        <View style={profilePdfStyles.header}>
          <Text style={profilePdfStyles.eyebrow}>WeConnect Client Hunting</Text>
          <Text style={profilePdfStyles.title}>Incomplete Profile Report</Text>
          <Text style={profilePdfStyles.subtitle}>
            {title} only. Students with all required profile links complete are excluded from this export.
          </Text>
          <Text style={profilePdfStyles.subtitle}>Generated at: {new Date(generatedAt).toLocaleString()}</Text>
          <View style={profilePdfStyles.metaRow}>
            <Text style={profilePdfStyles.metaChip}>Rows: {rows.length}</Text>
            <Text style={profilePdfStyles.metaChip}>Missing links: {totalMissingLinks}</Text>
          </View>
        </View>

        <View style={profilePdfStyles.table}>
          <View style={profilePdfStyles.tableHeader}>
            <Text style={[profilePdfStyles.th, { width: "28%" }]}>Student</Text>
            <Text style={[profilePdfStyles.th, { width: "24%" }]}>Email</Text>
            <Text style={[profilePdfStyles.th, { width: "12%" }]}>Status</Text>
            <Text style={[profilePdfStyles.th, { width: "12%" }]}>Range</Text>
            <Text style={[profilePdfStyles.th, { width: "24%" }]}>Missing</Text>
          </View>

          {rows.length === 0 ? (
            <Text style={profilePdfStyles.empty}>No incomplete profiles found for the selected status.</Text>
          ) : (
            rows.map((row, index) => {
              return (
                <View key={row.profile.id} style={[profilePdfStyles.row, index % 2 === 1 ? profilePdfStyles.rowAlt : null]} wrap={false}>
                  <Text style={[profilePdfStyles.td, { width: "28%" }]}>{row.profile.full_name ?? "Unknown student"}</Text>
                  <Text style={[profilePdfStyles.td, { width: "24%" }]}>{row.profile.email ?? "-"}</Text>
                  <Text style={[profilePdfStyles.td, { width: "12%" }]}>
                    <Text style={[profilePdfStyles.status, row.profile.status === "approved" ? profilePdfStyles.approved : profilePdfStyles.pending]}>
                      {row.profile.status}
                    </Text>
                  </Text>
                  <Text style={[profilePdfStyles.td, { width: "12%" }]}>{row.dailyTarget} / day</Text>
                  <Text style={[profilePdfStyles.td, { width: "24%" }]}>{row.missingLinks}</Text>
                </View>
              );
            })
          )}
        </View>

        <Text style={profilePdfStyles.footer} fixed>
          <Text>WeConnect Incomplete Profiles</Text>
          <Text>Generated on {new Date(generatedAt).toLocaleDateString()}</Text>
        </Text>
      </Page>
    </Document>
  );
}
