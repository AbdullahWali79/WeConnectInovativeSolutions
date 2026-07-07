import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { CourseCarousel } from "@/components/public/course-carousel";
import { EmptyState } from "@/components/empty-state";
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
    <main className="overflow-x-clip bg-[#030B1C] text-white min-h-screen relative">
      <ScrollProgress />
      <PromoPopup context="landing" />
      <PublicHeader />

      {/* Hero Section */}
      <section id="overview" className="relative isolate overflow-hidden bg-[#030B1C] pt-24 pb-20 lg:pt-32 lg:pb-28 text-center">
        {/* Background glow effects */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></div>
        <FloatingOrbs />
        
        <div className="relative z-10 mx-auto max-w-4xl px-5 md:px-margin-page">
          <FadeIn>
            <div className="mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFD24A]">
              3-6 Month Training Pathway to Internship & Job Readiness
            </div>

            <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.5rem] mb-6">
              Learn Tech Skills. Build Real Projects. Connect with Industry.
            </h1>

            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[#91A3C7] mb-10">
              WeConnect-Innovation bridges the gap between learning and employment through industry partnerships, mentor-guided projects, internships, and software house collaborations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/apply" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] px-10 py-4 text-sm font-black text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] transition-transform hover:scale-[1.02]">
                Apply Now
              </Link>
              <Link href="#courses" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-10 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10 hover:border-[#FFD24A]/30">
                Explore Programs
              </Link>
            </div>
            
            <p className="mt-8 text-xs font-bold uppercase tracking-widest text-[#5B6B88]">
              Students, software developers, and industry partners collaborate here.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Stats / Trust Bar */}
      <section className="relative overflow-hidden py-16 md:py-24 bg-[#061A3D]/40 border-y border-white/5">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,210,74,0.05),transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
          <FadeIn>
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FFD24A] mb-2">Our Impact</p>
              <h2 className="text-3xl md:text-4xl font-black text-white">Trusted by learners and industry partners</h2>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.05}>
            {impactStats.map((stat) => {
              const cardContent = (
                <>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD24A]/10 border border-[#FFD24A]/20 text-[#FFD24A] transition-all duration-300 group-hover:bg-[#FFD24A] group-hover:text-[#030B1C] group-hover:scale-110">
                    <Icon name={stat.icon} className="text-2xl" />
                  </div>
                  <div>
                    <div className="text-4xl font-black text-white mb-2">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="font-bold text-[#91A3C7] mb-1">{stat.label}</p>
                    <p className="text-xs text-[#5B6B88]">{stat.description}</p>
                  </div>
                </>
              );

              const cardClassName = "group flex flex-col items-center justify-center text-center rounded-3xl border border-white/10 bg-[#061A3D]/60 p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-2 hover:border-[#FFD24A]/30 hover:bg-[#061A3D]/80";

              return stat.href ? (
                <StaggerItem key={stat.label}>
                  <Link href={stat.href} className={`${cardClassName} cursor-pointer block h-full`}>
                    {cardContent}
                  </Link>
                </StaggerItem>
              ) : (
                <StaggerItem key={stat.label}>
                  <div className={`${cardClassName} cursor-default h-full`}>
                    {cardContent}
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* Happy Clients Portfolio (Replaces Career Pathway) */}
      <ClientsPortfolio />

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-[#030B1C]">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#91A3C7]">
                <Icon name="auto_awesome" className="text-sm" /> Why Choose WeConnect-Innovation?
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white">What Makes Us Different?</h2>
            </div>
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
              <StaggerItem key={title}>
                <div className="group h-full rounded-3xl border border-white/10 bg-[#061A3D]/60 p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 hover:border-[#FFD24A]/30 hover:bg-[#061A3D]/80 hover:shadow-[0_0_40px_rgba(255,210,74,0.15)]">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[#FFD24A] transition-all duration-300 group-hover:bg-[#FFD24A]/10 group-hover:border-[#FFD24A]/30 group-hover:scale-110">
                    <Icon name={icon} className="text-3xl" />
                  </div>
                  <h3 className="text-xl font-black text-white transition-colors group-hover:text-[#FFD24A] mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#91A3C7]">{text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Audience Section */}
      <section className="py-20 md:py-32 bg-[#061A3D]/30 border-t border-white/5">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page">
          <FadeIn>
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#91A3C7]">
                <Icon name="groups" className="text-sm" /> Who This Is For
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white">Built for learners who want practical outcomes</h2>
            </div>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {audienceGroups.map(([icon, title, text]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-[#061A3D]/40 p-8 backdrop-blur-md transition-transform hover:-translate-y-1">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFD24A]/10 border border-[#FFD24A]/20 text-[#FFD24A]">
                  <Icon name={icon} className="text-2xl" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{title}</h3>
                <p className="text-sm leading-relaxed text-[#91A3C7]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="relative bg-[#030B1C] py-20 md:py-32 border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(6,43,127,0.3),transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
          <FadeIn>
            <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#91A3C7]">
                  <Icon name="school" className="text-sm" /> Course Catalog
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Choose your pathway</h2>
                <p className="text-lg text-[#91A3C7]">
                  Explore active training pathways designed around practical assignments, mentor review, and portfolio-ready outcomes.
                </p>
              </div>
              <Link href="/courses" className="inline-flex items-center gap-2 shrink-0 rounded-xl bg-white/10 border border-white/20 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#FFD24A] hover:border-[#FFD24A] hover:text-[#030B1C]">
                View All Courses <Icon name="arrow_forward" className="text-sm" />
              </Link>
            </div>
          </FadeIn>

          {activeCourses.length > 0 ? (
            <CourseCarousel courses={activeCourses} />
          ) : (
            <FadeIn>
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-12 text-center backdrop-blur-md">
                <Icon name="school" className="mx-auto text-5xl text-[#91A3C7] mb-4" />
                <h3 className="text-2xl font-black text-white mb-2">No active courses yet</h3>
                <p className="text-[#91A3C7]">New training pathways will appear here as they become available.</p>
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA Section */}
      <section className="py-20 md:py-24 bg-[#061A3D]/40 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-5 md:px-margin-page text-center">
          <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#061A3D] to-[#062B7F] border border-[#4379FF]/30 p-10 sm:p-16 shadow-[0_0_60px_rgba(6,43,127,0.5)]">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,210,74,0.15),transparent_50%)]"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Ready to Start Your Training Journey?</h2>
              <p className="text-lg text-[#91A3C7] max-w-2xl mx-auto mb-10">
                Apply now and take the first step toward practical learning, mentor feedback, internship readiness, and career growth. Limited seats available for the next batch.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/apply" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FFD24A] to-[#FFA03A] px-10 py-4 text-sm font-black text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] transition-transform hover:scale-[1.02]">
                  Apply Now
                </Link>
                <Link href="/contact" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-10 py-4 text-sm font-bold text-white transition-colors hover:bg-white/10 hover:border-[#FFD24A]/30">
                  Talk to Advisor
                </Link>
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-widest text-[#FFD24A]/70">
                Email: <a href={CONTACT_EMAIL_HREF} className="hover:text-white">{CONTACT_EMAIL}</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden bg-[linear-gradient(135deg,#030B1C_0%,#061A3D_100%)] pt-16 pb-8 border-t border-white/10 text-white">
        <div className="mx-auto max-w-container-max px-5 md:px-margin-page relative z-10">
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col gap-4 text-sm text-[#5B6B88] md:flex-row md:items-center md:justify-between font-bold">
              <p>&copy; 2026 WeConnect-Innovation Training Portal. All rights reserved.</p>
              <div className="flex flex-wrap gap-6">
                <Link href="/privacy-policy" className="transition-colors hover:text-[#FFD24A]">Privacy Policy</Link>
                <Link href="/terms" className="transition-colors hover:text-[#FFD24A]">Terms</Link>
                <Link href="/apply" className="transition-colors hover:text-[#FFD24A]">Apply</Link>
                <a href={CONTACT_EMAIL_HREF} className="transition-colors hover:text-[#FFD24A]">{CONTACT_EMAIL}</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
