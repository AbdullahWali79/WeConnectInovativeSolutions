import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { Icon } from "@/components/icon";
import { FadeIn, ScrollProgress } from "@/components/public/animations";

export const metadata = {
  title: "Research Consultancy | WeConnect-Innovation",
  description: "Research support for BS, MS, and PhD students including proposal writing, literature review, data analysis, and thesis guidance.",
};

const supportAreas = [
  ["description", "Topic Selection", "Choose a practical topic that fits your degree level, timeline, and department requirements."],
  ["menu_book", "Literature Review", "Build a clear review structure, compare prior work, and map research gaps."],
  ["schema", "Research Proposal", "Define objectives, methodology, and scope with a strong proposal draft."],
  ["analytics", "Data Analysis", "Get help with SPSS, Excel, Python, qualitative coding, and result interpretation."],
  ["draw", "Thesis Formatting", "Format chapters, references, tables, figures, and appendices professionally."],
  ["verified", "Defense Prep", "Prepare slides, viva questions, and concise answers for committee review."],
];

const levelCards = [
  {
    level: "BS Students",
    title: "Research Foundation Support",
    points: ["Research topic brainstorming", "Literature review outline", "Questionnaire design", "Report formatting"],
  },
  {
    level: "MS Students",
    title: "Thesis and Proposal Guidance",
    points: ["Proposal drafting", "Methodology selection", "Data analysis support", "Result write-up"],
  },
  {
    level: "PhD Scholars",
    title: "Advanced Research Assistance",
    points: ["Research gap mapping", "Journal paper structure", "Statistical interpretation", "Defense readiness"],
  },
];

const processSteps = [
  ["01", "Share your topic", "Tell us your subject, university rules, deadline, and what stage you are at."],
  ["02", "Get a plan", "We map the scope, required deliverables, and the research milestones."],
  ["03", "Work with experts", "Receive structured support for writing, analysis, and presentation."],
  ["04", "Submit confidently", "Final files are reviewed so you can submit with clarity and confidence."],
];

export default function ResearchConsultancyPage() {
  return (
    <main className="overflow-x-clip bg-[#030B1C] text-white min-h-screen">
      <ScrollProgress />
      <PublicHeader />

      <section className="relative isolate overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.45),rgba(3,11,28,1))]" />
        <div className="absolute left-1/2 top-0 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,210,74,0.18),transparent_70%)] blur-3xl" />

        <div className="mx-auto max-w-container-max px-5 md:px-margin-page text-center">
          <FadeIn>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFD24A]/25 bg-[#FFD24A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD24A]">
              <Icon name="school" className="text-sm" />
              Research Consultancy for BS, MS & PhD Students
            </div>

            <h1 className="mx-auto max-w-5xl text-4xl font-black leading-tight text-white sm:text-5xl md:text-6xl">
              Research support that helps students move from topic idea to final submission.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#91A3C7]">
              WeConnect-Innovation helps students with academic research planning, writing structure, data analysis, and presentation-ready outputs. Use this page as a starting point for real support around thesis work, project reports, and defense preparation.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact?topic=research-consultancy"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] px-8 py-4 text-sm font-black text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] transition-transform hover:scale-[1.02] sm:w-auto"
              >
                Apply for Research Consultancy <Icon name="send" className="text-lg" />
              </Link>
              <Link
                href="#services"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Explore Services
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="services" className="py-20 sm:py-28">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#91A3C7]">
                <Icon name="workspace_premium" className="text-sm" /> What students usually need
              </div>
              <h2 className="text-3xl font-black sm:text-4xl">Common research support areas</h2>
            </div>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {supportAreas.map(([icon, title, text]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-[#061A3D]/60 p-7 shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-xl">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD24A]/10 text-[#FFD24A]">
                  <Icon name={icon} className="text-2xl" />
                </div>
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#91A3C7]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28 text-[#081735]">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00216e]/10 bg-[#00216e]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#00216e]">
                <Icon name="groups" className="text-sm" /> Dummy student paths
              </div>
              <h2 className="text-3xl font-black sm:text-4xl">Support by degree level</h2>
            </div>
          </FadeIn>

          <div className="grid gap-6 lg:grid-cols-3">
            {levelCards.map((card) => (
              <div key={card.level} className="rounded-3xl border border-[#DDE6F5] bg-white p-7 shadow-[0_10px_30px_rgba(2,33,110,0.06)]">
                <div className="text-xs font-black uppercase tracking-widest text-[#FF9F2E]">{card.level}</div>
                <h3 className="mt-3 text-2xl font-black text-[#081735]">{card.title}</h3>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-[#2B3D67]">
                  {card.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFD24A]/20 text-[#00216e]">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#91A3C7]">
                <Icon name="route" className="text-sm" /> How it works
              </div>
              <h2 className="text-3xl font-black sm:text-4xl">Simple consultation flow</h2>
            </div>
          </FadeIn>

          <div className="grid gap-6 lg:grid-cols-4">
            {processSteps.map(([step, title, text]) => (
              <div key={step} className="rounded-3xl border border-white/10 bg-[#061A3D]/50 p-7">
                <div className="text-sm font-black uppercase tracking-widest text-[#FFD24A]">{step}</div>
                <h3 className="mt-3 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#91A3C7]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-5 md:px-margin-page text-center">
          <FadeIn>
            <div className="rounded-[2rem] border border-[#FFD24A]/20 bg-[#061A3D]/70 p-8 shadow-[0_0_60px_rgba(0,0,0,0.35)] sm:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD24A]/25 bg-[#FFD24A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD24A]">
                <Icon name="send" className="text-sm" /> Direct apply
              </div>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">Need research consultancy now?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#91A3C7]">
                Students can directly request research guidance for BS projects, MS theses, or PhD work using the application path below.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/contact?topic=research-consultancy"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] px-8 py-4 text-sm font-black text-[#030B1B] transition-transform hover:scale-[1.02] sm:w-auto"
                >
                  Apply Now <Icon name="arrow_forward" className="text-lg" />
                </Link>
                <Link
                  href="mailto:info@weconnect-innovation.com?subject=Research%20Consultancy%20Application"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
                >
                  Email Application
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
