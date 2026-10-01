import { CmsElement, CmsLink, CmsInstance } from "@/components/cms/cms-element";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { CourseCarousel } from "@/components/public/course-carousel";
import { Icon } from "@/components/icon";
import { ClientsPortfolio } from "@/components/public/clients-portfolio";
import { FAQSection } from "@/components/public/faq-section";
import { TestimonialsSection } from "@/components/public/testimonials";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
  FloatingOrbs,
  ScrollProgress,
} from "@/components/public/animations";
import { PromoPopup } from "@/components/public/promo-popup";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";

export const revalidate = 300;

export const metadata = {
  title: "Internships & Training | WeConnect-Innovation",
  description: "Join our hands-on training pathways designed to make you internship-ready.",
};

export default async function InternshipsPage() {
  const supabase = createSupabasePublicClient();
  const [
    coursesResult,
    softwareHousesResult,
    traineesCountResult,
    applicationsCountResult,
    completedTraineesCountResult,
    completedStudentsCountResult,
    manualCompletedCountResult,
    mentorsCountResult,
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("software_houses")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("trainees")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("trainees")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("completed_student_showcase")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("manual_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("show_on_completed_page", true),
    supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const activeCourses = coursesResult.data ?? [];
  const traineesCount = traineesCountResult.count ?? 0;
  const applicationsCount = applicationsCountResult.count ?? 0;
  const completedTraineesCount = completedTraineesCountResult.count ?? 0;
  const completedStudentsCount = completedStudentsCountResult.count ?? 0;
  const manualCompletedCount = manualCompletedCountResult.count ?? 0;
  const mentorsCount = mentorsCountResult.count ?? 0;
  const partnerCount = softwareHousesResult.count ?? 5;

  const impactStats = [
    { icon: "school", value: 20 + traineesCount, suffix: "", label: "Registered Trainees", description: "Tracked through the training portal" },
    { icon: "pending_actions", value: 10 + applicationsCount, suffix: "", label: "Applied Students", description: "Applications submitted for review" },
    { icon: "workspace_premium", value: 50 + completedTraineesCount + completedStudentsCount + manualCompletedCount, suffix: "", label: "Certified Students", description: "Verified completed student records", href: "/completed-students" },
    { icon: "verified_user", value: mentorsCount, suffix: "", label: "Active Mentors", description: "Supporting learner reviews" },
    { icon: "trending_up", value: activeCourses.length, suffix: "", label: "Training Pathways", description: "Currently available programs" },
    { icon: "business", value: partnerCount, suffix: "", label: "Industry Partners", description: "Connected for career pathways" },
  ];

  const audienceGroups = [
    ["school", "Students & Beginners", "Start with guided basics and build practical industry skills."],
    ["work", "Internship Seekers", "Prepare a portfolio, complete reviewed tasks, and become placement-ready."],
    ["laptop_mac", "Freelancers", "Learn client-focused workflows for web, marketing, automation, and apps."],
  ];

  return (
    <CmsElement cmsId="828c2ef2-0" as="main" className="overflow-x-clip bg-[var(--wc-bg)] text-on-surface min-h-screen relative">
      <ScrollProgress />
      <PromoPopup context="landing" />
      <PublicHeader />

      {/* Hero Section */}
      <CmsElement cmsId="828c2ef2-1" as="section" id="overview" className="relative isolate overflow-hidden bg-[var(--wc-bg)] pt-24 pb-20 lg:pt-32 lg:pb-28 text-center">
        {/* Background glow effects */}
        <CmsElement cmsId="828c2ef2-2" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></CmsElement>
        <FloatingOrbs />

        <CmsElement cmsId="828c2ef2-3" as="div" className="relative z-10 mx-auto max-w-4xl px-5 md:px-margin-page">
          <FadeIn>
            <CmsElement cmsId="828c2ef2-4" as="div" className="mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">
              3-6 Month Training Pathway to Internship & Job Readiness
            </CmsElement>

            <CmsElement cmsId="828c2ef2-5" as="h1" className="mx-auto mt-6 max-w-4xl text-3xl font-black leading-[1.1] tracking-tight text-on-surface sm:text-4xl md:text-5xl lg:text-[3.5rem] mb-6">
              Learn Tech Skills. Build Real Projects. Connect with Industry.
            </CmsElement>

            <CmsElement cmsId="828c2ef2-6" as="p" className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--wc-on-surface-variant)] mb-10">
              WeConnect-Innovation bridges the gap between learning and employment through industry partnerships, mentor-guided projects, internships, and software house collaborations.
            </CmsElement>

            <CmsElement cmsId="828c2ef2-7" as="div" className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <CmsLink cmsId="828c2ef2-8" href="/apply" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] px-10 py-4 text-sm font-black text-on-primary shadow-[0_0_20px_rgba(var(--landing-accent-rgb),0.3)] transition-transform hover:scale-[1.02]">
                Apply Now
              </CmsLink>
              <CmsLink cmsId="828c2ef2-9" href="#courses" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-10 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-[var(--wc-surface-low)] hover:border-[var(--wc-secondary)]/30">
                Explore Programs
              </CmsLink>
            </CmsElement>

            <CmsElement cmsId="828c2ef2-10" as="p" className="mt-8 text-xs font-bold uppercase tracking-widest text-[#5B6B88]">
              Students, software developers, and industry partners collaborate here.
            </CmsElement>
          </FadeIn>
        </CmsElement>
      </CmsElement>

      {/* Stats / Trust Bar */}
      <CmsElement cmsId="828c2ef2-11" as="section" className="relative overflow-hidden py-16 md:py-24 bg-[var(--wc-surface-lowest)]/40 border-y border-[var(--wc-outline-variant)]">
        <CmsElement cmsId="828c2ef2-12" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--landing-accent-rgb),0.05),transparent_50%)] pointer-events-none" />
        <CmsElement cmsId="828c2ef2-13" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
          <FadeIn>
            <CmsElement cmsId="828c2ef2-14" as="div" className="mb-12 text-center">
              <CmsElement cmsId="828c2ef2-15" as="p" className="text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-2">Our Impact</CmsElement>
              <CmsElement cmsId="828c2ef2-16" as="h2" className="text-3xl md:text-4xl font-black text-on-surface">Trusted by learners and industry partners</CmsElement>
            </CmsElement>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.05}>
            {impactStats.map((stat) => {
              const cardContent = (
                <>
                  <CmsElement cmsId="828c2ef2-17" as="div" className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wc-secondary)]/10 border border-[var(--wc-secondary)]/20 text-[var(--wc-secondary)] transition-all duration-300 group-hover:bg-[var(--wc-secondary)] group-hover:text-on-primary group-hover:scale-110">
                    <Icon name={stat.icon} className="text-2xl" />
                  </CmsElement>
                  <CmsElement cmsId="828c2ef2-18" as="div">
                    <CmsElement cmsId="828c2ef2-19" as="div" className="text-4xl font-black text-on-surface mb-2">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </CmsElement>
                    <CmsElement cmsId="828c2ef2-20" as="p" className="font-bold text-[var(--wc-on-surface-variant)] mb-1">{stat.label}</CmsElement>
                    <CmsElement cmsId="828c2ef2-21" as="p" className="text-xs text-[#5B6B88]">{stat.description}</CmsElement>
                  </CmsElement>
                </>
              );

              const cardClassName = "group flex flex-col items-center justify-center text-center rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-2 hover:border-[var(--wc-secondary)]/30 hover:bg-[var(--wc-surface-lowest)]/80";

              return stat.href ? (
                <CmsInstance key={stat.label} instance={String(stat.label)}><StaggerItem key={stat.label}>
                  <CmsLink cmsId="828c2ef2-22" href={stat.href} className={`${cardClassName} cursor-pointer block h-full`}>
                    {cardContent}
                  </CmsLink>
                </StaggerItem></CmsInstance>
              ) : (
                <CmsInstance key={stat.label} instance={String(stat.label)}><StaggerItem key={stat.label}>
                  <CmsElement cmsId="828c2ef2-23" as="div" className={`${cardClassName} cursor-default h-full`}>
                    {cardContent}
                  </CmsElement>
                </StaggerItem></CmsInstance>
              );
            })}
          </StaggerContainer>
        </CmsElement>
      </CmsElement>

      {/* Happy Clients Portfolio (Replaces Career Pathway) */}
      <ClientsPortfolio />

      {/* Features Section */}
      <CmsElement cmsId="828c2ef2-24" as="section" className="py-20 md:py-32 bg-[var(--wc-bg)]">
        <CmsElement cmsId="828c2ef2-25" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <CmsElement cmsId="828c2ef2-26" as="div" className="mb-16 text-center max-w-3xl mx-auto">
              <CmsElement cmsId="828c2ef2-27" as="div" className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">
                <Icon name="auto_awesome" className="text-sm" /> Why Choose WeConnect-Innovation?
              </CmsElement>
              <CmsElement cmsId="828c2ef2-28" as="h2" className="text-4xl md:text-5xl font-black text-on-surface">What Makes Us Different?</CmsElement>
            </CmsElement>
          </FadeIn>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" staggerDelay={0.1}>
            {[
              ["engineering", "Industry-Aligned Training", "Curriculum shaped by software houses and employer-ready skills."],
              ["workspace_premium", "Real Client-Based Projects", "Build real solutions for actual business needs and client briefs."],
              ["handshake", "Software House Collaborations", "Learn directly with partner houses on practical software initiatives."],
              ["apartment", "Internship Opportunities", "Move from training into internship-ready career pathways."],
              ["collections_bookmark", "Portfolio Development", "Collect reviewed project work that highlights your abilities."],
              ["support_agent", "Career Mentorship", "Receive guidance, interview prep, and professional growth support."],
            ].map(([icon, title, text]) => (
              <CmsInstance key={title} instance={String(title)}><StaggerItem key={title}>
                <CmsElement cmsId="828c2ef2-29" as="div" className="group h-full rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/60 p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 hover:border-[var(--wc-secondary)]/30 hover:bg-[var(--wc-surface-lowest)]/80 hover:shadow-[0_0_40px_rgba(var(--landing-accent-rgb),0.15)]">
                  <CmsElement cmsId="828c2ef2-30" as="div" className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] text-[var(--wc-secondary)] transition-all duration-300 group-hover:bg-[var(--wc-secondary)]/10 group-hover:border-[var(--wc-secondary)]/30 group-hover:scale-110">
                    <Icon name={icon} className="text-3xl" />
                  </CmsElement>
                  <CmsElement cmsId="828c2ef2-31" as="h3" className="text-xl font-black text-on-surface transition-colors group-hover:text-[var(--wc-secondary)] mb-3">{title}</CmsElement>
                  <CmsElement cmsId="828c2ef2-32" as="p" className="text-sm leading-relaxed text-[var(--wc-on-surface-variant)]">{text}</CmsElement>
                </CmsElement>
              </StaggerItem></CmsInstance>
            ))}
          </StaggerContainer>
        </CmsElement>
      </CmsElement>

      {/* Audience Section */}
      <CmsElement cmsId="828c2ef2-33" as="section" className="py-20 md:py-32 bg-[var(--wc-surface-lowest)]/30 border-t border-[var(--wc-outline-variant)]">
        <CmsElement cmsId="828c2ef2-34" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <CmsElement cmsId="828c2ef2-35" as="div" className="mb-16 text-center max-w-3xl mx-auto">
              <CmsElement cmsId="828c2ef2-36" as="div" className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">
                <Icon name="groups" className="text-sm" /> Who This Is For
              </CmsElement>
              <CmsElement cmsId="828c2ef2-37" as="h2" className="text-4xl md:text-5xl font-black text-on-surface">Built for learners who want practical outcomes</CmsElement>
            </CmsElement>
          </FadeIn>

          <CmsElement cmsId="828c2ef2-38" as="div" className="grid gap-6 md:grid-cols-3">
            {audienceGroups.map(([icon, title, text]) => (
              <CmsElement cmsId="828c2ef2-39" as="div" instance={String(title)} key={title} className="rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)]/40 p-8 backdrop-blur-md transition-transform hover:-translate-y-1">
                <CmsElement cmsId="828c2ef2-40" as="div" className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wc-secondary)]/10 border border-[var(--wc-secondary)]/20 text-[var(--wc-secondary)]">
                  <Icon name={icon} className="text-2xl" />
                </CmsElement>
                <CmsElement cmsId="828c2ef2-41" as="h3" className="text-2xl font-black text-on-surface mb-3">{title}</CmsElement>
                <CmsElement cmsId="828c2ef2-42" as="p" className="text-sm leading-relaxed text-[var(--wc-on-surface-variant)]">{text}</CmsElement>
              </CmsElement>
            ))}
          </CmsElement>
        </CmsElement>
      </CmsElement>

      {/* Courses Section */}
      <CmsElement cmsId="828c2ef2-43" as="section" id="courses" className="relative bg-[var(--wc-bg)] py-20 md:py-32 border-t border-[var(--wc-outline-variant)]">
        <CmsElement cmsId="828c2ef2-44" as="div" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(6,43,127,0.3),transparent_50%)] pointer-events-none" />
        <CmsElement cmsId="828c2ef2-45" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
          <FadeIn>
            <CmsElement cmsId="828c2ef2-46" as="div" className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <CmsElement cmsId="828c2ef2-47" as="div" className="max-w-2xl">
                <CmsElement cmsId="828c2ef2-48" as="div" className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)]">
                  <Icon name="school" className="text-sm" /> Course Catalog
                </CmsElement>
                <CmsElement cmsId="828c2ef2-49" as="h2" className="text-4xl md:text-5xl font-black text-on-surface mb-4">Choose your pathway</CmsElement>
                <CmsElement cmsId="828c2ef2-50" as="p" className="text-lg text-[var(--wc-on-surface-variant)]">
                  Explore active training pathways designed around practical assignments, mentor review, and portfolio-ready outcomes.
                </CmsElement>
              </CmsElement>
              <CmsLink cmsId="828c2ef2-51" href="/courses" className="inline-flex items-center gap-2 shrink-0 rounded-xl bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] px-6 py-3 text-sm font-bold text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:border-[var(--wc-secondary)] hover:text-on-primary">
                View All Courses <Icon name="arrow_forward" className="text-sm" />
              </CmsLink>
            </CmsElement>
          </FadeIn>

          {activeCourses.length > 0 ? (
            <CourseCarousel courses={activeCourses} />
          ) : (
            <FadeIn>
              <CmsElement cmsId="828c2ef2-52" as="div" className="rounded-3xl border border-dashed border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] p-12 text-center backdrop-blur-md">
                <Icon name="school" className="mx-auto text-5xl text-[var(--wc-on-surface-variant)] mb-4" />
                <CmsElement cmsId="828c2ef2-53" as="h3" className="text-2xl font-black text-on-surface mb-2">No active courses yet</CmsElement>
                <CmsElement cmsId="828c2ef2-54" as="p" className="text-[var(--wc-on-surface-variant)]">New training pathways will appear here as they become available.</CmsElement>
              </CmsElement>
            </FadeIn>
          )}
        </CmsElement>
      </CmsElement>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA Section */}
      <CmsElement cmsId="828c2ef2-55" as="section" className="py-20 md:py-24 bg-[var(--wc-surface-lowest)]/40 border-t border-[var(--wc-outline-variant)]">
        <CmsElement cmsId="828c2ef2-56" as="div" className="mx-auto max-w-4xl px-5 md:px-margin-page text-center">
          <CmsElement cmsId="828c2ef2-57" as="div" className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[var(--wc-surface-lowest)] to-[var(--wc-primary)] border border-[#4379FF]/30 p-10 sm:p-16 shadow-[0_0_60px_rgba(6,43,127,0.5)]">
            <CmsElement cmsId="828c2ef2-58" as="div" className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></CmsElement>
            <CmsElement cmsId="828c2ef2-59" as="div" className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--landing-accent-rgb),0.15),transparent_50%)]"></CmsElement>

            <CmsElement cmsId="828c2ef2-60" as="div" className="relative z-10">
              <CmsElement cmsId="828c2ef2-61" as="h2" className="text-3xl md:text-5xl font-black text-on-surface mb-6">Ready to Start Your Training Journey?</CmsElement>
              <CmsElement cmsId="828c2ef2-62" as="p" className="text-lg text-[var(--wc-on-surface-variant)] max-w-2xl mx-auto mb-10">
                Apply now and take the first step toward practical learning, mentor feedback, internship readiness, and career growth. Limited seats available for the next batch.
              </CmsElement>

              <CmsElement cmsId="828c2ef2-63" as="div" className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <CmsLink cmsId="828c2ef2-64" href="/apply" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--wc-secondary)] to-[var(--wc-brand-accent)] px-10 py-4 text-sm font-black text-on-primary shadow-[0_0_20px_rgba(var(--landing-accent-rgb),0.3)] transition-transform hover:scale-[1.02]">
                  Apply Now
                </CmsLink>
                <CmsLink cmsId="828c2ef2-65" href="/contact" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-10 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-[var(--wc-surface-low)] hover:border-[var(--wc-secondary)]/30">
                  Talk to Advisor
                </CmsLink>
              </CmsElement>
              <CmsElement cmsId="828c2ef2-66" as="p" className="mt-8 text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]/70">
                Email: <CmsElement cmsId="828c2ef2-67" as="a" href={CONTACT_EMAIL_HREF} className="hover:text-on-surface">{CONTACT_EMAIL}</CmsElement>
              </CmsElement>
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>

      {/* Footer */}
      <CmsElement cmsId="828c2ef2-68" as="footer" className="relative overflow-hidden bg-[linear-gradient(135deg,var(--wc-bg)_0%,var(--wc-surface-lowest)_100%)] pt-16 pb-8 border-t border-[var(--wc-outline-variant)] text-on-surface">
        <CmsElement cmsId="828c2ef2-69" as="div" className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
          <CmsElement cmsId="828c2ef2-70" as="div" className="border-t border-[var(--wc-outline-variant)] pt-8">
            <CmsElement cmsId="828c2ef2-71" as="div" className="flex flex-col gap-4 text-sm text-[#5B6B88] md:flex-row md:items-center md:justify-between font-bold">
              <CmsElement cmsId="828c2ef2-72" as="p">&copy; 2026 WeConnect-Innovation Training Portal. All rights reserved.</CmsElement>
              <CmsElement cmsId="828c2ef2-73" as="div" className="flex flex-wrap gap-6">
                <CmsLink cmsId="828c2ef2-74" href="/privacy-policy" className="transition-colors hover:text-[var(--wc-secondary)]">Privacy Policy</CmsLink>
                <CmsLink cmsId="828c2ef2-75" href="/terms" className="transition-colors hover:text-[var(--wc-secondary)]">Terms</CmsLink>
                <CmsLink cmsId="828c2ef2-76" href="/apply" className="transition-colors hover:text-[var(--wc-secondary)]">Apply</CmsLink>
                <CmsElement cmsId="828c2ef2-77" as="a" href={CONTACT_EMAIL_HREF} className="transition-colors hover:text-[var(--wc-secondary)]">{CONTACT_EMAIL}</CmsElement>
              </CmsElement>
            </CmsElement>
          </CmsElement>
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
