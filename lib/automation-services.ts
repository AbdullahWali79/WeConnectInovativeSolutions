export type AutomationService = {
  slug: string;
  name: string;
  shortName: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  description: string;
  outcomes: string[];
  deliverables: string[];
  useCases: { title: string; description: string }[];
  keywords: string[];
};

export const automationServices: AutomationService[] = [
  {
    slug: "web-development-services",
    name: "Web Development Services",
    shortName: "Web Development",
    eyebrow: "Fast, scalable web experiences for global businesses",
    title: "Custom Web Development Services Built for Growth",
    metaTitle: "Custom Web Development Services for Businesses",
    metaDescription: "Build fast, secure and scalable websites, portals and web applications with a custom web development team serving businesses worldwide.",
    description: "We design and develop conversion-focused websites and dependable web applications tailored to your users, operations and long-term growth plans.",
    outcomes: ["Launch a fast, professional digital presence", "Turn complex requirements into intuitive journeys", "Integrate websites with business systems", "Scale features without rebuilding from scratch"],
    deliverables: ["Discovery, planning and technical architecture", "Responsive UI/UX design and development", "Frontend and backend engineering", "CMS, database and third-party integrations", "Performance, accessibility and security testing", "Deployment, documentation and ongoing support"],
    useCases: [
      { title: "Business websites", description: "Conversion-focused company and service websites designed to attract and qualify customers." },
      { title: "Web applications", description: "Custom dashboards, portals and platforms that support real operational workflows." },
      { title: "E-commerce platforms", description: "Online selling experiences connected to payments, inventory and fulfilment processes." },
    ],
    keywords: ["web development services", "custom web development company", "web application development", "website development agency", "hire web developers"],
  },
  {
    slug: "mobile-app-development",
    name: "Mobile App Development Services",
    shortName: "App Development",
    eyebrow: "Mobile products designed for real users",
    title: "Custom Mobile App Development for iOS and Android",
    metaTitle: "Mobile App Development Services | iOS & Android",
    metaDescription: "Create reliable iOS, Android and cross-platform mobile apps with custom UX, API integrations and end-to-end development support.",
    description: "We turn product ideas and business processes into polished mobile applications with thoughtful user journeys, reliable integrations and maintainable technology.",
    outcomes: ["Reach customers on iOS and Android", "Digitize field and internal workflows", "Deliver a consistent cross-platform experience", "Launch with a maintainable product foundation"],
    deliverables: ["Product discovery and feature planning", "Mobile UX and interface design", "Native or cross-platform app development", "Backend, API and payment integrations", "Quality assurance and device testing", "Store release and post-launch support"],
    useCases: [
      { title: "Customer applications", description: "Booking, commerce, membership and service experiences available from any device." },
      { title: "Internal business apps", description: "Mobile tools for field teams, reporting, approvals and daily operational tasks." },
      { title: "Connected platforms", description: "Mobile experiences synchronized with your website, CRM, database and third-party services." },
    ],
    keywords: ["mobile app development services", "custom app development", "iOS Android app developers", "cross-platform app development", "Flutter app development"],
  },
  {
    slug: "custom-software-development",
    name: "Custom Software Development Services",
    shortName: "Custom Software",
    eyebrow: "The right technology for your exact requirements",
    title: "Custom Software Development in the Stack Your Product Needs",
    metaTitle: "Custom Software Development Services | Any Stack",
    metaDescription: "Build custom business software, SaaS platforms, APIs and internal systems with a technology stack selected around your requirements.",
    description: "We engineer custom software without forcing every project into one technology stack. Architecture, language and framework choices are guided by product needs, integrations, scale and maintainability.",
    outcomes: ["Replace limiting off-the-shelf tools", "Build around your unique business rules", "Connect existing and new systems", "Own a scalable, maintainable software product"],
    deliverables: ["Requirements analysis and solution architecture", "Technology-stack evaluation and selection", "Frontend, backend, API and database development", "Cloud, desktop and third-party integrations", "Automated testing, security and deployment", "Documentation, training and maintenance"],
    useCases: [
      { title: "SaaS products", description: "Multi-user platforms with subscriptions, permissions, dashboards and scalable cloud architecture." },
      { title: "Internal systems", description: "Purpose-built CRM, ERP, inventory, reporting and workflow management software." },
      { title: "Modernization and integration", description: "Extend legacy systems, create APIs and connect fragmented business technology." },
    ],
    keywords: ["custom software development services", "custom software company", "SaaS development company", "business software development", "software developers any technology stack"],
  },
  {
    slug: "n8n-automation-services",
    name: "n8n Automation Services",
    shortName: "n8n Automation",
    eyebrow: "Flexible, self-hostable workflow automation",
    title: "Custom n8n Automation Services for Growing Businesses",
    metaTitle: "n8n Automation Services & Workflow Experts",
    metaDescription: "Hire n8n automation experts to connect your apps, automate business workflows and build secure AI-powered integrations for your global team.",
    description: "We design, build and maintain reliable n8n workflows that connect your tools, data and teams—without forcing your operations into rigid off-the-shelf processes.",
    outcomes: ["Reduce repetitive manual work", "Connect APIs and business tools", "Keep sensitive workflows under your control", "Scale operations without adding busywork"],
    deliverables: ["Workflow discovery and process mapping", "Custom n8n workflow development", "API, webhook and database integrations", "Error handling, monitoring and documentation", "Self-hosted or cloud deployment support", "Ongoing optimization and maintenance"],
    useCases: [
      { title: "Lead management", description: "Capture, enrich, score and route leads automatically across forms, email and your CRM." },
      { title: "Operations workflows", description: "Synchronize records, generate documents and notify the right people when business events occur." },
      { title: "AI-powered processing", description: "Classify messages, summarize documents and add human approval steps to AI workflows." },
    ],
    keywords: ["n8n automation services", "n8n expert", "n8n workflow automation", "n8n developer", "n8n integration services"],
  },
  {
    slug: "make-com-automation",
    name: "Make.com Automation Services",
    shortName: "Make.com Automation",
    eyebrow: "Visual automation for connected teams",
    title: "Make.com Automation That Keeps Your Business Moving",
    metaTitle: "Make.com Automation Services & Integration Experts",
    metaDescription: "Work with Make.com automation experts to integrate apps, remove repetitive tasks and build dependable business workflows.",
    description: "We create maintainable Make.com scenarios that move information between your sales, marketing, support and operations tools with less manual intervention.",
    outcomes: ["Automate multi-step processes", "Eliminate duplicate data entry", "Improve response and handoff times", "Create clear, maintainable scenarios"],
    deliverables: ["Automation opportunity audit", "Custom Make.com scenario development", "CRM, marketing and productivity integrations", "Routers, filters and data transformations", "Testing, monitoring and team documentation", "Scenario repair and optimization"],
    useCases: [
      { title: "Sales automation", description: "Move leads from campaigns and forms into your CRM, assign owners and trigger follow-ups." },
      { title: "E-commerce operations", description: "Connect orders, inventory, notifications, invoices and customer records." },
      { title: "Reporting", description: "Collect data from multiple platforms and deliver scheduled stakeholder reports." },
    ],
    keywords: ["Make.com automation", "Make.com expert", "Make integration services", "Make.com consultant", "business process automation"],
  },
  {
    slug: "ai-agent-development",
    name: "AI Agent Development Services",
    shortName: "AI Agent Development",
    eyebrow: "Purpose-built agents with business guardrails",
    title: "Custom AI Agents Built Around Your Business",
    metaTitle: "AI Agent Development Services for Businesses",
    metaDescription: "Build custom AI agents for support, sales and operations with secure integrations, human oversight and measurable business outcomes.",
    description: "We build practical AI agents that can understand requests, use approved business tools and complete defined tasks while keeping your team in control.",
    outcomes: ["Handle routine requests faster", "Give teams instant access to knowledge", "Automate defined actions across tools", "Retain human review for sensitive decisions"],
    deliverables: ["Use-case and feasibility assessment", "Agent architecture and conversation design", "Knowledge base and retrieval integration", "Tool calling and workflow connections", "Guardrails, testing and human escalation", "Deployment analytics and improvement"],
    useCases: [
      { title: "Customer support agents", description: "Answer common questions, retrieve account information and escalate complex cases." },
      { title: "Sales assistants", description: "Qualify inbound leads, answer product questions and schedule the next step." },
      { title: "Internal knowledge agents", description: "Help employees find policies, procedures and project information quickly." },
    ],
    keywords: ["AI agent development services", "custom AI agents", "AI automation agency", "business AI agent", "LLM agent development"],
  },
  {
    slug: "chatgpt-automation",
    name: "ChatGPT Automation Services",
    shortName: "ChatGPT Automation",
    eyebrow: "OpenAI-powered workflows for real operations",
    title: "ChatGPT Automation and OpenAI Integrations",
    metaTitle: "ChatGPT Automation & OpenAI Integration Services",
    metaDescription: "Automate support, content and operations with custom ChatGPT and OpenAI API integrations connected to your business tools.",
    description: "We integrate OpenAI models into secure workflows that help your team process information, respond faster and automate repeatable knowledge work.",
    outcomes: ["Accelerate document and message processing", "Deliver faster customer responses", "Create consistent structured outputs", "Connect AI with existing business systems"],
    deliverables: ["OpenAI API integration", "Custom prompts and structured outputs", "Document search and knowledge retrieval", "Workflow and CRM connections", "Safety controls and human approval", "Usage monitoring and optimization"],
    useCases: [
      { title: "Inbox automation", description: "Categorize inbound messages, draft responses and route each request appropriately." },
      { title: "Document workflows", description: "Extract, summarize and transform information from business documents." },
      { title: "Content operations", description: "Create structured drafts and repurpose approved material across channels." },
    ],
    keywords: ["ChatGPT automation services", "OpenAI API integration", "ChatGPT integration", "OpenAI automation", "custom GPT automation"],
  },
  {
    slug: "claude-ai-integration",
    name: "Claude AI Integration Services",
    shortName: "Claude Integration",
    eyebrow: "Thoughtful AI integration for knowledge-heavy work",
    title: "Claude AI Integrations for Documents, Support and Operations",
    metaTitle: "Claude AI Integration & Automation Services",
    metaDescription: "Integrate Claude AI into document, support and business workflows with custom APIs, automation and human oversight.",
    description: "We connect Anthropic's Claude models to your applications and workflows for long-form analysis, knowledge support and reliable content processing.",
    outcomes: ["Process complex documents efficiently", "Improve knowledge-based assistance", "Standardize analysis and drafting", "Embed AI into existing applications"],
    deliverables: ["Claude API integration", "Prompt and workflow design", "Document and knowledge connections", "Structured response pipelines", "Quality evaluation and safeguards", "Monitoring and maintenance"],
    useCases: [
      { title: "Document analysis", description: "Summarize, compare and extract structured insights from lengthy materials." },
      { title: "Knowledge assistance", description: "Answer team or customer questions using approved source material." },
      { title: "Editorial workflows", description: "Draft, review and transform content while following defined style rules." },
    ],
    keywords: ["Claude AI integration", "Claude API developer", "Anthropic Claude automation", "Claude AI services", "AI workflow integration"],
  },
  {
    slug: "gemini-ai-integration",
    name: "Gemini AI Integration Services",
    shortName: "Gemini Integration",
    eyebrow: "Google AI connected to your workflows",
    title: "Gemini AI Integration and Business Automation",
    metaTitle: "Gemini AI Integration & Automation Services",
    metaDescription: "Connect Google Gemini to your applications and workflows for multimodal processing, knowledge assistance and business automation.",
    description: "We build Gemini-powered features and automations that help businesses work with text, images and operational data across their existing technology stack.",
    outcomes: ["Add multimodal AI capabilities", "Automate information processing", "Connect AI with Google-centered workflows", "Create tailored internal assistants"],
    deliverables: ["Gemini API integration", "Multimodal workflow development", "Google Workspace process connections", "Knowledge retrieval and structured outputs", "Testing, guardrails and documentation", "Production monitoring and support"],
    useCases: [
      { title: "Multimodal processing", description: "Analyze text and images within a consistent automated workflow." },
      { title: "Workspace automation", description: "Use AI alongside documents, spreadsheets, email and operational tools." },
      { title: "Custom assistants", description: "Build role-specific assistants grounded in your approved business information." },
    ],
    keywords: ["Gemini AI integration", "Google Gemini API developer", "Gemini automation", "Gemini AI services", "Google AI integration"],
  },
  {
    slug: "custom-business-automation",
    name: "Custom Business Automation",
    shortName: "Custom Automation",
    eyebrow: "Automation designed for your exact process",
    title: "Custom Business Automation That Connects Your Entire Workflow",
    metaTitle: "Custom Business Automation & Workflow Development",
    metaDescription: "Replace repetitive manual work with custom business automation, API integrations and reliable workflows built around your operations.",
    description: "When a template is not enough, we combine APIs, databases, AI and custom software to automate the workflow your business actually uses.",
    outcomes: ["Remove operational bottlenecks", "Connect legacy and modern systems", "Reduce errors and turnaround time", "Build automation that grows with you"],
    deliverables: ["Business process discovery", "Solution architecture and roadmap", "Custom API and database integrations", "Workflow dashboards and alerts", "Security, testing and documentation", "Training and ongoing support"],
    useCases: [
      { title: "CRM and lead operations", description: "Unify lead capture, qualification, assignment, follow-up and reporting." },
      { title: "Back-office automation", description: "Automate approvals, records, invoices, notifications and recurring reports." },
      { title: "Cross-platform synchronization", description: "Keep data accurate across systems without repeated manual entry." },
    ],
    keywords: ["custom business automation", "workflow automation services", "business process automation company", "custom API integration", "automation agency"],
  },
];

export function getAutomationService(slug: string) {
  return automationServices.find((service) => service.slug === slug);
}
