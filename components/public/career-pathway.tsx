import React from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

export function CareerPathway() {
  const steps = [
    {
      icon: "workspace_premium",
      label: "Expert",
      title: "Expert Level",
      description: "Learners with 6-8 months of relevant experience may qualify for a sponsored internship track with structured weekly hours, mentor review, and certification after successful completion.",
      proof: "Requires 6-8 months relevant experience",
      progress: 25,
    },
    {
      icon: "military_tech",
      label: "Intermediate",
      title: "Intermediate Level",
      description: "Learners should have at least 2-3 months of experience in their chosen field before joining the guided onboarding plan.",
      proof: "Requires 2-3 months field experience",
      progress: 50,
    },
    {
      icon: "school",
      label: "Beginner",
      title: "Beginner Level",
      description: "New learners begin with foundation training, practical tasks, and monthly progress review before moving to the next stage.",
      proof: "Foundation-first learning path",
      progress: 75,
    },
    {
      icon: "rule",
      label: "Agreement",
      title: "Monthly Review",
      description: "Each month, progress is reviewed against attendance, task quality, communication, and consistency before the next stage is confirmed.",
      proof: "Transparent partner and student agreement",
      progress: 100,
      isGuarantee: true,
    },
  ];

  return (
    <section className="pathway-section" aria-labelledby="career-pathway-title">
      <div className="pathway-shell">
        <div className="pathway-header">
          <div className="pathway-header-copy">
            <div className="pathway-kicker">
              <Icon name="rocket_launch" className="pathway-kicker-icon" />
              Training Agreement
            </div>
            <h2 id="career-pathway-title" className="pathway-title">
              Training Agreement by WeConnect-Innovation
            </h2>
            <p className="pathway-subtitle">
              Transparent expectations for students and industry partners before training, internship placement, certification, and career support.
            </p>
          </div>

          <div className="pathway-trust-panel" aria-label="Pathway highlights">
            <div>
              <span className="trust-value">4</span>
              <span className="trust-label">Clear terms</span>
            </div>
            <div>
              <span className="trust-value">3mo</span>
              <span className="trust-label">Expert review</span>
            </div>
            <div>
              <span className="trust-value">6mo</span>
              <span className="trust-label">Eligible learner support</span>
            </div>
          </div>
        </div>

        <div className="pathway-progress" aria-hidden="true">
          <span />
        </div>

        <div className="pathway-steps">
          {steps.map((step, idx) => (
            <React.Fragment key={step.title}>
              <article className={`pathway-step ${step.isGuarantee ? "guarantee-step" : ""}`}>
                <div className="step-topline">
                  <span className="step-label">{step.label}</span>
                  <span className="step-percent">{step.progress}%</span>
                </div>

                <div className={`step-icon ${step.isGuarantee ? "guarantee-icon" : ""}`}>
                  <Icon name={step.icon} className="step-icon-symbol" />
                </div>

                <div className="step-content">
                  <strong className="step-title">{step.title}</strong>
                  <p className="step-description">{step.description}</p>
                </div>

                <div className="step-progress" aria-hidden="true">
                  <span style={{ width: `${step.progress}%` }} />
                </div>

                <div className="step-proof">
                  <Icon name={step.isGuarantee ? "military_tech" : "check_circle"} className="step-proof-icon" />
                  <span>{step.proof}</span>
                </div>
              </article>

              {idx < steps.length - 1 && (
                <div className="step-connector">
                  <span />
                  <Icon name="arrow_forward_ios" className="connector-arrow" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="pathway-cta-row">
          <div>
            <p className="pathway-cta-label">Ready to start your training pathway?</p>
            <p className="pathway-cta-copy">Apply now and our team will assess your level before the next training batch.</p>
          </div>
          <Link href="/apply" className="pathway-cta-button">
            Apply Now
            <Icon name="arrow_forward" className="pathway-cta-icon" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CareerPathway;
