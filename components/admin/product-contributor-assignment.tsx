"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getProductContributorCandidates,
  setStudentProductContributorAccess,
  type ProductContributorCandidate,
} from "@/app/admin/actions";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";

export function ProductContributorAssignment() {
  const [students, setStudents] = useState<ProductContributorCandidate[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    const result = await getProductContributorCandidates();
    if (!result.success) {
      setToast({ type: "error", message: result.error });
      setStudents([]);
    } else {
      setStudents(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return [];
    return students
      .filter((student) =>
        `${student.fullName} ${student.email} ${student.phone} ${student.courseTitle}`
          .toLowerCase()
          .includes(search),
      )
      .slice(0, 8);
  }, [query, students]);

  async function changeAccess(student: ProductContributorCandidate) {
    const enabled = !student.hasProductAccess;
    setBusyId(student.id);
    const result = await setStudentProductContributorAccess(student.id, enabled);
    setBusyId(null);

    if (!result.success) {
      setToast({ type: "error", message: result.error });
      return;
    }

    setStudents((current) =>
      current.map((item) => item.id === student.id ? { ...item, hasProductAccess: enabled } : item),
    );
    setToast({
      type: "success",
      message: enabled
        ? `${student.fullName} can now add and edit products from the Student Hub.`
        : `Product access removed from ${student.fullName}.`,
    });
  }

  return (
    <>
      <Toast toast={toast} onClear={() => setToast(null)} />
      <section className="wc-card mb-6 overflow-hidden">
        <div className="border-b border-outline-variant/70 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed">
              <Icon name="inventory_2" className="text-2xl" />
            </span>
            <div>
              <h2 className="text-title-lg text-on-surface">Assign Product Access</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Search an existing active, fee-paid student. No new teacher profile is created.
              </p>
            </div>
          </div>

          <div className="relative mt-5">
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant" />
            <input
              className="wc-input pl-12"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search paid student by name, email, phone, or course"
              autoComplete="off"
            />
          </div>
        </div>

        {query.trim() ? (
          <div className="divide-y divide-outline-variant/70">
            {loading ? (
              <p className="p-5 text-sm text-on-surface-variant">Checking active paid students...</p>
            ) : matches.length === 0 ? (
              <p className="p-5 text-sm text-on-surface-variant">
                No matching active paid student found.
              </p>
            ) : (
              matches.map((student) => (
                <div key={student.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-on-surface">{student.fullName}</p>
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase text-green-700">
                        Active + paid
                      </span>
                      {student.hasProductAccess ? (
                        <span className="rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold uppercase text-on-secondary-fixed">
                          Product contributor
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 break-words text-sm text-on-surface-variant">
                      {student.email}{student.phone ? ` · ${student.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {student.courseTitle} · Paid cycle {student.feeMonth}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === student.id}
                    onClick={() => changeAccess(student)}
                    className={student.hasProductAccess ? "wc-secondary-btn shrink-0" : "wc-primary-btn shrink-0"}
                  >
                    <Icon name={student.hasProductAccess ? "person_remove" : "person_add"} className="text-lg" />
                    {busyId === student.id
                      ? "Saving..."
                      : student.hasProductAccess
                        ? "Remove Access"
                        : "Assign Product Access"}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>
    </>
  );
}
