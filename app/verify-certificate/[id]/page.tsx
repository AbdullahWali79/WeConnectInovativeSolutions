import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificate Verification | We Connect Innovative Solutions" };

const prettyDate = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));

export default async function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: certificate } = await createSupabaseServiceClient().from("simple_certificates").select("*").eq("id", id).maybeSingle();
  if (!certificate) notFound();

  return <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-12"><div className="mx-auto min-w-0 max-w-6xl">
    <section className="mb-4 flex min-w-0 flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4"><div className="flex h-11 w-11 shrink-0 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl font-black text-white">✓</div><div className="min-w-0 break-words"><p className="text-[10px] sm:text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Official certificate record</p><h1 className="text-3xl font-black text-slate-900">Verified</h1><p className="text-sm font-semibold text-slate-600 sm:text-base">Certified by We Connect Innovative Solutions</p></div></div>
      <div className="min-w-0 break-words rounded-xl bg-blue-50 px-4 py-3 lg:max-w-sm text-center text-sm text-blue-950"><b className="block text-base">{certificate.software_house_name}</b><span>Affiliated with We Connect Innovative Solutions</span></div>
    </section>

    <article className="relative isolate w-full min-w-0 bg-white px-6 py-8 shadow-lg sm:px-12 sm:py-12 lg:min-h-[590px] lg:p-[7%] lg:shadow-2xl" style={{ color: certificate.text_color }}>
      <div className="absolute left-0 top-0 h-12 w-12 sm:h-24 sm:w-24" style={{ backgroundColor: certificate.primary_color }} /><div className="absolute left-6 top-0 h-8 w-8 sm:left-12 sm:h-16 sm:w-16 opacity-80" style={{ backgroundColor: certificate.secondary_color }} /><div className="absolute bottom-0 right-0 h-10 w-10 sm:h-20 sm:w-20" style={{ backgroundColor: certificate.primary_color }} /><div className="absolute bottom-5 right-0 h-8 w-8 sm:bottom-10 sm:h-16 sm:w-16 opacity-80" style={{ backgroundColor: certificate.secondary_color }} /><div className="pointer-events-none absolute inset-3 border-2 sm:inset-6" style={{ borderColor: certificate.primary_color }} />
      <div className="relative z-10 mx-auto max-w-2xl break-words text-center text-xs font-bold uppercase tracking-[.12em] sm:text-sm">{certificate.software_house_name}</div><div className="relative z-10 mx-auto mb-5 mt-3 w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 sm:text-xs">✓ Verified</div>
      {certificate.digital_stamp_url && <div className="pointer-events-none absolute bottom-[12%] left-1/2 h-28 w-28 -translate-x-1/2 opacity-15"><Image src={certificate.digital_stamp_url} alt="Official stamp" fill className="object-contain" unoptimized /></div>}
      <div className="relative z-[1] flex min-w-0 flex-col items-center justify-center text-center [overflow-wrap:anywhere]">
        {certificate.logo_url ? <div className="relative mb-3 h-14 w-28 sm:h-20 sm:w-36"><Image src={certificate.logo_url} alt={`${certificate.software_house_name} logo`} fill className="object-contain" unoptimized /></div> : <Image src="/logo.jpeg" alt="We Connect Innovative Solutions" width={100} height={60} className="mb-3 h-14 w-auto object-contain" />}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-blue-700 sm:text-xs">Affiliated with We Connect Innovative Solutions</p><h2 className="text-2xl font-light leading-tight sm:text-5xl">Certificate of Completion</h2><p className="mt-4 text-sm sm:text-lg">This certificate is proudly awarded to</p><h3 className="my-3 max-w-full text-3xl font-black leading-tight sm:text-6xl">{certificate.student_name}</h3>
        <p className="max-w-3xl text-sm leading-6 sm:text-xl sm:leading-8">for successfully completing the <b>{certificate.course_name} Internship</b> at <b>{certificate.software_house_name}</b> over a period of <b>{certificate.duration_weeks} weeks</b>, from {prettyDate(certificate.start_date)} to {prettyDate(certificate.end_date)}.</p><p className="mt-3 text-xs tracking-wide sm:text-base">Software House Registration No. <b>{certificate.roll_number}</b></p>
        <div className="mt-5 grid w-full min-w-0 max-w-2xl grid-cols-1 gap-2 min-[400px]:grid-cols-3 sm:gap-3"><Metric label="Punctuality" value={certificate.punctuality_percentage} color={certificate.primary_color} /><Metric label="Task Completion" value={certificate.task_completion_percentage} color={certificate.primary_color} /><Metric label="Project Involvement" value={certificate.project_involvement_percentage} color={certificate.primary_color} /></div>
        <div className="mt-6 w-full max-w-56 text-center sm:max-w-80">{certificate.signature_url && <div className="relative mx-auto h-10 w-32"><Image src={certificate.signature_url} alt="Authorized signature" fill className="object-contain" unoptimized /></div>}<div className="border-b-2" style={{ borderColor: certificate.primary_color }}>&nbsp;</div><p className="mt-2 text-[10px] font-semibold sm:text-xs">Head of {certificate.software_house_name}</p></div>
      </div>
    </article>
    <p className="mt-5 break-words text-center text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere]">Certificate ID: {certificate.id} · This record is displayed from the official We Connect Innovative Solutions verification system.</p>
  </div></main>;
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) { return <div className="min-w-0 rounded-md border bg-white/90 px-2 py-2" style={{ borderColor: color }}><b className="block text-sm sm:text-lg" style={{ color }}>{value}%</b><span className="block text-[10px] font-bold uppercase leading-relaxed">{label}</span></div>; }
