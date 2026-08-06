-- Industrial project catalog for the "Develop LLM-Powered Applications" course.
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- Safe to run more than once: projects with the same normalized title are skipped.

begin;

do $$
declare
  target_course_id uuid;
  inserted_count integer;
begin
  select c.id
    into target_course_id
  from public.courses c
  where lower(btrim(c.title)) in (
    lower('Develop LLM-Powered Applications'),
    lower('LLM-Powered Applications'),
    lower('Develop LLM Powered Applications')
  )
  order by
    case
      when lower(btrim(c.title)) = lower('Develop LLM-Powered Applications') then 0
      else 1
    end,
    c.created_at asc
  limit 1;

  if target_course_id is null then
    raise exception 'Course not found. Expected a course titled "Develop LLM-Powered Applications".';
  end if;

  insert into public.course_projects (course_id, title, description)
  select target_course_id, project.title, project.description
  from (
    values
      (
        'Enterprise Knowledge Copilot with Hybrid RAG',
        'Build a production-ready internal knowledge assistant that ingests PDF, DOCX, Markdown and web content, creates hash-based idempotent indexes and answers employee questions with source citations. Combine semantic vector search with BM25 keyword search, ParentDocumentRetriever, multi-query retrieval and cross-encoder reranking. Add document-level access control, conversation memory, streaming responses, feedback capture, retrieval and generation metrics, automated RAGAS evaluation, Docker deployment and a FastAPI API with health checks, rate limits and OpenAPI documentation.'
      ),
      (
        'AI Customer Support Triage and Resolution Platform',
        'Create a multi-tenant support platform that classifies incoming tickets, extracts structured fields, searches company knowledge bases and drafts grounded replies for agent approval. Use Pydantic schemas, LCEL routing, Redis-backed conversation memory, tool calling and confidence-based human escalation. Enforce tenant isolation, redact PII, defend against prompt injection and record a complete audit trail. Include WebSocket streaming, retry and fallback policies, latency and token-cost dashboards, regression datasets, automated tests and containerized deployment.'
      ),
      (
        'Contract Intelligence and Compliance Review System',
        'Develop a secure document-analysis application for legal and procurement teams. Ingest contracts, preserve section hierarchy, extract parties, dates, obligations, renewal clauses and risks into validated JSON, and compare clauses against an approved policy library. Implement hybrid retrieval, citation-backed findings, versioned prompts, reviewer approval workflows and downloadable compliance reports. Add encrypted storage integration, role-based access, PII masking, prompt-injection controls, traceable decisions, evaluation against a labeled contract dataset and an API designed for integration with existing business systems.'
      ),
      (
        'Multi-Agent Market Research and Report Generator',
        'Build a LangGraph workflow with specialized Researcher, Evidence Verifier, Analyst and Report Writer agents coordinated by a supervisor. Agents must use approved tools, maintain shared state, deduplicate evidence, attach citations and pause at a human approval node before publishing. Add execution timeouts, recursion and budget limits, checkpointing, resumable jobs and structured failure handling. Deliver a FastAPI service, real-time progress events, prompt and trace observability, evaluation datasets, role-based workspaces and automated generation of an executive report.'
      ),
      (
        'Natural-Language Business Intelligence Assistant',
        'Create an enterprise analytics copilot that converts business questions into safe, parameterized, read-only SQL for a PostgreSQL warehouse. Inspect an approved schema, validate every generated query, block writes and dangerous functions, enforce row and result limits and explain results in plain language. Add table selection through retrieval, query repair, chart-ready structured output, role-aware data access, PII masking, audit logs and human confirmation for expensive queries. Test SQL accuracy and security with a benchmark suite and deploy the service with caching, monitoring and rate limits.'
      ),
      (
        'Production AI Content Operations Pipeline',
        'Design a multi-stage content system that turns a campaign brief into audience research, titles, outlines, long-form copy, social variants and SEO metadata. Store prompts in a versioned registry, run independent stages in parallel, enforce brand voice through retrieval and validate every output with Pydantic. Include factuality and policy checks, reviewer approval, reusable templates, batch processing, semantic caching, cost budgets, fallback models and retry-safe job execution. Provide an API, operations dashboard, evaluation suite and deployment configuration suitable for a marketing team.'
      ),
      (
        'Healthcare Document Assistant with Privacy Guardrails',
        'Build a privacy-first assistant that summarizes uploaded clinical or insurance documents and answers questions only from authorized source material. Use layout-aware chunking, hybrid retrieval, reranking and evidence citations while clearly separating extracted facts from generated explanations. Detect and redact PII before external model calls, resist prompt injection inside documents, apply role-based access and retain auditable traces without storing sensitive prompts in logs. Include abstention rules, human review, a synthetic evaluation dataset, faithfulness thresholds, FastAPI endpoints and secure container deployment.'
      ),
      (
        'LLM Gateway for Cost, Reliability and Governance',
        'Implement a centralized gateway that exposes one API for multiple LLM providers and models. Support streaming, structured output, per-tenant API keys, model routing, token and monetary budgets, exponential-backoff retries, circuit breakers, provider fallbacks, Redis caching and request deduplication. Capture latency, token usage, errors and fallback events through OpenTelemetry and Prometheus without logging sensitive content. Add configurable safety policies, prompt version metadata, usage reports, load tests, Docker Compose and Kubernetes manifests with readiness checks and horizontal autoscaling.'
      ),
      (
        'Intelligent Recruitment Screening and Interview Copilot',
        'Create a recruitment platform that parses resumes and job descriptions into validated schemas, ranks candidates using transparent evidence and generates role-specific interview questions. Use retrieval to ground scoring in an approved competency framework and require a human decision at every hiring stage. Detect and remove protected or irrelevant personal attributes, test for ranking consistency and expose score explanations with citations. Add secure file handling, role permissions, audit logs, batch processing, evaluation datasets, recruiter feedback loops and production APIs with monitoring and rate limiting.'
      ),
      (
        'Incident Response and DevOps Runbook Agent',
        'Build an operations copilot that receives alerts, retrieves relevant runbooks and service documentation, summarizes likely causes and proposes safe diagnostic steps. Integrate read-only tools for logs, metrics and status checks, then require explicit human approval before any state-changing action. Use LangGraph for stateful workflows, structured tool outputs, timeouts, recursion limits and recovery checkpoints. Add incident timelines, evidence citations, severity routing, PII and secret redaction, complete audit trails, simulated incident tests, observability dashboards and Kubernetes deployment.'
      ),
      (
        'Personalized Learning Tutor with Long-Term Memory',
        'Develop an adaptive tutor that maintains learner goals, preferences, mastery scores and session summaries in PostgreSQL and a vector store. Route questions to subject-specific prompt chains, retrieve approved learning material, generate citation-backed explanations and create quizzes with validated answers. Implement spaced-repetition scheduling, misconception detection, progress reports and teacher review. Protect minors and personal data with content filters, consent-aware memory controls and deletion support. Include evaluation for answer accuracy, personalization and safety, plus streaming APIs, caching, monitoring and containerized deployment.'
      ),
      (
        'Capstone: Cloud-Native Multi-Tenant LLM Application Platform',
        'Build a complete SaaS platform where organizations create AI assistants from private documents, configure prompts and models, invite team members and monitor usage. Implement multi-tenant PostgreSQL data isolation, idempotent ingestion, hybrid RAG, reranking, Redis memory and caching, streaming chat, human feedback, prompt versioning and model fallback. Add authentication, role-based permissions, quotas, billing-ready usage records, PII redaction, prompt-injection defenses, LangSmith or OpenTelemetry tracing and automated RAGAS regression gates. Deliver tests, CI/CD, multi-stage Docker images, Kubernetes deployment, health probes, horizontal autoscaling and operational documentation.'
      )
  ) as project(title, description)
  where not exists (
    select 1
    from public.course_projects existing
    where existing.course_id = target_course_id
      and lower(btrim(existing.title)) = lower(btrim(project.title))
  );

  get diagnostics inserted_count = row_count;
  raise notice '% industrial LLM project(s) inserted for course id %.', inserted_count, target_course_id;
end
$$;

commit;

-- Verification: returns all catalog projects for the target course.
select cp.title, cp.description, cp.created_at
from public.course_projects cp
join public.courses c on c.id = cp.course_id
where lower(btrim(c.title)) in (
  lower('Develop LLM-Powered Applications'),
  lower('LLM-Powered Applications'),
  lower('Develop LLM Powered Applications')
)
order by cp.created_at, cp.title;
