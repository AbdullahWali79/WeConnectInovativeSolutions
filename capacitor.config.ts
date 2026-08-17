import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pk.weconnect.studenthub",
  appName: "WeConnect Student Hub",
  webDir: "public",
  server: {
    url: "https://weconnectinnovativesolutions.vercel.app/login?next=/student",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
