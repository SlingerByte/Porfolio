import { useCallback } from 'react'
import { useExperience } from '../state/ExperienceContext'
import type { Language } from './locale'

/**
 * UI chrome strings, per language. Content (projects, sections, etc.) lives
 * in portfolio.ts / portfolio.es.ts; everything the interface says directly
 * lives here. Dynamic parts use `{placeholder}` and are filled with .replace.
 */

const STRINGS = {
  en: {
    // nav
    navExperience: '01 EXPERIENCE',
    navWork: '02 PROJECTS',
    navSkills: '03 SKILLS',
    navContact: '04 CONTACT',
    navAria: 'Portfolio sections',
    // hero
    cordHint: 'PULL THE CORD · OR PRESS ENTER',
    scrollHint: 'SCROLL · STEP INTO THE STUDIO',
    sceneUnavailable: 'SCENE UNAVAILABLE — CONTENT REMAINS',
    reducedMotionHint: 'REDUCED MOTION · CAMERA HOLDS',
    viewWork: 'VIEW WORK →',
    getInTouch: 'GET IN TOUCH →',
    // sections
    experienceLabel: 'EXPERIENCE',
    experienceTitle: 'Experience',
    educationTitle: 'Education',
    certificationsTitle: 'Certifications',
    skillsLabel: 'SKILLS',
    skillsTitle: 'Toolbox',
    aboutLabel: 'ABOUT',
    aboutTitle: "Who's in this room",
    contactLabel: 'CONTACT',
    contactTitle: 'Say hello',
    selectedWorkLabel: 'SELECTED WORK',
    projectsTitle: 'Projects',
    bookProgress: 'SELECTED WORKS — PAGE {n} / {c}',
    // monitor terminal
    monitorPath: 'emilson@studio:~/experience',
    monitorClose: 'CLOSE ✕',
    monitorAria: 'Professional experience — scrollable',
    terminalInputAria: 'Terminal input',
    monitorIdle: 'type `help` for commands — then try `py print("hola")` or `py 2+2`',
    termHelp:
      'commands:\n  help · whoami · ls · pwd · date · clear · exit\n  py <code>   run a little Python, e.g. py 2+2\n  sudo ...    ask nicely',
    termWhoami: 'emilson.oviedo — Software Developer · AI',
    termLs: 'certifications/  education.log  experience/\nprojects/        skills/        timeline.txt',
    termPwd: '~/studio/2026',
    termDate: "the lamp says it's always a good time to build.",
    termExit: 'the door is that way →\n(or close this display)',
    termSudo: "nice try. you don't have sudo here (yet).",
    termNotFound: 'command not found: {cmd} — try `help`',
    pyHint: 'Python 3.13 (studio emulator) on linux\n>>> \nhint: try `py print("hola")` or `py 2+2`',
    pyNameError: "NameError: name '{name}' is not defined",
    pySyntaxError: 'SyntaxError: invalid syntax',
    // book
    bookTitle: 'SELECTED PROJECTS',
    bookClose: 'CLOSE ✕',
    bookPrev: '← PREV',
    bookNext: 'NEXT →',
    bookPrevAria: 'Previous page',
    bookNextAria: 'Next page',
    bookIntroAria: 'Introduction — selected projects',
    bookSpreadAria: 'Project spread — {title}',
    bookRole: 'ROLE — ',
    bookKicker: 'SELECTED PROJECTS',
    bookIntroduction: 'Introduction',
    bookSelected: 'Selected Projects',
    bookStack: 'STACK',
    bookEvidence: 'EVIDENCE',
    bookProblem: 'THE PROBLEM',
    bookApproach: 'THE APPROACH',
    bookBuilt: 'WHAT I BUILT',
    codeOnRequest: 'CODE AVAILABLE ON REQUEST',
    introTitleLeft: 'SELECTED',
    introTitleRight: 'PROJECTS',
    introTagline:
      'A small collection of things I built while trying to solve real problems with software.',
    introNote:
      "Not everything I've built made it into this book. These are just the ones worth talking about.",
    introStat: 'SELECTED PROJECTS',
    introMotto: 'PROBLEM FIRST. EVIDENCE ALWAYS.',
    introPersonality: 'Four projects. Several questionable decisions.',
    introRole: 'SOFTWARE DEVELOPER · AI',
    introRightLabel: 'A SELECTION OF WORK',
    introRightBody:
      'Every project here started with a problem worth solving\nand ended with something that actually worked.\n\nSome on the first try.\nThose were suspicious.',
    introRightFooter: 'Mostly software. Occasionally chaos.',
    introTurn: 'Turn the page →',
    // project card
    projectRole: 'ROLE — ',
    projectEvidence: 'EVIDENCE — ',
    projectDemo: 'LIVE DEMO →',
    projectHow: 'HOW IT WORKS',
    categoriesAria: 'Categories',
    // skills interface
    corkboardTitle: 'SKILLS · THE CORKBOARD',
    skillsClose: 'CLOSE ✕',
    skillsAria: 'Skills — scrollable',
    skillsFooter: '{n} tools across {f} families — grab a note to move it',
    // spatial layer
    focusMonitor: 'Monitor display expanded',
    focusBook: 'Selected projects expanded',
    focusCorkboard: 'Skills board expanded',
    affordMonitor: 'OPEN DISPLAY ↗',
    affordBook: 'OPEN CASE STUDY →',
    affordSkills: 'VIEW ALL SKILLS →',
    // door / corkboard
    doorPlate: '· CONTACT ·',
    skillsSign: '// SKILLS',
    // fallback
    fallbackWebgl: '// WEBGL UNAVAILABLE',
    fallbackExperience: '// EXPERIENCE',
    fallbackEducation: '// EDUCATION',
    fallbackCertifications: '// CERTIFICATIONS',
    fallbackProjects: '// PROJECTS',
    fallbackSkills: '// SKILLS',
    fallbackContact: '// CONTACT',
    // 3D book subtitles
    subGrantflow: 'LOCAL-FIRST AI · GRANT DISCOVERY',
    subEcofunding: 'GRANT-DISCOVERY PIPELINE',
    subVoxlab: 'LOCAL VOICE LAB',
    subBlip: 'FULL-STACK DELIVERY',
    coverTitle1: 'SELECTED',
    coverTitle2: 'PROJECTS',
    bookRows: 'PROBLEM\nAPPROACH\nBUILT\nEVIDENCE',
    // 3D monitor screen
    screenIdle:
      '$ whoami\nEMILSON OVIEDO\nSOFTWARE DEVELOPER · AI\n\nEXPERIENCE\nMICROSOFT · 2025–2026\n\nEDUCATION\nSENA',
    screenFocus:
      '$ cat timeline.txt\necofunding/  grantflow/\nvoxlab/  blip/\n\n> building careful, verifiable AI.\n\n\n> CLICK TO OPEN DISPLAY.',
    // contact pending (only shown if channels aren't published)
    contactPending: 'Public contact channels go live with the launch. This space stays intentionally empty rather than pointing at placeholders.',
    contactComingSoon: 'Contact channels coming soon.',
    evidenceTitle: 'How strongly the public copy can claim technical facts',
  },
  es: {
    navExperience: '01 EXPERIENCIA',
    navWork: '02 PROYECTOS',
    navSkills: '03 HABILIDADES',
    navContact: '04 CONTACTO',
    navAria: 'Secciones del portafolio',
    cordHint: 'JALA EL CORDÓN · O PRESIONA ENTER',
    scrollHint: 'SCROLL · ENTRA AL ESTUDIO',
    sceneUnavailable: 'ESCENA NO DISPONIBLE — EL CONTENIDO SIGUE AQUÍ',
    reducedMotionHint: 'MOVIMIENTO REDUCIDO · CÁMARA FIJA',
    viewWork: 'VER TRABAJO →',
    getInTouch: 'CONTÁCTAME →',
    experienceLabel: 'EXPERIENCIA',
    experienceTitle: 'Experiencia',
    educationTitle: 'Educación',
    certificationsTitle: 'Certificaciones',
    skillsLabel: 'HABILIDADES',
    skillsTitle: 'Caja de herramientas',
    aboutLabel: 'ACERCA DE',
    aboutTitle: '¿Quién está en esta habitación?',
    contactLabel: 'CONTACTO',
    contactTitle: 'Saluda',
    selectedWorkLabel: 'TRABAJOS SELECCIONADOS',
    projectsTitle: 'Proyectos',
    bookProgress: 'TRABAJOS SELECCIONADOS — PÁGINA {n} / {c}',
    monitorPath: 'emilson@studio:~/experiencia',
    monitorClose: 'CERRAR ✕',
    monitorAria: 'Experiencia profesional — con scroll',
    terminalInputAria: 'Entrada de terminal',
    monitorIdle: 'escribe `help` para ver los comandos — luego prueba `py print("hola")` o `py 2+2`',
    termHelp:
      'comandos:\n  help · whoami · ls · pwd · date · clear · exit\n  py <código>   ejecuta un poco de Python, ej. py 2+2\n  sudo ...    pide con educación',
    termWhoami: 'emilson.oviedo — Desarrollador de Software · IA',
    termLs: 'certificaciones/  educacion.log  experiencia/\nproyectos/        habilidades/    timeline.txt',
    termPwd: '~/estudio/2026',
    termDate: 'la lámpara dice que siempre es buen momento para construir.',
    termExit: 'la puerta está por ahí →\n(o cierra esta ventana)',
    termSudo: 'buen intento. todavía no tienes sudo aquí.',
    termNotFound: 'comando no encontrado: {cmd} — prueba `help`',
    pyHint: 'Python 3.13 (emulador del estudio) en linux\n>>> \npista: prueba `py print("hola")` o `py 2+2`',
    pyNameError: "NameError: el nombre '{name}' no está definido",
    pySyntaxError: 'SyntaxError: sintaxis inválida',
    bookTitle: 'PROYECTOS SELECCIONADOS',
    bookClose: 'CERRAR ✕',
    bookPrev: '← ANTERIOR',
    bookNext: 'SIGUIENTE →',
    bookPrevAria: 'Página anterior',
    bookNextAria: 'Página siguiente',
    bookIntroAria: 'Introducción — proyectos seleccionados',
    bookSpreadAria: 'Proyecto — {title}',
    bookRole: 'ROL — ',
    bookKicker: 'PROYECTOS SELECCIONADOS',
    bookIntroduction: 'Introducción',
    bookSelected: 'Proyectos Seleccionados',
    bookStack: 'STACK',
    bookEvidence: 'EVIDENCIA',
    bookProblem: 'EL PROBLEMA',
    bookApproach: 'EL ENFOQUE',
    bookBuilt: 'LO QUE CONSTRUÍ',
    codeOnRequest: 'CÓDIGO DISPONIBLE A PETICIÓN',
    introTitleLeft: 'PROYECTOS',
    introTitleRight: 'SELECCIONADOS',
    introTagline:
      'Una pequeña colección de cosas que construí intentando resolver problemas reales con software.',
    introNote:
      'No todo lo que he construido entró en este libro. Estos son solo los que valen la pena contar.',
    introStat: 'PROYECTOS SELECCIONADOS',
    introMotto: 'PRIMERO EL PROBLEMA. LA EVIDENCIA SIEMPRE.',
    introPersonality: 'Cuatro proyectos. Varias decisiones cuestionables.',
    introRole: 'DESARROLLADOR DE SOFTWARE · IA',
    introRightLabel: 'UNA SELECCIÓN DE TRABAJO',
    introRightBody:
      'Cada proyecto de aquí empezó con un problema que valía la pena resolver\ny terminó con algo que realmente funcionó.\n\nAlgunos a la primera.\nEsos daban sospecha.',
    introRightFooter: 'Mayormente software. De vez en cuando, caos.',
    introTurn: 'Pasa la página →',
    projectRole: 'ROL — ',
    projectEvidence: 'EVIDENCIA — ',
    projectDemo: 'DEMO →',
    projectHow: 'CÓMO FUNCIONA',
    categoriesAria: 'Categorías',
    corkboardTitle: 'HABILIDADES · EL CORCHO',
    skillsClose: 'CERRAR ✕',
    skillsAria: 'Habilidades — con scroll',
    skillsFooter: '{n} herramientas en {f} familias — agarra una nota para moverla',
    focusMonitor: 'Display del monitor expandido',
    focusBook: 'Proyectos seleccionados expandidos',
    focusCorkboard: 'Tablero de habilidades expandido',
    affordMonitor: 'ABRIR DISPLAY ↗',
    affordBook: 'ABRIR CASO DE ESTUDIO →',
    affordSkills: 'VER TODAS LAS HABILIDADES →',
    doorPlate: '· CONTACTO ·',
    skillsSign: '// HABILIDADES',
    fallbackWebgl: '// WEBGL NO DISPONIBLE',
    fallbackExperience: '// EXPERIENCIA',
    fallbackEducation: '// EDUCACIÓN',
    fallbackCertifications: '// CERTIFICACIONES',
    fallbackProjects: '// PROYECTOS',
    fallbackSkills: '// HABILIDADES',
    fallbackContact: '// CONTACTO',
    subGrantflow: 'IA LOCAL · DESCUBRIMIENTO DE SUBVENCIONES',
    subEcofunding: 'PIPELINE DE DESCUBRIMIENTO DE SUBVENCIONES',
    subVoxlab: 'LABORATORIO LOCAL DE VOZ',
    subBlip: 'DELIVERY FULL-STACK',
    coverTitle1: 'PROYECTOS',
    coverTitle2: 'SELECCIONADOS',
    bookRows: 'PROBLEMA\nENFOQUE\nLO CONSTRUÍDO\nEVIDENCIA',
    // 3D monitor screen
    screenIdle:
      '$ whoami\nEMILSON OVIEDO\nDESARROLLADOR DE SOFTWARE · IA\n\nEXPERIENCIA\nMICROSOFT · 2025–2026\n\nEDUCACIÓN\nSENA',
    screenFocus:
      '$ cat timeline.txt\necofunding/  grantflow/\nvoxlab/  blip/\n\n> construyendo IA cuidadosa y verificable.\n\n\n> CLIC PARA ABRIR EL DISPLAY.',
    // contact pending (only shown if channels aren't published)
    contactPending: 'Los canales públicos de contacto se activan con el lanzamiento. Este espacio se mantiene intencionalmente vacío en lugar de apuntar a datos de ejemplo.',
    contactComingSoon: 'Los canales de contacto estarán disponibles pronto.',
    evidenceTitle: 'Qué tan fuerte puede afirmar la copia pública los hechos técnicos',
  },
} as const

export type StringKey = keyof typeof STRINGS.en

export type TFunction = (key: StringKey, params?: Record<string, string>) => string

type StringDict = { [K in StringKey]: string }

const dict: Record<Language, StringDict> = STRINGS as unknown as Record<Language, StringDict>

/** Fill {placeholders} in a string. */
function fill(template: string, params?: Record<string, string>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? `{${key}}`)
}

/**
 * The current UI language + a translation function for interface strings.
 * Default is English; the nav toggle switches to Spanish.
 */
export function useI18n() {
  const { language, setLanguage } = useExperience()
  const t = useCallback<TFunction>(
    (key, params) => fill(dict[language][key] ?? dict.en[key], params),
    [language]
  )
  return { language, setLanguage, t }
}