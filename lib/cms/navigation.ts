export type NavItem = {
  href: string;
  path: string;
  label: string;
};

export type NavCategory = {
  label: string;
  href?: string;
  path?: string;
  items?: NavItem[];
};

export const navCategories: NavCategory[] = [
  { label: "Talent", href: "/talent", path: "/talent" },
  { label: "Services", href: "/services", path: "/services" },
  {
    label: "Study Abroad",
    items: [
      { href: "/research-consultancy", path: "/research-consultancy", label: "Overview" },
      { href: "/study-abroad/opportunities", path: "/study-abroad/opportunities", label: "Opportunities" },
    ],
  },
  {
    label: "Learning",
    items: [
      { href: "/courses", path: "/courses", label: "Courses" },
      { href: "/internships", path: "/internships", label: "Internships" },
      { href: "/trainees", path: "/trainees", label: "Trainees" },
      { href: "/completed-students", path: "/completed-students", label: "Completed Students" },
      { href: "/apply", path: "/apply", label: "Apply Now" },
    ],
  },
  {
    label: "Simulations",
    items: [
      { href: "/simulations", path: "/simulations", label: "All Simulations" },
    ],
  },
  { label: "Our Products", href: "/products", path: "/products" },
  {
    label: "More",
    items: [
      { href: "/#overview", path: "/", label: "About Us" },
      { href: "/team", path: "/team", label: "Our Team" },
      { href: "/mous", path: "/mous", label: "Partners" },
      { href: "/videos", path: "/videos", label: "Student Videos" },
      { href: "/testimonials", path: "/testimonials", label: "Client Reviews" },
      { href: "/ai-tools", path: "/ai-tools", label: "AI Tools" },
      { href: "/prompts", path: "/prompts", label: "Prompts" },
      { href: "/blogs", path: "/blogs", label: "Blogs" },
      { href: "/news", path: "/news", label: "News" },
      { href: "/contact", path: "/contact", label: "Contact Us" },
    ],
  },
];

export const groupId = (label: string) => `group:${label.toLowerCase().replace(/\s+/g, "-")}`;
