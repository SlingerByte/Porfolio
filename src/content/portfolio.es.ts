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
 * SPANISH PORTFOLIO CONTENT — selected by the language toggle at runtime.
 * Same shape as portfolio.ts (the English default). Proper nouns (project
 * titles, organizations, technologies, names) stay as they are.
 */

export const profile: Profile = {
  name: 'Emilson Oviedo',
  role: 'Desarrollador de Software · IA',
  tagline:
    'Desarrollador full-stack e ingeniero de IA — construyo software cuidadoso y verificable, del esquema a la interfaz.',
}

export const projects: Project[] = [
  {
    id: 'grantflow',
    title: 'GrantFlow',
    shortDescription:
      'Plataforma de IA local-first que ayuda a organizaciones sin fines de lucro a descubrir, evaluar y verificar oportunidades de financiación.',
    description:
      'La financiación está ahí, pero encontrarla es un trabajo en sí: fuentes dispersas, documentos densos, reglas de elegibilidad enterradas en páginas de texto. Las organizaciones pequeñas rara vez tienen tiempo para ese ciclo de investigación.\n\nGrantFlow lo convierte en un proceso reproducible. Dado el perfil de una organización, busca en la web a través de una instancia propia de SearXNG, recupera candidatos en PostgreSQL con pgvector, los ordena con un puntuador determinista y —opcionalmente— deja que un LLM local evalúe la relevancia y verifique las afirmaciones contra la evidencia recopilada, siempre con fuentes trazables. Dos modos de investigación comparten una regla: los resultados de descubrimiento nunca se tragan en silencio.\n\nLo construí de principio a fin y documenté cada decisión estructural como un ADR —veintiuno hasta ahora—, incluido un modelo de amenazas de seguridad. Sesenta pruebas de backend corren detrás de una verificación offline completa.',
    tags: ['Ingeniería de IA', 'RAG', 'Código abierto'],
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
    role: 'Creador y desarrollador único',
    period: '2026 – present',
    featured: true,
    evidence: 'verified',
    links: { repo: 'https://github.com/SlingerByte/GrantFlow' },
    image: null,
    attribution: { label: 'Código abierto', organizationNamesPublic: true },
  },
  {
    id: 'ecofunding',
    title: 'EcoFunding',
    shortDescription:
      'Pipeline automatizado de descubrimiento de subvenciones: búsqueda semántica, embeddings y evaluación — construido durante una pasantía profesional.',
    description:
      'Desarrollado como desarrollador único para una organización sin fines de lucro del sector de la conservación durante una pasantía profesional. El sistema descubre y evalúa oportunidades de financiación en más de 50 idiomas usando embeddings, búsqueda semántica y un pipeline de evaluación híbrido que combina búsqueda vectorial con heurísticas por palabras clave.\n\nFunciona en dos etapas desacopladas. Un Explorer genera consultas de búsqueda, rastrea la web y aplica filtrado semántico antes de poner en cola las URLs candidatas. Luego un Hunter obtiene cada página, extrae su contenido y la clasifica —distinguiendo oportunidades reales de noticias y otro contenido irrelevante— y escribe el resultado en un único registro, sin duplicar entradas.\n\nLa evasión de detección de bots usa fingerprinting TLS con curl_cffi, evitando la necesidad de navegadores headless. El pipeline automatizado redujo el tiempo de búsqueda de financiación de aproximadamente 15 horas a 2 horas por semana.\n\nDesplegado en Azure Container Apps con CI/CD de GitHub Actions. Mis commits conforman la gran mayoría del historial del repositorio.',
    tags: ['Proyecto profesional', 'Búsqueda semántica', 'Embeddings'],
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
    role: 'Desarrollador de Software',
    period: '2025 – 2026',
    featured: true,
    evidence: 'verified',
    links: null, // confidencial — el código pertenece al proyecto del cliente (nunca público)
    image: null,
    // Nombres de la organización ocultos hasta tener permiso explícito — el
    // contexto interno vive en design/m4/M4.1-evidence-report.md, nunca en datos de UI.
    attribution: { label: 'Proyecto profesional', organizationNamesPublic: false },
  },
  {
    id: 'voxlab',
    title: 'VoxLab',
    shortDescription:
      'Un laboratorio local para experimentar con IA de voz: síntesis, transcripción, clonación y benchmarks, todo en una sola máquina.',
    description:
      'VoxLab empezó como un playground CLI para modelos locales de texto a voz y creció hasta convertirse en un laboratorio completo de experimentación. Sube una grabación de referencia, obtén una transcripción local que puedes editar, ajusta emoción, intensidad, velocidad y volumen, y escucha la voz clonada en tu navegador.\n\nTodo corre localmente en la GPU —Fun-CosyVoice3 hoy, con el motor diseñado para intercambiarse por otros modelos después—, servido por FastAPI detrás de un frontend en React, con instrumentación de CPU/GPU/RAM durante la inferencia. Un harness de benchmarks persiste cada corrida como reportes JSON, así que las afirmaciones de rendimiento son reproducibles en lugar de anecdóticas. Doce pruebas automatizadas cubren el comportamiento central del servidor.\n\nVoxLab no es un producto — es un entorno personal de investigación para entender el comportamiento de los modelos de voz, las limitaciones del hardware y las diferencias medibles.',
    tags: ['IA de voz', 'Inferencia local', 'Benchmarks'],
    technologies: [
      'Python',
      'FastAPI',
      'Fun-CosyVoice3',
      'React',
      'Vite',
      'ASR local',
      'Inferencia GPU',
    ],
    role: 'Creador y desarrollador único',
    period: '2026 – present',
    featured: true,
    evidence: 'verified',
    links: { repo: 'https://github.com/SlingerByte/VoxLab' },
    image: null,
    attribution: { label: 'Laboratorio personal', organizationNamesPublic: true },
  },
  {
    id: 'blip',
    title: 'Blip',
    shortDescription:
      'Plataforma de delivery full-stack enfocada en condiciones más justas para los repartidores y vehículos de bajas emisiones.',
    description:
      'Mi proyecto de grado del SENA: una plataforma de delivery multipartes que sirve a clientes, tiendas locales, repartidores y administradores.\n\nLos clientes navegan por las tiendas y arman su carrito; los comerciantes gestionan catálogos y pedidos desde su panel; los repartidores reciben asignaciones por enlace y navegan con un mapa interactivo; los administradores supervisan las operaciones desde un dashboard de métricas. Construido con React y AdonisJS sobre PostgreSQL, con Cloudinary para medios, actualizaciones en tiempo real con Socket.IO y mapas con MapLibre, tiles de Protomaps y geocodificación con Nominatim.',
    tags: ['Full stack', 'Tiempo real', 'Mapas'],
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
    role: 'Desarrollador — proyecto de grado',
    period: '2025 – 2026',
    featured: false,
    evidence: 'partial', // sin historial de VCS ni suite de pruebas en el repo
    links: null, // privado — proyecto de cliente + grado, código no publicado
    image: null,
    attribution: { label: 'Proyecto de formación', organizationNamesPublic: true },
  },
]

export const experience: ExperienceItem[] = [
  {
    id: 'microsoft-intern',
    role: 'Pasante de Ingeniería de Software',
    org: 'Microsoft',
    period: '2025 – 2026',
    summary:
      'Diseñé e implementé EcoFunding, una plataforma automatizada de descubrimiento de financiación usando embeddings, búsqueda semántica, búsqueda vectorial y pgvector. Construí un pipeline de evaluación híbrido en más de 50 idiomas, un sistema de clasificación para filtrar oportunidades reales del ruido y evasión de detección de bots con fingerprinting TLS. Desplegado en Azure Container Apps con CI/CD de GitHub Actions. Reduje el tiempo de búsqueda de financiación de ~15 horas a ~2 horas por semana.',
  },
  {
    id: 'juna-contrib',
    role: 'Contribuidor de Calidad de Software',
    org: 'Jüna — Plataforma de Prevención de Violencia Digital',
    period: '2025 – 2026',
    summary:
      'Contribuí a la estabilización de la plataforma y a la calidad del software como parte del contexto de la pasantía en Microsoft. Implementé pruebas automatizadas con Vitest y Playwright para prevenir regresiones, contribuyendo al lanzamiento exitoso en producción de la plataforma.',
  },
]

export const education: EducationItem[] = [
  {
    id: 'sena',
    title: 'Tecnología en Análisis y Desarrollo de Software',
    org: 'SENA',
    year: '2026',
  },
]

export const certifications: CertificationItem[] = [
  {
    id: 'ai900',
    title: 'Azure AI Fundamentals (AI-900)',
    issuer: 'Certificado por Microsoft',
    year: '2026',
  },
]

export const skills: SkillGroup[] = [
  {
    id: 'ai-engineering',
    label: 'Ingeniería de IA',
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
    label: 'Lenguajes de programación',
    items: ['Python', 'TypeScript', 'JavaScript', 'PHP', 'SQL'],
  },
  {
    id: 'backend',
    label: 'Backend',
    items: ['FastAPI', 'Node.js', 'AdonisJS', 'SQLAlchemy', 'APIs REST'],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    items: ['React', 'Vite', 'Tailwind CSS', 'Zustand'],
  },
  {
    id: 'databases',
    label: 'Bases de datos',
    items: ['PostgreSQL', 'pgvector', 'Supabase', 'MongoDB'],
  },
  {
    id: 'cloud-devops',
    label: 'Cloud y DevOps',
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
    label: 'Automatización',
    items: ['Web Scraping', 'BeautifulSoup', 'curl_cffi'],
  },
  {
    id: 'quality-tools',
    label: 'Calidad y herramientas',
    items: ['Playwright', 'Vitest', 'pytest', 'Git', 'GitHub', 'GitHub Copilot'],
  },
]

export const contact: ContactLinks = {
  // canales reales activos — el globo de contacto los muestra ahora
  published: true,
  cta: '¿Tienes un proyecto o una idea en mente? Me encantaría construirlo contigo.',
  email: 'emilson1662@gmail.com',
  github: 'https://github.com/SlingerByte',
  linkedin: 'https://www.linkedin.com/in/emilson-oviedo/',
  cvUrl: null, // TODO(cv)
}

/** Cuerpo de la sección Acerca de. */
export const aboutParagraphs: string[] = [
  'Soy Emilson Oviedo, desarrollador de software con experiencia práctica en Microsoft, donde diseñé e implementé soluciones de IA para el descubrimiento automatizado de financiación usando embeddings, búsqueda semántica y bases de datos vectoriales.',
  'Mi trabajo reciente se centra en la ingeniería de IA aplicada: sistemas de recuperación, flujos de trabajo con LLM locales, experimentación con modelos de voz y pipelines de evaluación semántica — todo construido con Python, FastAPI, PostgreSQL y Azure. Antes de eso, lancé una plataforma de delivery full-stack como proyecto de grado en el SENA.',
  'Me importa la evidencia. Mis repositorios llevan registros de decisiones de arquitectura, pruebas y benchmarks, porque creo que las afirmaciones sobre software deberían poder comprobarse. Esta página no es la excepción: todo lo descrito aquí existe en código que puedes inspeccionar.',
]

/** Intro de una línea por sección. */
export const sectionIntros = {
  work: 'Cuatro proyectos que muestran cómo trabajo: primero el problema, la evidencia siempre.',
  skills:
    'Lo que uso con confianza — todo esto se ha enviado en un proyecto real de arriba.',
  experience:
    'IA aplicada en Microsoft, ingeniería de calidad con Jüna — y la educación detrás de ambos.',
  contact: 'Encontraste la puerta — la parte fácil es saludar.',
} as const

/** Orientación para la habitación espacial (M5.8). Wayfinding puro. */
export const roomIntro = {
  label: 'ACERCA DE ESTA HABITACIÓN',
  headline: 'Este es mi espacio de trabajo.',
  line: 'Cada objeto cuenta una parte diferente de mi historia.',
  note: 'Una habitación que construí — haz scroll para recorrerla. Cada objeto se abre cuando te acercas.',
  hint: 'EXPLORA LA HABITACIÓN',
  legend: [
    { object: 'El monitor', holds: 'mi experiencia y educación' },
    { object: 'El libro', holds: 'mis proyectos seleccionados' },
    { object: 'El corcho', holds: 'las habilidades con las que trabajo' },
    { object: 'La puerta', holds: 'cómo llegar a mí' },
  ],
} as const