"use client";
import { CmsImage, CmsElement } from "@/components/cms/cms-element";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Icon } from "@/components/icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { TeamMember } from "@/lib/supabase/types";

type TeamMemberWithLead = TeamMember & { lead_name?: string | null };

function TeamMemberPhoto({ src, name }: { src?: string | null; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photoSrc = src?.trim();
  const showPhoto = Boolean(photoSrc && photoSrc !== failedSrc);

  return (
    <CmsImage cmsId="22c09694-0"
      src={showPhoto ? photoSrc! : "/logo.jpeg"}
      alt={showPhoto ? name : "WeConnect logo"}
      width={112}
      height={112}
      unoptimized
      className={`h-full w-full rounded-full ${showPhoto ? "object-cover" : "bg-white object-contain p-2"}`}
      onError={showPhoto ? () => setFailedSrc(photoSrc!) : undefined}
    />
  );
}

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export const fallbackTeamMembers: TeamMember[] = [
  {
    id: "muhammad-abdullah",
    name: "Muhammad Abdullah",
    role: "Team Leader",
    department: "Leadership",
    image_url: null,
    portfolio_url: null,
    email: null,
    phone: null,
    skills: ["Team Management", "Mentorship", "Operations"],
    bio: "Leads team strategy and delivery at WeConnect-Innovation.",
    reports_to: null,
    status: "active",
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "atif-ayyoub",
    name: "Atif Ayyoub",
    role: "Web Developer",
    department: "Engineering",
    image_url: null,
    portfolio_url: null,
    email: null,
    phone: null,
    skills: ["Next.js", "Frontend", "Supabase"],
    bio: "Builds production web experiences and internal admin workflows.",
    reports_to: "muhammad-abdullah",
    status: "active",
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "abdullah-javeed",
    name: "Abdullah Javeed",
    role: "Flutter Mobile Application Developer",
    department: "Mobile Engineering",
    image_url: null,
    portfolio_url: null,
    email: null,
    phone: null,
    skills: ["Flutter", "Dart", "Mobile UI"],
    bio: "Develops cross-platform mobile applications and interfaces.",
    reports_to: "muhammad-abdullah",
    status: "active",
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sanawar-ali",
    name: "Sanawar Ali",
    role: "Web Designer",
    department: "Design",
    image_url: null,
    portfolio_url: null,
    email: null,
    phone: null,
    skills: ["UI Design", "UX", "Prototyping"],
    bio: "Designs visual systems and user flows for web products.",
    reports_to: "muhammad-abdullah",
    status: "active",
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "haseeb-amjad",
    name: "Haseeb Amjad",
    role: "AI Developer",
    department: "AI Automation",
    image_url: null,
    portfolio_url: null,
    email: null,
    phone: null,
    skills: ["LLM Workflows", "Automation", "Integrations"],
    bio: "Builds AI-powered tools and automation systems.",
    reports_to: "muhammad-abdullah",
    status: "active",
    display_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

type TeamMembersGridProps = {
  readonly initialMembers: TeamMember[];
};

export function TeamMembersGrid({ initialMembers }: TeamMembersGridProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [flippedMemberId, setFlippedMemberId] = useState<string | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    async function refreshMembers() {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("display_order", { ascending: true });

      if (!mounted || error || !data || data.length === 0) return;
      setMembers(data);
    }

    void refreshMembers();
    return () => {
      mounted = false;
    };
  }, []);

  const byId = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const withLead = useMemo<TeamMemberWithLead[]>(() => members.map((member) => ({ ...member, lead_name: member.reports_to ? byId.get(member.reports_to)?.name ?? null : null })), [members, byId]);

  const roles = useMemo(
    () => Array.from(new Set(withLead.map((member) => member.role).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [withLead]
  );
  const departments = useMemo(
    () => Array.from(new Set(withLead.map((member) => member.department).filter((department): department is string => Boolean(department)))).sort((a, b) => a.localeCompare(b)),
    [withLead]
  );

  const filtered = useMemo(() => withLead.filter((member) => {
    const text = `${member.name} ${member.role} ${member.department ?? ""} ${member.email ?? ""}`.toLowerCase();
    const queryMatch = text.includes(query.trim().toLowerCase());
    const roleMatch = roleFilter === "all" || member.role === roleFilter;
    const deptMatch = departmentFilter === "all" || (member.department ?? "") === departmentFilter;
    return queryMatch && roleMatch && deptMatch;
  }), [withLead, query, roleFilter, departmentFilter]);

  // Ensure activeIndex is within bounds when filters change
  useEffect(() => {
    if (activeIndex >= filtered.length && filtered.length > 0) {
      setActiveIndex(0);
    }
  }, [filtered.length, activeIndex]);

  const handleNext = useCallback(() => {
    if (filtered.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % filtered.length);
    setFlippedMemberId(null);
  }, [filtered.length]);

  const handlePrev = useCallback(() => {
    if (filtered.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    setFlippedMemberId(null);
  }, [filtered.length]);

  return (
    <CmsElement cmsId="22c09694-1" as="section" className="relative mx-auto min-h-screen overflow-hidden py-32 bg-[var(--wc-bg)] text-on-surface">
      <CmsElement cmsId="22c09694-2" as="div" className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></CmsElement>

      <CmsElement cmsId="22c09694-3" as="div" className="relative z-10 px-5 md:px-margin-page max-w-container-max mx-auto">
        <CmsElement cmsId="22c09694-4" as="div" className="mb-12 text-center">
          <CmsElement cmsId="22c09694-5" as="div" className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--wc-secondary)]/30 bg-[var(--wc-secondary)]/10 px-4 py-2 text-xs font-bold tracking-widest text-[var(--wc-secondary)] uppercase">
            <Icon name="groups" className="text-sm" /> The Minds Behind The Code
          </CmsElement>
          <CmsElement cmsId="22c09694-6" as="h1" className="mt-3 text-4xl font-black text-on-surface md:text-5xl">Our Expert Team</CmsElement>
          <CmsElement cmsId="22c09694-7" as="p" className="mx-auto mt-4 max-w-2xl text-lg text-[var(--wc-on-surface-variant)]">Meet the brilliant developers, designers, and strategists driving digital innovation.</CmsElement>
        </CmsElement>

        {/* Filters */}
        <CmsElement cmsId="22c09694-8" as="div" className="mb-16 mx-auto grid max-w-4xl gap-4 md:grid-cols-4 bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] p-4 rounded-2xl backdrop-blur-md">
          <CmsElement cmsId="22c09694-9" as="div" className="relative md:col-span-2">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D8BA6]" />
            <input
              className="w-full rounded-xl bg-[var(--wc-surface-lowest)] border border-[var(--wc-outline-variant)] pl-11 pr-4 py-3 text-on-surface placeholder-[#5B6B88] focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)]"
              placeholder="Search by name, role, email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </CmsElement>
          <select
            className="rounded-xl bg-[var(--wc-surface-lowest)] border border-[var(--wc-outline-variant)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] [&>option]:bg-[var(--wc-bg)]"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">All Roles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select
            className="rounded-xl bg-[var(--wc-surface-lowest)] border border-[var(--wc-outline-variant)] px-4 py-3 text-on-surface focus:border-[var(--wc-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--wc-secondary)] [&>option]:bg-[var(--wc-bg)]"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </CmsElement>

        {/* Leadership cards */}
        <CmsElement cmsId="22c09694-10" as="div" className="mx-auto mb-20 grid max-w-4xl gap-8 sm:grid-cols-2">
          <CmsElement cmsId="22c09694-11" as="div" className="group relative flex h-full flex-col items-center rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <CmsElement cmsId="22c09694-12" as="div" className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--wc-primary-container)] text-[var(--wc-on-primary-container)]">
              <TeamMemberPhoto name="Dr. Hammad Habib Qazi" />
            </CmsElement>
            <CmsElement cmsId="22c09694-13" as="h2" className="text-xl font-bold">Dr. Hammad Habib Qazi</CmsElement>
            <CmsElement cmsId="22c09694-14" as="p" className="mt-1 text-xs font-black uppercase tracking-wider text-[var(--wc-primary)]">Founder &amp; CEO</CmsElement>
            <CmsElement cmsId="22c09694-15" as="p" className="mt-4 flex-grow text-sm text-[var(--wc-on-surface-variant)]">
              Leading the vision and strategy for digital excellence and innovation.
            </CmsElement>
            <CmsElement cmsId="22c09694-16" as="div" className="mt-6 flex w-full flex-col gap-3">
              <CmsElement cmsId="22c09694-17" as="h3" className="text-sm font-bold text-[var(--wc-on-surface)]">Contact Information</CmsElement>
              <CmsElement cmsId="22c09694-18" as="a" href="tel:+447454498664" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wc-surface-container)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:bg-[var(--wc-primary)] hover:text-white">
                <Icon name="call" className="text-[18px]" /> +44 7454 498664
              </CmsElement>
              <CmsElement cmsId="22c09694-19" as="a" href="https://www.linkedin.com/in/hummad-h-qazi-01bb8662/" target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--wc-outline)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:border-[#0077b5] hover:bg-[#0077b5] hover:text-white">
                <CmsElement cmsId="22c09694-20" as="span" className="font-serif text-[14px] font-bold leading-none" aria-hidden="true">in</CmsElement> LinkedIn
              </CmsElement>
            </CmsElement>
          </CmsElement>

          <CmsElement cmsId="22c09694-21" as="div" className="group relative flex h-full flex-col items-center rounded-3xl border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-lowest)] p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <CmsElement cmsId="22c09694-22" as="div" className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--wc-primary-container)] text-[var(--wc-on-primary-container)]">
              <TeamMemberPhoto name="Muhammad Abdullah" />
            </CmsElement>
            <CmsElement cmsId="22c09694-23" as="h2" className="text-xl font-bold">Muhammad Abdullah</CmsElement>
            <CmsElement cmsId="22c09694-24" as="p" className="mt-1 text-xs font-black uppercase tracking-wider text-[var(--wc-primary)]">Co-Founder &amp; Operational Manager</CmsElement>
            <CmsElement cmsId="22c09694-25" as="p" className="mt-4 flex-grow text-sm text-[var(--wc-on-surface-variant)]">
              Overseeing operations, product development, and ensuring client success.
            </CmsElement>
            <CmsElement cmsId="22c09694-26" as="div" className="mt-6 flex w-full flex-col gap-3">
              <CmsElement cmsId="22c09694-27" as="h3" className="text-sm font-bold text-[var(--wc-on-surface)]">Contact Information</CmsElement>
              <CmsElement cmsId="22c09694-28" as="a" href="tel:03046983794" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wc-surface-container)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:bg-[var(--wc-primary)] hover:text-white">
                <Icon name="call" className="text-[18px]" /> 0304 698 3794
              </CmsElement>
              <CmsElement cmsId="22c09694-29" as="a" href="https://www.linkedin.com/in/abdullahwale/" target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--wc-outline)] px-4 py-2.5 text-sm font-bold text-[var(--wc-on-surface)] transition-colors hover:border-[#0077b5] hover:bg-[#0077b5] hover:text-white">
                <CmsElement cmsId="22c09694-30" as="span" className="font-serif text-[14px] font-bold leading-none" aria-hidden="true">in</CmsElement> LinkedIn
              </CmsElement>
            </CmsElement>
          </CmsElement>
        </CmsElement>

        {/* 3D Coverflow Carousel */}
        {filtered.length === 0 ? (
          <CmsElement cmsId="22c09694-31" as="div" className="bg-[var(--wc-surface-low)] border border-[var(--wc-outline-variant)] rounded-3xl p-12 text-center max-w-2xl mx-auto mt-8">
            <Icon name="person_search" className="text-6xl text-[#5B6B88] mb-4" />
            <CmsElement cmsId="22c09694-32" as="h3" className="text-2xl font-bold text-on-surface mb-2">No experts found</CmsElement>
            <CmsElement cmsId="22c09694-33" as="p" className="text-[var(--wc-on-surface-variant)]">Try adjusting your search or filters.</CmsElement>
          </CmsElement>
        ) : (
          <CmsElement cmsId="22c09694-34" as="div" className="relative w-full h-[550px] md:h-[600px] flex items-center justify-center">

            {/* Left Nav Button */}
            <CmsElement cmsId="22c09694-35" as="button"
              onClick={handlePrev}
              className="absolute left-0 md:left-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
            >
              <Icon name="arrow_back" className="text-2xl" />
            </CmsElement>

            <CmsElement cmsId="22c09694-36" as="div" className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
              {filtered.map((member, index) => {
                let diff = index - activeIndex;

                if (diff > Math.floor(filtered.length / 2)) {
                  diff -= filtered.length;
                } else if (diff < -Math.floor(filtered.length / 2)) {
                  diff += filtered.length;
                }

                let translateX = 0;
                let translateZ = 0;
                let rotateY = 0;
                let opacity = 0;
                let zIndex = 0;
                let scale = 1;

                if (diff === 0) {
                  translateX = 0;
                  translateZ = 0;
                  rotateY = 0;
                  opacity = 1;
                  zIndex = 30;
                  scale = 1;
                } else if (diff === 1) {
                  translateX = 50;
                  translateZ = -100;
                  rotateY = -15;
                  opacity = 0.7;
                  zIndex = 20;
                  scale = 0.85;
                } else if (diff === -1) {
                  translateX = -50;
                  translateZ = -100;
                  rotateY = 15;
                  opacity = 0.7;
                  zIndex = 20;
                  scale = 0.85;
                } else if (diff === 2) {
                  translateX = 80;
                  translateZ = -200;
                  rotateY = -25;
                  opacity = 0.4;
                  zIndex = 10;
                  scale = 0.7;
                } else if (diff === -2) {
                  translateX = -80;
                  translateZ = -200;
                  rotateY = 25;
                  opacity = 0.4;
                  zIndex = 10;
                  scale = 0.7;
                } else {
                  translateX = diff > 0 ? 100 : -100;
                  translateZ = -300;
                  opacity = 0;
                  zIndex = 0;
                  scale = 0.5;
                }

                const isActive = diff === 0;

                return (
                  <CmsElement cmsId="22c09694-37" as="div" instance={String(member.id)}
                    key={member.id}
                    className="absolute w-[300px] sm:w-[350px] md:w-[380px] h-[480px] sm:h-[500px] transition-all duration-700 ease-in-out cursor-pointer [perspective:1000px]"
                    style={{
                      transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                      opacity,
                      zIndex,
                    }}
                    onClick={() => {
                      if (!isActive) {
                        setActiveIndex(index);
                        setFlippedMemberId(null);
                      } else {
                        setFlippedMemberId(current => current === member.id ? null : member.id);
                      }
                    }}
                  >
                    <CmsElement cmsId="22c09694-38" as="div"
                      className="relative h-full w-full rounded-[28px] text-left transition-transform duration-500 [transform-style:preserve-3d]"
                      style={{ transform: `rotateY(${flippedMemberId === member.id ? 180 : 0}deg)` }}
                    >
                      {/* Front of Card */}
                      <CmsElement cmsId="22c09694-39" as="div" className={`absolute inset-0 overflow-hidden rounded-[28px] border transition-colors duration-500 bg-[var(--wc-surface-lowest)] p-6 [backface-visibility:hidden] flex flex-col justify-between ${isActive ? 'border-[var(--wc-secondary)]/50 shadow-glow-lg' : 'border-[var(--wc-outline-variant)] shadow-xl'}`}>
                        <CmsElement cmsId="22c09694-40" as="div" className="flex flex-col items-center mt-6">
                          <CmsElement cmsId="22c09694-41" as="div" className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full p-[3px] transition-all duration-500 ${isActive ? 'bg-gradient-to-br from-[var(--wc-secondary)] to-[var(--wc-primary)] shadow-glow-lg' : 'bg-[var(--wc-surface-low)]'}`}>
                            <CmsElement cmsId="22c09694-42" as="div" className="flex h-full w-full items-center justify-center rounded-full bg-[var(--wc-bg)] overflow-hidden">
                              <TeamMemberPhoto src={member.image_cdn_url?.trim() || member.image_url} name={member.name} />
                            </CmsElement>
                          </CmsElement>
                          <CmsElement cmsId="22c09694-43" as="div" className="mt-8 text-center">
                            <CmsElement cmsId="22c09694-44" as="p" className="text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)] mb-2">{member.role}</CmsElement>
                            <CmsElement cmsId="22c09694-45" as="h3" className={`text-2xl font-black transition-colors ${isActive ? 'text-on-surface' : 'text-[var(--wc-on-surface-variant)]'}`}>{member.name}</CmsElement>
                            <CmsElement cmsId="22c09694-46" as="p" className="mt-2 text-sm text-[var(--wc-on-surface-variant)]">{member.department ?? "General"}</CmsElement>
                          </CmsElement>
                        </CmsElement>
                        <CmsElement cmsId="22c09694-47" as="div" className="flex justify-center mb-2">
                          <CmsElement cmsId="22c09694-48" as="span" className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-bold transition-colors ${isActive ? 'border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface' : 'border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-[#5B6B88]'}`}>
                            <Icon name="swap_horiz" className="text-[14px]" /> Flip for Bio
                          </CmsElement>
                        </CmsElement>
                      </CmsElement>

                      {/* Back of Card */}
                      <CmsElement cmsId="22c09694-49" as="div" className="absolute inset-0 rounded-[28px] border border-[var(--wc-secondary)]/30 bg-gradient-to-b from-[var(--wc-primary)] to-[var(--wc-bg)] p-6 text-on-surface [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl flex flex-col">
                        <CmsElement cmsId="22c09694-50" as="p" className="text-xs font-bold uppercase tracking-widest text-[var(--wc-secondary)]">{member.role}</CmsElement>
                        <CmsElement cmsId="22c09694-51" as="h4" className="mt-2 text-2xl font-black">{member.name}</CmsElement>

                        <CmsElement cmsId="22c09694-52" as="div" className="mt-4 border-t border-[var(--wc-outline-variant)] pt-4 flex-1">
                          <CmsElement cmsId="22c09694-53" as="p" className="text-sm leading-6 text-[var(--wc-on-surface-variant)]">
                            {member.bio ?? "Core contributor to our digital product initiatives."}
                          </CmsElement>
                        </CmsElement>

                        <CmsElement cmsId="22c09694-54" as="div" className="mt-5 mb-16">
                          <CmsElement cmsId="22c09694-55" as="p" className="text-xs font-bold uppercase tracking-widest text-[var(--wc-on-surface-variant)] mb-3">Expertise</CmsElement>
                          <CmsElement cmsId="22c09694-56" as="div" className="flex flex-wrap gap-2">
                            {(member.skills ?? ["Software Development", "Problem Solving"]).map((skill) => (
                              <CmsElement cmsId="22c09694-57" as="span" instance={String(skill)} key={skill} className="rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] px-3 py-1 text-[11px] font-bold text-on-surface">
                                {skill}
                              </CmsElement>
                            ))}
                          </CmsElement>
                        </CmsElement>

                        {member.portfolio_url && (
                          <CmsElement cmsId="22c09694-58" as="div" className="absolute bottom-6 left-6 right-6">
                            <CmsElement cmsId="22c09694-59" as="a"
                              href={normalizeExternalUrl(member.portfolio_url)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--wc-secondary)] py-3 text-sm font-bold text-on-primary shadow-glow transition hover:scale-[1.02]"
                            >
                              View Portfolio <Icon name="open_in_new" className="text-[16px]" />
                            </CmsElement>
                          </CmsElement>
                        )}
                      </CmsElement>
                    </CmsElement>
                  </CmsElement>
                );
              })}
            </CmsElement>

            {/* Right Nav Button */}
            <CmsElement cmsId="22c09694-60" as="button"
              onClick={handleNext}
              className="absolute right-0 md:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wc-outline-variant)] bg-[var(--wc-surface-low)] text-on-surface transition-all hover:bg-[var(--wc-secondary)] hover:text-on-primary hover:scale-110 shadow-lg backdrop-blur-md"
            >
              <Icon name="arrow_forward" className="text-2xl" />
            </CmsElement>

            {/* Pagination Dots */}
            <CmsElement cmsId="22c09694-61" as="div" className="absolute bottom-[-30px] left-0 right-0 flex justify-center gap-2">
              {filtered.map((_, idx) => (
                <CmsElement cmsId="22c09694-62" as="button" instance={String(idx)}
                  key={idx}
                  onClick={() => {
                    setActiveIndex(idx);
                    setFlippedMemberId(null);
                  }}
                  className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[var(--wc-secondary)]' : 'w-2 bg-[var(--wc-surface-low)] hover:bg-[var(--wc-surface-low)]'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </CmsElement>

          </CmsElement>
        )}
      </CmsElement>
    </CmsElement>
  );
}
