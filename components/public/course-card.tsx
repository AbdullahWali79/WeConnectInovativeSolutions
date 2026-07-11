"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Course } from "@/lib/supabase/types";
import { Icon } from "@/components/icon";

export function CourseCard({ course }: { course: Course }) {
  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant/50 bg-white shadow-card transition-shadow hover:shadow-card-hover"
    >
      {/* Animated top accent bar */}
      <div className="relative h-1.5 overflow-hidden bg-primary/10">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary via-blue-500 to-primary"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 to-transparent blur-sm" />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-5 flex items-center justify-between">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary shadow-inner-light"
          >
            <Icon name="school" />
          </motion.div>
          <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-fixed">
            {course.level ?? "Open"}
          </span>
        </div>

        <h3 className="text-title-lg text-on-surface transition-colors group-hover:text-primary">
          {course.title}
        </h3>
        <p className="mt-3 flex-1 text-body-md text-on-surface-variant">
          {course.description ?? "A practical WeConnect-Innovation course with guided tasks and mentor review."}
        </p>

        <div className="mt-6 flex items-center justify-between text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Icon name="schedule" className="text-base" /> {course.duration ?? "Self paced"}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="verified" className="text-base" /> Certificate
          </span>
        </div>

        <Link
          href={`/apply?course=${course.id}`}
          className="wc-primary-btn mt-6 w-full transition-all duration-300 hover:shadow-glow"
        >
          Apply Now
        </Link>
      </div>
    </motion.article>
  );
}
