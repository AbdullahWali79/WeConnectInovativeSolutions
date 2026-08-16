-- Adds 50 Docker projects and 50 Flutter projects.
-- Per course: projects 1-25 are Intermediate, projects 26-50 are Advanced.
-- Paste this complete file into Supabase SQL Editor and click Run.
-- Duplicate-safe: a matching normalized title in the same course is skipped.

begin;

do $$
declare
  docker_course_id uuid;
  flutter_course_id uuid;
  docker_inserted integer := 0;
  flutter_inserted integer := 0;
begin
  select id into docker_course_id from public.courses
  where lower(btrim(title)) in (
    lower('Docker for Beginners - Hands On - DevOps'),
    lower('Docker for Beginners – Hands On – DevOps'),
    lower('Docker for Beginners Hands On DevOps')
  )
  order by created_at limit 1;

  select id into flutter_course_id from public.courses
  where lower(btrim(title)) = lower('Flutter App Development')
  order by created_at limit 1;

  if docker_course_id is null then raise exception 'Docker course not found.'; end if;
  if flutter_course_id is null then raise exception 'Flutter App Development course not found.'; end if;

  with project_titles as (
    select title, ordinality as project_no
    from unnest(array[
      '[Intermediate] Containerized Static Portfolio Website',
      '[Intermediate] Dockerized Node.js REST API',
      '[Intermediate] Python Flask API with PostgreSQL',
      '[Intermediate] React and Nginx Production Container',
      '[Intermediate] WordPress and MySQL Compose Stack',
      '[Intermediate] Redis-Backed URL Shortener',
      '[Intermediate] Containerized Task Management App',
      '[Intermediate] Multi-Container E-commerce Starter',
      '[Intermediate] MongoDB Express Admin Stack',
      '[Intermediate] Dockerized Django Blog Platform',
      '[Intermediate] Local Email Testing Environment',
      '[Intermediate] Nginx Reverse Proxy for Two Services',
      '[Intermediate] Health-Checked Microservice Stack',
      '[Intermediate] Persistent Database Backup Service',
      '[Intermediate] Development Environment with Hot Reload',
      '[Intermediate] Dockerized Automated Test Runner',
      '[Intermediate] Private Registry Image Workflow',
      '[Intermediate] Scheduled Data Processing Container',
      '[Intermediate] Container Log Collection Stack',
      '[Intermediate] PHP Laravel and MariaDB Environment',
      '[Intermediate] Java Spring Boot Container API',
      '[Intermediate] Go Web Service with Multi-Stage Build',
      '[Intermediate] RabbitMQ Worker and API Stack',
      '[Intermediate] HTTPS Local Gateway with Nginx',
      '[Intermediate] Docker Compose Team Development Kit',
      '[Advanced] Production Multi-Service SaaS Platform',
      '[Advanced] Highly Available Reverse Proxy Cluster',
      '[Advanced] Blue-Green Deployment Automation',
      '[Advanced] Canary Release with Traffic Routing',
      '[Advanced] Secure Secrets and Configuration Platform',
      '[Advanced] Container Supply Chain Security Pipeline',
      '[Advanced] Observability Stack with Metrics Logs and Traces',
      '[Advanced] Auto-Scaling Queue Worker Architecture',
      '[Advanced] Event-Driven Microservices Commerce System',
      '[Advanced] Zero-Downtime Database Migration Pipeline',
      '[Advanced] Multi-Tenant Application Isolation Lab',
      '[Advanced] Disaster Recovery and Backup Automation',
      '[Advanced] Docker Swarm Production Cluster',
      '[Advanced] GitHub Actions Container CI/CD Platform',
      '[Advanced] GitLab Container Delivery Pipeline',
      '[Advanced] AI Inference API with CPU and GPU Profiles',
      '[Advanced] Streaming Platform with Kafka and Schema Registry',
      '[Advanced] ELK Security Monitoring Environment',
      '[Advanced] Service Mesh Simulation with Mutual TLS',
      '[Advanced] Multi-Architecture Image Build System',
      '[Advanced] Rootless and Distroless Security Hardening',
      '[Advanced] Chaos Engineering Microservices Lab',
      '[Advanced] Performance and Load Testing Platform',
      '[Advanced] Self-Hosted Developer Platform Stack',
      '[Advanced] Capstone Cloud-Native DevOps Environment'
    ]::text[]) with ordinality as t(title, ordinality)
  )
  insert into public.course_projects (course_id, title, description)
  select docker_course_id, pt.title,
    case when pt.project_no <= 25 then
      'Build ' || replace(pt.title, '[Intermediate] ', '') || ' using Docker and Docker Compose. Create optimized Dockerfiles, environment-based configuration, persistent volumes, service networking, health checks and startup dependencies. Document build/run commands, verify data persistence and recovery, add a .dockerignore file, test failure scenarios and provide screenshots plus a clear README. Use non-root containers where supported and ensure another developer can launch the complete project with one command.'
    else
      'Design and implement ' || replace(pt.title, '[Advanced] ', '') || ' as a production-grade container platform. Use multi-stage builds, least-privilege images, secrets management, health/readiness checks, resource limits, resilient networking, centralized observability and automated CI/CD. Demonstrate rollback, backup/recovery, scaling and failure handling; scan images and dependencies, produce architecture and threat-model documentation, add integration/load tests and supply reproducible deployment instructions with measurable reliability and security results.'
    end
  from project_titles pt
  where not exists (
    select 1 from public.course_projects e
    where e.course_id = docker_course_id and lower(btrim(e.title)) = lower(btrim(pt.title))
  );
  get diagnostics docker_inserted = row_count;

  with project_titles as (
    select title, ordinality as project_no
    from unnest(array[
      '[Intermediate] Personal Expense Tracker App',
      '[Intermediate] Habit and Streak Builder',
      '[Intermediate] Recipe Discovery and Favorites App',
      '[Intermediate] Student Course Companion',
      '[Intermediate] Local Business Directory App',
      '[Intermediate] Weather and Air Quality Dashboard',
      '[Intermediate] News Reader with Offline Bookmarks',
      '[Intermediate] Fitness Workout Planner',
      '[Intermediate] Event Booking Mobile App',
      '[Intermediate] Restaurant Menu and Ordering App',
      '[Intermediate] Real-Time Team Chat App',
      '[Intermediate] Doctor Appointment Booking App',
      '[Intermediate] Property Listings Mobile App',
      '[Intermediate] Job Search and Saved Jobs App',
      '[Intermediate] E-commerce Storefront App',
      '[Intermediate] Inventory Scanner and Stock App',
      '[Intermediate] Quiz and Leaderboard App',
      '[Intermediate] Travel Itinerary Planner',
      '[Intermediate] Podcast Player and Downloads App',
      '[Intermediate] Community Help and Donation App',
      '[Intermediate] Service Provider Booking App',
      '[Intermediate] Digital Wallet UI and Ledger App',
      '[Intermediate] Attendance with QR Scanner App',
      '[Intermediate] Multi-Language Learning Flashcards',
      '[Intermediate] Firebase Push Notification Center',
      '[Advanced] AI Personal Finance Coach',
      '[Advanced] Multi-Vendor E-commerce Marketplace',
      '[Advanced] AI Healthcare Intake Assistant',
      '[Advanced] Real-Time Ride Booking Platform',
      '[Advanced] Offline-First Field Sales CRM',
      '[Advanced] AI Resume and Job Matching App',
      '[Advanced] Food Delivery with Live Rider Tracking',
      '[Advanced] Telemedicine Video Consultation App',
      '[Advanced] Social Media Creator Platform',
      '[Advanced] Smart Home IoT Control Dashboard',
      '[Advanced] AI Study Tutor with RAG Chat',
      '[Advanced] Secure Mobile Banking Application',
      '[Advanced] Logistics Fleet and Route Optimizer',
      '[Advanced] Augmented Reality Product Preview App',
      '[Advanced] Voice-Enabled Accessibility Assistant',
      '[Advanced] Enterprise Employee Operations App',
      '[Advanced] Live Auction and Bidding Platform',
      '[Advanced] Subscription Video Streaming App',
      '[Advanced] Disaster Response Coordination App',
      '[Advanced] AI Document Scanner and Extractor',
      '[Advanced] Cross-Platform Project Management Suite',
      '[Advanced] Privacy-First Encrypted Messenger',
      '[Advanced] Smart Agriculture Monitoring App',
      '[Advanced] Mobile Point of Sale and Analytics',
      '[Advanced] Capstone AI-Powered Super App'
    ]::text[]) with ordinality as t(title, ordinality)
  )
  insert into public.course_projects (course_id, title, description)
  select flutter_course_id, pt.title,
    case when pt.project_no <= 25 then
      'Build ' || replace(pt.title, '[Intermediate] ', '') || ' in Flutter using clean reusable widgets and responsive layouts. Implement navigation, forms and validation, state management, REST or Firebase integration, loading/error/empty states, local persistence and search/filter behavior. Follow Material 3, support light/dark themes, add basic accessibility, unit and widget tests, and deliver an Android build with screenshots and setup documentation.'
    else
      'Architect and deliver ' || replace(pt.title, '[Advanced] ', '') || ' as a production-ready Flutter application for Android and iOS. Apply feature-first clean architecture, typed models, dependency injection, secure authentication, role-aware navigation, offline synchronization, caching, realtime updates, push notifications, deep links and analytics. Add AI or device integrations where relevant with validated outputs and privacy controls. Include unit/widget/integration tests, performance profiling, crash handling, CI/CD, store-ready builds and complete technical documentation.'
    end
  from project_titles pt
  where not exists (
    select 1 from public.course_projects e
    where e.course_id = flutter_course_id and lower(btrim(e.title)) = lower(btrim(pt.title))
  );
  get diagnostics flutter_inserted = row_count;

  raise notice 'Inserted % Docker and % Flutter projects.', docker_inserted, flutter_inserted;
end
$$;

commit;

-- Verification: both courses should show 50 projects after the first successful run.
select c.title as course, count(cp.id) as total_projects,
  count(cp.id) filter (where cp.title like '[Intermediate]%') as intermediate_projects,
  count(cp.id) filter (where cp.title like '[Advanced]%') as advanced_projects
from public.courses c
left join public.course_projects cp on cp.course_id = c.id
where lower(btrim(c.title)) in (
  lower('Docker for Beginners - Hands On - DevOps'),
  lower('Docker for Beginners – Hands On – DevOps'),
  lower('Docker for Beginners Hands On DevOps'),
  lower('Flutter App Development')
)
group by c.id, c.title
order by c.title;
