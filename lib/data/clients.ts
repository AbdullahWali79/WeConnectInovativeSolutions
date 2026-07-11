export interface HappyClient {
  id: string;
  name: string;
  logoUrl?: string; // e.g. "/clients/logo1.png"
  industry: string;
  shortDescription: string;
}

export const happyClients: HappyClient[] = [
  {
    id: "client-1",
    name: "TechNova Solutions",
    industry: "E-Commerce",
    shortDescription: "Our interns helped scale their backend architecture and implement AI-driven product recommendations.",
  },
  {
    id: "client-2",
    name: "BluePeak Media",
    industry: "Digital Marketing",
    shortDescription: "Built a fully automated content delivery dashboard using React and Node.js.",
  },
  {
    id: "client-3",
    name: "FinSecure",
    industry: "FinTech",
    shortDescription: "Developed a secure internal compliance portal with advanced role-based access control.",
  },
  {
    id: "client-4",
    name: "Urban Health",
    industry: "Healthcare",
    shortDescription: "Created a patient appointment scheduling system integrated with local hospital databases.",
  },
  {
    id: "client-5",
    name: "NextGen Software House",
    industry: "Software Development",
    shortDescription: "Hamare interns ne inke enterprise CRM system ke frontend modules ko successfully build kiya.",
  }
];
