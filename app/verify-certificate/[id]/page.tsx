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

  return <main className="min-h-screen bg-slate-100 px-3 py-8 sm:px-6 sm:py-12"><div className="mx-auto max-w-6xl">
    <section className="mb-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:flex-row">
      <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-3xl font-black text-white">✓</div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Official certificate record</p><h1 className="text-3xl font-black text-slate-900">Verified</h1><p className="font-semibold text-slate-600">Certified by We Connect Innovative Solutions</p></div></div>
      <div className="rounded-xl bg-blue-50 px-5 py-3 text-center text-sm text-blue-950"><b className="block text-base">{certificate.software_house_name}</b><span>Affiliated with We Connect Innovative Solutions</span></div>
    </section>

    <article className="relative aspect-[1.414/1] min-h-[590px] overflow-hidden bg-white p-[7%] shadow-2xl" style={{ color: certificate.text_color }}>
      <div className="absolute left-0 top-0 h-24 w-24" style={{ backgroundColor: certificate.primary_color }} /><div className="absolute left-12 top-0 h-16 w-16 opacity-80" style={{ backgroundColor: certificate.secondary_color }} /><div className="absolute bottom-0 right-0 h-20 w-20" style={{ backgroundColor: certificate.primary_color }} /><div className="absolute bottom-10 right-0 h-16 w-16 opacity-80" style={{ backgroundColor: certificate.secondary_color }} /><div className="absolute inset-[5%] border-2" style={{ borderColor: certificate.primary_color }} />
      <div className="absolute left-[7%] top-[7%] z-10 max-w-[34%] text-xs font-bold uppercase tracking-[.12em] sm:text-sm">{certificate.software_house_name}</div><div className="absolute right-[7%] top-[6%] z-10 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 sm:text-xs">✓ Verified</div>
      {certificate.digital_stamp_url && <div className="pointer-events-none absolute bottom-[12%] left-1/2 h-28 w-28 -translate-x-1/2 opacity-15"><Image src={certificate.digital_stamp_url} alt="Official stamp" fill className="object-contain" unoptimized /></div>}
      <div className="relative z-[1] flex h-full flex-col items-center justify-center text-center">
        {certificate.logo_url ? <div className="relative mb-3 h-14 w-28 sm:h-20 sm:w-36"><Image src={certificate.logo_url} alt={`${certificate.software_house_name} logo`} fill className="object-contain" unoptimized /></div> : <Image src="/logo.jpeg" alt="We Connect Innovative Solutions" width={100} height={60} className="mb-3 h-14 w-auto object-contain" />}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-blue-700 sm:text-xs">Affiliated with We Connect Innovative Solutions</p><h2 className="text-3xl font-light sm:text-5xl">Certificate of Completion</h2><p className="mt-4 text-sm sm:text-lg">This certificate is proudly awarded to</p><h3 className="my-3 text-3xl font-black sm:text-6xl">{certificate.student_name}</h3>
        <p className="max-w-3xl text-sm leading-6 sm:text-xl sm:leading-8">for successfully completing the <b>{certificate.course_name} Internship</b> at <b>{certificate.software_house_name}</b> over a period of <b>{certificate.duration_weeks} weeks</b>, from {prettyDate(certificate.start_date)} to {prettyDate(certificate.end_date)}.</p><p className="mt-3 text-xs tracking-wide sm:text-base">Software House Registration No. <b>{certificate.roll_number}</b></p>
        <div className="mt-4 grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-3"><Metric label="Punctuality" value={certificate.punctuality_percentage} color={certificate.primary_color} /><Metric label="Task Completion" value={certificate.task_completion_percentage} color={certificate.primary_color} /><Metric label="Project Involvement" value={certificate.project_involvement_percentage} color={certificate.primary_color} /></div>
        <div className="mt-4 w-56 text-center sm:w-80">{certificate.signature_url && <div className="relative mx-auto h-10 w-32"><Image src={certificate.signature_url} alt="Authorized signature" fill className="object-contain" unoptimized /></div>}<div className="border-b-2" style={{ borderColor: certificate.primary_color }}>&nbsp;</div><p className="mt-2 text-[10px] font-semibold sm:text-xs">Head of {certificate.software_house_name}</p></div>
      </div>
    </article>
    <p className="mt-5 text-center text-xs text-slate-500">Certificate ID: {certificate.id} · This record is displayed from the official We Connect Innovative Solutions verification system.</p>
  </div></main>;
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) { return <div className="rounded-md border bg-white/90 px-1 py-1.5" style={{ borderColor: color }}><b className="block text-sm sm:text-lg" style={{ color }}>{value}%</b><span className="block text-[7px] font-bold uppercase sm:text-[10px]">{label}</span></div>; }
