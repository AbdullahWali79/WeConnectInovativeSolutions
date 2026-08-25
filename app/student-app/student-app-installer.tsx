"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function StudentAppInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareUrl, setShareUrl] = useState("https://weconnectinovativesolutions.vercel.app/student-app");

  useEffect(() => {
    setShareUrl(window.location.href.split("#")[0]);
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    );

    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const complete = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setNotice("Student App installed successfully.");
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);

  async function install() {
    if (installed) {
      window.location.href = "/student";
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      setNotice(outcome === "accepted" ? "Installation started." : "Installation cancelled. You can try again anytime.");
      return;
    }
    setNotice(/iphone|ipad|ipod/i.test(navigator.userAgent)
      ? "iPhone/iPad: tap the Share icon, then select Add to Home Screen."
      : "Open the browser menu and select Install app or Add to Home screen.");
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "WeConnect Student App", text: "Install the WeConnect Student App", url: shareUrl }).catch(() => undefined);
      return;
    }
    await copyLink();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setNotice("Student App link copied. You can paste it anywhere.");
  }

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent("Install the WeConnect Student App: ");

  return (
    <main className="min-h-screen bg-[var(--wc-bg)] px-5 py-10 text-[var(--wc-on-surface)]">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Link href="/login" className="self-start inline-flex items-center gap-2 font-bold text-[var(--wc-primary)]">
          <Icon name="arrow_back" /> Back to login
        </Link>

        <Image src="/icons/icon-192.png" width={128} height={128} priority alt="WeConnect Student App" className="mt-10 rounded-3xl shadow-xl" />
        <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-[var(--wc-secondary)]">WeConnect Innovation</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Download Student App</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--wc-on-surface-variant)]">
          Install the app on Android, iPhone, Windows, or Mac and quickly access your courses, tasks, projects, and progress.
        </p>

        <button onClick={install} className="wc-primary-btn mt-8 w-full max-w-md py-4 text-base">
          <Icon name={installed ? "open_in_new" : "download"} /> {installed ? "OPEN STUDENT APP" : "DOWNLOAD STUDENT APP"}
        </button>
        {notice && <p role="status" className="mt-4 rounded-xl bg-[var(--wc-surface-low)] px-5 py-3 text-sm font-bold">{notice}</p>}

        <section className="wc-card mt-10 w-full p-6 sm:p-8">
          <h2 className="text-xl font-black">Share with students</h2>
          <p className="mt-2 text-sm text-[var(--wc-on-surface-variant)]">Admin aur students is page ka link kisi ko bhi share kar sakte hain.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href={`https://wa.me/?text=${encodedText}${encodedUrl}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white">WhatsApp</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white">Facebook</a>
            <button onClick={share} className="rounded-xl border border-[var(--wc-outline-variant)] px-4 py-3 font-black"><Icon name="ios_share" className="mr-2 align-middle" />Instagram / More</button>
            <button onClick={copyLink} className="rounded-xl border border-[var(--wc-outline-variant)] px-4 py-3 font-black"><Icon name="content_copy" className="mr-2 align-middle" />Copy Link</button>
          </div>
          <div className="mt-5 break-all rounded-xl bg-[var(--wc-surface-low)] p-4 text-sm font-bold text-[var(--wc-primary)]">{shareUrl}</div>
        </section>
      </div>
    </main>
  );
}
