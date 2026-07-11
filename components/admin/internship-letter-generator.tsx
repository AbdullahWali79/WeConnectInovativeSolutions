"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import type { ZodError } from "zod";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Toast, type ToastState } from "@/components/toast";
import { InternshipLetterForm, type InternshipLetterFormErrors } from "@/components/admin/internship-letter-form";
import { LetterPreview } from "@/components/admin/internship-letter-preview";
import { createInternshipLetter } from "@/app/admin/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Course, Enrollment, InternshipLetter, Profile, ProgressReport, SoftwareHouse } from "@/lib/supabase/types";
import { formatLetterDate } from "@/lib/internship-letter-template";
import { internshipLetterSchema, type InternshipLetterFormValues } from "@/lib/validations/internship-letter";
import Image from "next/image";

function dateInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function createDefaultForm(): InternshipLetterFormValues {
  const today = dateInputValue();
  return {
    student_name: "",
    father_name: "",
    gender: "Female",
    student_id: "",
    internship_role: "",
    joining_date: today,
    completion_date: today,
    letter_date: today,
    attendance_marks: 5,
    technical_marks: 20,
    total_marks: 25,
    hr_manager_name: "",
    ceo_name: "",
  };
}

function formFromLetter(letter: InternshipLetter): InternshipLetterFormValues {
  return {
    student_name: letter.student_name,
    father_name: letter.father_name,
    gender: letter.gender,
    student_id: letter.student_id,
    internship_role: letter.internship_role,
    joining_date: letter.joining_date.slice(0, 10),
    completion_date: letter.completion_date.slice(0, 10),
    letter_date: letter.letter_date.slice(0, 10),
    attendance_marks: letter.attendance_marks,
    technical_marks: letter.technical_marks,
    total_marks: letter.total_marks,
    hr_manager_name: letter.hr_manager_name ?? "",
    ceo_name: letter.ceo_name ?? "",
  };
}

function errorsFromValidation(error: ZodError<InternshipLetterFormValues>) {
  const nextErrors: InternshipLetterFormErrors = {};
  error.issues.forEach((issue) => {
    const field = issue.path[0] as keyof InternshipLetterFormValues | undefined;
    if (field && !nextErrors[field]) {
      nextErrors[field] = issue.message;
    }
  });
  return nextErrors;
}

export function InternshipLetterGenerator() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<InternshipLetterFormValues>(() => createDefaultForm());
  const [errors, setErrors] = useState<InternshipLetterFormErrors>({});
  const [letters, setLetters] = useState<InternshipLetter[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // Software Houses
  const [softwareHouses, setSoftwareHouses] = useState<SoftwareHouse[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  const [selectedHouse, setSelectedHouse] = useState<SoftwareHouse | null>(null);

  // Load software houses
  useEffect(() => {
    async function loadHouses() {
      const { data } = await supabase
        .from("software_houses")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      const houses = (data as SoftwareHouse[]) ?? [];
      setSoftwareHouses(houses);
      if (houses.length > 0) {
        setSelectedHouseId(houses[0].id);
        setSelectedHouse(houses[0]);
        // Pre-fill HR/CEO from first house
        setForm((prev) => ({
          ...prev,
          hr_manager_name: houses[0].hr_manager_name ?? "",
          ceo_name: houses[0].ceo_name ?? "",
        }));
      }
    }
    void loadHouses();
  }, [supabase]);

  // When house changes, update HR/CEO names
  function handleHouseChange(houseId: string) {
    setSelectedHouseId(houseId);
    const house = softwareHouses.find((h) => h.id === houseId) ?? null;
    setSelectedHouse(house);
    if (house) {
      setForm((prev) => ({
        ...prev,
        hr_manager_name: house.hr_manager_name ?? "",
        ceo_name: house.ceo_name ?? "",
      }));
    }
  }

  const loadLetters = useCallback(async () => {
    setLoadingRecent(true);
    const { data, error } = await supabase
      .from("internship_letters")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) setToast({ type: "error", message: error.message });
    setLetters(data ?? []);
    setLoadingRecent(false);
  }, [supabase]);

  useEffect(() => { void loadLetters(); }, [loadLetters]);

  useEffect(() => {
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");
    if (!studentId || !courseId) return;

    async function loadCompletionContext() {
      const [studentResult, courseResult, enrollmentResult, reportResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", studentId).single(),
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("enrollments").select("*").eq("student_id", studentId).eq("course_id", courseId).single(),
        supabase.from("progress_reports").select("*").eq("student_id", studentId).eq("course_id", courseId).maybeSingle(),
      ]);

      const student = studentResult.data as Profile | null;
      const course = courseResult.data as Course | null;
      const enrollment = enrollmentResult.data as Enrollment | null;
      const report = reportResult.data as ProgressReport | null;

      if (studentResult.error || courseResult.error || enrollmentResult.error || !student || !course || !enrollment) {
        setToast({ type: "error", message: "Could not load completed course details for letter." });
        return;
      }

      const averageScore = report?.average_score ?? enrollment.final_score ?? 0;
      const technicalMarks = Math.min(20, Math.max(0, Math.round((averageScore / 100) * 20)));
      const completionDate = enrollment.completed_at ? enrollment.completed_at.slice(0, 10) : dateInputValue();

      setForm((current) => ({
        ...current,
        student_name: student.full_name ?? "",
        student_id: `WC-${student.id.slice(0, 8).toUpperCase()}`,
        internship_role: `${course.title} Intern`,
        joining_date: enrollment.created_at.slice(0, 10),
        completion_date: completionDate,
        letter_date: dateInputValue(),
        attendance_marks: 5,
        technical_marks: technicalMarks,
        total_marks: Math.min(25, 5 + technicalMarks),
      }));
      setErrors({});
      setToast({ type: "info", message: "Completed course details synced into the letter form." });
    }

    void loadCompletionContext();
  }, [searchParams, supabase]);

  function updateField<K extends keyof InternshipLetterFormValues>(field: K, value: InternshipLetterFormValues[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value } as InternshipLetterFormValues;
      if (field === "attendance_marks" || field === "technical_marks") {
        const attendance = Number(field === "attendance_marks" ? value : current.attendance_marks);
        const technical = Number(field === "technical_marks" ? value : current.technical_marks);
        next.total_marks = Math.min(25, Math.max(0, attendance + technical));
      }
      return next;
    });
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function validateForm() {
    const result = internshipLetterSchema.safeParse(form);
    if (!result.success) {
      setErrors(errorsFromValidation(result.error));
      return null;
    }
    setErrors({});
    setForm(result.data);
    return result.data;
  }

  function generateLetter() {
    const parsed = validateForm();
    if (!parsed) {
      setToast({ type: "error", message: "Please fix form errors before generating." });
      return;
    }
    setToast({ type: "success", message: "Letter generated successfully." });
  }

  async function saveLetter() {
    const parsed = validateForm();
    if (!parsed) {
      setToast({ type: "error", message: "Failed to generate letter." });
      return;
    }
    setSaving(true);
    const result = await createInternshipLetter(parsed);
    setSaving(false);
    if (!result.success) {
      setToast({ type: "error", message: result.error ?? "Failed to save letter." });
      return;
    }
    setForm(formFromLetter(result.data));
    setLetters((current) => [result.data, ...current.filter((letter) => letter.id !== result.data.id)].slice(0, 8));
    setToast({ type: "success", message: "Letter saved successfully." });
  }

  function generateNewLetter() {
    setForm(createDefaultForm());
    setErrors({});
  }

  function previewSavedLetter(letter: InternshipLetter) {
    setForm(formFromLetter(letter));
    setErrors({});
    setToast({ type: "info", message: "Saved letter loaded for preview." });
  }

  return (
    <>
      <Toast toast={toast} onClear={clearToast} />
      <PageHeader
        eyebrow="Internship Letters"
        title="Internship Completion Letter Generator"
        description="Generate, preview, save, and download official completion letters after internship completion."
        action={
          <button type="button" onClick={generateNewLetter} className="wc-primary-btn px-4 py-2 text-sm">
            <Icon name="add" className="text-base" />
            Generate New Letter
          </button>
        }
      />

      {/* Company Selector */}
      <div className="mb-6 wc-card p-4">
        <p className="wc-label mb-2">Select Software House / Company</p>
        {softwareHouses.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
            <Icon name="warning" className="text-amber-500" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">No software houses found</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Go to <strong>Software Houses</strong> in the sidebar to add companies first.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {softwareHouses.map((house) => {
              const isSelected = selectedHouseId === house.id;
              return (
                <button
                  key={house.id}
                  type="button"
                  onClick={() => handleHouseChange(house.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container"
                  }`}
                >
                  {house.logo_url ? (
                    <div className="relative h-8 w-14 shrink-0">
                      <Image src={house.logo_url} alt={house.name} fill className="object-contain" unoptimized />
                    </div>
                  ) : (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-black"
                      style={{ background: house.header_color1 ?? "#1e40af" }}
                    >
                      {house.name.charAt(0)}
                    </div>
                  )}
                  <div className="text-left">
                    <p className={`text-sm font-bold ${isSelected ? "text-primary" : "text-on-surface"}`}>{house.name}</p>
                    {house.tagline && <p className="text-xs text-on-surface-variant">{house.tagline}</p>}
                  </div>
                  {isSelected && <Icon name="check_circle" className="ml-1 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid gap-6 2xl:grid-cols-[minmax(420px,0.9fr)_minmax(640px,1.1fr)]">
          <div className="space-y-6">
            <InternshipLetterForm
              values={form}
              errors={errors}
              saving={saving}
              onChange={updateField}
              onGenerate={generateLetter}
              onSave={saveLetter}
            />

            <RecentLetters
              letters={letters}
              loading={loadingRecent}
              onPreview={previewSavedLetter}
            />
          </div>

          <LetterPreview
            data={form}
            selectedHouse={selectedHouse}
            onDownload={() => setToast({ type: "success", message: "PDF downloaded successfully." })}
          />
        </div>
      </motion.div>
    </>
  );
}

function RecentLetters({
  letters,
  loading,
  onPreview,
}: {
  letters: InternshipLetter[];
  loading: boolean;
  onPreview: (letter: InternshipLetter) => void;
}) {
  return (
    <section className="wc-card overflow-hidden">
      <div className="border-b border-outline-variant/70 p-4">
        <p className="wc-label">Saved Letters</p>
        <h2 className="mt-1 text-base font-bold text-on-surface">Recent records</h2>
      </div>

      {loading ? (
        <div className="p-4 text-sm font-semibold text-on-surface-variant">Loading recent letters...</div>
      ) : letters.length === 0 ? (
        <div className="p-4">
          <EmptyState title="No letters saved yet" description="Saved internship letters will appear here." icon="description" />
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/70">
          {letters.map((letter) => (
            <div key={letter.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate font-bold text-on-surface">{letter.student_name}</p>
                <p className="text-xs text-on-surface-variant">
                  {letter.student_id} | {letter.internship_role}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {formatLetterDate(letter.joining_date)} to {formatLetterDate(letter.completion_date)}
                </p>
              </div>
              <button type="button" onClick={() => onPreview(letter)} className="wc-secondary-btn px-3 py-2 text-xs">
                <Icon name="visibility" className="text-sm" />
                Preview Letter
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
