import { z } from "zod";

export const internshipLetterSchema = z
  .object({
    student_name: z.string().trim().min(2, "Student name is required"),
    father_name: z.string().trim().min(2, "Father name is required"),
    gender: z.enum(["Male", "Female"]),
    student_id: z.string().trim().min(3, "Student ID is required"),
    internship_role: z.string().trim().min(3, "Internship role is required"),
    joining_date: z.string().trim().min(1, "Joining date is required"),
    completion_date: z.string().trim().min(1, "Completion date is required"),
    letter_date: z.string().trim().min(1, "Letter date is required"),
    attendance_marks: z.coerce.number().int().min(0).max(5),
    technical_marks: z.coerce.number().int().min(0).max(20),
    total_marks: z.coerce.number().int().min(0).max(25),
    hr_manager_name: z.string().trim().optional().default(""),
    ceo_name: z.string().trim().optional().default(""),
  })
  .refine((data) => data.completion_date >= data.joining_date, {
    path: ["completion_date"],
    message: "Completion date must be on or after joining date.",
  });

export type InternshipLetterFormValues = z.infer<typeof internshipLetterSchema>;
