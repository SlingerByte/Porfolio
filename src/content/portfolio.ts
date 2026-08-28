import type {
  CertificationItem,
  ContactLinks,
  EducationItem,
  ExperienceItem,
  Profile,
  Project,
  SkillGroup,
} from './types'

/**
 * REAL PORTFOLIO CONTENT — aligned with the CV (M7). This is the ENGLISH
 * (default) source; Spanish lives in portfolio.es.ts and is selected at
 * runtime by the language toggle.
 *
 * LANGUAGE: English (canonical, default). Technical vocabulary stays in
 * English where standard in software engineering.
 *
 * UNKNOWN items are marked with TODO and must NOT be filled with plausible data.
 * EcoFunding org/client names are withheld until clearance (attribution flag).
 */

export const profile: Profile = {
  name: 'Emilson Oviedo',
  role: 'Software Developer · AI',
  tagline:
    "Full-stack developer & AI engineer — I build careful, verifiable software, from schema to interface.",
}

export const projects: Project[] = [
  {
    id: 'grantflow',
    title: 'GrantFlow',
    shortDescription:
      'Local-first AI platform that helps nonprofits discover, evaluate and verify funding opportunities.',
    description:
      'Funding is out there, but finding it is a job of its own: scattered sources, dense call documents, eligibility rules buried in pages of text. Small organizations rarely have time for that research loop.\n\nGrantFlow turns it into a reproducible pipeline. Given an organization profile, it searches the live web through a self-hosted SearXNG instance, retrieves candidates into PostgreSQL with pgvector, ranks them with a deterministic scorer, and — optionally — lets a local LLM assess relevance and verify claims against collected evidence, always with traceable sources. Two research modes share one rule: discovery outcomes are never silently swallowed.\n\nI built it end-to-end and documented every structural decision as an ADR — twenty-one so far — including a security threat model. Sixty backend tests run behind a fully offline verification gate.',
    tags: ['AI Engineering', 'RAG', 'Open Source'],
    technologies: [
      'Python',
      'FastAPI',
      'SQLAlchemy (async)',
      'PostgreSQL + pgvector',
      'Ollama',
      'SearXNG',
      'React',
      'TypeScript',
      'Docker Compose',
    ],
    role: 'Creator & sole developer',
    period: '2026 – present',
    featured: true,
    evidence: 'verified',
    links: { repo: 'https://github.com/SlingerByte/GrantFlow' },
    image: null,
    attribution: { label: 'Open source', organizationNamesPublic: true },
  },
  {
    id: 'ecofunding',
    title: 'EcoFunding',
    shortDescription:
      'Automated grant-discovery pipeline: semantic search, embeddings and evaluation — built during professional internship.',
    description:
      'Developed as the sole developer for a conservation-sector nonprofit during a professional internship. The system discovers and evaluates funding opportunities across 50+ languages using embeddings, semantic search and a hybrid evaluation pipeline combining vector search with keyword-based heuristics.\n\nIt runs as two decoupled stages. An Explorer generates search queries, crawls the web and applies semantic filtering before queueing candidate URLs. A Hunter then fetches each page, extracts its content and classifies it — distinguishing real funding opportunities from news articles and other non-relevant content — writing the result back to a single record, never duplicating entries.\n\nBot detection evasion uses TLS fingerprinting with curl_cffi, avoiding the need for headless browsers. The automated pipeline reduced funding search time from approximately 15 hours to 2 hours per week.\n\nDeployed on Azure Container Apps with GitHub Actions CI/CD. My commits make up the vast majority of the repository\'s history.',
    tags: ['Professional Project', 'Semantic Search', 'Embeddings'],
    technologies: [
      'Python',
      'FastAPI',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'PostgreSQL',
      'SQLAlchemy',
      'pgvector',
      'SentenceTransformers',
      'Hugging Face',
      'curl_cffi',
      'BeautifulSoup',
      'Docker',
      'Azure Container Apps',
      'Azure Blob Storage',
      'GitHub Actions',
    ],
    role: 'Software Developer',
    period: '2025 – 2026',
    featured: true,
    evidence: 'verified',
    links: null, // confidential — code belongs to the client project (never public)
    image: null,
    // Organization names withheld until explicit permission — internal
    // context lives in design/m4/M4.1-evidence-report.md, never in UI data.
    attribution: { label: 'Professional project', organizationNamesPublic: false },
  },
  {
    id: 'voxlab',
    title: 'VoxLab',
    shortDescription:
      'A local laboratory for voice AI experimentation — synthesis, transcription, cloning and benchmarking, all on one machine.',
    description:
      'VoxLab started as a CLI playground for local text-to-speech models and grew into a full experimentation lab. Upload a reference recording, get a local transcription you can edit, dial in emotion, intensity, speed and volume, and hear the cloned voice in your browser.\n\nEverything runs locally on the GPU — Fun-CosyVoice3 today, with the engine designed to be swapped for other models later — served by FastAPI behind a React front-end, with instrumentation for CPU/GPU/RAM during inference. A benchmark harness persists every experiment run as JSON reports, so performance claims are reproducible instead of anecdotal. Twelve automated tests cover the core server behavior.\n\nVoxLab is not a product — it is a personal research environment for understanding voice model behavior, hardware constraints and measurable differences.',
    tags: ['Voice AI', 'Local Inference', 'Benchmarking'],
    technologies: [
      'Python',
      'FastAPI',
      'Fun-CosyVoice3',
      'React',
      'Vite',
      'Local ASR',
      'GPU inference',
    ],
    role: 'Creator & sole developer',
    period: '2026 – present',
    featured: true,
    evidence: 'verified',
    links: { repo: 'https://github.com/SlingerByte/VoxLab' },
    image: null,
    attribution: { label: 'Personal lab', organizationNamesPublic: true },
  },
  {
    id: 'blip',
    title: 'Blip',
    shortDescription:
      'Full-stack delivery platform focused on fairer conditions for couriers and lower-emission vehicles.',
    description:
      'My SENA graduation project: a multi-sided delivery platform serving customers, local shops, couriers and platform admins.\n\nCustomers browse shops and build carts; merchants manage catalogs and orders from their panel; couriers receive assignments by link and navigate with an interactive map; admins oversee operations from a metrics dashboard. Built with React and AdonisJS on PostgreSQL, with Cloudinary for media, realtime updates over Socket.IO, and maps powered by MapLibre with Protomaps tiles and Nominatim geocoding.',
    tags: ['Full Stack', 'Real Time', 'Maps'],
    technologies: [
      'React',
      'Vite',
      'Tailwind CSS',
      'AdonisJS',
      'Node.js',
      'PostgreSQL',
      'Supabase',
      'Socket.IO',
      'MapLibre + Protomaps',
      'Cloudinary',
    ],
    role: 'Developer — graduation project',
    period: '2025 – 2026',
    featured: false,
    evidence: 'partial', // no VCS history and no test suite found in the repo
    links: null, // private — client + graduation project, code not published
    image: null,
    attribution: { label: 'Training project', organizationNamesPublic: true },
  },
]

export const experience: ExperienceItem[] = [
  {
    id: 'microsoft-intern',
    role: 'Software Engineering Intern',
    org: 'Microsoft',
    period: '2025 – 2026',
    summary:
      'Designed and implemented EcoFunding, an automated funding-discovery platform using embeddings, semantic search, vector search and pgvector. Built a hybrid evaluation pipeline across 50+ languages, a classification system to filter real opportunities from noise, and bot detection evasion with TLS fingerprinting. Deployed on Azure Container Apps with GitHub Actions CI/CD. Reduced funding search time from ~15 hours to ~2 hours per week.',
  },
  {
    id: 'juna-contrib',
    role: 'Software Quality Contributor',
    org: 'Jüna — Digital Violence Prevention Platform',
    period: '2025 – 2026',
    summary:
      'Contributed to platform stabilization and software quality as part of the Microsoft internship context. Implemented automated testing with Vitest and Playwright to prevent regressions, contributing to the successful production release of the platform.',
  },
]

export const education: EducationItem[] = [
  {
    id: 'sena',
    title: 'Software Analysis and Development Technology',
    org: 'SENA',
    year: '2026',
  },
]

export const certifications: CertificationItem[] = [
  {
    id: 'ai900',
    title: 'Azure AI Fundamentals (AI-900)',
    issuer: 'Microsoft Certified',
    year: '2026',
  },
]

export const skills: SkillGroup[] = [
  {
    id: 'ai-engineering',
    label: 'AI Engineering',
    items: [
      'Embeddings',
      'Semantic Search',
      'Information Retrieval',
      'Vector Search',
      'pgvector',
      'SentenceTransformers',
      'Hugging Face',
      'LangChain',
      'LangGraph',
      'Model Context Protocol (MCP)',
      'Prompt Engineering',
      'NLP',
    ],
  },
  {
    id: 'languages',
    label: 'Programming Languages',
    items: ['Python', 'TypeScript', 'JavaScript', 'PHP', 'SQL'],
  },
  {
    id: 'backend',
    label: 'Backend',
    items: ['FastAPI', 'Node.js', 'AdonisJS', 'SQLAlchemy', 'REST APIs'],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    items: ['React', 'Vite', 'Tailwind CSS', 'Zustand'],
  },
  {
    id: 'databases',
    label: 'Databases',
    items: ['PostgreSQL', 'pgvector', 'Supabase', 'MongoDB'],
  },
  {
    id: 'cloud-devops',
    label: 'Cloud & DevOps',
    items: [
      'Azure Container Apps',
      'Azure Blob Storage',
      'Azure Entra ID',
      'Docker',
      'GitHub Actions',
      'CI/CD',
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    items: ['Web Scraping', 'BeautifulSoup', 'curl_cffi'],
  },
  {
    id: 'quality-tools',
    label: 'Software Quality & Tools',
    items: ['Playwright', 'Vitest', 'pytest', 'Git', 'GitHub', 'GitHub Copilot'],
  },
]

export const contact: ContactLinks = {
  // real channels live — the contact bubble renders them now
  published: true,
  cta: 'Have a project or an idea in mind? I\'d love to build it with you.',
  email: 'emilson1662@gmail.com',
  github: 'https://github.com/SlingerByte',
  linkedin: 'https://www.linkedin.com/in/emilson-oviedo/',
  cvUrl: null, // TODO(cv)
}

/** About section body. */
export const aboutParagraphs: string[] = [
  'I\'m Emilson Oviedo, a software developer with hands-on experience at Microsoft, where I designed and implemented AI solutions for automated funding discovery using embeddings, semantic search and vector databases.',
  'My recent work centers on applied AI engineering: retrieval systems, local LLM workflows, voice-model experimentation and semantic evaluation pipelines — all built with Python, FastAPI, PostgreSQL and Azure. Before that, I shipped a full-stack delivery platform as my graduation project at SENA.',
  'I care about evidence. My repositories carry architecture decision records, tests and benchmarks, because I think claims about software should be checkable. This page is no exception: everything described here exists in code you can inspect.',
]

/** One-line intro per section. */
export const sectionIntros = {
  work: 'Four projects that show how I work: problem first, evidence always.',
  skills:
    'What I use with confidence — everything here has shipped in a real project above.',
  experience:
    'Applied AI at Microsoft, quality engineering with Jüna — and the education behind both.',
  contact: 'You found the door — the easy part is saying hello.',
} as const

/**
 * Orientation copy for the spatial room (M5.8). Pure wayfinding: it explains
 * the metaphor and maps each object to the story part it holds. Every claim
 * mirrors an actual object/content pairing in the scene.
 */
export const roomIntro = {
  label: 'ABOUT THIS ROOM',
  headline: 'This is my workspace.',
  line: 'Each object tells a different part of my story.',
  note: 'A room I built — scroll to walk it. Each object opens when you get close.',
  hint: 'EXPLORE THE ROOM',
  legend: [
    { object: 'The monitor', holds: 'my experience & education' },
    { object: 'The book', holds: 'my selected projects' },
    { object: 'The corkboard', holds: 'the skills I work with' },
    { object: 'The door', holds: 'how to reach me' },
  ],
} as const