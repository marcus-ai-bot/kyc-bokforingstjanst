import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { type KycReport } from "@/lib/kyc";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 12,
  },
  logo: {
    width: 132,
    height: 38,
    objectFit: "contain",
  },
  titleWrap: {
    maxWidth: 300,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 9,
    marginTop: 4,
    color: "#4b5563",
  },
  topGrid: {
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  topCol: {
    width: "48%",
  },
  label: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  riskBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 700,
  },
  section: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 3,
  },
  sectionLaw: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 6,
  },
  sectionText: {
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 8,
    color: "#6b7280",
  },
});

function getRiskBadgeStyle(risk: KycReport["riskniva"]) {
  switch (risk) {
    case "Låg risk":
      return { backgroundColor: "#ecfdf5", color: "#047857" };
    case "Normal risk":
      return { backgroundColor: "#eff6ff", color: "#1d4ed8" };
    case "Förhöjd risk":
      return { backgroundColor: "#fff7ed", color: "#c2410c" };
    case "Hög risk":
      return { backgroundColor: "#fff1f2", color: "#be123c" };
  }
}

export function KycPdfDocument({
  report,
  logoSrc,
}: {
  report: KycReport;
  logoSrc: string;
}) {
  return (
    <Document title={`KYC-${report.organisationsnummer}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoSrc} style={styles.logo} />
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Kundkännedom enligt Lag (2017:630)</Text>
            <Text style={styles.subtitle}>
              Genererad rapport för arkivering och uppföljning
            </Text>
          </View>
        </View>

        <View style={styles.topGrid}>
          <View style={styles.topRow}>
            <View style={styles.topCol}>
              <Text style={styles.label}>Bolag</Text>
              <Text style={styles.value}>{report.bolagsnamn}</Text>
            </View>
            <View style={styles.topCol}>
              <Text style={styles.label}>Organisationsnummer</Text>
              <Text style={styles.value}>{report.organisationsnummer}</Text>
            </View>
          </View>
          <View style={styles.topRow}>
            <View style={styles.topCol}>
              <Text style={styles.label}>SNI och bransch</Text>
              <Text style={styles.value}>
                {report.sniKod} • {report.branschNamn}
              </Text>
            </View>
            <View style={styles.topCol}>
              <Text style={styles.label}>Bedömningsdatum</Text>
              <Text style={styles.value}>{report.bedomningsdatum}</Text>
            </View>
          </View>
          <View style={styles.topRow}>
            <View style={styles.topCol}>
              <Text style={styles.label}>Adress</Text>
              <Text style={styles.value}>{report.adress}</Text>
            </View>
            <View style={styles.topCol}>
              <Text style={styles.label}>Juridisk form / Anställda</Text>
              <Text style={styles.value}>
                {report.juridiskForm} • {report.anstallda} st
              </Text>
            </View>
          </View>

          <Text style={{ ...styles.riskBadge, ...getRiskBadgeStyle(report.riskniva) }}>
            {report.riskniva}
          </Text>
        </View>

        {report.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.id}. {section.title}
            </Text>
            <Text style={styles.sectionLaw}>{section.lagrum}</Text>
            <Text style={styles.sectionText}>{section.text}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Genererad {report.bedomningsdatum} | Lag (2017:630) om åtgärder mot
          penningtvätt och finansiering av terrorism
        </Text>
      </Page>
    </Document>
  );
}
