import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { Icon } from "@/components/icon";
import { FadeIn, ScrollProgress } from "@/components/public/animations";
import { CONTACT_EMAIL_HREF } from "@/lib/contact";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Study Abroad & University Partnership Consultancy",
  description: "Ethical international education consultancy for students and universities, covering admissions guidance and institutional partnerships across leading study destinations.",
  path: "/research-consultancy",
  keywords: ["study abroad consultancy", "international student admissions", "university partnerships", "education consultant Pakistan", "overseas education guidance"],
});

const destinations = [
  ["GB", "United Kingdom", "Globally respected degrees and focused programs"],
  ["AU", "Australia", "A leading choice for Pakistani students with globally recognized degrees"],
  ["DE", "Germany", "Affordable, research-led learning and strong technical education"],
  ["HU", "Hungary", "Highly sought-after government scholarships for Pakistani students"],
  ["CN", "China", "Strong STEM, business and scholarship options"],
  ["MY", "Malaysia", "Affordable, diverse and internationally connected"],
  ["US", "USA", "Flexible pathways and wide-ranging specializations"],
  ["CA", "Canada", "Career-focused education in a multicultural setting"],
  ["IT", "Italy", "Historic universities and English-taught options"],
  ["CY", "Cyprus", "Accessible European study pathways"],
  ["KR", "South Korea", "Innovation, technology and modern campuses"],
  ["SA", "Saudi Arabia", "Expanding universities and scholarship opportunities"],
  ["SG", "Singapore", "Asia's global education and business hub"],
] as const;

const studentServices = [
  ["explore", "Profile & destination counselling", "We assess your academic background, goals and budget to shortlist suitable countries and institutions."],
  ["fact_check", "Course and university selection", "Compare programs, entry requirements, intakes, tuition and available funding options."],
  ["description", "Application support", "Get organized support for applications, statements, CVs and document readiness."],
  ["payments", "Scholarship guidance", "Identify relevant scholarships and understand their eligibility and application requirements."],
  ["verified_user", "Visa file guidance", "Prepare a clear visa document checklist and interview plan based on official requirements."],
  ["flight_takeoff", "Pre-departure support", "Plan accommodation, travel, arrival essentials and the transition to student life abroad."],
] as const;

const partnerBenefits = [
  ["campaign", "Market representation", "Present your institution and programs to suitable prospective students in our market."],
  ["groups", "Student recruitment", "Build a responsible recruitment pipeline focused on fit, readiness and transparency."],
  ["event", "Campus engagement", "Connect through information sessions, webinars, counselling events and student communities."],
  ["monitoring", "Application coordination", "Receive structured applicant communication and support throughout the admissions journey."],
] as const;

const steps = [
  ["01", "Tell us your goal", "Students share their study plans; institutions share their recruitment priorities."],
  ["02", "Receive a clear roadmap", "We align destinations, courses, requirements, timelines and next actions."],
  ["03", "Prepare and apply", "Our team supports documentation and coordination while keeping decisions transparent."],
  ["04", "Move forward confidently", "Students prepare for departure and university partners receive ongoing local support."],
] as const;

export default function EducationConsultancyPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--wc-bg)] text-on-surface">
      <ScrollProgress />
      <PublicHeader />

      <section className="relative isolate overflow-hidden pb-20 pt-24 sm:pb-28 sm:pt-32">
        <div className="absolute inset-0 -z-20 bg-[#061735]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(0,91,255,0.35),transparent_35%),radial-gradient(circle_at_85%_35%,rgba(255,210,74,0.2),transparent_30%)]" />
        <div className="mx-auto grid max-w-container-max items-center gap-12 px-5 md:px-margin-page lg:grid-cols-[1.15fr_.85fr]">
          <FadeIn>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ffd24a] backdrop-blur"><Icon name="public" className="text-base" /> International Education Consultancy</div>
            <h1 className="mt-6 max-w-4xl text-balance text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">The right study pathway. A trusted partner at every step.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">WeConnect Innovative Solutions combines education experience with technology-led support to connect ambitious students with suitable international universities—and help institutions build meaningful student relationships in Pakistan.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact?topic=study-abroad" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffd24a] px-7 py-4 text-sm font-black text-[#081735] transition hover:-translate-y-0.5 hover:bg-white">Book Student Counselling <Icon name="arrow_forward" className="text-lg" /></Link>
              <Link href="#universities" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/15">Partner With Us <Icon name="handshake" className="text-lg" /></Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-blue-200"><Icon name="verified" className="text-base text-[#ffd24a]" /> Transparent guidance. No admission, scholarship or visa guarantees.</p>
          </FadeIn>
          <FadeIn delay={0.12}>
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-3 border-b border-white/10 pb-5"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffd24a] text-[#081735]"><Icon name="school" /></span><div><p className="font-black text-white">Two audiences. One trusted bridge.</p><p className="text-sm text-blue-200">Students + international universities</p></div></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[["person_search", "For Students", "Personalized admission guidance"], ["account_balance", "For Universities", "Responsible local representation"], ["language", `${destinations.length} Destinations`, "Global study opportunities"], ["support_agent", "End-to-end", "From planning to departure"]].map(([icon, title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-[#061735]/45 p-4"><Icon name={icon} className="text-2xl text-[#ffd24a]" /><h2 className="mt-3 font-black text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-blue-200">{text}</p></div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="bg-[var(--wc-surface-lowest)] py-16 sm:py-20" aria-labelledby="destinations-heading">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <div className="mx-auto max-w-3xl text-center"><span className="wc-section-label"><Icon name="travel_explore" className="text-sm" /> Study Destinations</span><h2 id="destinations-heading" className="mt-4 text-3xl font-black sm:text-4xl">Explore opportunities across the world</h2><p className="mt-4 leading-7 text-on-surface-variant">Compare programs and requirements across these destinations so your choice is based on fit—not guesswork.</p></div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {destinations.map(([code, country, note]) => <div key={country} className="group rounded-2xl border border-outline-variant/60 bg-[var(--wc-bg)] p-5 transition hover:-translate-y-1 hover:border-[var(--wc-primary)]/30 hover:shadow-lg"><span className="inline-flex rounded-lg bg-[var(--wc-primary)] px-2.5 py-1 text-xs font-black tracking-wider text-white">{code}</span><h3 className="mt-4 text-lg font-black">{country}</h3><p className="mt-2 text-sm leading-6 text-on-surface-variant">{note}</p></div>)}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24" id="students">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
          <div className="lg:sticky lg:top-28"><span className="wc-section-label"><Icon name="school" className="text-sm" /> For Students</span><h2 className="mt-4 text-3xl font-black sm:text-4xl">Your study-abroad plan, made clearer</h2><p className="mt-5 leading-7 text-on-surface-variant">From the first shortlist to pre-departure preparation, our team helps you understand each step and make informed decisions.</p><Link href="/contact?topic=student-counselling" className="mt-7 inline-flex items-center gap-2 font-black text-primary">Discuss your profile <Icon name="arrow_forward" /></Link></div>
          <div className="grid gap-4 sm:grid-cols-2">{studentServices.map(([icon, title, text]) => <article key={title} className="rounded-3xl border border-outline-variant/60 bg-[var(--wc-surface-lowest)] p-6 shadow-sm"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--wc-primary)]/10 text-[var(--wc-primary)]"><Icon name={icon} /></span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-on-surface-variant">{text}</p></article>)}</div>
        </div></div>
      </section>

      <section id="universities" className="bg-[#061735] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full bg-[#ffd24a]/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#ffd24a]"><Icon name="account_balance" className="text-sm" /> For Universities</span><h2 className="mt-5 text-3xl font-black sm:text-5xl">Build a credible student pipeline with a local technology partner</h2><p className="mt-5 text-lg leading-8 text-blue-100">As a software house with university-sector experience, we bring digital capability, student engagement and structured coordination to international institutional partnerships.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{partnerBenefits.map(([icon, title, text]) => <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.07] p-6"><Icon name={icon} className="text-3xl text-[#ffd24a]" /><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-blue-200">{text}</p></article>)}</div>
          <div className="mt-9"><Link href="/contact?topic=university-partnership" className="inline-flex items-center gap-2 rounded-xl bg-[#ffd24a] px-7 py-4 text-sm font-black text-[#081735]">Start a Partnership Conversation <Icon name="arrow_forward" /></Link></div>
        </div>
      </section>

      <section className="py-16 sm:py-24"><div className="mx-auto max-w-container-max px-5 md:px-margin-page">
        <div className="mx-auto max-w-3xl text-center"><span className="wc-section-label"><Icon name="route" className="text-sm" /> Our Process</span><h2 className="mt-4 text-3xl font-black sm:text-4xl">A simple, transparent way forward</h2></div>
        <div className="mt-10 grid gap-4 lg:grid-cols-4">{steps.map(([number, title, text]) => <article key={number} className="rounded-3xl border border-outline-variant/60 bg-[var(--wc-surface-lowest)] p-6"><span className="text-3xl font-black text-[var(--wc-primary)]/25">{number}</span><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-on-surface-variant">{text}</p></article>)}</div>
      </div></section>

      <section className="px-5 pb-20 md:px-margin-page"><div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[var(--wc-primary)] px-6 py-12 text-center text-white sm:px-12">
        <Icon name="connect_without_contact" className="text-4xl text-[#ffd24a]" /><h2 className="mt-5 text-3xl font-black sm:text-4xl">Let&apos;s connect education with opportunity</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100">Whether you are planning your international education or representing a university seeking a reliable local partner, start the conversation with us.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/contact?topic=education-consultancy" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffd24a] px-7 py-4 text-sm font-black text-[#081735]">Send an Enquiry <Icon name="send" /></Link><a href={`${CONTACT_EMAIL_HREF}?subject=International%20Education%20Consultancy`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-4 text-sm font-black text-white">Email Our Team <Icon name="mail" /></a></div>
      </div></section>
    </main>
  );
}
