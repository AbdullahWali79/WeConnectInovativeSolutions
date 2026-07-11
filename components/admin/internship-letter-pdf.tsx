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
    paddingTop: 33,
    paddingRight: 32,
    paddingBottom: 24,
    paddingLeft: 32,
    fontSize: 11,
    fontFamily: "Times-Roman",
    color: "#111111",
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 11,
    marginBottom: 15,
  },
  logo: {
    width: 84,
    height: 64,
    objectFit: "contain",
    marginBottom: 4,
  },
  companyName: {
    fontFamily: "Times-Bold",
    fontSize: 32,
    textAlign: "center",
  },
  tagline: {
    marginTop: 3,
    fontSize: 12,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  metaText: {
    fontFamily: "Times-Bold",
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 14.5,
    textAlign: "center",
    marginBottom: 10,
    textDecoration: "underline",
  },
  paragraph: {
    marginBottom: 7,
    lineHeight: 1.30,
    textAlign: "justify",
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 7,
    fontFamily: "Times-Bold",
    fontSize: 11.5,
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
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#111111",
  },
  cellComponent: {
    width: "58%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#111111",
  },
  cellRemarks: {
    width: "28%",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  signatures: {
    marginTop: 32,
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
    paddingBottom: 3,
    textAlign: "center",
    fontFamily: "Times-Bold",
  },
  signatureLabel: {
    marginTop: 4,
    fontSize: 8,
    textAlign: "center",
  },
  stamp: {
    width: 78,
    height: 42,
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
    marginTop: 24,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#111111",
    textAlign: "center",
    fontSize: 8,
    lineHeight: 1.25,
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

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            {sigSettings?.hr_signature_url ? (
              <Image src={sigSettings.hr_signature_url} style={{ width: 80, height: 40, objectFit: "contain", marginBottom: 4 }} />
            ) : null}
            <Text style={[styles.signatureLine, { borderBottomColor: color1 }]}>{data.hr_manager_name || "HR Manager"}</Text>
            <Text style={styles.signatureLabel}>HR Manager Signature</Text>
          </View>
          {sigSettings?.stamp_url ? (
            <Image src={sigSettings.stamp_url} style={{ width: 78, height: 42, objectFit: "contain" }} />
          ) : (
            <View style={[styles.stamp, { borderColor: color1 }]}>
              <Text style={styles.stampText}>Company</Text>
              <Text style={styles.stampText}>Stamp</Text>
            </View>
          )}
          <View style={styles.signatureBlock}>
            {sigSettings?.signature_url ? (
              <Image src={sigSettings.signature_url} style={{ width: 80, height: 40, objectFit: "contain", marginBottom: 4 }} />
            ) : null}
            <Text style={[styles.signatureLine, { borderBottomColor: color1 }]}>{data.ceo_name || "CEO"}</Text>
            <Text style={styles.signatureLabel}>CEO Signature</Text>
          </View>
        </View>

        <Text style={[styles.contact, { borderTopColor: color1 }]}>
          {phone}{email ? ` | ${email}` : ""}
          {"\n"}
          {address}
        </Text>
      </Page>
    </Document>
  );
}
