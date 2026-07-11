import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Course, Enrollment, Profile, ProgressReport } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

type ResultCardPDFProps = {
  student: Profile | null;
  course: Course | null;
  enrollment: Enrollment;
  report: ProgressReport | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  card: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    padding: 24,
  },
  eyebrow: {
    color: "#072b8a",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#072b8a",
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 18,
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  muted: {
    color: "#475569",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  metric: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 10,
    padding: 12,
  },
  label: {
    color: "#64748b",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
  },
  value: {
    color: "#072b8a",
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
    color: "#475569",
  },
});

export function ResultCardPDF({ student, course, enrollment, report }: ResultCardPDFProps) {
  const totalTasks = report?.total_tasks ?? 0;
  const completedTasks = report?.completed_tasks ?? 0;
  const progress = report?.progress_percentage ?? enrollment.progress_percentage;
  const score = report?.average_score ?? enrollment.final_score;

  return (
    <Document title={`${student?.full_name ?? "student"}-${course?.title ?? "course"}-result-card`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>WeConnect-Inovation Result Card</Text>
          <Text style={styles.title}>Course Completion Record</Text>

          <Text style={styles.name}>{student?.full_name ?? "Unknown student"}</Text>
          <Text style={styles.muted}>{student?.email ?? "No email"}</Text>
          <Text style={styles.name}>{course?.title ?? "Unknown course"}</Text>
          <Text style={styles.muted}>Status: {enrollment.status.toUpperCase()}</Text>

          <View style={styles.grid}>
            <View style={styles.metric}>
              <Text style={styles.label}>Progress</Text>
              <Text style={styles.value}>{progress}%</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.label}>Average Score</Text>
              <Text style={styles.value}>{score}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.label}>Reviewed Tasks</Text>
              <Text style={styles.value}>{completedTasks}/{totalTasks}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.label}>Completion Date</Text>
              <Text style={styles.value}>{enrollment.completed_at ? formatDate(enrollment.completed_at) : "Pending"}</Text>
            </View>
          </View>

          <Text style={styles.footer}>
            This result card is generated from the locked course enrollment record after admin review and course completion.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
