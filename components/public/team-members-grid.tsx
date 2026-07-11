"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { TeamMember } from "@/lib/supabase/types";

type TeamMemberWithLead = TeamMember & { lead_name?: string | null };

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
    <section className="relative mx-auto min-h-screen overflow-hidden py-32 bg-[#030B1C] text-white">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,43,127,0.4),transparent)] pointer-events-none"></div>

      <div className="relative z-10 px-5 md:px-margin-page max-w-container-max mx-auto">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-[#FFD24A]/30 bg-[#FFD24A]/10 px-4 py-2 text-xs font-bold tracking-widest text-[#FFD24A] uppercase">
            <Icon name="groups" className="text-sm" /> The Minds Behind The Code
          </div>
          <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">Our Expert Team</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#91A3C7]">Meet the brilliant developers, designers, and strategists driving digital innovation.</p>
        </div>

        {/* Filters */}
        <div className="mb-16 mx-auto grid max-w-4xl gap-4 md:grid-cols-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
          <div className="relative md:col-span-2">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D8BA6]" />
            <input 
              className="w-full rounded-xl bg-black/20 border border-white/10 pl-11 pr-4 py-3 text-white placeholder-[#5B6B88] focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A]" 
              placeholder="Search by name, role, email" 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
            />
          </div>
          <select 
            className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] [&>option]:bg-[#030B1C]" 
            value={roleFilter} 
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">All Roles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select 
            className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-white focus:border-[#FFD24A] focus:outline-none focus:ring-1 focus:ring-[#FFD24A] [&>option]:bg-[#030B1C]" 
            value={departmentFilter} 
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </div>

        {/* 3D Coverflow Carousel */}
        {filtered.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center max-w-2xl mx-auto mt-8">
            <Icon name="person_search" className="text-6xl text-[#5B6B88] mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No experts found</h3>
            <p className="text-[#91A3C7]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="relative w-full h-[550px] md:h-[600px] flex items-center justify-center">
            
            {/* Left Nav Button */}
            <button 
              onClick={handlePrev}
              className="absolute left-0 md:left-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110 shadow-lg backdrop-blur-md"
            >
              <Icon name="arrow_back" className="text-2xl" />
            </button>

            <div className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-1000">
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
                  <div 
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
                    <div
                      className="relative h-full w-full rounded-[28px] text-left transition-transform duration-500 [transform-style:preserve-3d]"
                      style={{ transform: `rotateY(${flippedMemberId === member.id ? 180 : 0}deg)` }}
                    >
                      {/* Front of Card */}
                      <div className={`absolute inset-0 overflow-hidden rounded-[28px] border transition-colors duration-500 bg-[#061A3D] p-6 [backface-visibility:hidden] flex flex-col justify-between ${isActive ? 'border-[#FFD24A]/50 shadow-[0_0_60px_rgba(255,210,74,0.2)]' : 'border-white/10 shadow-xl'}`}>
                        <div className="flex flex-col items-center mt-6">
                          <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full p-[3px] transition-all duration-500 ${isActive ? 'bg-gradient-to-br from-[#FFD24A] to-[#062B7F] shadow-[0_0_30px_rgba(255,210,74,0.4)]' : 'bg-white/10'}`}>
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#030B1C] overflow-hidden">
                              {(member.image_cdn_url ?? member.image_url) ? (
                                <Image src={member.image_cdn_url ?? member.image_url ?? ""} alt={member.name} width={112} height={112} unoptimized className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-4xl font-black text-white">{member.name.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          <div className="mt-8 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#FFD24A] mb-2">{member.role}</p>
                            <h3 className={`text-2xl font-black transition-colors ${isActive ? 'text-white' : 'text-[#91A3C7]'}`}>{member.name}</h3>
                            <p className="mt-2 text-sm text-[#91A3C7]">{member.department ?? "General"}</p>
                          </div>
                        </div>
                        <div className="flex justify-center mb-2">
                          <span className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-bold transition-colors ${isActive ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 bg-white/5 text-[#5B6B88]'}`}>
                            <Icon name="swap_horiz" className="text-[14px]" /> Flip for Bio
                          </span>
                        </div>
                      </div>

                      {/* Back of Card */}
                      <div className="absolute inset-0 rounded-[28px] border border-[#FFD24A]/30 bg-gradient-to-b from-[#062B7F] to-[#030B1C] p-6 text-white [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl flex flex-col">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#FFD24A]">{member.role}</p>
                        <h4 className="mt-2 text-2xl font-black">{member.name}</h4>
                        
                        <div className="mt-4 border-t border-white/10 pt-4 flex-1">
                          <p className="text-sm leading-6 text-[#91A3C7]">
                            {member.bio ?? "Core contributor to our digital product initiatives."}
                          </p>
                        </div>
                        
                        <div className="mt-5 mb-16">
                          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Expertise</p>
                          <div className="flex flex-wrap gap-2">
                            {(member.skills ?? ["Software Development", "Problem Solving"]).map((skill) => (
                              <span key={skill} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-bold text-white">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {member.portfolio_url && (
                          <div className="absolute bottom-6 left-6 right-6">
                            <a
                              href={normalizeExternalUrl(member.portfolio_url)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD24A] py-3 text-sm font-bold text-[#030B1C] shadow-[0_0_20px_rgba(255,210,74,0.3)] transition hover:scale-[1.02]"
                            >
                              View Portfolio <Icon name="open_in_new" className="text-[16px]" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Nav Button */}
            <button 
              onClick={handleNext}
              className="absolute right-0 md:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all hover:bg-[#FFD24A] hover:text-[#030B1C] hover:scale-110 shadow-lg backdrop-blur-md"
            >
              <Icon name="arrow_forward" className="text-2xl" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-[-30px] left-0 right-0 flex justify-center gap-2">
              {filtered.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveIndex(idx);
                    setFlippedMemberId(null);
                  }}
                  className={`h-2 transition-all rounded-full ${idx === activeIndex ? 'w-8 bg-[#FFD24A]' : 'w-2 bg-white/20 hover:bg-white/50'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            
          </div>
        )}
      </div>
    </section>
  );
}
