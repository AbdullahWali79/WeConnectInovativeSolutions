-- Industrial project catalog for the 30-day Advanced Python roadmap.
-- Safe to run more than once: an existing project with the same title is skipped.

begin;

do $$
declare
  target_course_id uuid;
begin
  select c.id
    into target_course_id
  from public.courses c
  where lower(c.title) in (
    lower('Python Development Pro Bootcamp'),
    lower('Advanced Python Development')
  )
  order by
    case when lower(c.title) = lower('Python Development Pro Bootcamp') then 0 else 1 end,
    c.created_at asc
  limit 1;

  if target_course_id is null then
    raise exception 'Course not found. Expected "Python Development Pro Bootcamp" or "Advanced Python Development".';
  end if;

  insert into public.course_projects (course_id, title, description)
  select target_course_id, project.title, project.description
  from (
    values
      (
        'Multi-Tenant SaaS Helpdesk API',
        'Build a production-style customer support backend for multiple companies. Use FastAPI or Flask, PostgreSQL, SQLAlchemy, JWT authentication and role-based access control. Implement organizations, agents, customers, tickets, priorities, comments, status history, search, filtering and pagination. Enforce tenant isolation so one company cannot access another company''s records. Add request validation, centralized error handling, Swagger/OpenAPI documentation, pytest coverage, Docker setup, environment-based configuration, database migrations and a deployed health-check endpoint.'
      ),
      (
        'Retail Inventory and Order Automation Platform',
        'Create an inventory service for a multi-branch retailer using Python OOP, PostgreSQL and a Flask/FastAPI REST API. Support products, suppliers, warehouses, purchase orders, sales orders, stock transfers and low-stock alerts. Use database transactions to prevent negative stock and duplicate order processing. Import supplier sheets from Excel/CSV, export management reports, send scheduled email alerts, maintain an audit log and provide tests for stock reservation, cancellation and concurrent updates.'
      ),
      (
        'Automated Invoice Processing and Reconciliation System',
        'Develop a finance automation pipeline that ingests invoice Excel/CSV files and PDF-extracted data, validates required fields, detects duplicates, calculates taxes and matches invoices with purchase orders and payments. Use Pandas for cleaning, SQLAlchemy for persistence and a Flask dashboard for exceptions. Generate reconciliation summaries and downloadable reports, log every processing step, quarantine invalid records and support safe retry without creating duplicate transactions.'
      ),
      (
        'Real-Time E-Commerce Price Intelligence Engine',
        'Build a resilient competitor price monitoring service with Requests, BeautifulSoup and optional Selenium for dynamic pages. Store timestamped prices in PostgreSQL, normalize currencies and product identifiers, detect meaningful price or stock changes and send email alerts. Add scheduled jobs, retry with exponential backoff, rate limiting, structured logs and configurable scraping rules. Provide a Pandas/Matplotlib dashboard showing price history, competitor comparison and alert accuracy while respecting target-site terms and robots policies.'
      ),
      (
        'Secure Digital Banking Ledger Simulator',
        'Design an OOP-based banking ledger with customers, accounts, deposits, withdrawals, transfers and statements. Persist data with SQLAlchemy and expose authenticated REST endpoints. Use atomic database transactions, idempotency keys and immutable ledger entries so balances remain correct during retries or failures. Add password hashing, role permissions, daily transfer limits, suspicious-activity rules, exception handling, audit logs and unit/integration tests covering insufficient funds, duplicate requests and concurrent transfers.'
      ),
      (
        'Logistics Shipment Tracking and ETA Dashboard',
        'Create a shipment operations system that consumes carrier-style REST APIs, stores tracking events and displays current shipment status in a Flask web dashboard. Model shipments, hubs, customers and event timelines; normalize third-party API responses; calculate delivery KPIs with Pandas; and flag delayed shipments. Include background polling, API timeout/retry handling, email notifications, date/time-zone correctness, search and filters, CSV export, mocked API tests and deployment configuration using environment variables.'
      ),
      (
        'Customer Churn Analytics and Prediction Service',
        'Build an end-to-end analytics project for a subscription company. Clean a realistic customer dataset with Pandas, handle missing values and categorical fields, perform exploratory analysis with Matplotlib/Seaborn and train a baseline churn model with scikit-learn. Evaluate precision, recall, F1 and confusion matrix, save the trained pipeline and expose predictions through a validated Flask/FastAPI endpoint. Add model-version metadata, input logging without sensitive data, tests and a management report explaining key churn drivers and limitations.'
      ),
      (
        'Production Email Campaign and Delivery Tracker',
        'Develop a bulk email operations tool that imports contacts from Excel/CSV, validates and de-duplicates addresses, renders personalized HTML templates and schedules campaigns. Use SMTP/MIME, configurable batching, rate limits and retry rules. Record sent, failed and skipped outcomes in a database, support safe campaign resume, generate summary reports and protect credentials with environment variables. Include unsubscribe suppression, test mode, structured logging and unit tests using a mocked mail server.'
      ),
      (
        'Incident Monitoring and Alert Aggregation Service',
        'Create a lightweight operations monitoring platform that checks website/API health, response time and expected JSON content on a schedule. Store incidents and measurements, group repeated failures, send email alerts only when state changes and send recovery notifications. Provide a Flask dashboard with uptime charts, recent incidents and configurable monitors. Implement timeouts, retries, exception handling, background jobs, log rotation, REST endpoints, tests with mocked services and Docker-based deployment.'
      ),
      (
        'Document Approval Workflow with Role-Based Access',
        'Build a business workflow application where employees submit documents and managers approve, reject or request changes. Use Flask, SQLAlchemy, WTForms/Jinja or a REST frontend, secure login and role-based permissions. Maintain status history, comments, file metadata and an audit trail; validate uploads and prevent unauthorized downloads. Add dashboard filters, email notifications, pagination, database migrations, CSRF protection, automated tests and deployment instructions.'
      ),
      (
        'Executive Sales Reporting and Excel Automation Suite',
        'Create a repeatable reporting pipeline that reads monthly sales workbooks, validates schemas, cleans and combines data, calculates region/product KPIs and produces a professionally formatted Excel report with charts plus a PDF summary. Use Pandas, OpenPyXL and Matplotlib. Separate configuration from code, record data-quality issues, support command-line date ranges, preserve an audit log and add regression tests that verify totals against known control figures.'
      ),
      (
        'Capstone: Cloud-Deployed Marketplace Backend',
        'Build a complete marketplace backend combining the course skills: Python OOP, Flask/FastAPI, PostgreSQL, SQLAlchemy, authentication, REST APIs, external payment sandbox integration, email notifications, reporting and deployment. Implement buyers, sellers, products, inventory, carts, orders, payment webhooks and admin moderation. Require idempotent checkout, transaction-safe stock updates, pagination, validation, centralized errors, audit logs, unit/integration tests, API documentation, Docker configuration, CI checks and a live health endpoint.'
      )
  ) as project(title, description)
  where not exists (
    select 1
    from public.course_projects existing
    where existing.course_id = target_course_id
      and lower(btrim(existing.title)) = lower(btrim(project.title))
  );

  raise notice 'Industrial Python projects are now available for course id %.', target_course_id;
end
$$;

commit;

-- Verification: this should return the newly added catalog rows.
select cp.title, cp.description, cp.created_at
from public.course_projects cp
join public.courses c on c.id = cp.course_id
where lower(c.title) in (
  lower('Python Development Pro Bootcamp'),
  lower('Advanced Python Development')
)
order by cp.created_at, cp.title;
