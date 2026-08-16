-- Adds 50 projects to each of these courses:
-- Advanced Digital Marketing, Advanced WordPress Development, AI Automation with n8n.
-- Each course receives 25 Intermediate + 25 Advanced projects.
-- Paste the complete file into Supabase SQL Editor and click Run.
-- Duplicate-safe by normalized title within each course.

begin;

do $$
declare
  marketing_id uuid;
  wordpress_id uuid;
  n8n_id uuid;
  marketing_inserted integer := 0;
  wordpress_inserted integer := 0;
  n8n_inserted integer := 0;
begin
  select id into marketing_id from public.courses where lower(btrim(title)) = lower('Advanced Digital Marketing') order by created_at limit 1;
  select id into wordpress_id from public.courses where lower(btrim(title)) = lower('Advanced WordPress Development') order by created_at limit 1;
  select id into n8n_id from public.courses where lower(btrim(title)) in (lower('AI Automation with n8n'), lower('AI Automation With n8n')) order by created_at limit 1;

  if marketing_id is null then raise exception 'Advanced Digital Marketing course not found.'; end if;
  if wordpress_id is null then raise exception 'Advanced WordPress Development course not found.'; end if;
  if n8n_id is null then raise exception 'AI Automation with n8n course not found.'; end if;

  with titles as (
    select title, ordinality as n from unnest(array[
      '[Intermediate] Local Business SEO Audit and Growth Plan','[Intermediate] Google Ads Search Campaign Build','[Intermediate] Meta Ads Lead Generation Funnel','[Intermediate] E-commerce Email Marketing Campaign','[Intermediate] Social Media Content Calendar System','[Intermediate] Keyword Research and Content Cluster','[Intermediate] Landing Page Conversion Optimization','[Intermediate] Google Analytics 4 Measurement Setup','[Intermediate] Influencer Outreach Campaign','[Intermediate] YouTube Channel Growth Strategy','[Intermediate] LinkedIn B2B Lead Generation','[Intermediate] Marketing Competitor Analysis','[Intermediate] Customer Persona and Journey Mapping','[Intermediate] Online Reputation Management Plan','[Intermediate] WhatsApp Marketing Funnel','[Intermediate] E-commerce Product Launch Campaign','[Intermediate] Blog SEO Optimization Project','[Intermediate] Retargeting Campaign Strategy','[Intermediate] Newsletter Growth and Segmentation','[Intermediate] Affiliate Marketing Launch Plan','[Intermediate] Local SEO Google Business Profile','[Intermediate] Marketing Dashboard and KPI Report','[Intermediate] A-B Testing Campaign Project','[Intermediate] Lead Magnet and Nurture Sequence','[Intermediate] Multi-Channel Brand Awareness Campaign',
      '[Advanced] AI-Powered Omnichannel Marketing System','[Advanced] Enterprise SEO Migration Strategy','[Advanced] Performance Max Commerce Campaign','[Advanced] Marketing Attribution Analytics Platform','[Advanced] AI Content Operations Pipeline','[Advanced] Predictive Customer Segmentation','[Advanced] International SEO Expansion Program','[Advanced] SaaS Product-Led Growth Campaign','[Advanced] Advanced Conversion Rate Optimization Lab','[Advanced] Customer Lifetime Value Growth Strategy','[Advanced] Marketing Automation and Lead Scoring','[Advanced] Programmatic Advertising Strategy','[Advanced] AI Social Listening Command Center','[Advanced] Marketplace Growth and Retention Plan','[Advanced] B2B Account-Based Marketing Program','[Advanced] Mobile App Acquisition and ASO Campaign','[Advanced] Privacy-First Analytics Implementation','[Advanced] Digital Marketing Crisis Response System','[Advanced] AI-Personalized E-commerce Lifecycle','[Advanced] Full-Funnel D2C Brand Launch','[Advanced] Multi-Touch Attribution Experiment','[Advanced] Global Influencer Marketing Program','[Advanced] Subscription Churn Reduction Campaign','[Advanced] Revenue Operations Marketing Dashboard','[Advanced] Capstone Integrated Growth Marketing Strategy'
    ]::text[]) with ordinality t(title, ordinality)
  )
  insert into public.course_projects(course_id,title,description)
  select marketing_id, title, case when n <= 25 then
    'Plan and execute ' || replace(title,'[Intermediate] ','') || '. Define the target audience, measurable SMART objectives, channel strategy, content/creative assets, budget and campaign calendar. Implement tracking with UTM parameters and GA4-ready events, document ethical and privacy considerations, analyze reach, engagement, conversion and cost KPIs, and deliver evidence, a results dashboard and optimization recommendations.'
  else
    'Design ' || replace(title,'[Advanced] ','') || ' as a data-driven, market-ready growth program. Combine customer research, competitive intelligence, AI-assisted workflows with human review, advanced segmentation, experimentation, attribution and lifecycle automation. Define governance, consent and brand-safety controls; model budget and revenue impact; build executive dashboards; and deliver an implementation roadmap, test results and defensible recommendations based on measurable KPIs.' end
  from titles p where not exists(select 1 from public.course_projects e where e.course_id=marketing_id and lower(btrim(e.title))=lower(btrim(p.title)));
  get diagnostics marketing_inserted = row_count;

  with titles as (
    select title, ordinality as n from unnest(array[
      '[Intermediate] Professional Service Business Website','[Intermediate] WooCommerce Fashion Store','[Intermediate] Restaurant Ordering Website','[Intermediate] Online Course Membership Site','[Intermediate] Real Estate Listing Portal','[Intermediate] Appointment Booking Website','[Intermediate] News and Magazine Platform','[Intermediate] Nonprofit Donation Website','[Intermediate] Multilingual Corporate Website','[Intermediate] Hotel Booking Website','[Intermediate] Job Board and Application Portal','[Intermediate] Digital Downloads Marketplace','[Intermediate] Portfolio and Case Study Website','[Intermediate] Fitness Membership Website','[Intermediate] Event Registration Platform','[Intermediate] Medical Clinic Website','[Intermediate] Learning Management System Setup','[Intermediate] Subscription Box WooCommerce Store','[Intermediate] Local Directory Website','[Intermediate] Recipe Community Platform','[Intermediate] WordPress SEO Performance Upgrade','[Intermediate] Secure Backup and Recovery Setup','[Intermediate] Custom Gutenberg Block Collection','[Intermediate] WooCommerce Payment and Shipping Setup','[Intermediate] WordPress Client Handover Project',
      '[Advanced] Headless WordPress Next.js Platform','[Advanced] Multi-Vendor WooCommerce Marketplace','[Advanced] Enterprise WordPress Multisite Network','[Advanced] Custom WooCommerce Subscription System','[Advanced] AI Content Assistant WordPress Plugin','[Advanced] High-Traffic News Publishing Platform','[Advanced] Custom Learning Management Plugin','[Advanced] WordPress CRM Integration Platform','[Advanced] Advanced Membership and Access Control','[Advanced] Custom Booking and Resource Engine','[Advanced] WooCommerce ERP Synchronization','[Advanced] WordPress REST API Mobile Backend','[Advanced] Enterprise Search with Elasticsearch','[Advanced] WordPress Security Hardening Lab','[Advanced] Core Web Vitals Optimization Project','[Advanced] Automated WordPress CI-CD Pipeline','[Advanced] Multi-Currency International Commerce','[Advanced] Custom Gutenberg Theme Framework','[Advanced] AI Semantic Search WordPress Plugin','[Advanced] WooCommerce Analytics Dashboard','[Advanced] Serverless WordPress Media Pipeline','[Advanced] WordPress Accessibility Compliance Project','[Advanced] Scalable Membership Community Platform','[Advanced] Legacy WordPress Modernization Project','[Advanced] Capstone Enterprise WordPress SaaS'
    ]::text[]) with ordinality t(title, ordinality)
  )
  insert into public.course_projects(course_id,title,description)
  select wordpress_id, title, case when n <= 25 then
    'Build ' || replace(title,'[Intermediate] ','') || ' using WordPress with a responsive custom design, appropriate theme or child theme, structured content, forms, roles and required integrations. Configure SEO, caching, backups and security; optimize images and Core Web Vitals; test mobile usability and accessibility; and provide administrator documentation, sample content and a deployable backup.'
  else
    'Architect and deliver ' || replace(title,'[Advanced] ','') || ' as a production-grade WordPress solution. Use custom themes/plugins, hooks, secure REST APIs, validated and escaped data, granular permissions, background processing and scalable caching. Include automated tests, performance/security audits, staging-to-production deployment, observability, backup/rollback procedures, accessibility, technical architecture and maintainable developer documentation.' end
  from titles p where not exists(select 1 from public.course_projects e where e.course_id=wordpress_id and lower(btrim(e.title))=lower(btrim(p.title)));
  get diagnostics wordpress_inserted = row_count;

  with titles as (
    select title, ordinality as n from unnest(array[
      '[Intermediate] Website Contact Lead Automation','[Intermediate] Gmail Attachment to Google Drive Workflow','[Intermediate] Daily Sales Report Automation','[Intermediate] Social Media Content Approval Flow','[Intermediate] Customer Feedback Collection Pipeline','[Intermediate] Invoice Reminder Automation','[Intermediate] Employee Onboarding Workflow','[Intermediate] Form to CRM Lead Sync','[Intermediate] E-commerce Order Notification Flow','[Intermediate] Scheduled Database Backup Workflow','[Intermediate] Telegram Support Alert Bot','[Intermediate] RSS to Newsletter Content Flow','[Intermediate] Calendar Booking Reminder System','[Intermediate] Spreadsheet Data Cleanup Automation','[Intermediate] GitHub Issue Notification Workflow','[Intermediate] Customer Birthday Campaign','[Intermediate] Low Stock Alert Automation','[Intermediate] PDF Invoice Generation Workflow','[Intermediate] Website Uptime Monitoring Flow','[Intermediate] Multi-Step Approval Automation','[Intermediate] Email Classification with AI','[Intermediate] Meeting Summary and Task Extraction','[Intermediate] AI Product Description Generator','[Intermediate] Helpdesk Ticket Routing Workflow','[Intermediate] Weekly KPI Dashboard Automation',
      '[Advanced] Multi-Agent Customer Support Automation','[Advanced] AI Sales Qualification and CRM Pipeline','[Advanced] Enterprise Document RAG Workflow','[Advanced] Autonomous Content Operations System','[Advanced] AI Voice Appointment Automation','[Advanced] Intelligent Invoice Processing Platform','[Advanced] Omnichannel E-commerce Operations','[Advanced] AI Recruitment Screening Workflow','[Advanced] Incident Response Orchestration System','[Advanced] Multi-Tenant Automation SaaS Backend','[Advanced] Human-in-the-Loop Contract Review','[Advanced] AI Market Research Agent Network','[Advanced] Customer Churn Prevention Automation','[Advanced] Secure Financial Reconciliation Flow','[Advanced] AI Knowledge Base Maintenance System','[Advanced] Supply Chain Exception Automation','[Advanced] Healthcare Intake Processing Workflow','[Advanced] DevOps Release and Rollback Orchestrator','[Advanced] AI Social Listening and Response System','[Advanced] Event-Driven Data Quality Platform','[Advanced] Personalized Learning Automation Engine','[Advanced] Real-Time Fraud Alert Workflow','[Advanced] Marketing Attribution Data Pipeline','[Advanced] Resilient Multi-Provider AI Gateway','[Advanced] Capstone Enterprise AI Automation Platform'
    ]::text[]) with ordinality t(title, ordinality)
  )
  insert into public.course_projects(course_id,title,description)
  select n8n_id, title, case when n <= 25 then
    'Build ' || replace(title,'[Intermediate] ','') || ' in n8n using correctly configured triggers, credentials, data mapping, branching, loops and reusable sub-workflows. Validate inputs, prevent duplicates, add retries and error notifications, store an execution audit trail, protect secrets and demonstrate the workflow with realistic test data. Provide an exported workflow JSON, setup guide and screenshots of successful and failed executions.'
  else
    'Design ' || replace(title,'[Advanced] ','') || ' as a production-grade n8n automation architecture. Use webhooks, queues, databases, APIs and AI nodes with structured output, human approval gates, idempotency, rate-limit handling, retries, dead-letter recovery and complete observability. Enforce tenant/data isolation and secret management, measure cost and latency, load-test critical paths, document rollback and disaster recovery, and deliver modular exported workflows plus architecture diagrams.' end
  from titles p where not exists(select 1 from public.course_projects e where e.course_id=n8n_id and lower(btrim(e.title))=lower(btrim(p.title)));
  get diagnostics n8n_inserted = row_count;

  raise notice 'Inserted % Marketing, % WordPress and % n8n projects.', marketing_inserted, wordpress_inserted, n8n_inserted;
end
$$;

commit;

select c.title as course, count(cp.id) as total_projects,
 count(cp.id) filter(where cp.title like '[Intermediate]%') as intermediate_projects,
 count(cp.id) filter(where cp.title like '[Advanced]%') as advanced_projects
from public.courses c left join public.course_projects cp on cp.course_id=c.id
where lower(btrim(c.title)) in (lower('Advanced Digital Marketing'),lower('Advanced WordPress Development'),lower('AI Automation with n8n'))
group by c.id,c.title order by c.title;
