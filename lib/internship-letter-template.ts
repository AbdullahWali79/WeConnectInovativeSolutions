import type { InternshipLetterFormValues } from "@/lib/validations/internship-letter";

export type InternshipLetterData = InternshipLetterFormValues & {
  id?: string;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const internshipLetterCompany = {
  name: "WeConnect-Inovation",
  displayName: "WeConnect-Inovation Software House",
  tagline: "Professional Training and Software Development",
  phone: "03046983794",
  email: "atifayyoub582@gmail.com",
  address: "Sharqi Colony Back Side of Cookooz Cafe, Near Main Masjid.",
};

export const internshipLetterPronouns = {
  Male: {
    title: "Mr.",
    subject: "he",
    object: "him",
    possessive: "his",
  },
  Female: {
    title: "Ms.",
    subject: "she",
    object: "her",
    possessive: "her",
  },
} as const;

export function getInternshipLetterPronouns(gender: InternshipLetterFormValues["gender"]) {
  return internshipLetterPronouns[gender];
}

export function getParentRelation(gender: InternshipLetterFormValues["gender"]) {
  return gender === "Female" ? "D/O" : "S/O";
}

export function capitalize(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

export function formatLetterDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export function buildStudentReference(data: InternshipLetterData) {
  const pronouns = getInternshipLetterPronouns(data.gender);
  return `${pronouns.title} ${data.student_name} ${getParentRelation(data.gender)} ${data.father_name}`;
}

export function buildInternshipLetterParagraphs(data: InternshipLetterData & { __companyDisplayName?: string }) {
  const pronouns = getInternshipLetterPronouns(data.gender);
  const reference = buildStudentReference(data);
  const subject = pronouns.subject;
  const subjectTitle = capitalize(subject);
  const possessive = pronouns.possessive;
  const possessiveTitle = capitalize(possessive);
  const companyDisplay = data.__companyDisplayName ?? internshipLetterCompany.displayName;

  return [
    `This letter is to certify that ${reference} successfully completed ${possessive} internship at ${companyDisplay} as a ${data.internship_role} from ${formatLetterDate(data.joining_date)} to ${formatLetterDate(data.completion_date)}.`,
    `During ${possessive} internship tenure, ${subject} demonstrated strong technical abilities, creativity, and a professional attitude toward ${possessive} responsibilities. ${subjectTitle} actively contributed to application development projects and showed excellent problem-solving skills, along with a strong understanding of modern development practices and technologies.`,
    `${pronouns.title} ${data.student_name} consistently displayed sincerity, punctuality, teamwork, and a willingness to learn. ${possessiveTitle} ability to understand project requirements, collaborate effectively with team members, and complete assigned tasks efficiently made ${pronouns.object} a valuable part of our organization.`,
    `Based on ${possessive} overall performance, we found ${pronouns.object} to be hardworking, dedicated, and highly motivated. We are confident that ${subject} possesses the skills and potential required to excel in ${possessive} professional career.`,
    `We wish ${pronouns.object} continued success and a bright future in all ${possessive} future endeavors.`,
  ];
}


export function sanitizePdfFileName(value: string) {
  const safeName = value.trim().replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${safeName || "internship"}-internship-completion-letter.pdf`;
}
