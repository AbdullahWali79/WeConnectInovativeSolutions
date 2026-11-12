-- ════════════════════════════════════════════════════════════════════
-- SEO UPDATE SCRIPT — All Products
-- Sets slug, seo_title, seo_description, seo_keywords for every product
-- Match is done by product NAME (case-insensitive)
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- Helper: generate slug from text
-- (Supabase/PostgreSQL already has lower() and regexp_replace)

-- ─────────────────────────────────────────────────────────────────────
-- 1. KametiPro
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'kametipro-committee-management',
  seo_title = 'KametiPro — Digital Committee & Payment Management Software',
  seo_description = 'KametiPro is a digital committee management platform that tracks payments, manages members, and automates turn orders with full transparency. Built by We Connect Innovative Solutions.',
  seo_keywords = ARRAY['KametiPro','committee management','committee software','payment tracking','member management','rotating savings','committee system','digital committee','Pakistan committee software'],
  updated_at = now()
WHERE lower(name) = lower('KametiPro');

-- ─────────────────────────────────────────────────────────────────────
-- 2. SecureVote
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'securevote-online-election-platform',
  seo_title = 'SecureVote — Secure Online Voting & Election Platform',
  seo_description = 'SecureVote is a full-stack online election platform with anonymous ballots, real-time participation metrics, verifiable results, and immutable audit trails for trustworthy digital voting.',
  seo_keywords = ARRAY['SecureVote','online voting','election platform','digital voting','anonymous ballot','election security','vote verification','audit trail','organization voting'],
  updated_at = now()
WHERE lower(name) = lower('SecureVote');

-- ─────────────────────────────────────────────────────────────────────
-- 3. AI Resume Builder and ATS Optimizer
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'ai-resume-builder-ats-optimizer',
  seo_title = 'AI Resume Builder & ATS Optimizer — Smart Resume Tool',
  seo_description = 'AI-powered resume builder with editable templates, ATS keyword analysis, bullet rewriting, PDF export, version history, and responsive dark/light UI for job seekers.',
  seo_keywords = ARRAY['AI resume builder','ATS optimizer','resume builder','ATS keyword analysis','resume PDF export','job application tool','AI resume','ATS-friendly resume','resume templates'],
  updated_at = now()
WHERE lower(name) = lower('AI Resume Builder and ATS Optimizer');

-- ─────────────────────────────────────────────────────────────────────
-- 4. tradepro360
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'tradepro360-booking-job-management',
  seo_title = 'TradePro 360 — Booking & Job Management for UK Trades',
  seo_description = 'TradePro 360 is a smart booking and job management platform for UK plumbers, electricians, and cleaners with AI dispatching, live tracking, dynamic quotes, and payments.',
  seo_keywords = ARRAY['TradePro 360','tradesperson software','UK plumber booking','electrician job management','cleaner scheduling','AI dispatch','job management platform','trade services app'],
  updated_at = now()
WHERE lower(name) = lower('tradepro360');

-- ─────────────────────────────────────────────────────────────────────
-- 5. FineFlowAI Enterprise Combined
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'fineflowai-finance-expense-management',
  seo_title = 'FineFlowAI — AI Finance & Expense Management System',
  seo_description = 'FinFlowAI is an AI-powered finance document and expense management system with OCR receipt scanning, duplicate detection, budget management, and secure financial reporting.',
  seo_keywords = ARRAY['FineFlowAI','finance management','expense tracker','OCR receipts','budget management','finance reports','AI finance','expense management system','receipt scanning'],
  updated_at = now()
WHERE lower(name) = lower('FineFlowAI Enterprise Combined');

-- ─────────────────────────────────────────────────────────────────────
-- 6. Book Store App
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'book-store-app-online-bookshop',
  seo_title = 'Book Store App — Online Book Shop Management System',
  seo_description = 'Professional book shop management app with browsing, search, ordering, admin dashboard, and Supabase-powered secure authentication and role-based access control.',
  seo_keywords = ARRAY['book store app','online bookshop','book shop management','book ordering','book store dashboard','Supabase ecommerce','book store software','online book store'],
  updated_at = now()
WHERE lower(name) = lower('Book Store App');

-- ─────────────────────────────────────────────────────────────────────
-- 7. Certificate Generator
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'certifypro-certificate-generator',
  seo_title = 'CertifyPro — Certificate Generator & Verification Platform',
  seo_description = 'CertifyPro is a modern certificate management platform for designing, issuing, storing, downloading, and verifying professional certificates with QR verification and multiple templates.',
  seo_keywords = ARRAY['certificate generator','CertifyPro','certificate management','QR certificate verification','digital certificates','certificate templates','certificate issuance','professional certificates'],
  updated_at = now()
WHERE lower(name) = lower('Certificate Generator');

-- ─────────────────────────────────────────────────────────────────────
-- 8. HostHaven (hospitality management platform)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'hosthaven-hospitality-management-platform',
  seo_title = 'HostHaven — Full-Stack Hospitality & Property Management',
  seo_description = 'HostHaven is an end-to-end hospitality and property management platform for hotels, rentals, and property managers with booking, guest management, and analytics dashboards.',
  seo_keywords = ARRAY['HostHaven','hospitality management','property management','hotel platform','rental management','property management software','hospitality software','booking platform'],
  updated_at = now()
WHERE lower(name) = lower('HostHaven (hospitality management platform)');

-- ─────────────────────────────────────────────────────────────────────
-- 9. Business ERP
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'business-erp-client-management-system',
  seo_title = 'Business ERP & Client Management System — React + Supabase',
  seo_description = 'Modern desktop-first ERP application with customer management, sales tracking, inventory, invoice processing, role-based auth, dashboards, and real-time data sync.',
  seo_keywords = ARRAY['Business ERP','ERP system','client management','sales tracking','inventory management','invoice processing','ERP software','business management system','React ERP'],
  updated_at = now()
WHERE lower(name) = lower('Business ERP');

-- ─────────────────────────────────────────────────────────────────────
-- 10. Mood Tracker
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'moodly-mood-tracker-app',
  seo_title = 'Moodly — Personal Mood & Reflection Tracker App',
  seo_description = 'Moodly is a modern mood and reflection tracker that helps users record daily moods, reflect on experiences, track emotional patterns, and build self-awareness.',
  seo_keywords = ARRAY['Moodly','mood tracker','mental health app','emotion tracking','reflection journal','mood journal','wellness app','mental wellness','self-awareness tool'],
  updated_at = now()
WHERE lower(name) = lower('Mood Tracker');

-- ─────────────────────────────────────────────────────────────────────
-- 11. Medicine Reminder
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'medireminder-medicine-reminder-app',
  seo_title = 'MediReminder — Medication Management & Reminder Platform',
  seo_description = 'MediReminder is a medication management platform that helps users organize medicines, track daily doses, monitor adherence, and manage schedules through an intuitive dashboard.',
  seo_keywords = ARRAY['MediReminder','medicine reminder','medication management','pill tracker','dose reminder','medication adherence','medicine scheduler','health reminder app'],
  updated_at = now()
WHERE lower(name) = lower('Medicine Reminder');

-- ─────────────────────────────────────────────────────────────────────
-- 12. Gym Management System
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'gym-management-system-full-stack',
  seo_title = 'Gym Management System — Full-Stack Gym Software',
  seo_description = 'Full-stack gym management system for members, trainers, memberships, attendance, payments, workouts, nutrition plans, progress tracking, and business analytics with role-based dashboards.',
  seo_keywords = ARRAY['gym management system','gym software','fitness management','member management','trainer management','gym payments','gym attendance','fitness business software','gym dashboard'],
  updated_at = now()
WHERE lower(name) = lower('Gym Management System');

-- ─────────────────────────────────────────────────────────────────────
-- 13. Invoice_generator
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'invoice-generator-pro-invoicing-app',
  seo_title = 'Invoice Generator — Professional Invoicing & Billing App',
  seo_description = 'Professional invoice management app for handling customers, products, stock, invoices, sales, and business reports with a clean, intuitive interface.',
  seo_keywords = ARRAY['invoice generator','invoicing app','billing software','invoice management','business reports','stock management','customer invoicing','billing system'],
  updated_at = now()
WHERE lower(name) = lower('Invoice_generator');

-- ─────────────────────────────────────────────────────────────────────
-- 14. Vite-Dashboard
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'vite-dashboard-react-template',
  seo_title = 'Vite Dashboard — Fast React Frontend Template',
  seo_description = 'Lightweight React frontend template powered by Vite with Hot Module Replacement, React Fast Refresh, and ESLint configuration for fast development.',
  seo_keywords = ARRAY['Vite dashboard','React template','Vite React','frontend template','HMR','React Fast Refresh','ESLint config','Vite boilerplate','React starter'],
  updated_at = now()
WHERE lower(name) = lower('Vite-Dashboard');

-- ─────────────────────────────────────────────────────────────────────
-- 15. AI Travel Planner and Booking Marketplace
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'ai-travel-planner-booking-marketplace',
  seo_title = 'AI Travel Planner & Booking Marketplace — Smart Trip Planner',
  seo_description = 'AI-powered travel planner for personalized itineraries, hotel and activity exploration, budget management, route views, and booking inquiries in one responsive platform.',
  seo_keywords = ARRAY['AI travel planner','travel marketplace','trip planner','travel booking','personalized itinerary','hotel booking','travel AI','smart travel planner','vacation planner'],
  updated_at = now()
WHERE lower(name) = lower('AI Travel Planner and Booking Marketplace');

-- ─────────────────────────────────────────────────────────────────────
-- 16. PropVal.AI
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'propval-ai-house-price-predictor',
  seo_title = 'PropVal.AI — AI House Price Predictor for Pakistan Real Estate',
  seo_description = 'AI-powered Pakistani real estate valuation platform using Machine Learning and Flask to predict house prices in PKR with accurate property valuations.',
  seo_keywords = ARRAY['PropVal.AI','house price predictor','real estate AI','property valuation','Pakistan real estate','ML price prediction','property price estimate','real estate valuation','Flask ML'],
  updated_at = now()
WHERE lower(name) = lower('PropVal.AI — AI-Powered House Price Predictor');

-- ─────────────────────────────────────────────────────────────────────
-- 17. PromptVault
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'promptvault-ai-prompt-library',
  seo_title = 'PromptVault — AI Prompt Library & Generator Tool',
  seo_description = 'PromptVault is a full-stack AI prompt library where users discover, customize with auto-detected variables, and copy production-tested prompts in one click. Includes admin console.',
  seo_keywords = ARRAY['PromptVault','AI prompt library','prompt generator','AI prompts','prompt engineering','prompt collection','copy prompts','AI prompt tool','prompt marketplace'],
  updated_at = now()
WHERE lower(name) = lower('PromptVault — Ready-to-Run AI Prompt Library & Generator');

-- ─────────────────────────────────────────────────────────────────────
-- 18. InvoicePro
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'invoicepro-desktop-invoice-generator',
  seo_title = 'InvoicePro — Professional Desktop Invoice Generator (Python)',
  seo_description = 'Professional Windows desktop invoice management app built with Python featuring dynamic invoice creation, A4 PDF generation, customer management, and database-backed history.',
  seo_keywords = ARRAY['InvoicePro','desktop invoice','Python invoice app','invoice generator','PDF invoice','Windows invoicing','invoice software','desktop billing','Python billing app'],
  updated_at = now()
WHERE lower(name) = lower('InvoicePro — Professional Desktop Invoice Generator');

-- ─────────────────────────────────────────────────────────────────────
-- 19. Professional finance Manager
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'professional-finance-manager-budget-tracker',
  seo_title = 'Professional Finance Manager — Budget Tracker App',
  seo_description = 'A professional budget tracker and finance manager app for tracking expenses, managing budgets, and gaining financial insights through an intuitive dashboard.',
  seo_keywords = ARRAY['finance manager','budget tracker','expense tracker','financial management','budget app','personal finance','money tracker','finance dashboard','budget planner'],
  updated_at = now()
WHERE lower(name) = lower('Professional finance Manager');

-- ─────────────────────────────────────────────────────────────────────
-- 20. Smart pos app
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'smart-pos-app-point-of-sale',
  seo_title = 'Smart POS App — Point of Sale System',
  seo_description = 'Smart POS app for retail businesses — manage sales, process payments, track inventory, and generate reports through an intuitive point-of-sale interface.',
  seo_keywords = ARRAY['POS app','point of sale','POS system','retail POS','sales terminal','payment processing','POS software','retail management','cash register app'],
  updated_at = now()
WHERE lower(name) = lower('Smart pos app');

-- ─────────────────────────────────────────────────────────────────────
-- 21. Smart Trade
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'smart-trade-trading-platform',
  seo_title = 'Smart Trade — Online Trading Platform',
  seo_description = 'Smart Trade is an online trading platform for managing trades, tracking market positions, and executing trading strategies with real-time data.',
  seo_keywords = ARRAY['Smart Trade','trading platform','online trading','trade management','market tracking','trading app','trade software','investment platform'],
  updated_at = now()
WHERE lower(name) = lower('Smart Trade');

-- ─────────────────────────────────────────────────────────────────────
-- 22. Invoice generator (Hybrid - Flutter)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'invoice-generator-flutter-pdf-invoicing',
  seo_title = 'Flutter Invoice Generator — PDF Invoicing with Supabase',
  seo_description = 'Professional Flutter-based invoice management app to create, preview, and share high-quality PDF invoices with integrated Supabase backend support.',
  seo_keywords = ARRAY['Flutter invoice','invoice generator','mobile invoicing','PDF invoice','Supabase invoice','Flutter billing','mobile billing app','cross-platform invoicing'],
  updated_at = now()
WHERE lower(name) = lower('Invoice generator') AND short_description ILIKE '%Flutter%';

-- ─────────────────────────────────────────────────────────────────────
-- 23. DockFlow
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'dockflow-flask-deployment-cicd',
  seo_title = 'DockFlow — Containerized Flask Deployment & CI/CD Platform',
  seo_description = 'DockFlow is a Dockerized Flask app with GitHub Actions CI/CD pipeline, automated testing, health monitoring, and environment-based config for modern DevOps practices.',
  seo_keywords = ARRAY['DockFlow','Docker Flask','CI/CD pipeline','GitHub Actions','containerized app','Flask deployment','DevOps','Docker deployment','automated testing'],
  updated_at = now()
WHERE lower(name) ILIKE lower('DockFlow%');

-- ─────────────────────────────────────────────────────────────────────
-- 24. gym and fitness studio (FitFlow)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'fitflow-gym-fitness-studio-saas',
  seo_title = 'FitFlow — Gym & Fitness Studio Management SaaS',
  seo_description = 'FitFlow is a React-based gym management SaaS with members, classes, attendance, workouts, payments, QR/face check-in, AI workouts, gamification, and rewards leaderboard.',
  seo_keywords = ARRAY['FitFlow','gym management','fitness studio','gym SaaS','member management','QR check-in','AI workouts','fitness software','gamification fitness','gym booking'],
  updated_at = now()
WHERE lower(name) = lower('gym and fitness studio');

-- ─────────────────────────────────────────────────────────────────────
-- 25. Stayfolio
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'stayfolio-hotel-management-onboarding',
  seo_title = 'Stayfolio — Hotel Management & Onboarding Platform',
  seo_description = 'Full-stack hotel management platform with multi-step owner onboarding, admin approval workflow, guest booking portal, role-based dashboards, revenue analytics, and cloud storage.',
  seo_keywords = ARRAY['Stayfolio','hotel management','hotel onboarding','guest booking','hotel platform','revenue analytics','hotel software','property onboarding','hotel booking system'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Stayfolio%');

-- ─────────────────────────────────────────────────────────────────────
-- 26. Automated Bulk Email Campaign Manager (Python)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'bulk-email-campaign-manager-python',
  seo_title = 'Automated Bulk Email Campaign Manager — Python SMTP',
  seo_description = 'Python-based email automation system for personalized bulk emails via Gmail SMTP with scheduling, rate limiting, validation, retry handling, and delivery tracking.',
  seo_keywords = ARRAY['bulk email','email campaign','email automation','Python SMTP','Gmail SMTP','email marketing','bulk mailing','email scheduler','delivery tracking'],
  updated_at = now()
WHERE lower(name) = lower('Automated Bulk Email Campaign Manager') AND short_description ILIKE '%Python%';

-- ─────────────────────────────────────────────────────────────────────
-- 27. AI Research & Knowledge Workspace
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'ai-research-knowledge-workspace',
  seo_title = 'AI Research & Knowledge Workspace — RAG + LangGraph',
  seo_description = 'Production-grade full-stack AI research workspace with Streamlit UI, FastAPI backend, AI Orchestrator routing between RAG, LangGraph agents, JWT auth, and document management.',
  seo_keywords = ARRAY['AI research workspace','RAG','LangGraph','AI orchestrator','FastAPI','Streamlit','knowledge workspace','AI research tool','document management','full-stack AI'],
  updated_at = now()
WHERE lower(name) = lower('AI Research & Knowledge Workspace');

-- ─────────────────────────────────────────────────────────────────────
-- 28. Field & Form — E-Commerce Store with Stripe Payments
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'field-and-form-ecommerce-stripe',
  seo_title = 'Field & Form — E-Commerce Store with Stripe Payments',
  seo_description = 'Full-stack e-commerce platform with animated storefront, Flask REST API, JWT auth, shopping cart, Stripe Checkout, webhook order confirmation, and Celery email notifications.',
  seo_keywords = ARRAY['Field & Form','ecommerce store','Stripe payments','Flask ecommerce','online store','shopping cart','Stripe checkout','ecommerce platform','webhook payments'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Field & Form%');

-- ─────────────────────────────────────────────────────────────────────
-- 29. Pulse — Full-Stack Social Media Dashboard
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'pulse-social-media-dashboard',
  seo_title = 'Pulse — Full-Stack Social Media Dashboard App',
  seo_description = 'Full-stack social media dashboard with JWT auth, post creation, image uploads, likes, comments, nested replies, hashtag search, live feed, and admin content moderation.',
  seo_keywords = ARRAY['Pulse','social media dashboard','social platform','post feed','JWT auth','content moderation','social app','social media management','hashtag search'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Pulse — Full-Stack%') OR (lower(name) = lower('Pulse') AND short_description ILIKE '%social media%');

-- ─────────────────────────────────────────────────────────────────────
-- 30. LiveChat – Real-Time Collaboration Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'livechat-real-time-collaboration',
  seo_title = 'LiveChat — Real-Time Chat & Collaboration Platform',
  seo_description = 'Premium real-time chat platform with dynamic rooms, instant messaging, typing indicators, online presence, reactions, replies, pinned messages, and message search.',
  seo_keywords = ARRAY['LiveChat','real-time chat','chat platform','instant messaging','collaboration tool','chat rooms','typing indicators','team chat','live chat app'],
  updated_at = now()
WHERE lower(name) ILIKE lower('LiveChat%');

-- ─────────────────────────────────────────────────────────────────────
-- 31. TradeWeb
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'tradeweb-trading-platform',
  seo_title = 'TradeWeb — Online Trading & Booking Platform',
  seo_description = 'TradeWeb is a trading and services platform inspired by TradePro, offering booking management, job tracking, and client management for service businesses.',
  seo_keywords = ARRAY['TradeWeb','trading platform','booking system','service marketplace','trade management','online booking','job tracking platform'],
  updated_at = now()
WHERE lower(name) = lower('TradeWeb');

-- ─────────────────────────────────────────────────────────────────────
-- 32. Jampack - React 19 & Bootstrap 5
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'jampack-react-bootstrap-admin-dashboard',
  seo_title = 'Jampack — React 19 & Bootstrap 5 SaaS Admin Dashboard',
  seo_description = 'Jampack is a modern responsive React 19 & Bootstrap 5 SaaS admin dashboard with multiple layouts, analytics dashboards, e-commerce suite, task management, chat, and file manager.',
  seo_keywords = ARRAY['Jampack','React 19','Bootstrap 5','admin dashboard','SaaS template','React dashboard','analytics dashboard','ecommerce admin','task management','admin template'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Jampack%React 19%');

-- ─────────────────────────────────────────────────────────────────────
-- 33. MatPress
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'matpress-materialize-admin-dashboard',
  seo_title = 'MatPress — Materialize CSS Admin Dashboard Template',
  seo_description = 'MatPress is a responsive admin dashboard template built with HTML5, Materialize CSS, Sass, and JavaScript with UI widgets, charts, forms, dark mode, and pre-designed web apps.',
  seo_keywords = ARRAY['MatPress','Materialize CSS','admin dashboard','dashboard template','Material Design','HTML5 template','Sass dashboard','admin panel','UI widgets'],
  updated_at = now()
WHERE lower(name) ILIKE lower('MatPress%Materialize%');

-- ─────────────────────────────────────────────────────────────────────
-- 34. Chronicle — Flask Blogging Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'chronicle-flask-blogging-platform',
  seo_title = 'Chronicle — Flask Blogging Platform with Writer Dashboard',
  seo_description = 'Full-stack blogging platform built with Flask featuring user authentication, post CRUD, comments, marketing landing page, and writer dashboard with profile and settings.',
  seo_keywords = ARRAY['Chronicle','Flask blog','blogging platform','Flask blogging','writer dashboard','blog CMS','Python blog','Flask web app','blog platform'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Chronicle%Flask%');

-- ─────────────────────────────────────────────────────────────────────
-- 35. Restaurant Management System (DineFlow)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'dineflow-restaurant-management-system',
  seo_title = 'DineFlow — Restaurant Management System & POS',
  seo_description = 'DineFlow is a production restaurant management system with POS, orders, kitchen workflows, tables, reservations, inventory, customers, payments, employees, and analytics.',
  seo_keywords = ARRAY['DineFlow','restaurant management','restaurant POS','kitchen management','table reservations','restaurant software','food service POS','restaurant analytics','restaurant system'],
  updated_at = now()
WHERE lower(name) = lower('Restaurant Management System') AND short_description ILIKE '%DineFlow%';

-- ─────────────────────────────────────────────────────────────────────
-- 36. Online Examination System (ExamPro)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'exampro-online-examination-system',
  seo_title = 'ExamPro — Online Examination & Assessment Platform',
  seo_description = 'ExamPro is a full-stack online examination platform for admins, teachers, and students with timed assessments, question banks, automatic grading, results, and performance analytics.',
  seo_keywords = ARRAY['ExamPro','online examination','exam platform','question bank','automatic grading','online test','assessment system','exam software','e-learning assessment'],
  updated_at = now()
WHERE lower(name) = lower('Online Examination System');

-- ─────────────────────────────────────────────────────────────────────
-- 37. PulseChat – Real-Time Chat Application
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'pulsechat-real-time-chat-app',
  seo_title = 'PulseChat — Real-Time Chat Application with Rooms',
  seo_description = 'PulseChat is a modern real-time chat app for joining chat rooms, instant messaging, message history, online user presence, and live typing indicators.',
  seo_keywords = ARRAY['PulseChat','real-time chat','chat application','chat rooms','instant messaging','online presence','typing indicators','chat app','messaging app'],
  updated_at = now()
WHERE lower(name) ILIKE lower('PulseChat%');

-- ─────────────────────────────────────────────────────────────────────
-- 38. Food Delivery App (FoodRush)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'foodrush-food-delivery-app',
  seo_title = 'FoodRush — Full-Stack Food Delivery Platform',
  seo_description = 'FoodRush is a full-stack food delivery platform with restaurant discovery, meal customization, cart, payments, real-time delivery tracking, and dashboards for restaurants and drivers.',
  seo_keywords = ARRAY['FoodRush','food delivery','food delivery app','restaurant delivery','online food ordering','delivery tracking','food platform','food order app','delivery dashboard'],
  updated_at = now()
WHERE lower(name) = lower('Food Delivery App');

-- ─────────────────────────────────────────────────────────────────────
-- 39. Hotel Booking System (StaySphere)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'staysphere-hotel-booking-system',
  seo_title = 'StaySphere — Hotel Booking & Management System',
  seo_description = 'StaySphere is a full-stack hotel booking system for searching hotels, checking room availability, making reservations, managing bookings, reviews, and hotel analytics.',
  seo_keywords = ARRAY['StaySphere','hotel booking','hotel reservation','room booking','hotel management','hotel system','accommodation booking','hotel platform','travel booking'],
  updated_at = now()
WHERE lower(name) = lower('Hotel Booking System');

-- ─────────────────────────────────────────────────────────────────────
-- 40. CRM System (NexaCRM)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'nexacrm-customer-relationship-management',
  seo_title = 'NexaCRM — CRM System for Leads, Contacts & Sales Pipeline',
  seo_description = 'NexaCRM is a modern CRM platform for managing leads, contacts, companies, conversations, sales pipelines, tasks, and business activities through a professional SaaS dashboard.',
  seo_keywords = ARRAY['NexaCRM','CRM system','customer relationship management','lead management','sales pipeline','contact management','CRM software','SaaS CRM','business CRM'],
  updated_at = now()
WHERE lower(name) ILIKE lower('CRM System%');

-- ─────────────────────────────────────────────────────────────────────
-- 41. Amazon Clone (ShopSphere)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'shopsphere-amazon-clone-ecommerce',
  seo_title = 'ShopSphere — Amazon Clone E-Commerce Platform',
  seo_description = 'ShopSphere is a modern full-stack e-commerce platform with product discovery, search, filtering, shopping cart, wishlist, user accounts, orders, and a premium marketplace UI.',
  seo_keywords = ARRAY['Amazon clone','ShopSphere','ecommerce platform','online marketplace','shopping cart','product search','ecommerce app','online store','marketplace platform'],
  updated_at = now()
WHERE lower(name) = lower('Amazon Clone');

-- ─────────────────────────────────────────────────────────────────────
-- 42. AirBNB Clone (Stayora)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'stayora-airbnb-clone-vacation-rental',
  seo_title = 'Stayora — Airbnb Clone Vacation Rental Marketplace',
  seo_description = 'Stayora is a modern Airbnb-inspired vacation rental marketplace to discover stays, search and filter properties, explore listings on a map, and become a host.',
  seo_keywords = ARRAY['Airbnb clone','Stayora','vacation rental','rental marketplace','property booking','short-term rental','travel accommodation','rental platform','host platform'],
  updated_at = now()
WHERE lower(name) = lower('AirBNB Clone');

-- ─────────────────────────────────────────────────────────────────────
-- 43. Task Manager — Full-Stack API & Dashboard
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'task-manager-fullstack-api-dashboard',
  seo_title = 'Task Manager — Full-Stack API & Kanban Dashboard',
  seo_description = 'Production-ready full-stack task management platform with JWT auth, role-based access, Kanban dashboard, and admin panel built with FastAPI and Vanilla JS.',
  seo_keywords = ARRAY['task manager','Kanban dashboard','FastAPI','task management','project management','task API','team tasks','admin panel','productivity tool'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Task Manager — Full-Stack%');

-- ─────────────────────────────────────────────────────────────────────
-- 44. JamPack – React Bootstrap (second entry)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'jampack-react-bootstrap-saas-dashboard',
  seo_title = 'JamPack — React Bootstrap SaaS Admin Dashboard',
  seo_description = 'Modern responsive SaaS admin dashboard built with React.js and Bootstrap featuring multiple layouts, charts, calendar, tables, and reusable UI components optimized with Vite.',
  seo_keywords = ARRAY['JamPack','React dashboard','Bootstrap admin','SaaS dashboard','admin template','React Bootstrap','dashboard UI','Vite React','admin panel'],
  updated_at = now()
WHERE lower(name) ILIKE lower('JamPack%React Bootstrap%');

-- ─────────────────────────────────────────────────────────────────────
-- 45. TaskFlow – RESTful Task Manager API
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'taskflow-restful-task-manager-api',
  seo_title = 'TaskFlow — RESTful Task Manager API with JWT Auth',
  seo_description = 'Secure RESTful Task Manager API with JWT authentication, role-based access control, PostgreSQL, and a modern React dashboard for team task management.',
  seo_keywords = ARRAY['TaskFlow','task manager API','RESTful API','JWT auth','task management','PostgreSQL API','React dashboard','task API','team productivity'],
  updated_at = now()
WHERE lower(name) ILIKE lower('TaskFlow%RESTful%') AND short_description NOT ILIKE '%Website%';

-- ─────────────────────────────────────────────────────────────────────
-- 46. MailFlow
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'mailflow-bulk-email-campaign-manager',
  seo_title = 'MailFlow — Bulk Email Campaign Manager (Flask)',
  seo_description = 'MailFlow is a Flask-based bulk email campaign manager for importing contacts, creating templates, scheduling campaigns, managing subscriptions, and monitoring delivery.',
  seo_keywords = ARRAY['MailFlow','email campaign','bulk email','Flask email','email marketing','email automation','campaign manager','newsletter tool','email scheduler'],
  updated_at = now()
WHERE lower(name) ILIKE lower('MailFlow%');

-- ─────────────────────────────────────────────────────────────────────
-- 47. Estimate — House Price Predictor
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'estimate-house-price-predictor-ml',
  seo_title = 'Estimate — House Price Predictor using Random Forest ML',
  seo_description = 'Full-stack ML web app that predicts Pakistani property prices in PKR using Random Forest regression with interactive blueprint floorplans and model benchmark metrics.',
  seo_keywords = ARRAY['house price predictor','Estimate','property price ML','Random Forest','real estate prediction','Pakistan property','ML price prediction','property valuation','house price AI'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Estimate%House Price%');

-- ─────────────────────────────────────────────────────────────────────
-- 48. HousePrice AI
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'houseprice-ai-property-price-predictor',
  seo_title = 'HousePrice AI — AI Property Price Prediction App',
  seo_description = 'AI-powered house price prediction app that estimates property prices based on area, bedrooms, bathrooms, and location using a trained machine learning model.',
  seo_keywords = ARRAY['HousePrice AI','house price prediction','property price AI','real estate AI','ML property valuation','house value estimator','AI price predictor','property estimate'],
  updated_at = now()
WHERE lower(name) ILIKE lower('HousePrice AI%');

-- ─────────────────────────────────────────────────────────────────────
-- 49. Vault — Encrypted Password Manager (React/Flask)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'vault-encrypted-password-manager',
  seo_title = 'Vault — Zero-Knowledge Encrypted Password Manager',
  seo_description = 'Vault is a zero-knowledge password manager with Fernet encryption, PBKDF2HMAC key derivation, on-demand decryption, entropy password generator, and auto-logout.',
  seo_keywords = ARRAY['Vault','password manager','encrypted vault','Fernet encryption','zero-knowledge','password security','credential manager','PBKDF2HMAC','password generator'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Vault%Encrypted%') AND short_description ILIKE '%React%';

-- ─────────────────────────────────────────────────────────────────────
-- 50. VAULT — Encrypted Password Manager (Education)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'vault-password-manager-education',
  seo_title = 'VAULT — Encrypted Password Manager (Educational)',
  seo_description = 'A password manager where one master password guards every credential — each entry encrypted independently with Fernet, auto-locks after 5 minutes of inactivity.',
  seo_keywords = ARRAY['VAULT','password manager','Fernet encryption','master password','credential security','password vault','encryption education','auto-lock vault'],
  updated_at = now()
WHERE lower(name) ILIKE lower('VAULT%Encrypted%') AND short_description ILIKE '%master password%';

-- ─────────────────────────────────────────────────────────────────────
-- 51. AcademiaX
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'academiax-academic-institute-management',
  seo_title = 'AcademiaX — Next-Gen Academic & Institute Management System',
  seo_description = 'AcademiaX is a next-generation academic and institute management system for managing students, courses, faculty, enrollment, attendance, grades, and administrative operations.',
  seo_keywords = ARRAY['AcademiaX','academic management','institute management','school software','education ERP','student management','course management','academic system','education platform'],
  updated_at = now()
WHERE lower(name) ILIKE lower('%AcademiaX%');

-- ─────────────────────────────────────────────────────────────────────
-- 52. software_house_reservation
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'software-house-seat-reservation-app',
  seo_title = 'Software House Seat Reservation — Mobile App',
  seo_description = 'Mobile app for software house seat reservations — students register, get approval, reserve seats, and view reservations while admins manage seats, approvals, and daily reports.',
  seo_keywords = ARRAY['seat reservation','software house','mobile app','student booking','seat booking','reservation system','seat management','student reservation','seat allocation'],
  updated_at = now()
WHERE lower(name) = lower('software_house_reservation');

-- ─────────────────────────────────────────────────────────────────────
-- 53. Sales Data Analyzer | From Raw CSV to Business Insights
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'sales-data-analyzer-csv-insights',
  seo_title = 'Sales Data Analyzer — CSV to Business Insights (Python)',
  seo_description = 'Python-powered sales analytics app that cleans raw CSV data, analyzes sales trends, identifies top products, forecasts next-month sales, and generates PDF reports.',
  seo_keywords = ARRAY['sales data analyzer','CSV analytics','sales insights','Python sales','data cleaning','sales forecasting','PDF reports','business analytics','sales trends'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Sales Data Analyzer%CSV%');

-- ─────────────────────────────────────────────────────────────────────
-- 54. Verve Audio Co.
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'verve-audio-ecommerce-platform',
  seo_title = 'Verve Audio Co. — Full-Stack E-Commerce Audio Store',
  seo_description = 'Full-stack e-commerce web app for premium audio gear with Flask APIs, JWT auth, cart management, Stripe checkout, webhooks, and Celery async email confirmations.',
  seo_keywords = ARRAY['Verve Audio','audio ecommerce','audio store','Flask ecommerce','Stripe payments','premium audio','online audio shop','ecommerce platform','audio gear'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Verve Audio%');

-- ─────────────────────────────────────────────────────────────────────
-- 55. Transmit — Real-Time Chat Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'transmit-real-time-chat-platform',
  seo_title = 'Transmit — High-Performance Real-Time Chat Platform',
  seo_description = 'Transmit is a high-performance real-time broadcast chat app with dynamic channels, live user presence, WebSocket messaging, persistent chat history, and typing indicators.',
  seo_keywords = ARRAY['Transmit','real-time chat','WebSocket chat','broadcast chat','chat platform','instant messaging','live presence','chat channels','messaging platform'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Transmit%Real-Time%');

-- ─────────────────────────────────────────────────────────────────────
-- 56. Tally — AI-Powered Sales Data Analyzer Dashboard
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'tally-ai-sales-data-analyzer-dashboard',
  seo_title = 'Tally — AI-Powered Sales Analytics Dashboard',
  seo_description = 'Full-stack sales analytics dashboard that cleans CSV retail data and displays real-time KPIs, trend charts, product rankings, and ML revenue predictions with PDF export.',
  seo_keywords = ARRAY['Tally','sales analytics','data dashboard','CSV analytics','ML predictions','sales KPIs','business intelligence','revenue forecast','sales dashboard'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Tally%AI%');

-- ─────────────────────────────────────────────────────────────────────
-- 57. 1st Library Deployment
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'bmi-calculator-python-library',
  seo_title = 'BMI Calculator — Python Library with Automated Testing',
  seo_description = 'A simple Python library for calculating BMI with input validation and automated testing, demonstrating clean package development practices.',
  seo_keywords = ARRAY['BMI calculator','Python library','health calculator','Python package','automated testing','BMI calculation','Python BMI','health tool'],
  updated_at = now()
WHERE lower(name) = lower('1st Library Deployment');

-- ─────────────────────────────────────────────────────────────────────
-- 58. Inventory Management System
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'inventory-management-system-pharmacy',
  seo_title = 'Inventory Management System — Pharmacy & Retail',
  seo_description = 'Complete inventory management system for pharmacy, medicines, and retail goods — track stock, manage suppliers, monitor expiry dates, and generate inventory reports.',
  seo_keywords = ARRAY['inventory management','pharmacy inventory','stock management','inventory system','medicine inventory','retail inventory','stock tracking','inventory software','pharmacy software'],
  updated_at = now()
WHERE lower(name) = lower('Inventory Management System');

-- ─────────────────────────────────────────────────────────────────────
-- 59. prep hotel (StayEase)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'stayease-hotel-booking-platform',
  seo_title = 'StayEase — Hotel Management & Booking Platform',
  seo_description = 'StayEase is a hotel management and booking platform where owners manage hotels, rooms, bookings, and revenue, admins approve hotels, and customers search and book stays.',
  seo_keywords = ARRAY['StayEase','hotel booking','hotel management','hotel platform','room booking','hotel reservation','hospitality software','hotel system','booking platform'],
  updated_at = now()
WHERE lower(name) = lower('prep hotel');

-- ─────────────────────────────────────────────────────────────────────
-- 60. Automated Bulk Email Campaign Manager (GUI/Education)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'bulk-email-campaign-manager-gui',
  seo_title = 'Bulk Email Campaign Manager — GUI Email Automation Tool',
  seo_description = 'GUI-based bulk email campaign manager for importing CSV contacts, sending personalized HTML emails, scheduling campaigns, rate limiting, and tracking sent/failed emails.',
  seo_keywords = ARRAY['bulk email','email campaign','GUI email tool','email automation','HTML email','email scheduler','campaign manager','email marketing tool','CSV contacts'],
  updated_at = now()
WHERE lower(name) = lower('Automated Bulk Email Campaign Manager') AND short_description ILIKE '%GUI%';

-- ════════════════════════════════════════════════════════════════════
-- PRODUCTS 61-120 CONTINUE IN NEXT FILE
-- ════════════════════════════════════════════════════════════════════
