-- Adds three independent 30-day syllabus courses imported from the supplied workbooks.
-- Repeat-safe: existing course/topic rows are updated instead of duplicated.

begin;

-- Avoid legacy course triggers while seeding syllabus-only records.
set local session_replication_role = replica;

insert into public.course_categories (name, description)
select 'Digital Marketing', 'Digital marketing strategy, channels, campaigns, analytics, and practical growth skills.'
where not exists (select 1 from public.course_categories where lower(name) = lower('Digital Marketing'));

insert into public.courses (category_id, title, description, duration, level, status)
select cc.id, 'Advanced Digital Marketing', 'A 30-day advanced digital marketing syllabus with daily channel-focused learning and practical assignments.', '30 Days', 'Advanced', 'active'
from public.course_categories cc
where lower(cc.name) = lower('Digital Marketing')
  and not exists (select 1 from public.courses where lower(title) = lower('Advanced Digital Marketing'));

update public.courses
set category_id = (select id from public.course_categories where lower(name) = lower('Digital Marketing') limit 1),
    description = 'A 30-day advanced digital marketing syllabus with daily channel-focused learning and practical assignments.', duration = '30 Days', level = 'Advanced', status = 'active'
where lower(title) = lower('Advanced Digital Marketing');

insert into public.course_categories (name, description)
select 'WordPress Development', 'WordPress website creation, customization, optimization, security, and deployment.'
where not exists (select 1 from public.course_categories where lower(name) = lower('WordPress Development'));

insert into public.courses (category_id, title, description, duration, level, status)
select cc.id, 'Advanced WordPress Development', 'A 30-day advanced WordPress development syllabus with guided resources and hands-on projects.', '30 Days', 'Advanced', 'active'
from public.course_categories cc
where lower(cc.name) = lower('WordPress Development')
  and not exists (select 1 from public.courses where lower(title) = lower('Advanced WordPress Development'));

update public.courses
set category_id = (select id from public.course_categories where lower(name) = lower('WordPress Development') limit 1),
    description = 'A 30-day advanced WordPress development syllabus with guided resources and hands-on projects.', duration = '30 Days', level = 'Advanced', status = 'active'
where lower(title) = lower('Advanced WordPress Development');

insert into public.course_categories (name, description)
select 'Artificial Intelligence', 'Artificial intelligence, large language models, automation, and production AI applications.'
where not exists (select 1 from public.course_categories where lower(name) = lower('Artificial Intelligence'));

insert into public.courses (category_id, title, description, duration, level, status)
select cc.id, 'Develop LLM-Powered Applications', 'A 30-day industrial syllabus for designing, building, evaluating, and deploying LLM-powered applications.', '30 Days', 'Advanced', 'active'
from public.course_categories cc
where lower(cc.name) = lower('Artificial Intelligence')
  and not exists (select 1 from public.courses where lower(title) = lower('Develop LLM-Powered Applications'));

update public.courses
set category_id = (select id from public.course_categories where lower(name) = lower('Artificial Intelligence') limit 1),
    description = 'A 30-day industrial syllabus for designing, building, evaluating, and deploying LLM-powered applications.', duration = '30 Days', level = 'Advanced', status = 'active'
where lower(title) = lower('Develop LLM-Powered Applications');

set local session_replication_role = origin;

with selected_course as (
  select id from public.courses where lower(title) = lower('Advanced Digital Marketing') order by created_at asc limit 1
), rows (day_number, title, english_video, urdu_video, practice_project) as (
  values
    (1, 'Social Media (Strategy)', 'Search: "Social Media Marketing Strategy for Beginners 2026 in Urdu" by Waseem Akram (Covers audience research and platform selection).', null, 'Understand the 3 pillars: Organic, Paid, and Community. Task: Choose a local Pakistani brand (e.g., a restaurant) and define their target audience.'),
    (2, 'Social Media (Content)', 'Search: "Canva Social Media Post Design Tutorial for Beginners in Urdu" by Tech Urdu (Covers templates, colors, and branding).', null, 'Learn to create a 7-day content calendar using Canva. Task: Design 3 Instagram/Facebook post images for the chosen brand.'),
    (3, 'Social Media (Ads)', 'Search: "Facebook Ads Manager Complete Course 2026 in Hindi/Urdu" by Talha Awan (Covers campaign setup, targeting, and budget).', null, 'Learn the basics of Meta Ads Manager (Facebook/Instagram). Task: Create a dummy ad campaign (draft only) for "Lead Generation".'),
    (4, 'Social Media (Analytics)', 'Search: "How to Read Instagram Insights and Analytics in Urdu" by Digital Squad (Covers what metrics to track daily).', null, 'Understand Insights (Reach, Impressions, Engagement Rate). Task: Analyze the Instagram Insights of any 2 random local pages.'),
    (5, 'Social Media (Review)', 'Search: "Social Media Audit Checklist for Brands" by HubSpot Academy (English - to learn how to review their own plan).', null, 'Task: Create a full 1-week organic posting strategy + 1 paid ad draft for the fake brand. Present to teacher.'),
    (6, 'WhatsApp Marketing (Setup)', 'Search: "WhatsApp Business App Complete Setup Guide in Urdu" by Tech Urdu (Covers profile, away messages, and quick replies).', null, 'Learn the difference between WhatsApp Personal, Business App, and Business API. Task: Install WhatsApp Business, create a business profile with a logo and description.'),
    (7, 'WhatsApp Marketing (Catalogs)', 'Search: "How to Add Products to WhatsApp Business Catalog in Hindi" by The Digital Maestro (Covers catalog setup and sharing).', null, 'Learn to upload products/services to the WhatsApp Business Catalog. Task: Add 5 imaginary products to the catalog with photos and prices.'),
    (8, 'WhatsApp Marketing (Broadcasts)', 'Search: "WhatsApp Broadcast List Marketing Strategy in Urdu" by Naeem Digital (Covers how to segment and write scripts).', null, 'Learn how to send broadcast messages to opted-in customers (without spamming). Task: Write 3 different broadcast scripts (Sale, Announcement, Engagement).'),
    (9, 'WhatsApp Marketing (Chatbots)', 'Search: "WhatsApp Auto Reply and Chatbot Setup for Business in Hindi" by Rahul Tech (Covers quick replies and away messages).', null, 'Introduction to auto-replies and chatbots (using ManyChat or WhatsApp Business API). Task: Create a simple "Welcome" auto-reply message.'),
    (10, 'WhatsApp Marketing (Review)', 'Search: "WhatsApp Marketing Sales Funnel Strategy" by Social Media Examiner (English - for high-level funnel view).', null, 'Task: Design a "WhatsApp Marketing Funnel" (How to get a lead → send catalog → close sale via chat).'),
    (11, 'Email Marketing (Platform)', 'Search: "Mailchimp Tutorial for Beginners in Urdu/Hindi" by Digital Geek (Covers signup, lists, and basic settings).', null, 'Learn to set up a free email marketing account (Mailchimp or Brevo). Task: Create an account and import 5 dummy contacts.'),
    (12, 'Email Marketing (Sequence)', 'Search: "Email Marketing Welcome Sequence Copywriting in Urdu" by Waseem Akram (Covers AIDA formula for emails).', null, 'Learn to write a 3-email "Welcome Sequence" for new subscribers. Task: Write the 3 emails (Welcome, Value, Special Offer).'),
    (13, 'Email Marketing (Design)', 'Search: "How to Design Beautiful Emails in Canva for Mailchimp" by Canva Design School (English - step-by-step visual guide).', null, 'Learn to create a professional email template using Canva or Mailchimp''s editor. Task: Design 1 newsletter email layout.'),
    (14, 'Email Marketing (Review)', 'Search: "Email Deliverability Tips - How to Avoid Spam in Urdu" by Faisal Farooq (Covers subject lines and header settings).', null, 'Task: Send a test email to your own email ID and check if it lands in Inbox vs Spam.'),
    (15, 'GMB Marketing (Setup)', 'Search: "Google My Business Profile Complete Setup Guide 2026 in Urdu" by Sher Ali (Covers verification and filling out details).', null, 'Learn to claim and verify a Google Business Profile (GMB). Task: Claim a "fictitious" local business on Google (or use a real one if allowed).'),
    (16, 'GMB Marketing (Optimization)', 'Search: "GMB Optimization Tips to Rank Higher on Google Maps in Urdu" by Waqas Digital (Covers keywords and photo optimization).', null, 'Learn to optimize the profile (Photos, Description, Services, Business Hours). Task: Upload 5 high-quality photos and write a compelling "About" description.'),
    (17, 'GMB Marketing (Reviews)', 'Search: "How to Get More 5-Star Google Reviews for Local Business in Urdu" by Local SEO Pakistan (Covers review management).', null, 'Learn how to request and manage customer reviews. Task: Write 3 sample review request messages (WhatsApp + SMS) to ask customers for reviews.'),
    (18, 'GMB Marketing (Posts)', 'Search: "Google My Business Posts - How to Use Them for Marketing in Hindi" by Dinesh Kumar (Covers posting and CTAs).', null, 'Learn to create "Google Posts" (offers, events, updates) on the GMB dashboard. Task: Create 2 Google Posts (one with an image, one with an offer).'),
    (19, 'Website Marketing (Basics)', 'Search: "WordPress vs Landing Pages - What to Choose for Business in Urdu" by Muhammad Azam (Covers core difference).', null, 'Understand what a website is and difference between Landing Page vs Full Website. Task: Choose a domain name and hosting (research only, don''t buy yet).'),
    (20, 'Website Marketing (WordPress)', 'Search: "Install WordPress and Theme Step by Step in Urdu" by Nadeem Safi (Covers getting started).', null, 'Learn to install WordPress and a basic theme (using free localhost or demo). Task: Install WordPress on a local environment (XAMPP) or use a free hosting trial.'),
    (21, 'Website Marketing (Landing Page)', 'Search: "Elementor Tutorial for Beginners - Create a Landing Page in Urdu" by Tech Channel Pakistan (Covers drag-and-drop building).', null, 'Learn to use Elementor to build a 1-page landing page. Task: Build a simple landing page for a "Free eBook" lead magnet.'),
    (22, 'Website Marketing (SEO)', 'Search: "On-Page SEO for Beginners in 2026 - Urdu/Hindi" by SEO Master Pakistan (Covers Yoast plugin and keyword placement).', null, 'Learn basic On-Page SEO (Titles, Meta Descriptions, Headings). Task: Optimize the landing page created on Day 21 with proper keywords.'),
    (23, 'Video Marketing (Strategy)', 'Search: "YouTube vs Instagram Reels - Which is Better for Your Business in Urdu" by Faisal Farooq (Covers strategy and ROI).', null, 'Understand the difference between Short-form (Reels/TikTok) and Long-form (YouTube) video marketing. Task: Decide which format fits the fake brand best.'),
    (24, 'Video Marketing (Scripting)', 'Search: "How to Write a Viral Video Script for Social Media in Urdu" by Digital Squad (Covers hook, value, CTA).', null, 'Learn to write a 60-second video script for a sales pitch or educational video. Task: Write a full script using the PAS (Problem-Agitate-Solution) formula.'),
    (25, 'Video Marketing (Editing)', 'Search: "CapCut Complete Editing Tutorial for Social Media Reels in Urdu" by CapCut Official (Pakistan) (Covers text, transitions, and effects).', null, 'Use CapCut to edit a vertical video (add subtitles, text overlays, trending audio). Task: Record a 30-sec video of yourself and edit it professionally.'),
    (26, 'Video Marketing (YouTube SEO)', 'Search: "YouTube SEO - How to Rank Your Videos on Top in Urdu" by Waseem Akram (Covers titles, tags, and thumbnails).', null, 'Learn to optimize YouTube videos (Title, Description, Tags, Thumbnail). Task: Upload the edited video to YouTube (unlisted) and write perfect SEO meta data.'),
    (27, 'Integration (All 6)', 'Search: "Omnichannel Marketing Strategy - Combining Social, Email, and WhatsApp" by HubSpot Academy (English - high-level integration concept).', null, 'Learn how to connect all channels: Website → Email → WhatsApp → Social Media. Task: Draw a flowchart showing how a customer moves from Instagram to buying.'),
    (28, 'Client Service Packages', 'Search: "How to Create Digital Marketing Service Packages in Urdu" by Saad Usmani (Covers pricing and service lists).', null, 'Create 3 service packages (Silver, Gold, Platinum) including these 6 channels. Task: Write the deliverables for each package.'),
    (29, 'Freelance Profile Setup', 'Search: "Fiverr Gig Description Writing Tips for Digital Marketers in Urdu" by Freelancer Pakistan (Covers keywords and profile optimization).', null, 'Create a Fiverr/Upwork profile and write a Gig describing these 6 services. Task: Write a Gig title and description.'),
    (30, 'Final Mock Project', 'Search: "Client Pitch Presentation Tips for Freelancers in Urdu" by The Futur (English) or Pakistani Freelancers (Urdu) - (Covers how to present the plan).', null, 'Graduation Task: Pick any local shop in your city. Prepare a complete 1-month proposal covering WhatsApp, GMB, Social Media, Website, Email, and Video Marketing for them. Present it live.')
)
insert into public.course_topics (course_id, day_number, title, english_video, urdu_video, practice_project)
select selected_course.id, rows.day_number, rows.title, rows.english_video, rows.urdu_video, rows.practice_project
from selected_course cross join rows
on conflict (course_id, day_number) do update set
  title = excluded.title,
  english_video = excluded.english_video,
  urdu_video = excluded.urdu_video,
  practice_project = excluded.practice_project;

with selected_course as (
  select id from public.courses where lower(title) = lower('Advanced WordPress Development') order by created_at asc limit 1
), rows (day_number, title, english_video, urdu_video, practice_project) as (
  values
    (1, 'Recap HTML5, CSS3, JS & PHP Basics – forms, loops, arrays, functions', null, 'Video: CodeWithHarry “HTML CSS JS PHP in One Video” (Hindi) – search “CodeWithHarry Web Development Full Course”. Extra: w3schools exercises.', null),
    (2, 'Introduction to WordPress – what it is, dashboard tour, settings, pages vs posts', null, 'Video: “WordPress Tutorial for Beginners in Hindi” by Thapa Technical (Part 1). Extra: WordPress.org Codex – “First Steps with WordPress”.', null),
    (3, 'Themes – installing, activating, Customizer basics; block vs classic themes', null, 'Video: “WordPress Theme Installation & Customization” by Yahoo Baba (Hindi). Extra: Official Theme Handbook intro.', null),
    (4, 'Child Themes – why use them, creating a child theme (style.css + functions.php)', null, 'Video: “Child Theme in WordPress” by Geeky Shows (Hindi). Extra: Child Theme docs on developer.wordpress.org.', null),
    (5, 'Template hierarchy – understanding how WordPress chooses templates', null, 'Video: “WordPress Template Hierarchy Explained in Hindi” by WP Bouncer. Extra: Template hierarchy diagram from developer.wordpress.org.', null),
    (6, 'The Loop – displaying posts, basic functions (the_title(), the_content(), the_excerpt())', null, 'Video: “WordPress Loop in Hindi” by CodeWithHarry (from his WP series). Extra: WP_Query documentation.', null),
    (7, 'Custom queries – WP_Query, query_posts (avoid), get_posts()', null, 'Video: “WP_Query in WordPress Hindi” by Yahoo Baba. Extra: WP_Query class reference.', null),
    (8, 'Actions & Filters (Hooks) – introduction, how they work, simple examples', null, 'Video: “WordPress Hooks (Actions & Filters) in Hindi” by Thapa Technical. Extra: WordPress Hooks database.', null),
    (9, 'Using hooks in your child theme – common hooks (wp_footer, the_content, etc.)', null, 'Video: “WordPress Action and Filter Hooks Practical” by Geeky Shows (Hindi). Extra: Adam Brown’s Hookr.io to find hooks.', null),
    (10, 'Menus, Widgets, Sidebars – registering a sidebar, adding a custom menu location', null, 'Video: “Register Sidebar & Menu in WordPress” by CodeWithHarry (Hindi). Extra: register_sidebar() and register_nav_menu() codex.', null),
    (11, 'Custom Post Types & Taxonomies – creating a “Portfolio” or “Team” CPT', null, 'Video: “Custom Post Type in WordPress Hindi” by Yahoo Baba. Extra: register_post_type() docs.', null),
    (12, 'Custom Fields – using Advanced Custom Fields (ACF) to add extra data', null, 'Video: “ACF WordPress Tutorial in Hindi” by WP Bouncer. Extra: ACF documentation.', null),
    (13, 'Plugin Development Introduction – file structure, header, activation/deactivation', null, 'Video: “Create Your First WordPress Plugin” by Thapa Technical (Hindi). Extra: Plugin Handbook.', null),
    (14, 'Shortcodes – creating a shortcode with/without attributes', null, 'Video: “WordPress Shortcode Tutorial in Hindi” by Geeky Shows. Extra: add_shortcode() codex.', null),
    (15, 'Plugin Settings Page – Options API, adding admin menu & settings', null, 'Video: “Plugin Settings Page in WordPress Hindi” by Yahoo Baba. Extra: add_options_page() and register_setting().', null),
    (16, 'Hooks in Plugins – using actions/filters within your own plugin', null, 'Video: “WordPress Plugin with Hooks” by CodeWithHarry (Hindi, part of his plugin series). Extra: Action Scheduler library overview.', null),
    (17, 'Custom Post Type Plugin – moving the “Projects” CPT into your own plugin', null, 'Video: “Custom Post Type as Plugin” by WP Bouncer (Hindi). Extra: flush_rewrite_rules() usage.', null),
    (18, 'Widget Plugin – building a simple dashboard widget or front‑end widget', null, 'Video: “Create a WordPress Widget Plugin” by Yahoo Baba (Hindi). Extra: WP_Widget class reference.', null),
    (19, 'Shortcode Plugin with Database Interaction – saving data (basic CRUD)', null, 'Video: “Custom Table Plugin WordPress” by Geeky Shows (Hindi). Extra: $wpdb class usage.', null),
    (20, 'Theme Development from Scratch – files required (style.css, index.php, functions.php)', null, 'Video: “WordPress Theme Development in Hindi – Part 1” by Thapa Technical. Extra: Theme Developer Handbook.', null),
    (21, 'Header, Footer, Sidebar – get_header(), get_footer(), get_sidebar(), dynamic_sidebar()', null, 'Video: “Create Header Footer Sidebar in Theme” by Yahoo Baba (Hindi). Extra: Template tags for includes.', null),
    (22, 'The Loop in Your Own Theme – main loop, single.php, page.php, archive.php', null, 'Video: “Theme Loop and Templates” by Geeky Shows (Hindi). Extra: Template hierarchy cheat sheet.', null),
    (23, 'Enqueuing Styles & Scripts – wp_enqueue_style(), wp_enqueue_script(), dependencies', null, 'Video: “Enqueue CSS & JS in WordPress Theme” by CodeWithHarry. Extra: functions.php example from _s theme.', null),
    (24, 'Theme Supports & Post Thumbnails – add_theme_support( ‘post-thumbnails’, ‘menus’, ‘html5’ )', null, 'Video: “Theme Supports in WordPress Hindi” by WP Bouncer. Extra: add_theme_support() codex.', null),
    (25, 'Customizer Integration – adding controls (colours, text fields) to the Customizer', null, 'Video: “WordPress Customizer API in Hindi” by Thapa Technical. Extra: Customizer API handbook.', null),
    (26, 'Portfolio Theme – Start building the final project: a full portfolio theme', null, 'Video: “Build a Complete WordPress Theme” by Yahoo Baba (Hindi, multi‑part playlist).', null),
    (27, 'Archive & Single Templates for Portfolio – single-portfolio.php, archive-portfolio.php', null, 'Video: “Custom Post Type Templates” by Geeky Shows (Hindi).', null),
    (28, 'Front‑end Interactions – adding a basic AJAX “Load More” button for projects', null, 'Video: “AJAX in WordPress Theme” by Thapa Technical (Hindi). Extra: WordPress AJAX handbook.', null),
    (29, 'Security & Sanitization – escaping output, nonces, data validation', null, 'Video: “WordPress Security Best Practices” by CodeWithHarry (Hindi). Extra: WordPress Security docs.', null),
    (30, 'Final Polish & Deployment – testing, moving from Local WP to a live server (optional), review', null, 'Video: “How to Move WordPress from Local to Live Server” by Yahoo Baba (Hindi). Extra: Duplicator or All‑in‑One WP Migration plugin.', null)
)
insert into public.course_topics (course_id, day_number, title, english_video, urdu_video, practice_project)
select selected_course.id, rows.day_number, rows.title, rows.english_video, rows.urdu_video, rows.practice_project
from selected_course cross join rows
on conflict (course_id, day_number) do update set
  title = excluded.title,
  english_video = excluded.english_video,
  urdu_video = excluded.urdu_video,
  practice_project = excluded.practice_project;

with selected_course as (
  select id from public.courses where lower(title) = lower('Develop LLM-Powered Applications') order by created_at asc limit 1
), rows (day_number, title, english_video, urdu_video, practice_project) as (
  values
    (1, 'W1 - Python Async, Pydantic & Config Async/await, Pydantic v2, .env configs, retry logic.', 'Channel: Corey Schafer Title: Async IO in Python (Complete Tutorial) (Search exact title on YouTube)', null, 'Project: Build a reusable LLMClient class with Pydantic configs, tenacity for retries (exponential backoff), and structured JSON logging.'),
    (2, 'W1 - OpenAI API Fundamentals Chat completion, Roles (System/User/Asst), Token counting (Tiktoken).', 'Channel: TechWithTim Title: OpenAI API Python Tutorial (Search exact title)', null, 'Project: Create a production wrapper that logs each request''s input/output tokens to a file (or CloudWatch) for cost auditing.'),
    (3, 'W1 - Streaming Responses Token-by-token streaming, Async streaming using async for.', 'Channel: LangChain Official Title: Streaming with LangChain (Search exact title)', null, 'Project: Build a FastAPI endpoint with StreamingResponse that streams tokens to the frontend in real-time, with heartbeat checks.'),
    (4, 'W1 - LCEL (LangChain Expression Language) Base Runnable interface, pipe operator (|), invoke vs stream.', 'Channel: LangChain Official Title: LangChain Expression Language (LCEL) Explained (Search exact title)', null, 'Project: Convert your raw OpenAI calls to a prompt | model | parser LCEL chain and add performance timing middleware.'),
    (5, 'W1 - Prompt Templates ChatPromptTemplate, MessagesPlaceholder, Few-shot examples.', 'Channel: James Briggs Title: LangChain Prompt Templates (Search exact title)', null, 'Project: Store all prompt templates in external YAML/JSON config files, not hardcoded, allowing hot-reloads in production.'),
    (6, 'W1 - Output Parsers PydanticOutputParser, JsonOutputParser, StrOutputParser.', 'Channel: AssemblyAI Title: LangChain Output Parsers (Search exact title)', null, 'Project: Use RetryOutputParser to automatically retry the LLM if the JSON validation fails, ensuring 100% structured output.'),
    (7, 'W1 - Callbacks & Observability Custom callbacks, Token usage tracking, Streaming handlers.', 'Channel: LangChain Official Title: Callbacks in LangChain (Search exact title)', null, 'Project: Implement a CustomCallbackHandler that sends metrics (latency, tokens) to OpenTelemetry / Prometheus for monitoring.'),
    (8, 'W2 - Memory Systems (Buffer & Summary) ConversationBuffer, Window, Summary Memory.', 'Channel: Prompt Engineering Title: LangChain Memory Types Explained (Search exact title)', null, 'Project: Build a chatbot with Redis-backed memory so the conversation persists across server restarts.'),
    (9, 'W2 - Memory Systems (Vector & Entity) VectorStoreRetrieverMemory, EntityMemory for fact extraction.', 'Channel: LangChain Official (look for short demos) Title: VectorStoreRetrieverMemory in LangChain', null, 'Project: Build a "User Profile" system that remembers user preferences (e.g., "User likes Python") across different chat sessions using Vector DB.'),
    (10, 'W2 - Sequential Chains LLMChain, SimpleSequentialChain, SequentialChain.', 'Channel: Data Science Garage Title: LangChain Sequential Chains (Search exact title)', null, 'Project: Create a 3-step content generator (Title -> Outline -> Body) with step-level error handling so one failure doesn''t crash the whole chain.'),
    (11, 'W2 - Router Chains RouterChain, MultiPromptChain to route queries to different experts.', 'Channel: Eden AI Title: LangChain Router Chains Tutorial (Search exact title)', null, 'Project: Build a dynamic router that loads prompt templates from a PostgreSQL database based on user intent classification.'),
    (12, 'W2 - Advanced LCEL Patterns RunnablePassthrough, RunnableParallel, RunnableBranch, RunnableLambda.', 'Channel: LangChain Official Title: Advanced LCEL Patterns (Search exact title)', null, 'Project: Build a parallel chain that fetches documents from 3 different Vector DBs simultaneously and merges the contexts.'),
    (13, 'W2 - Intro to RAG (Ingestion) Text splitting (RecursiveCharacterTextSplitter), Embeddings, Chroma/Pinecone setup.', 'Channel: LangChain Official Title: RAG from Scratch (Part 1) (Search exact title - official playlist)', null, 'Project: Write an idempotent ingestion script that checks for existing hashes to avoid duplicate embeddings.'),
    (14, 'W2 - Advanced Retrievers ParentDocumentRetriever (small chunks, big parents), MultiQueryRetriever.', 'Channel: LangChain Official Title: MultiQuery Retriever in LangChain (Search exact title)', null, 'Project: Implement ParentDocumentRetriever and run an A/B test to measure answer quality improvement on 50 sample queries.'),
    (15, 'W3 - Hybrid Search Keyword (BM25) + Semantic (Vector) ensemble retriever.', 'Channel: Pinecone Official Title: Hybrid Search with LangChain (Search exact title)', null, 'Project: Build an EnsembleRetriever with weighted scoring (e.g., 0.6 vector, 0.4 BM25) controlled via an env variable for tuning.'),
    (16, 'W3 - LangChain Indexing API Deduplication, incremental indexing, cleaning stale docs.', 'Channel: LangChain Official Title: Indexing API in LangChain (Search exact title)', null, 'Project: Set up a GitHub Action cron job that runs the Indexing API daily to sync new documents automatically.'),
    (17, 'W3 - Autonomous Agents (Basics) AgentExecutor, Tools (SerpAPI, Calculator), React loop.', 'Channel: Nicholas Renotte Title: LangChain Agents Complete Guide (Search exact title)', null, 'Project: Build an agent with timeout and recursion limits to prevent infinite loops in production.'),
    (18, 'W3 - Custom Tools & Toolkits Creating @tool decorators, BaseTool class.', 'Channel: LangChain Official Title: Custom Tools in LangChain (Search exact title)', null, 'Project: Create a custom SQLTool that executes read-only, parameterized queries against a real DB, preventing SQL injection.'),
    (19, 'W3 - LangSmith Tracing & Debugging Setup, nested run trees, visual debugging.', 'Channel: LangChain Official Title: LangSmith Tracing & Debugging (Search exact title)', null, 'Project: Instrument your full RAG pipeline with @traceable and add custom metadata tags (environment=prod, version=1.2).'),
    (20, 'W3 - LangSmith Evaluation & Hub Datasets, Regression testing, Prompt registry (Hub).', 'Channel: LangChain Official Title: LangSmith Evaluation (Search exact title)', null, 'Project: Upload a dataset of 100 QA pairs, run an evaluation test, and push the winning prompt to LangSmith Hub for team sharing.'),
    (21, 'W3 - Production Fallbacks & Retries with_fallbacks(), handling rate limits (429 errors).', 'Channel: LangChain Official Title: Fallbacks in LangChain (Search exact title)', null, 'Project: Configure a chain to fallback to GPT-3.5-turbo if GPT-4 hits a rate limit, and log all fallback events to an alerting system.'),
    (22, 'W4 - Caching & Batching SQLiteCache, RedisCache, Semantic Caching, Batch processing.', 'Channel: LangChain Official Title: Caching in LangChain (Search exact title)', null, 'Project: Implement Redis Semantic Caching (using embeddings) to auto-respond to identical user queries, saving 80% token costs.'),
    (23, 'W4 - Microservice Architecture Separation of concerns: Orchestrator, Inference, Indexing, Memory services.', 'Channel: ArjanCodes Title: Microservices with FastAPI (Search exact title)', null, 'Project: Draw a detailed architecture diagram and write the API contract (OpenAPI/Swagger) for 3 separate microservices.'),
    (24, 'W4 - FastAPI Integration Async endpoints, dependency injection, WebSocket streaming, Rate limiting.', 'Channel: (Search specific) - e.g., LangChain + FastAPI Streaming. Title: FastAPI with Streaming LLM Responses', null, 'Project: Build the production FastAPI app with slowapi rate limiting, health check endpoints (/health), and CORS for frontend.'),
    (25, 'W4 - Advanced RAG - Rerankers Cross-encoders (Cohere Rerank, BAAI Reranker).', 'Channel: Greg Kamradt Title: Advanced RAG with Rerankers (Search exact title)', null, 'Project: Integrate Cohere Rerank into the retrieval step and run a latency vs. accuracy benchmark to decide if it''s viable for real-time traffic.'),
    (26, 'W4 - LangGraph (Multi-Agent Systems) Stateful graphs, Supervisor agents, Human-in-the-loop.', 'Channel: LangChain Official Title: LangGraph Crash Course (Search exact title)', null, 'Project: Build a Supervisor agent that delegates to a "Researcher" and "Writer", and adds a Human approval node before sending emails.'),
    (27, 'W4 - Security & Guardrails Prompt injection detection, PII redaction (Presidio), Input sanitization.', 'Channel: (Search) - LLM Security Guardrails Title: Protecting LLM Apps from Prompt Injection', null, 'Project: Write a middleware that uses Presidio to redact PII (emails, phones) from the user input before sending it to OpenAI.'),
    (28, 'W4 - Evaluation Metrics (RAGAS) Faithfulness, Context Relevancy, Answer Relevancy, GPT-4 as Judge.', 'Channel: RAGAS Official Title: RAGAS Tutorial - Evaluate your RAG Pipeline (Search exact title)', null, 'Project: Integrate RAGAS evaluation into your CI/CD pipeline to block deployments if the "Faithfulness" score drops below 0.85.'),
    (29, 'W4 - Containerization (Docker) Multi-stage Dockerfile, .dockerignore, environment variables.', 'Channel: TechWithTim Title: Dockerize Python FastAPI (Search exact title)', null, 'Project: Write a multi-stage Dockerfile that reduces the final image size (< 200MB) and mounts secrets via Docker secrets.'),
    (30, 'W4 - Kubernetes & CI/CD Deployment K8s deployments, Horizontal Pod Autoscaling (HPA), CI/CD pipeline (GitHub Actions).', 'Channel: (Search) - Deploy FastAPI to Kubernetes Title: Deploying Python Apps to Kubernetes', null, 'Project: Write deployment.yaml and service.yaml for K8s. Configure HPA to auto-scale based on CPU usage, and set up a GitHub Action to auto-deploy on merge.')
)
insert into public.course_topics (course_id, day_number, title, english_video, urdu_video, practice_project)
select selected_course.id, rows.day_number, rows.title, rows.english_video, rows.urdu_video, rows.practice_project
from selected_course cross join rows
on conflict (course_id, day_number) do update set
  title = excluded.title,
  english_video = excluded.english_video,
  urdu_video = excluded.urdu_video,
  practice_project = excluded.practice_project;

commit;
