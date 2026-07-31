import { AccessDenied } from "@/components/admin/access-denied";
import { ProjectsCatalog, type ProjectBundle } from "@/components/admin/projects-catalog";
import { requirePermissionPage } from "@/lib/admin-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Course, CourseProject, Enrollment, Profile, StudentFeeRecord, Task } from "@/lib/supabase/types";

export default async function AdminProjectsPage() {
  const access = await requirePermissionPage("/admin/projects-catalog", "courses.view");

  if (!access.granted) {
    return <AccessDenied description="Projects access has not been enabled for this account." />;
  }

  const supabase = createSupabaseServiceClient();
  const { data: projectsData } = await supabase.from("course_projects").select("*").order("created_at");
  const projects = (projectsData ?? []) as CourseProject[];
  
  const [coursesResult, activeCoursesResult] = await Promise.all([
    supabase.from("courses").select("*").eq("status", "active").order("title"),
    supabase.from("courses").select("*").eq("status", "active"),
  ]);

  const courses = (coursesResult.data ?? []) as Course[];
  const activeCourses = (activeCoursesResult.data ?? []) as Course[];
  const equivalentCourseIds = new Map<string, string[]>();

  courses.forEach((course) => {
    const matchingIds = activeCourses
      .filter(
        (candidate) =>
          candidate.id === course.id ||
          (course.category_id && candidate.category_id && candidate.category_id === course.category_id),
      )
      .map((candidate) => candidate.id);

    equivalentCourseIds.set(course.id, [...new Set([course.id, ...matchingIds])]);
  });

  const relevantCourseIds = [
    ...new Set([...equivalentCourseIds.values()].flat()),
  ];
  const [enrollmentsResult, tasksResult, feesResult] = await Promise.all([
    supabase.from("enrollments").select("*").in("course_id", relevantCourseIds).eq("status", "active"),
    supabase.from("tasks").select("*").in("course_id", relevantCourseIds).eq("workflow_type", "project"),
    supabase.from("student_fee_records").select("*").in("course_id", relevantCourseIds),
  ]);

  const enrollments = (enrollmentsResult.data ?? []) as Enrollment[];
  const tasks = (tasksResult.data ?? []) as Task[];
  const feeRecords = (feesResult.data ?? []) as StudentFeeRecord[];
  
  const paidEnrollmentIds = new Set(
    feeRecords
      .filter(
        (record) =>
          record.status === "paid" ||
          (record.status === "partial" && Number(record.amount_paid) > 0),
      )
      .map((record) => record.enrollment_id)
      .filter((id): id is string => Boolean(id)),
  );
  
  const paidStudentCourseKeys = new Set(
    feeRecords
      .filter(
        (record) =>
          record.status === "paid" ||
          (record.status === "partial" && Number(record.amount_paid) > 0),
      )
      .map((record) => `${record.student_id}:${record.course_id}`),
  );
  
  const paidEnrollments = enrollments.filter(
    (enrollment) =>
      paidEnrollmentIds.has(enrollment.id) ||
      paidStudentCourseKeys.has(`${enrollment.student_id}:${enrollment.course_id}`),
  );
  
  const studentIds = [...new Set(paidEnrollments.map((enrollment) => enrollment.student_id))];
  let students: Profile[] = [];

  if (studentIds.length > 0) {
    const { data: studentData } = await supabase
      .from("profiles")
      .select("*")
      .in("id", studentIds)
      .eq("role", "student")
      .eq("status", "approved")
      .order("full_name");

    students = ((studentData ?? []) as Profile[]).filter(
      (student) => !student.admin_status || student.admin_status === "active" || student.admin_status === "approved",
    );
  }

  const bundles: ProjectBundle[] = courses.map((course) => {
    const matchingCourseIds = new Set(equivalentCourseIds.get(course.id) ?? [course.id]);
    const matchingEnrollments = paidEnrollments.filter((enrollment) =>
      matchingCourseIds.has(enrollment.course_id),
    );
    const enrollmentByStudent = new Map<string, Enrollment>();

    matchingEnrollments.forEach((enrollment) => {
      const savedEnrollment = enrollmentByStudent.get(enrollment.student_id);
      if (!savedEnrollment || enrollment.course_id === course.id) {
        enrollmentByStudent.set(enrollment.student_id, enrollment);
      }
    });

    return {
      course,
      projects: projects.filter((project) => project.course_id === course.id),
      students: students
        .filter((student) => enrollmentByStudent.has(student.id))
        .map((student) => ({
          ...student,
          assignmentCourseId: enrollmentByStudent.get(student.id)!.course_id,
        })),
      existingTasks: tasks.filter((task) => matchingCourseIds.has(task.course_id)),
    };
  });

  return (
    <ProjectsCatalog
      bundles={bundles}
      canAssign={access.permissions.includes("tasks.create")}
      canEdit={access.permissions.includes("courses.edit")}
    />
  );
}
