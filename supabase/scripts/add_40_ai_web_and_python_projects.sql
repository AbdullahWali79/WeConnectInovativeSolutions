-- Adds 20 AI-enabled web projects and 20 Python projects to the project catalog.
-- Paste this complete file into Supabase SQL Editor and click Run.
-- Safe to run repeatedly: matching project titles in the same course are skipped.

begin;

do $$
declare
  web_course_id uuid;
  python_course_id uuid;
  web_inserted integer := 0;
  python_inserted integer := 0;
begin
  select id into web_course_id
  from public.courses
  where lower(btrim(title)) in (lower('Advance Web Development'), lower('Advanced Web Development'))
  order by case when lower(btrim(title)) = lower('Advance Web Development') then 0 else 1 end, created_at
  limit 1;

  select id into python_course_id
  from public.courses
  where lower(btrim(title)) in (lower('Python Development Pro Bootcamp'), lower('Advanced Python Development'))
  order by case when lower(btrim(title)) = lower('Python Development Pro Bootcamp') then 0 else 1 end, created_at
  limit 1;

  if web_course_id is null then
    raise exception 'Web course not found. Expected "Advance Web Development" or "Advanced Web Development".';
  end if;
  if python_course_id is null then
    raise exception 'Python course not found. Expected "Python Development Pro Bootcamp" or "Advanced Python Development".';
  end if;

  insert into public.course_projects (course_id, title, description)
  select web_course_id, p.title, p.description
  from (values
    ('AI-Powered E-commerce Shopping Assistant', 'Build a Next.js e-commerce platform with Supabase/PostgreSQL, Stripe checkout, product search and an LLM shopping assistant. The assistant must recommend products from catalog data using RAG, compare items, answer policy questions with citations and hand off uncertain queries. Include authentication, admin inventory, order tracking, responsive UI, rate limiting, prompt-injection protection, analytics, tests and Vercel deployment.'),
    ('Multi-Tenant AI Customer Support SaaS', 'Create a SaaS helpdesk where businesses manage teams, tickets and private knowledge bases. Add an AI agent that classifies priority, detects sentiment, retrieves relevant articles and drafts grounded replies for human approval. Implement tenant isolation, RBAC, subscriptions, usage quotas, audit logs, streaming chat, feedback, background ingestion, observability and production deployment.'),
    ('AI Resume Builder and ATS Optimizer', 'Develop a full-stack resume platform with editable templates, PDF export, job-description analysis and AI-assisted bullet rewriting. Score keyword coverage without inventing experience, show actionable ATS suggestions and preserve version history. Add secure accounts, saved resumes, subscription limits, structured LLM output, accessibility, mobile responsiveness and automated tests.'),
    ('RAG-Based Legal Document Workspace', 'Build a secure web app for uploading contracts and policies, extracting text, indexing documents and answering questions with page-level citations. Include clause comparison, risk flags, summaries, organization workspaces, permissions, review comments and downloadable reports. Defend against malicious document prompts, validate AI output and implement deletion, audit history and evaluation cases.'),
    ('AI Sales CRM and Lead Qualification Platform', 'Create a modern CRM for contacts, deals, activities and pipelines. Use AI to summarize calls, enrich lead notes, score opportunities using transparent criteria and draft personalized follow-ups. Provide dashboards, filters, reminders, email integration stubs, team roles, approval before sending, structured output validation, activity audit logs and secure APIs.'),
    ('Natural-Language Analytics Dashboard', 'Build a full-stack business intelligence app that turns plain-language questions into safe read-only SQL and interactive charts. Restrict the model to an approved schema, validate SQL, block writes, apply row limits and explain results. Add saved dashboards, role-aware access, query history, CSV export, caching, usage monitoring and benchmark tests.'),
    ('AI Meeting Notes and Action Tracker', 'Develop a collaborative meeting workspace that accepts transcripts, produces summaries, decisions and assigned action items, and lets users correct AI output. Include teams, meetings, deadlines, reminders, search, comments, real-time updates and calendar integration stubs. Use structured extraction, speaker-aware processing, privacy controls, audit logs and responsive design.'),
    ('Personalized AI Learning Management System', 'Create an LMS with courses, lessons, quizzes, progress tracking and instructor dashboards. Add a grounded AI tutor that answers only from course content, adapts explanations, generates practice questions and identifies weak topics. Include citations, teacher review, safety controls, mastery analytics, role permissions and accessible responsive interfaces.'),
    ('AI Content Marketing Operations Suite', 'Build a multi-brand content planning platform for briefs, calendars, approvals and publishing-ready assets. AI should generate outlines, SEO metadata and channel variants using stored brand guidelines. Add prompt versioning, reviewer workflows, plagiarism/factuality checks, reusable templates, batch jobs, cost tracking, team permissions and export features.'),
    ('Healthcare Appointment and AI Intake Portal', 'Create a patient appointment portal with provider schedules, reminders and secure intake forms. Add an AI assistant that converts patient-entered text into a structured pre-visit summary while clearly avoiding diagnosis. Implement consent, sensitive-data protection, role access, audit logs, validation, human review, accessibility and secure deployment.'),
    ('AI Recruitment and Interview Management System', 'Build an applicant tracking system with jobs, candidates, stages, interviews and team notes. AI should parse resumes, map evidence to job criteria, draft interview questions and summarize interviewer feedback. Exclude protected attributes, show explanations, require human hiring decisions, support RBAC, audit history and bias-oriented evaluation tests.'),
    ('Smart Real Estate Marketplace with AI Search', 'Develop a property marketplace with listings, maps, saved searches, agents and inquiries. Add conversational semantic search that understands budget, location and amenities, plus listing-description assistance and property comparison. Ground answers in database records, include admin moderation, image management, SEO, analytics and mobile-first performance.'),
    ('AI Finance Document and Expense Manager', 'Create a finance dashboard for receipt upload, expense categorization, budgets and approval workflows. Use OCR plus AI structured extraction for vendor, date, tax and line items, with confidence scores and manual correction. Add duplicate detection, reports, role permissions, immutable audit events, secure files and test fixtures.'),
    ('AI Code Review and Engineering Knowledge Portal', 'Build a developer portal that imports repository documentation, indexes approved code snippets and answers engineering questions with citations. Add pull-request diff review, style-rule checks, suggested tests and human feedback. Protect secrets, isolate organizations, limit repository access, log model usage and provide streaming responses and evaluation datasets.'),
    ('Omnichannel AI Social Media Dashboard', 'Create a dashboard for planning posts, media assets, approvals and performance across multiple social channels using mock provider adapters. AI generates brand-aware captions, repurposes content and suggests posting schedules based on analytics. Include team roles, calendar views, approval gates, retries, rate-limit handling and engagement reports.'),
    ('AI Travel Planner and Booking Marketplace', 'Develop a travel web app that creates personalized, editable itineraries from preferences and verified destination data. Include hotels/activities catalogs, maps, budgets, day-by-day scheduling and booking inquiry flows. Require citations for recommendations, detect impossible plans, support collaborative sharing, SEO pages and responsive offline-friendly views.'),
    ('AI Cybersecurity Incident Management Portal', 'Build an incident dashboard for alerts, severity, timelines, evidence and response tasks. An AI copilot should summarize alerts, retrieve approved runbooks and recommend diagnostic actions without executing changes. Add explicit approvals, secret redaction, immutable audit logs, RBAC, real-time events, integrations via mock webhooks and incident simulations.'),
    ('Voice-Enabled AI Restaurant Ordering System', 'Create a restaurant ordering PWA with menus, modifiers, carts, kitchen status and payments. Add multilingual voice/text ordering that maps requests to real menu items, asks clarifying questions and handles allergies with prominent warnings. Include admin menu management, order tracking, accessibility, offline behavior, structured AI outputs and end-to-end tests.'),
    ('AI Marketplace for Freelancers and Clients', 'Build a two-sided marketplace with profiles, job posts, proposals, milestones, messaging and reviews. AI assists clients with scoped briefs and helps freelancers tailor proposals using only their verified profile. Add semantic matching with explanations, moderation, escrow-style payment stubs, notifications, search, fraud signals and admin analytics.'),
    ('Capstone: Enterprise AI Workspace Platform', 'Build a production-grade multi-tenant platform where organizations create assistants from private documents, configure tools, invite members and monitor usage. Implement authentication, RBAC, hybrid RAG, citations, streaming, conversation history, feedback, quotas, billing-ready usage, prompt-injection defenses, PII redaction, evaluations, observability, CI/CD and cloud deployment.')
  ) as p(title, description)
  where not exists (
    select 1 from public.course_projects e
    where e.course_id = web_course_id and lower(btrim(e.title)) = lower(btrim(p.title))
  );
  get diagnostics web_inserted = row_count;

  insert into public.course_projects (course_id, title, description)
  select python_course_id, p.title, p.description
  from (values
    ('FastAPI AI Customer Support Backend', 'Build a production FastAPI service for tickets, customers and agents with PostgreSQL, SQLAlchemy, Alembic and JWT/RBAC. Add an LLM workflow for classification, sentiment, knowledge retrieval and reply drafts with human approval. Include async endpoints, background jobs, Redis caching, rate limits, Pydantic validation, pytest, Docker and observability.'),
    ('Python RAG Document Intelligence API', 'Create a document ingestion and question-answering system for PDF, DOCX and web pages. Implement parsing, chunking, embeddings, hybrid retrieval, reranking, citations and structured answers using FastAPI and a vector database. Add idempotent jobs, access control, prompt-injection defenses, evaluation datasets, tracing and container deployment.'),
    ('AI Invoice Extraction and Reconciliation Pipeline', 'Develop a Python pipeline that reads invoice PDFs/images with OCR, extracts validated fields using AI and matches them against purchase orders and payments. Use Pandas, PostgreSQL and background workers. Add confidence-based manual review, duplicate detection, tax calculations, audit logs, retry safety, Excel reports and automated tests.'),
    ('Real-Time Fraud Detection Service', 'Build a streaming fraud-detection backend that receives payment events, computes behavioral features and combines rules with a scikit-learn model. Expose decisions through FastAPI, store explanations, support analyst review and monitor drift. Include Kafka or Redis Streams, idempotency, model versioning, tests, metrics and Docker Compose.'),
    ('Demand Forecasting and Inventory Optimizer', 'Create an end-to-end forecasting system using Pandas, time-series features and scikit-learn/XGBoost to predict SKU demand. Recommend reorder points subject to lead time and safety stock, expose forecasts through an API and generate dashboards/reports. Include backtesting, error metrics, model registry metadata, scheduled retraining and data validation.'),
    ('Multi-Agent Market Research Engine', 'Implement a LangGraph-style Python workflow with researcher, verifier, analyst and writer agents. Gather evidence only through approved tools, deduplicate sources, attach citations and pause for human approval. Add persistent checkpoints, resumable jobs, budget/recursion limits, structured outputs, FastAPI job endpoints, progress events and evaluation tests.'),
    ('AI-Powered Recruitment Screening API', 'Build a Python recruitment backend that parses resumes and job descriptions, maps evidence to competencies and generates interview questions. Use transparent scoring, exclude protected attributes and require recruiter decisions. Add secure file handling, batch processing, PostgreSQL, role permissions, audit logs, consistency tests and API documentation.'),
    ('Computer Vision Retail Shelf Monitor', 'Develop a Python computer-vision service that detects products, empty shelf space and misplaced items from store images or video. Use OpenCV and a modern detection model, expose inference through FastAPI and provide annotated results. Include dataset preparation, precision/recall evaluation, model versioning, queues, GPU/CPU fallback and Docker.'),
    ('Predictive Maintenance IoT Platform', 'Create a Python service that ingests equipment sensor readings, calculates rolling features and predicts anomalies or failure risk. Use time-series storage, scikit-learn, scheduled inference and alerting. Add simulated device data, explainable alerts, dashboards, drift monitoring, retraining workflow, REST APIs, tests and deployment configuration.'),
    ('Intelligent Web Scraping and Price Monitor', 'Build a resilient Python price intelligence system using Requests/BeautifulSoup and Playwright for permitted dynamic sites. Normalize products and currencies, detect price/stock changes and notify users. Implement schedules, proxies configuration, rate limits, exponential retries, robots/terms safeguards, PostgreSQL history, analytics and tests with saved fixtures.'),
    ('AI Email Classification and Response Automation', 'Develop a Python email operations service that reads messages through provider adapters, identifies intent and urgency, extracts entities and drafts responses grounded in company policies. Require approval before sending, redact PII, handle attachments safely and maintain an audit trail. Include queues, retries, templates, monitoring and mocked integration tests.'),
    ('Secure Banking Ledger and Risk Scoring API', 'Design a double-entry banking ledger with accounts, transfers and immutable transactions using FastAPI and PostgreSQL. Guarantee atomicity and idempotency, then add explainable risk scoring for suspicious patterns. Implement strong authentication, limits, audit events, reconciliation jobs, property-based tests, concurrent transaction tests and monitoring.'),
    ('Healthcare NLP Document Summarization Service', 'Build a privacy-focused Python API that extracts and summarizes synthetic clinical documents, identifies medications and dates and answers questions with citations. Separate facts from generated explanations, redact identifiers, enforce permissions and abstain when evidence is missing. Include synthetic tests, faithfulness evaluation, encrypted-storage adapters and audit-safe logs.'),
    ('Geospatial Delivery Route Optimization Engine', 'Create a Python optimization service for delivery fleets using geocoding adapters, distance matrices and OR-Tools. Handle vehicle capacity, time windows, driver shifts and priority stops, then expose routes through FastAPI. Add map-ready GeoJSON, scenario comparison, caching, failure fallbacks, performance benchmarks and Docker deployment.'),
    ('Recommendation Engine for E-commerce', 'Develop a hybrid product recommendation system combining popularity, content similarity and collaborative filtering. Build offline evaluation, cold-start strategies and a FastAPI inference service with Redis caching. Record feedback events, run A/B-ready experiments, explain recommendations, monitor bias and latency, and package training/inference separately.'),
    ('Python DevOps Incident Copilot', 'Build an operations assistant that consumes synthetic alerts, searches runbooks and proposes evidence-backed troubleshooting steps. Integrate read-only log and metric tools, require approval for any state-changing operation and redact secrets. Use stateful workflows, timeouts, checkpoints, audit logs, evaluation scenarios, OpenTelemetry and Kubernetes manifests.'),
    ('Automated Data Quality and ETL Monitoring Platform', 'Create a Python data platform that ingests CSV/API/database sources, validates schemas, profiles columns and runs configurable quality rules. Quarantine failures, track lineage and send alerts on anomalies. Use Pandas or Polars, Pydantic, SQLAlchemy and orchestration jobs; add dashboards, retry-safe loads, incremental processing and regression tests.'),
    ('Algorithmic Trading Research Backtester', 'Develop a research-only backtesting engine for historical market data with strategy plugins, realistic fees/slippage and strict prevention of look-ahead bias. Calculate risk metrics, compare benchmarks and export reports. Add data validation, parameter sweeps, reproducible configurations, tests and a FastAPI endpoint; clearly label outputs as simulation, not financial advice.'),
    ('Speech Analytics and Call Quality Platform', 'Build a Python pipeline that processes recorded calls, creates transcripts, separates speakers, detects topics/sentiment and produces structured summaries and action items. Add searchable metadata, quality scorecards, reviewer corrections, PII redaction, batch queues, confidence values, evaluation samples and secure FastAPI endpoints.'),
    ('Capstone: Cloud-Native AI Automation SaaS', 'Build a complete multi-tenant Python SaaS where customers create document-based AI workflows and API integrations. Use FastAPI, PostgreSQL, Redis workers, object storage and a vector database. Include hybrid RAG, tool calling, approvals, RBAC, quotas, usage metering, audit logs, evaluations, tracing, tests, CI/CD, Docker and Kubernetes deployment.')
  ) as p(title, description)
  where not exists (
    select 1 from public.course_projects e
    where e.course_id = python_course_id and lower(btrim(e.title)) = lower(btrim(p.title))
  );
  get diagnostics python_inserted = row_count;

  raise notice '% web projects and % Python projects inserted.', web_inserted, python_inserted;
end
$$;

commit;

-- Verification summary. Expected totals increase by 20 for each matched course.
select c.title as course, count(cp.id) as total_projects
from public.courses c
left join public.course_projects cp on cp.course_id = c.id
where lower(btrim(c.title)) in (
  lower('Advance Web Development'), lower('Advanced Web Development'),
  lower('Python Development Pro Bootcamp'), lower('Advanced Python Development')
)
group by c.id, c.title
order by c.title;
