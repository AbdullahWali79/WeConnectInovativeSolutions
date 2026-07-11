"use client";

import type { InternshipLetterFormValues } from "@/lib/validations/internship-letter";
import { Icon } from "@/components/icon";

export type InternshipLetterFormErrors = Partial<Record<keyof InternshipLetterFormValues, string>>;

type Props = {
  values: InternshipLetterFormValues;
  errors: InternshipLetterFormErrors;
  saving: boolean;
  onChange: <K extends keyof InternshipLetterFormValues>(field: K, value: InternshipLetterFormValues[K]) => void;
  onGenerate: () => void;
  onSave: () => void;
};

export function InternshipLetterForm({ values, errors, saving, onChange, onGenerate, onSave }: Props) {
  return (
    <form className="wc-card space-y-5 p-4" onSubmit={(event) => event.preventDefault()}>
      <div>
        <p className="wc-label">Student Details Form</p>
        <h2 className="mt-1 text-base font-bold text-on-surface">Internship Completion Letter Generator</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Student Name" error={errors.student_name}>
          <input
            className="wc-input mt-2"
            value={values.student_name}
            onChange={(event) => onChange("student_name", event.target.value)}
            placeholder="Laiba Ismaeel"
            required
          />
        </Field>

        <Field label="Father Name" error={errors.father_name}>
          <input
            className="wc-input mt-2"
            value={values.father_name}
            onChange={(event) => onChange("father_name", event.target.value)}
            placeholder="Muhammad Ismaeel"
            required
          />
        </Field>

        <Field label="Student / Employee ID" error={errors.student_id}>
          <input
            className="wc-input mt-2"
            value={values.student_id}
            onChange={(event) => onChange("student_id", event.target.value)}
            placeholder="NS-SH-I-F-D-098"
            required
          />
        </Field>

        <Field label="Gender" error={errors.gender}>
          <select
            className="wc-input mt-2"
            value={values.gender}
            onChange={(event) => onChange("gender", event.target.value as InternshipLetterFormValues["gender"])}
          >
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </Field>

        <Field label="Internship Role" error={errors.internship_role}>
          <input
            className="wc-input mt-2"
            value={values.internship_role}
            onChange={(event) => onChange("internship_role", event.target.value)}
            placeholder="Mobile App Development Intern"
            required
          />
        </Field>

        <Field label="Letter Date" error={errors.letter_date}>
          <input
            className="wc-input mt-2"
            type="date"
            value={values.letter_date}
            onChange={(event) => onChange("letter_date", event.target.value)}
            required
          />
        </Field>

        <Field label="Joining Date" error={errors.joining_date}>
          <input
            className="wc-input mt-2"
            type="date"
            value={values.joining_date}
            onChange={(event) => onChange("joining_date", event.target.value)}
            required
          />
        </Field>

        <Field label="Completion Date" error={errors.completion_date}>
          <input
            className="wc-input mt-2"
            type="date"
            value={values.completion_date}
            onChange={(event) => onChange("completion_date", event.target.value)}
            required
          />
        </Field>
      </div>

      <div className="border-t border-outline-variant/70 pt-5">
        <p className="wc-label">Evaluation Form</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field label="Attendance, Behavior and Interest" error={errors.attendance_marks}>
            <input
              className="wc-input mt-2"
              type="number"
              min={0}
              max={5}
              value={values.attendance_marks}
              onChange={(event) => onChange("attendance_marks", Number(event.target.value))}
            />
          </Field>

          <Field label="Practical Evaluation and Technical Performance" error={errors.technical_marks}>
            <input
              className="wc-input mt-2"
              type="number"
              min={0}
              max={20}
              value={values.technical_marks}
              onChange={(event) => onChange("technical_marks", Number(event.target.value))}
            />
          </Field>

          <Field label="Total Marks" error={errors.total_marks}>
            <input
              className="wc-input mt-2"
              type="number"
              min={0}
              max={25}
              value={values.total_marks}
              onChange={(event) => onChange("total_marks", Number(event.target.value))}
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-outline-variant/70 pt-5">
        <p className="wc-label">Signatures</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="HR Manager Name">
            <input
              className="wc-input mt-2"
              value={values.hr_manager_name}
              onChange={(event) => onChange("hr_manager_name", event.target.value)}
              placeholder="HR Manager"
            />
          </Field>

          <Field label="CEO Name">
            <input
              className="wc-input mt-2"
              value={values.ceo_name}
              onChange={(event) => onChange("ceo_name", event.target.value)}
              placeholder="CEO"
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-outline-variant/70 pt-5 sm:flex-row">
        <button type="button" onClick={onGenerate} className="wc-primary-btn flex-1">
          <Icon name="auto_awesome" className="text-base" />
          Generate Letter
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="wc-secondary-btn flex-1">
          <Icon name="save" className="text-base" />
          {saving ? "Saving..." : "Save Letter"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="wc-label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-semibold text-error">{error}</span> : null}
    </label>
  );
}
