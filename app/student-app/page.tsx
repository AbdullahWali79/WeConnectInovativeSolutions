import type { Metadata } from "next";
import { StudentAppInstaller } from "./student-app-installer";

export const metadata: Metadata = {
  title: "Install WeConnect Student App",
  description: "Install the WeConnect Student App and access courses, tasks, projects, and progress from your phone or computer.",
  alternates: { canonical: "/student-app" },
  openGraph: {
    title: "Install WeConnect Student App",
    description: "Get the WeConnect Student App for courses, tasks, projects, and progress tracking.",
    url: "/student-app",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "WeConnect Student App" }],
  },
  twitter: {
    card: "summary",
    title: "Install WeConnect Student App",
    description: "Get the WeConnect Student App for courses, tasks, projects, and progress tracking.",
    images: ["/icons/icon-512.png"],
  },
};

export default function StudentAppPage() {
  return <StudentAppInstaller />;
}
