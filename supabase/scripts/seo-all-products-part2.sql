-- ════════════════════════════════════════════════════════════════════
-- SEO UPDATE SCRIPT — All Products (Part 2: Products 61-120)
-- Sets slug, seo_title, seo_description, seo_keywords
-- Match is done by product NAME (case-insensitive)
-- Run this in Supabase SQL Editor after Part 1
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 61. InkWell-Flask-Blog Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'inkwell-flask-blog-platform',
  seo_title = 'InkWell — Flask Blogging Platform with PostgreSQL',
  seo_description = 'InkWell is a modern full-stack blogging platform built with Flask, PostgreSQL, and SQLAlchemy featuring auth, blog CRUD, comments, profile management, and image uploads.',
  seo_keywords = ARRAY['InkWell','Flask blog','blogging platform','Python blog','PostgreSQL blog','blog CMS','Flask web app','blog platform','SQLAlchemy'],
  updated_at = now()
WHERE lower(name) ILIKE lower('InkWell%');

-- ─────────────────────────────────────────────────────────────────────
-- 62. Dispatch — Bulk Email Campaign Manager & Automation Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'dispatch-bulk-email-automation-platform',
  seo_title = 'Dispatch — Bulk Email Campaign & Automation Platform',
  seo_description = 'Full-stack bulk email campaign manager built with Flask and React. Features CSV parsing, dynamic token personalization, APScheduler background delivery, rate limiting, and real-time tracking.',
  seo_keywords = ARRAY['Dispatch','email automation','bulk email','email campaign','Flask React','APScheduler','email marketing','campaign tracking','personalized emails'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Dispatch%Bulk Email%');

-- ─────────────────────────────────────────────────────────────────────
-- 63. Hotel Management System (Google Stitch)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'hotel-management-system-google-stitch',
  seo_title = 'Hotel Management System — Google Stitch Frontend',
  seo_description = 'Hotel management system built with Google Stitch frontend for managing hotel operations, bookings, guests, rooms, and hospitality services.',
  seo_keywords = ARRAY['hotel management','Google Stitch','hotel system','hospitality management','hotel booking','room management','hotel software','hospitality platform'],
  updated_at = now()
WHERE lower(name) = lower('Hotel Management System') AND short_description ILIKE '%Google%';

-- ─────────────────────────────────────────────────────────────────────
-- 64. Eatsy – Local Restaurant & Cafe Digital Twin
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'eatsy-restaurant-cafe-digital-twin',
  seo_title = 'Eatsy — Restaurant QR Ordering & Kitchen Display System',
  seo_description = 'Eatsy is a full-stack restaurant ordering system for UK high-street restaurants with QR table ordering, Kitchen Display System, stock control, loyalty rewards, and Gemini AI marketing.',
  seo_keywords = ARRAY['Eatsy','restaurant ordering','QR ordering','Kitchen Display System','KDS','restaurant digital twin','stock control','loyalty rewards','Gemini AI','UK restaurant'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Eatsy%');

-- ─────────────────────────────────────────────────────────────────────
-- 65. Hotel Booking Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'hotel-booking-platform-fullstack',
  seo_title = 'Hotel Booking Platform — Full-Stack Hospitality Solution',
  seo_description = 'Professional full-stack hotel booking platform for customers to discover and book hotels, owners to manage properties, and admins to oversee operations and analytics.',
  seo_keywords = ARRAY['hotel booking','booking platform','hotel reservation','hospitality platform','hotel software','property booking','hotel management','travel booking','accommodation'],
  updated_at = now()
WHERE lower(name) = lower('Hotel Booking Platform');

-- ─────────────────────────────────────────────────────────────────────
-- 66. TaskFlow RESTful Task Manager API (Website variant)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'taskflow-task-manager-api-website',
  seo_title = 'TaskFlow RESTful API — Secure Task Management Backend',
  seo_description = 'TaskFlow RESTful API is a secure task-management API built with Flask, PostgreSQL, and JWT Authentication for task CRUD, dashboards, analytics, and user management.',
  seo_keywords = ARRAY['TaskFlow','task manager API','RESTful API','Flask API','PostgreSQL','JWT auth','task management','API backend','task CRUD'],
  updated_at = now()
WHERE lower(name) ILIKE lower('TaskFlow%RESTful%') AND short_description ILIKE '%Website%';

-- ─────────────────────────────────────────────────────────────────────
-- 67. Software House Seat
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'software-house-seat-booking',
  seo_title = 'Software House Seat — Seat Booking App',
  seo_description = 'Simple seat booking app for software house seats — allows students and visitors to reserve available seats in a shared workspace environment.',
  seo_keywords = ARRAY['seat booking','software house','workspace booking','seat reservation','shared workspace','coworking seat','seat management','booking app'],
  updated_at = now()
WHERE lower(name) = lower('Software House Seat');

-- ─────────────────────────────────────────────────────────────────────
-- 68. Sales-Data Analyzer (CLI)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'sales-data-analyzer-cli-python',
  seo_title = 'Sales-Data Analyzer — Python CLI with PDF Reports',
  seo_description = 'Python CLI tool that cleans messy 5-year retail sales data, analyzes trends, forecasts future sales, and generates professional PDF reports with charts and predictions.',
  seo_keywords = ARRAY['sales analyzer','Python CLI','sales data','retail analytics','PDF reports','sales forecasting','data cleaning','CLI tool','retail sales'],
  updated_at = now()
WHERE lower(name) = lower('Sales-Data Analyzer');

-- ─────────────────────────────────────────────────────────────────────
-- 69. Flutter Admin Panal
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'flutter-admin-panel-dashboard',
  seo_title = 'Flutter Admin Panel — Mobile Dashboard UI',
  seo_description = 'Flutter-based admin panel dashboard for managing app data, users, and operations from a mobile-first cross-platform interface.',
  seo_keywords = ARRAY['Flutter admin','admin panel','Flutter dashboard','mobile admin','cross-platform admin','Flutter UI','admin app','mobile dashboard'],
  updated_at = now()
WHERE lower(name) = lower('Flutter Admin Panal');

-- ─────────────────────────────────────────────────────────────────────
-- 70. MedConnect – Clinic & Dental Patient Management System
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'medconnect-clinic-dental-patient-management',
  seo_title = 'MedConnect — Clinic & Dental Patient Management System (UK)',
  seo_description = 'MedConnect is a full-stack clinic management system for UK GP, dental, and physiotherapy practices with patient records, appointments, digital intake forms, and prescriptions.',
  seo_keywords = ARRAY['MedConnect','clinic management','dental software','patient management','GP practice','healthcare software','UK clinic','medical records','appointment scheduling','physiotherapy'],
  updated_at = now()
WHERE lower(name) ILIKE lower('MedConnect%');

-- ─────────────────────────────────────────────────────────────────────
-- 71. PropLens – Real Estate Agent CRM & Property Portal
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'proplens-real-estate-crm-property-portal',
  seo_title = 'PropLens — Real Estate CRM & Property Portal (UK)',
  seo_description = 'PropLens is a full-stack CRM and property portal for UK estate agents with AI buyer matching, 360° virtual tours, multi-portal syndication, landlord reporting, and offer tracking.',
  seo_keywords = ARRAY['PropLens','real estate CRM','property portal','UK estate agent','AI buyer matching','virtual tours','property syndication','Rightmove','Zoopla','letting agent CRM'],
  updated_at = now()
WHERE lower(name) ILIKE lower('PropLens%');

-- ─────────────────────────────────────────────────────────────────────
-- 72. 6amMart - Multi-Vendor E-Commerce Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = '6ammart-multi-vendor-ecommerce',
  seo_title = '6amMart — Multi-Vendor E-Commerce & Grocery Platform',
  seo_description = 'Full-featured multi-vendor e-commerce and grocery mart built with Next.js featuring real-time Google Maps tracking, dynamic storefronts, multi-language/RTL support, and vendor management.',
  seo_keywords = ARRAY['6amMart','multi-vendor','ecommerce platform','grocery delivery','Next.js ecommerce','Google Maps tracking','multi-language','vendor management','online marketplace'],
  updated_at = now()
WHERE lower(name) ILIKE lower('6amMart%');

-- ─────────────────────────────────────────────────────────────────────
-- 73. Matpress DashBord in React
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'matpress-react-admin-dashboard',
  seo_title = 'MatPress React Dashboard — Material Design Admin Panel',
  seo_description = 'Feature-rich Material Design admin dashboard template with 170+ HTML pages, multiple layouts, charts, forms, and UI components built with Materialize CSS and React.',
  seo_keywords = ARRAY['MatPress','React dashboard','Material Design','admin dashboard','Materialize CSS','admin panel','dashboard template','React admin','UI components'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Matpress%React%');

-- ─────────────────────────────────────────────────────────────────────
-- 74. Sales Data Analyzer using Python
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'sales-data-analyzer-python-reports',
  seo_title = 'Sales Data Analyzer — Python with Charts & PDF Reports',
  seo_description = 'Professional Python sales analyzer that cleans retail data, generates reports, visualizes trends, identifies top products, predicts sales with Linear Regression, and exports PDFs.',
  seo_keywords = ARRAY['sales analyzer','Python sales','retail analytics','data visualization','Linear Regression','sales prediction','PDF reports','sales trends','business intelligence'],
  updated_at = now()
WHERE lower(name) = lower('Sales Data Analyzer using Python');

-- ─────────────────────────────────────────────────────────────────────
-- 75. Netflix Clone (StreamFlix)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'streamflix-netflix-clone-streaming',
  seo_title = 'StreamFlix — Netflix Clone Streaming Platform',
  seo_description = 'StreamFlix is a modern full-stack streaming platform built with React, TypeScript, Tailwind, and Supabase for browsing movies, managing profiles, watchlists, and personalized streaming.',
  seo_keywords = ARRAY['Netflix clone','StreamFlix','streaming platform','movie streaming','React streaming','watch movies','TV shows','watchlist','Supabase streaming','video platform'],
  updated_at = now()
WHERE lower(name) = lower('Netflix Clone');

-- ─────────────────────────────────────────────────────────────────────
-- 76. Hospital Management System (MediCore)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'medicore-hospital-management-system',
  seo_title = 'MediCore — Hospital Management System & Healthcare Platform',
  seo_description = 'MediCore is a full-stack healthcare platform for managing patients, doctors, appointments, medical records, pharmacy, lab tests, admissions, billing, and staff with role-based dashboards.',
  seo_keywords = ARRAY['MediCore','hospital management','healthcare platform','hospital software','medical records','patient management','doctor scheduling','pharmacy management','hospital ERP','healthcare IT'],
  updated_at = now()
WHERE lower(name) = lower('Hospital Management System');

-- ─────────────────────────────────────────────────────────────────────
-- 77. TradePro-360 (Emergency home services)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'tradepro360-emergency-home-services',
  seo_title = 'TradePro 360 — Emergency Home Services Platform',
  seo_description = 'TradePro 360 is a full-stack emergency home services platform connecting customers with plumbers, electricians, and emergency repair professionals.',
  seo_keywords = ARRAY['TradePro 360','emergency services','home services','plumber booking','electrician services','repair platform','emergency repair','home maintenance','service marketplace'],
  updated_at = now()
WHERE lower(name) ILIKE lower('TradePro-360%') OR (lower(name) = lower('TradePro-360') AND short_description ILIKE '%emergency%');

-- ─────────────────────────────────────────────────────────────────────
-- 78. CUI Chat
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'cui-chat-university-social-platform',
  seo_title = 'CUI Chat — University Social Media Platform (COMSATS)',
  seo_description = 'CUI Chat is a secure university social media platform for COMSATS University built with Laravel and PHP for student networking, posts, communication, and profile management.',
  seo_keywords = ARRAY['CUI Chat','university social platform','COMSATS','Laravel PHP','student networking','university app','campus social','student community','PHP social platform'],
  updated_at = now()
WHERE lower(name) = lower('CUI Chat');

-- ─────────────────────────────────────────────────────────────────────
-- 79. Hajj Umrah Website
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'hajj-umrah-travel-website',
  seo_title = 'Hajj & Umrah Travel Website — Pilgrimage Packages & Info',
  seo_description = 'Modern responsive travel website for Hajj and Umrah pilgrimage packages, services, destinations, and contact details with smooth navigation and mobile-friendly experience.',
  seo_keywords = ARRAY['Hajj Umrah','pilgrimage travel','Hajj packages','Umrah packages','travel website','Islamic travel','pilgrimage website','Hajj services','Umrah booking'],
  updated_at = now()
WHERE lower(name) = lower('Hajj Umrah Website');

-- ─────────────────────────────────────────────────────────────────────
-- 80. Photo Editor (Remove background)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'photo-editor-background-remover',
  seo_title = 'Photo Editor — Image Background Removal Tool',
  seo_description = 'Photo editing tool that removes extra objects and backgrounds from pictures with a clean, intuitive interface for quick image editing.',
  seo_keywords = ARRAY['photo editor','background remover','image editor','remove background','photo editing','image cleanup','object removal','photo tool','image processing'],
  updated_at = now()
WHERE lower(name) = lower('Photo Editor') AND short_description ILIKE '%Remove%';

-- ─────────────────────────────────────────────────────────────────────
-- 81. Photo Editor (App variant)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'photo-editing-app',
  seo_title = 'Photo Editing App — Image Editor Application',
  seo_description = 'Photo editing application for enhancing and modifying images with filters, adjustments, and editing tools.',
  seo_keywords = ARRAY['photo editor','photo editing','image editor','photo app','editing tool','photo filters','image enhancement','photo manipulation'],
  updated_at = now()
WHERE lower(name) = lower('Photo Editor') AND short_description NOT ILIKE '%Remove%';

-- ─────────────────────────────────────────────────────────────────────
-- 82. factory_flow
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'factoryflow-factory-management-app',
  seo_title = 'FactoryFlow — Factory Management & Production Dashboard',
  seo_description = 'FactoryFlow is a professional factory management app for monitoring production, employees, inventory, and workflow through a modern dashboard.',
  seo_keywords = ARRAY['FactoryFlow','factory management','production monitoring','manufacturing software','factory dashboard','inventory management','employee tracking','workflow management','factory software'],
  updated_at = now()
WHERE lower(name) = lower('factory_flow');

-- ─────────────────────────────────────────────────────────────────────
-- 83. DevBlog Platform – Flask Blogging Website
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'devblog-flask-blogging-platform',
  seo_title = 'DevBlog — Flask Blogging Platform with Bootstrap',
  seo_description = 'Modern full-stack blogging platform built with Flask where users register, create, edit, and delete posts, upload profile pictures, and interact through comments with SQLite.',
  seo_keywords = ARRAY['DevBlog','Flask blog','blogging platform','Python blog','Bootstrap blog','SQLite blog','blog CMS','developer blog','Flask web app'],
  updated_at = now()
WHERE lower(name) ILIKE lower('DevBlog%');

-- ─────────────────────────────────────────────────────────────────────
-- 84. RESTful Task Manager API (Education)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'restful-task-manager-api-flask',
  seo_title = 'RESTful Task Manager API — Flask + PostgreSQL + JWT',
  seo_description = 'Secure RESTful Task Manager API built with Flask with JWT auth, role-based authorization, task CRUD, filtering, pagination, rate limiting, API docs, and PostgreSQL.',
  seo_keywords = ARRAY['task manager API','RESTful API','Flask API','JWT auth','PostgreSQL','rate limiting','API documentation','task CRUD','Flask REST API'],
  updated_at = now()
WHERE lower(name) ILIKE lower('RESTful Task Manager API%') AND short_description NOT ILIKE '%TaskFlow%';

-- ─────────────────────────────────────────────────────────────────────
-- 85. Hajj Umrah Tours — Luxury Pilgrimage Travel Website
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'hajj-umrah-tours-luxury-travel',
  seo_title = 'Hajj Umrah Tours — Luxury Pilgrimage Travel Agency Website',
  seo_description = 'Luxury multi-page travel agency website for Hajj & Umrah pilgrimage built with Next.js, TypeScript, and Tailwind CSS with package comparisons, journey timeline, and inquiry form.',
  seo_keywords = ARRAY['Hajj Umrah tours','luxury pilgrimage','travel agency','Next.js travel','pilgrimage packages','Hajj tours','Umrah tours','Islamic travel','luxury Hajj','Tailwind CSS'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Hajj Umrah Tours%');

-- ─────────────────────────────────────────────────────────────────────
-- 86. BanoQabil
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'banoqabil-mern-stack-project',
  seo_title = 'BanoQabil — MERN Stack Web Application',
  seo_description = 'BanoQabil is a MERN stack (MongoDB, Express, React, Node.js) web application project showcasing full-stack JavaScript development.',
  seo_keywords = ARRAY['BanoQabil','MERN stack','MongoDB','Express','React','Node.js','full-stack JavaScript','web application','MERN project'],
  updated_at = now()
WHERE lower(name) = lower('BanoQabil') AND badge = 'new';

-- ─────────────────────────────────────────────────────────────────────
-- 87. Client-hunting-site
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'ai-client-hunting-web-crawler',
  seo_title = 'AI Client Hunter — Web Crawler for Lead Generation',
  seo_description = 'AI-powered web crawler that finds businesses matching your criteria, scans thousands of sources in minutes to deliver high-quality leads for your sales pipeline.',
  seo_keywords = ARRAY['client hunting','AI web crawler','lead generation','business leads','sales pipeline','AI lead finder','B2B leads','client finder','lead scraper','sales automation'],
  updated_at = now()
WHERE lower(name) = lower('Client-hunting-site');

-- ─────────────────────────────────────────────────────────────────────
-- 88. Carfever
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'carfever-uk-automotive-marketplace',
  seo_title = 'CarFever — UK Automotive Marketplace for Car Buyers',
  seo_description = 'CarFever is the UK premier automotive marketplace connecting buyers and certified dealers with verified listings, 200+ point vehicle inspections, and pricing transparency.',
  seo_keywords = ARRAY['CarFever','car marketplace','UK cars','automotive marketplace','car buying','certified dealers','vehicle inspection','car listings','used cars UK','car dealer'],
  updated_at = now()
WHERE lower(name) = lower('Carfever') AND badge = 'new';

-- ─────────────────────────────────────────────────────────────────────
-- 89. CabGrab
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'cabgrab-ride-hailing-mobility-platform',
  seo_title = 'CabGrab — Smart Urban Mobility & Ride-Hailing Platform',
  seo_description = 'Comprehensive ride-hailing and delivery ecosystem with real-time tracking, driver apps, fleet analytics, and dynamic surge pricing built for scale.',
  seo_keywords = ARRAY['CabGrab','ride hailing','ride booking','taxi app','urban mobility','delivery platform','fleet management','surge pricing','driver app','ride-sharing'],
  updated_at = now()
WHERE lower(name) ILIKE lower('CabGrab%') AND badge = 'new';

-- ─────────────────────────────────────────────────────────────────────
-- 90. Movie Search Platform (CineVault)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'cinevault-movie-search-platform',
  seo_title = 'CineVault — Movie Discovery & Search Platform',
  seo_description = 'CineVault is a modern full-stack movie discovery platform with trending movies, favorites, watchlists, reviews, AI-powered recommendations, auth, and dark/light themes.',
  seo_keywords = ARRAY['CineVault','movie search','movie platform','film discovery','movie recommendations','AI movies','watchlist','movie reviews','React movies','IMDb style'],
  updated_at = now()
WHERE lower(name) = lower('Movie Search Platform');

-- ─────────────────────────────────────────────────────────────────────
-- 91. Prompt Forge
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'prompt-forge-ai-prompt-library',
  seo_title = 'Prompt Forge — Curated AI Prompt Library with Variables',
  seo_description = 'Curated library of battle-tested AI prompts with a powerful variable engine for customizing, copying, and deploying prompts in seconds.',
  seo_keywords = ARRAY['Prompt Forge','AI prompts','prompt library','prompt engineering','AI prompt tool','battle-tested prompts','prompt variables','prompt customization','copy prompts'],
  updated_at = now()
WHERE lower(name) = lower('Prompt Forge');

-- ─────────────────────────────────────────────────────────────────────
-- 92. Patente Master
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'patente-master-admin-dashboard',
  seo_title = 'Patente Master — Italian Driving Exam Admin Dashboard',
  seo_description = 'Admin dashboard for Patente Master, an Italian driving-exam learning app, built with React and Supabase for user activity, learning performance, content, and revenue tracking.',
  seo_keywords = ARRAY['Patente Master','admin dashboard','Italian driving exam','React Supabase','learning app admin','driving license','exam preparation','admin panel','education dashboard'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Patente Master%');

-- ─────────────────────────────────────────────────────────────────────
-- 93. Customer Management System
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'customer-management-system-retail',
  seo_title = 'Customer Management System — Retail CRM Platform',
  seo_description = 'Website for retail professionals to manage customers, track interactions, organize contacts, and streamline customer relationship management.',
  seo_keywords = ARRAY['customer management','CRM','retail CRM','customer system','contact management','retail software','customer tracking','business CRM','retail management'],
  updated_at = now()
WHERE lower(name) = lower('Customer Management System');

-- ─────────────────────────────────────────────────────────────────────
-- 94. Alarm Desktop Application
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'alarm-desktop-task-reminder',
  seo_title = 'Alarm Desktop App — Task Reminder & Alarm Software',
  seo_description = 'Task reminder alarm desktop application for setting alarms, managing reminders, and staying on schedule with notifications and alerts.',
  seo_keywords = ARRAY['alarm app','desktop alarm','task reminder','reminder software','alarm clock','desktop notification','task alarm','productivity tool','reminder app'],
  updated_at = now()
WHERE lower(name) = lower('Alarm Desktop Application');

-- ─────────────────────────────────────────────────────────────────────
-- 95. movie_explorer (Flutter)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'movie-explorer-flutter-ticket-booking',
  seo_title = 'Movie Explorer — Flutter Movie Discovery & Ticket Booking',
  seo_description = 'Flutter-based movie discovery and ticket booking app to explore movies, view details, add favorites, book tickets, manage bookings, and update profiles.',
  seo_keywords = ARRAY['movie explorer','Flutter app','movie booking','ticket booking','mobile movie app','Flutter movies','cinema app','movie tickets','mobile app'],
  updated_at = now()
WHERE lower(name) = lower('movie_explorer');

-- ─────────────────────────────────────────────────────────────────────
-- 96. Tic tac teo game
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'tic-tac-toe-game-ai',
  seo_title = 'Tic Tac Toe — Classic Game with AI Bots & Themes',
  seo_description = 'Ultimate Tic Tac Toe game with stunning dark/light themes, smooth animations, customizable player names, and challenging AI bots across 3 difficulty levels.',
  seo_keywords = ARRAY['Tic Tac Toe','board game','AI game','game app','classic game','strategy game','AI bots','mini game','2 player game'],
  updated_at = now()
WHERE lower(name) = lower('Tic tac teo game');

-- ─────────────────────────────────────────────────────────────────────
-- 97. Bano Qabil Platform (Premium)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'bano-qabil-learning-management-system',
  seo_title = 'Bano Qabil — Learning Management System (LMS)',
  seo_description = 'Bano Qabil LMS is a full-stack academic management platform for students, teachers, courses, batches, assignments, attendance, and admin operations through secure dashboards.',
  seo_keywords = ARRAY['Bano Qabil','LMS','learning management system','education platform','academic management','student management','course management','education software','LMS platform','e-learning'],
  updated_at = now()
WHERE lower(name) = lower('Bano Qabil Platform') AND badge = 'premium';

-- ─────────────────────────────────────────────────────────────────────
-- 98. Video Editor Portfolio (single user)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'video-editor-portfolio-single-user',
  seo_title = 'Video Editor Portfolio — Personal Portfolio Website',
  seo_description = 'Custom video editor portfolio website built for a single user to showcase video editing work, projects, and services.',
  seo_keywords = ARRAY['video editor portfolio','portfolio website','video portfolio','editor showcase','personal portfolio','video editing','creative portfolio','portfolio site'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Video Editor Portfolio%single%');

-- ─────────────────────────────────────────────────────────────────────
-- 99. Video Editor Portfolio (platform)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'video-editor-portfolio-platform',
  seo_title = 'Video Editor Portfolio — CMS Platform with Supabase',
  seo_description = 'Modern responsive video editor portfolio platform with public portfolio, secure auth, admin dashboard, video management, skills, contact messages, and CMS powered by Supabase.',
  seo_keywords = ARRAY['video editor portfolio','portfolio platform','video CMS','Supabase portfolio','admin dashboard','video management','creative portfolio','portfolio website','video showcase'],
  updated_at = now()
WHERE lower(name) = lower('Video Editor Portfolio') AND badge = 'premium';

-- ─────────────────────────────────────────────────────────────────────
-- 100. CarFever SERN Website
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'carfever-sern-car-selling-website',
  seo_title = 'CarFever SERN — Car Selling Digital Platform',
  seo_description = 'CarFever is a SERN-based website for selling cars on a digital platform at reasonable prices with a modern, responsive interface.',
  seo_keywords = ARRAY['CarFever','SERN','car selling','car marketplace','React Node','PostgreSQL cars','digital car platform','auto sales','car website'],
  updated_at = now()
WHERE lower(name) = lower('CarFever SERN Website');

-- ─────────────────────────────────────────────────────────────────────
-- 101. WeConnect CabGrab Ride Booking Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'weconnect-cabgrab-ride-booking',
  seo_title = 'WeConnect CabGrab — Ride Booking Platform Solution',
  seo_description = 'WeConnect CabGrab is a modern taxi booking solution for booking rides via web or mobile, with driver management, trip tracking, and payment processing.',
  seo_keywords = ARRAY['WeConnect CabGrab','ride booking','taxi platform','ride-hailing solution','driver management','trip management','payment processing','transport app','ride app'],
  updated_at = now()
WHERE lower(name) ILIKE lower('WeConnect CabGrab%');

-- ─────────────────────────────────────────────────────────────────────
-- 102. WeConnect WhatsWay
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'weconnect-whatsway-whatsapp-marketing',
  seo_title = 'WeConnect WhatsWay — WhatsApp Marketing Automation SaaS',
  seo_description = 'WhatsWay is a WhatsApp marketing automation SaaS for sending bulk messages, automating chats with bots, and managing customer communication efficiently.',
  seo_keywords = ARRAY['WhatsWay','WhatsApp marketing','bulk WhatsApp','WhatsApp automation','chat bots','WhatsApp SaaS','customer communication','marketing automation','WhatsApp business'],
  updated_at = now()
WHERE lower(name) ILIKE lower('WeConnect WhatsWay%');

-- ─────────────────────────────────────────────────────────────────────
-- 103. Best Restaurant Management Software (Bhojon)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'bhojon-restaurant-management-software',
  seo_title = 'Bhojon — Best Restaurant Management Software with POS',
  seo_description = 'Bhojon is an all-in-one restaurant management software with POS system and online ordering for billing, inventory, customer orders, and workflow automation.',
  seo_keywords = ARRAY['Bhojon','restaurant software','restaurant POS','online ordering','restaurant billing','inventory management','restaurant management','food business software','POS system'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Best Restaurant Management%');

-- ─────────────────────────────────────────────────────────────────────
-- 104. Transportation Managment System Dubai
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'transportation-management-system-dubai',
  seo_title = 'Transportation Management System — Dubai Logistics Portal',
  seo_description = 'Comprehensive portal for managing logistics and transport operations efficiently — track vehicles, manage routes, monitor deliveries, and streamline fleet operations.',
  seo_keywords = ARRAY['transportation management','logistics portal','Dubai transport','fleet management','logistics software','transport system','delivery tracking','fleet operations','TMS'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Transportation%Dubai%');

-- ─────────────────────────────────────────────────────────────────────
-- 105. CarFever Marketplace (Premium)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'carfever-marketplace-uk-cars',
  seo_title = 'CarFever Marketplace — UK Automotive Community Platform',
  seo_description = 'Modern UK-based automotive marketplace and community for buying, selling, and showcasing high-performance cars, modification projects, and car events.',
  seo_keywords = ARRAY['CarFever Marketplace','UK car market','car community','performance cars','car modification','car events','automotive community','buy sell cars','UK automotive'],
  updated_at = now()
WHERE lower(name) ILIKE lower('CarFever Marketplace%');

-- ─────────────────────────────────────────────────────────────────────
-- 106. LeadHunter Pro
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'leadhunter-pro-lead-management',
  seo_title = 'LeadHunter Pro — Lead Hunting & Client Management Platform',
  seo_description = 'Modern lead hunting and client management platform for assigning sales tasks, managing leads, tracking team performance, and streamlining client acquisition.',
  seo_keywords = ARRAY['LeadHunter Pro','lead management','sales tasks','client acquisition','lead tracking','sales pipeline','CRM platform','team performance','B2B sales','lead generation'],
  updated_at = now()
WHERE lower(name) ILIKE lower('LeadHunter Pro%');

-- ─────────────────────────────────────────────────────────────────────
-- 107. Cafeteria Management System
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'cafeteria-management-system',
  seo_title = 'Cafeteria Management System — Food Ordering Platform',
  seo_description = 'Modern cafeteria management platform streamlining food ordering, cafeteria operations, payment management, and real-time order tracking for students, staff, and admins.',
  seo_keywords = ARRAY['cafeteria management','food ordering','cafeteria software','canteen management','order tracking','payment management','cafeteria system','food service','canteen app'],
  updated_at = now()
WHERE lower(name) = lower('Cafeteria Management System');

-- ─────────────────────────────────────────────────────────────────────
-- 108. Committee-Management System
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'committee-management-system',
  seo_title = 'Committee Management System — Transparent Committee Platform',
  seo_description = 'Modern committee management platform for secure committee creation, member management, trust verification, shared slots, transparent payments, and real-time activity tracking.',
  seo_keywords = ARRAY['committee management','committee system','member management','payment tracking','trust verification','committee software','rotating savings','committee platform','transparent payments'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Committee-Management%');

-- ─────────────────────────────────────────────────────────────────────
-- 109. Internship Hub
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'internship-hub-industry-liaison-cell',
  seo_title = 'Internship Hub — Industry Liaison Cell Management System',
  seo_description = 'Internship Hub is a comprehensive ILC platform connecting students with internships, streamlining applications, and managing companies, internships, notices, and placements.',
  seo_keywords = ARRAY['Internship Hub','ILC','industry liaison','internship platform','student internships','university placements','internship management','career portal','student placement'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Internship Hub%');

-- ─────────────────────────────────────────────────────────────────────
-- 110. CUIResolve
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'cuiresolve-university-complaint-management',
  seo_title = 'CUIResolve — University Complaint Management System',
  seo_description = 'CUIResolve is a university complaint management system for students to submit complaints, track progress, and receive resolutions with an admin dashboard for issue management.',
  seo_keywords = ARRAY['CUIResolve','complaint management','university complaints','grievance system','student complaints','issue tracking','complaint resolution','university system','grievance portal'],
  updated_at = now()
WHERE lower(name) ILIKE lower('CUIResolve%');

-- ─────────────────────────────────────────────────────────────────────
-- 111. Doctor Hub
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'doctor-hub-healthcare-management',
  seo_title = 'Doctor Hub — Smart Healthcare Management Platform',
  seo_description = 'Doctor Hub is a healthcare management platform connecting patients with doctors, clinics, and assistants for appointment booking, medical records, prescriptions, and communication.',
  seo_keywords = ARRAY['Doctor Hub','healthcare platform','doctor appointment','medical records','telemedicine','patient management','healthcare software','online doctor','prescription management','clinic management'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Doctor Hub%');

-- ─────────────────────────────────────────────────────────────────────
-- 112. We Connect Vehari
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'we-connect-vehari-community-platform',
  seo_title = 'We Connect Vehari — Local News, Events & Community Hub',
  seo_description = 'We Connect Vehari is a local community hub for news, events, educational resources, and community updates, empowering the Vehari community with valuable information.',
  seo_keywords = ARRAY['We Connect Vehari','Vehari community','local news','community platform','Vehari news','local events','community hub','Pakistan community','Vehari city'],
  updated_at = now()
WHERE lower(name) ILIKE lower('We Connect Vehari%');

-- ─────────────────────────────────────────────────────────────────────
-- 113. XStore E-Commerce Platform
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'xstore-ecommerce-woocommerce-theme',
  seo_title = 'XStore — WooCommerce E-Commerce Theme & Online Store',
  seo_description = 'High-performance multi-purpose WooCommerce theme with 110+ demos, unlimited headers/footers, and seamless integrations for scalable e-commerce growth up to $500K+.',
  seo_keywords = ARRAY['XStore','WooCommerce theme','ecommerce theme','WordPress store','online store','WooCommerce','ecommerce website','WordPress ecommerce','WooCommerce customization'],
  updated_at = now()
WHERE lower(name) ILIKE lower('XStore%');

-- ─────────────────────────────────────────────────────────────────────
-- 114. GoRide - inDriver Clone
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'goride-indriver-clone-flutter-taxi',
  seo_title = 'GoRide — inDriver Clone Flutter Taxi Booking App',
  seo_description = 'Full-stack Flutter ride-hailing app inspired by inDriver with real-time fare bidding, multi-vendor support, and seamless taxi booking for users, drivers, and admins.',
  seo_keywords = ARRAY['GoRide','inDriver clone','Flutter taxi','ride-hailing app','fare bidding','taxi booking','Flutter app','ride app','driver app','multi-vendor taxi'],
  updated_at = now()
WHERE lower(name) ILIKE lower('GoRide%');

-- ─────────────────────────────────────────────────────────────────────
-- 115. Jaand Airies — WordPress Business Website
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'jaand-airies-wordpress-business-website',
  seo_title = 'Jaand Airies — Modern WordPress Business Website',
  seo_description = 'Fully responsive business website built in WordPress with custom design, optimized structure, and fast loading — developed for a real client with complete branding.',
  seo_keywords = ARRAY['Jaand Airies','WordPress website','business website','WordPress development','responsive website','custom WordPress','business site','web design','client website'],
  updated_at = now()
WHERE lower(name) ILIKE lower('Jaand Airies%');

-- ─────────────────────────────────────────────────────────────────────
-- 116. React Native Taxi & Parcel Booking App
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'react-native-taxi-parcel-booking-app',
  seo_title = 'React Native Taxi & Parcel Booking App (Taxido)',
  seo_description = 'Production React Native taxi & parcel booking app with Laravel admin panel, live driver bidding, and full client handover — built and deployed live.',
  seo_keywords = ARRAY['React Native','taxi app','parcel booking','Taxido','Laravel admin','ride booking','mobile taxi app','driver bidding','cross-platform app','ride-hailing mobile'],
  updated_at = now()
WHERE lower(name) ILIKE lower('React Native Taxi%');

-- ─────────────────────────────────────────────────────────────────────
-- 117. CryptoPilot
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'cryptopilot-crypto-trading-platform',
  seo_title = 'CryptoPilot — Cryptocurrency Management & Auto-Trading',
  seo_description = 'CryptoPilot is an advanced crypto management and automated trading platform for monitoring portfolios, executing smart trades, and piloting with powerful bots and dashboard tools.',
  seo_keywords = ARRAY['CryptoPilot','crypto trading','cryptocurrency platform','portfolio management','auto trading','trading bots','crypto dashboard','bitcoin trading','crypto software','digital assets'],
  updated_at = now()
WHERE lower(name) = lower('CryptoPilot');

-- ─────────────────────────────────────────────────────────────────────
-- 118. Blogger WebSite (Adam Azam campaign)
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'blogger-website-campaign',
  seo_title = 'Campaign Website — Responsive Blogger Design',
  seo_description = 'Responsive campaign website designed and developed for Adam Azam New York State Senate run, focusing on youth engagement and community development.',
  seo_keywords = ARRAY['campaign website','Blogger','political website','responsive design','election campaign','Senate campaign','youth engagement','community development','web design'],
  updated_at = now()
WHERE lower(name) = lower('Blogger WebSite');

-- ─────────────────────────────────────────────────────────────────────
-- 119. AR Consulting Engineers
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'ar-consulting-engineers-website',
  seo_title = 'AR Consulting Engineers — Engineering Consultancy Website',
  seo_description = 'Professional consultancy website for AR Consulting Engineers built with Blogger.com showcasing services, expertise, and contact details in a clean, user-friendly layout.',
  seo_keywords = ARRAY['AR Consulting','engineering consultancy','consultancy website','engineering firm','professional website','Blogger website','consulting engineers','engineering services','firm website'],
  updated_at = now()
WHERE lower(name) = lower('AR Consulting Engineers');

-- ─────────────────────────────────────────────────────────────────────
-- 120. Resume Website
-- ─────────────────────────────────────────────────────────────────────
UPDATE products SET
  slug = 'resume-website-portfolio',
  seo_title = 'Resume Website — Personal Portfolio & CV Website',
  seo_description = 'Professional resume website for showcasing skills, experience, and achievements with ATS-friendly formatting and role-specific presentation for job applications.',
  seo_keywords = ARRAY['resume website','CV website','personal portfolio','online resume','professional portfolio','job application','career website','personal branding','digital resume'],
  updated_at = now()
WHERE lower(name) = lower('Resume Website');

-- ════════════════════════════════════════════════════════════════════
-- DONE! All 120 products have SEO fields set.
-- Verify with: SELECT name, slug, seo_title FROM products WHERE status = 'active' ORDER BY display_order;
-- ════════════════════════════════════════════════════════════════════
