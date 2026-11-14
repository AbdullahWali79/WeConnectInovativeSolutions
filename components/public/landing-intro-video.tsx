"use client";

import { useMemo } from "react";
import { Icon } from "@/components/icon";
import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { FadeIn } from "@/components/public/animations";
import { parseVideoEmbed, type LandingVideoSettings } from "@/lib/landing-video";

export function LandingIntroVideo({ settings }: { settings: LandingVideoSettings }) {
  const parsedVideo = useMemo(() => parseVideoEmbed(settings.video_url), [settings.video_url]);

  if (!settings.is_enabled || !settings.video_url) {
    return null;
  }

  return (
    <CmsElement
      cmsId="intro-video-sec-0"
      as="section"
      id="intro-video"
      className="relative isolate overflow-hidden scroll-mt-24 py-16 sm:py-24"
      style={{
        backgroundColor: "var(--wc-bg)",
        color: "var(--wc-on-bg)",
      }}
      aria-labelledby="intro-video-heading"
    >
      {/* Ambient background glow matching hero branding */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--wc-primary) 35%, transparent) 0%, color-mix(in srgb, var(--wc-secondary) 20%, transparent) 45%, transparent 75%)",
        }}
      />

      <div className="homepage-wide-container relative z-10">
        <FadeIn>
          {/* Section Header */}
          <div className="mx-auto max-w-3xl text-center">
            {settings.badge_text && (
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-[0.16em] uppercase"
                style={{
                  border: "1px solid color-mix(in srgb, var(--wc-secondary) 34%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--wc-secondary) 12%, transparent)",
                  color: "var(--wc-secondary)",
                }}
              >
                <Icon name="smart_display" className="text-sm" />
                <span>{settings.badge_text}</span>
              </div>
            )}

            <h2
              id="intro-video-heading"
              className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl"
              style={{ color: "var(--wc-on-surface)" }}
            >
              {settings.title}
            </h2>

            {settings.description && (
              <p
                className="mt-4 text-base leading-relaxed sm:text-lg"
                style={{ color: "var(--wc-on-surface-variant)" }}
              >
                {settings.description}
              </p>
            )}
          </div>

          {/* Cinematic 16:9 Video Player Container */}
          <div className="mx-auto mt-10 max-w-5xl">
            <div
              className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border p-2 sm:p-3 shadow-2xl backdrop-blur-xl transition-all duration-300"
              style={{
                borderColor: "color-mix(in srgb, var(--wc-secondary) 25%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--wc-surface) 60%, transparent)",
                boxShadow: "0 25px 80px -15px color-mix(in srgb, var(--wc-primary) 35%, transparent)",
              }}
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl bg-black">
                {parsedVideo.type === "embed" && parsedVideo.src ? (
                  <iframe
                    src={parsedVideo.src}
                    title={settings.title || "WeConnect Intro Video"}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                ) : parsedVideo.type === "direct" && parsedVideo.src ? (
                  <video
                    src={parsedVideo.src}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-6 text-center text-white">
                    <p className="text-sm">Video format could not be embedded directly.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Below Video */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-center">
              <span className="text-xs sm:text-sm font-semibold text-on-surface-variant">
                Ready to turn your vision into scalable software?
              </span>
              <CmsLink
                cmsId="intro-video-cta"
                href="/contact"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary hover:underline"
              >
                Discuss your project <Icon name="arrow_forward" className="text-sm" />
              </CmsLink>
            </div>
          </div>
        </FadeIn>
      </div>
    </CmsElement>
  );
}
