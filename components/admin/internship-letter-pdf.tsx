/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  buildInternshipLetterParagraphs,
  formatLetterDate,
  internshipLetterCompany,
  sanitizePdfFileName,
  type InternshipLetterData,
} from "@/lib/internship-letter-template";
import type { AdminSignatureSettings, BrandingSettingsSnapshot, SoftwareHouse } from "@/lib/supabase/types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingRight: 32,
    paddingBottom: 18,
    paddingLeft: 32,
    fontSize: 9.5,
    fontFamily: "Times-Roman",
    color: "#111111",
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 6,
    marginBottom: 9,
  },
  logo: {
    width: 60,
    height: 42,
    objectFit: "contain",
    marginBottom: 2,
  },
  companyName: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    textAlign: "center",
  },
  tagline: {
    marginTop: 1,
    fontSize: 9.5,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metaText: {
    fontFamily: "Times-Bold",
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 11.5,
    textAlign: "center",
    marginBottom: 6,
    textDecoration: "underline",
  },
  paragraph: {
    marginBottom: 4,
    lineHeight: 1.18,
    textAlign: "justify",
  },
  sectionTitle: {
    marginTop: 5,
    marginBottom: 4,
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: "#111111",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableHead: {
    fontFamily: "Times-Bold",
  },
  cellSerial: {
    width: "14%",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#111111",
  },
  cellComponent: {
    width: "58%",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#111111",
  },
  cellRemarks: {
    width: "28%",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  signatures: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "31%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 2,
    textAlign: "center",
    fontFamily: "Times-Bold",
  },
  signatureLabel: {
    marginTop: 3,
    fontSize: 7.5,
    textAlign: "center",
  },
  stamp: {
    width: 64,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#111111",
    borderStyle: "dashed",
  },
  stampText: {
    fontSize: 8,
    textAlign: "center",
  },
  contact: {
    marginTop: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#111111",
    textAlign: "center",
    fontSize: 7.5,
    lineHeight: 1.2,
  },
});

function getLogoSource(houseLogoUrl?: string | null) {
  if (houseLogoUrl) return houseLogoUrl;
  if (typeof window === "undefined") return "/logo.jpeg";
  return `${window.location.origin}/logo.jpeg`;
}

export function InternshipLetterPDF({
  data,
  selectedHouse,
  sigSettings,
  branding,
}: {
  data: InternshipLetterData;
  selectedHouse?: SoftwareHouse | null;
  sigSettings?: AdminSignatureSettings | null;
  branding: BrandingSettingsSnapshot;
}) {
  const companyName = selectedHouse?.name ?? internshipLetterCompany.name;
  const tagline = selectedHouse?.tagline ?? internshipLetterCompany.tagline;
  const phone = selectedHouse
    ? [selectedHouse.phone, selectedHouse.phone2].filter(Boolean).join(" | ")
    : internshipLetterCompany.phone;
  const email = selectedHouse?.email ?? internshipLetterCompany.email;
  const address = selectedHouse?.address ?? internshipLetterCompany.address;
  const paragraphs = buildInternshipLetterParagraphs({ ...data, __companyDisplayName: companyName });
  const fallbackLogo = branding.logo_url ?? null;
  const color1 = selectedHouse?.header_color1 ?? branding.primary_color;

  return (
    <Document title={sanitizePdfFileName(data.student_name)}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { borderBottomColor: color1 }]}>
          <Image src={getLogoSource(selectedHouse?.logo_url ?? fallbackLogo)} style={styles.logo} />
          <Text style={styles.companyName}>{companyName}</Text>
          {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
        </View>

        <View style={styles.metaRow}>
          <Text>
            <Text style={styles.metaText}>Employee ID #: </Text>
            {data.student_id || "Not set"}
          </Text>
          <Text>
            <Text style={styles.metaText}>Date: </Text>
            {formatLetterDate(data.letter_date)}
          </Text>
        </View>

        <Text style={styles.title}>TO WHOM IT MAY CONCERN</Text>

        {paragraphs.map((paragraph) => (
          <Text key={paragraph} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Internship Evaluation Summary</Text>
          <View style={[styles.table, { borderColor: color1 }]}>
            <View style={styles.tableRow}>
            <Text style={[styles.cellSerial, styles.tableHead, { borderRightColor: color1 }]}>Sr. No.</Text>
            <Text style={[styles.cellComponent, styles.tableHead, { borderRightColor: color1 }]}>Component</Text>
            <Text style={[styles.cellRemarks, styles.tableHead]}>Remarks</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellSerial}>1.</Text>
            <Text style={styles.cellComponent}>Joining Date</Text>
            <Text style={styles.cellRemarks}>{formatLetterDate(data.joining_date)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellSerial}>2.</Text>
            <Text style={styles.cellComponent}>Attendance, Behavior and Interest</Text>
            <Text style={styles.cellRemarks}>{data.attendance_marks}/5</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellSerial}>3.</Text>
            <Text style={styles.cellComponent}>Practical Evaluation and Technical Performance</Text>
            <Text style={styles.cellRemarks}>{data.technical_marks}/20</Text>
          </View>
          <View style={styles.tableRowLast}>
            <Text style={styles.cellSerial}></Text>
            <Text style={[styles.cellComponent, styles.tableHead]}>Total Marks</Text>
            <Text style={[styles.cellRemarks, styles.tableHead]}>{data.total_marks}/25</Text>
          </View>
        </View>

        <View style={styles.signatures} wrap={false}>
          <View style={styles.signatureBlock}>
            {sigSettings?.hr_signature_url ? (
              <Image src={sigSettings.hr_signature_url} style={{ width: 72, height: 32, objectFit: "contain", marginBottom: 3 }} />
            ) : null}
            <Text style={[styles.signatureLine, { borderBottomColor: color1 }]}>{data.hr_manager_name || "HR Manager"}</Text>
            <Text style={styles.signatureLabel}>HR Manager Signature</Text>
          </View>
          {sigSettings?.stamp_url ? (
            <Image src={sigSettings.stamp_url} style={{ width: 64, height: 34, objectFit: "contain" }} />
          ) : (
            <View style={[styles.stamp, { borderColor: color1 }]}>
              <Text style={styles.stampText}>Company</Text>
              <Text style={styles.stampText}>Stamp</Text>
            </View>
          )}
          <View style={styles.signatureBlock}>
            {sigSettings?.signature_url ? (
              <Image src={sigSettings.signature_url} style={{ width: 72, height: 32, objectFit: "contain", marginBottom: 3 }} />
            ) : null}
            <Text style={[styles.signatureLine, { borderBottomColor: color1 }]}>{data.ceo_name || "CEO"}</Text>
            <Text style={styles.signatureLabel}>CEO Signature</Text>
          </View>
        </View>

        <Text style={[styles.contact, { borderTopColor: color1 }]} wrap={false}>
          {phone}{email ? ` | ${email}` : ""}
          {"\n"}
          {address}
        </Text>
      </Page>
    </Document>
  );
}
