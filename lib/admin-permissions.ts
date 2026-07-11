export const ADMIN_ONLY_PERMISSION_KEYS = ["completions.certificates.issue"] as const;

export const OTHER_PERMISSION_MODULES = [
  {
    id: "trainees",
    title: "Trainees",
    permissions: [
      { key: "trainees.view", label: "View Trainees" },
      { key: "trainees.create", label: "Create Trainees" },
      { key: "trainees.edit", label: "Edit Trainees" },
      { key: "trainees.delete", label: "Delete Trainees" },
    ],
  },
  {
    id: "products",
    title: "Products",
    permissions: [
      { key: "products.view", label: "View Products" },
      { key: "products.create", label: "Create Products" },
      { key: "products.edit", label: "Edit Products" },
      { key: "products.delete", label: "Delete Products" },
    ],
  },
  {
    id: "promotional_popups",
    title: "Promotion",
    permissions: [
      { key: "promotional_popups.view", label: "View Promotion" },
      { key: "promotional_popups.create", label: "Create Promotion" },
      { key: "promotional_popups.edit", label: "Edit Promotion" },
      { key: "promotional_popups.delete", label: "Delete Promotion" },
    ],
  },
  {
    id: "team_members",
    title: "Team Members",
    permissions: [
      { key: "team_members.view", label: "View Team Members" },
      { key: "team_members.create", label: "Create Team Members" },
      { key: "team_members.edit", label: "Edit Team Members" },
      { key: "team_members.delete", label: "Delete Team Members" },
    ],
  },
] as const;

export const OTHER_PERMISSION_DEFINITIONS = [
  ...OTHER_PERMISSION_MODULES[0].permissions,
  ...OTHER_PERMISSION_MODULES[1].permissions,
  ...OTHER_PERMISSION_MODULES[2].permissions,
  ...OTHER_PERMISSION_MODULES[3].permissions,
] as const;

export const TEACHER_PERMISSION_GROUPS = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Overview stats and quick navigation for the teacher workspace.",
    permissions: [{ key: "dashboard.view", label: "View Dashboard" }],
  },
  {
    id: "students",
    title: "Students",
    description: "Student profiles, enrollments, and password support.",
    permissions: [
      { key: "students.view", label: "View Students" },
      { key: "students.edit", label: "Edit Students" },
    ],
  },
  {
    id: "courses",
    title: "Courses",
    description: "Course catalog, categories, and course lifecycle actions.",
    permissions: [
      { key: "courses.view", label: "View Courses" },
      { key: "courses.create", label: "Create Courses" },
      { key: "courses.edit", label: "Edit Courses" },
      { key: "courses.delete", label: "Delete Courses" },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Task assignment, resources, and task maintenance.",
    permissions: [
      { key: "tasks.view", label: "View Tasks" },
      { key: "tasks.create", label: "Create Tasks" },
      { key: "tasks.edit", label: "Edit Tasks" },
      { key: "tasks.delete", label: "Delete Tasks" },
    ],
  },
  {
    id: "submissions",
    title: "Submissions",
    description: "Student submission review and grading tools.",
    permissions: [
      { key: "submissions.view", label: "View Submissions" },
      { key: "submissions.grade", label: "Grade Submissions" },
    ],
  },
  {
    id: "announcements",
    title: "Announcements",
    description: "Student-facing announcements and priority notices.",
    permissions: [
      { key: "announcements.view", label: "View Announcements" },
      { key: "announcements.create", label: "Create Announcements" },
    ],
  },
  {
    id: "progress",
    title: "Progress",
    description: "Automatic progress reports and completion trends.",
    permissions: [{ key: "progress.view", label: "View Progress" }],
  },
  {
    id: "applications",
    title: "Applications",
    description: "Course applications and applicant approval workflow.",
    permissions: [
      { key: "applications.view", label: "View Applications" },
      { key: "applications.approve", label: "Approve Applications" },
    ],
  },
  {
    id: "client_hunting",
    title: "Client Hunting",
    description: "Scenario-led client hunting, lead reviews, and approval workflow.",
    permissions: [
      { key: "client_hunting.view", label: "View Client Hunting" },
      { key: "client_hunting.create", label: "Create Client Hunting" },
      { key: "client_hunting.edit", label: "Edit Client Hunting" },
      { key: "client_hunting.delete", label: "Delete Client Hunting" },
      { key: "client_hunting.approve", label: "Approve Client Hunting" },
    ],
  },
  {
    id: "other",
    title: "Other",
    description: "Auxiliary admin modules and product management controls.",
    permissions: OTHER_PERMISSION_DEFINITIONS,
  },
] as const;

export const TEACHER_SELECTABLE_PERMISSION_KEYS = TEACHER_PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
);

export const ALL_PERMISSION_KEYS = [
  ...TEACHER_SELECTABLE_PERMISSION_KEYS,
  ...ADMIN_ONLY_PERMISSION_KEYS,
] as const;

export type TeacherSelectablePermissionKey = (typeof TEACHER_SELECTABLE_PERMISSION_KEYS)[number];
export type AdminOnlyPermissionKey = (typeof ADMIN_ONLY_PERMISSION_KEYS)[number];
export type PermissionKey = (typeof ALL_PERMISSION_KEYS)[number];

export type PermissionDefinition = {
  key: TeacherSelectablePermissionKey;
  label: string;
};

export type PermissionGroup = {
  id: string;
  title: string;
  description: string;
  permissions: readonly PermissionDefinition[];
};

export const permissionLabelByKey = new Map<string, string>(
  [
    ...TEACHER_PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => [permission.key, permission.label] as const)),
    ["completions.certificates.issue", "Issue Completion Certificates"] as const,
  ],
);

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function isTeacherSelectablePermissionKey(value: string): value is TeacherSelectablePermissionKey {
  return (TEACHER_SELECTABLE_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function isAdminOnlyPermissionKey(value: string): value is AdminOnlyPermissionKey {
  return (ADMIN_ONLY_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function getPermissionLabel(permissionKey: string) {
  return permissionLabelByKey.get(permissionKey) ?? permissionKey;
}

export function getPermissionLabels(permissionKeys: readonly string[]) {
  return permissionKeys.map(getPermissionLabel);
}
