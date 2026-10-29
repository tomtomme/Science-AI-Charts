import React, { useState, useMemo } from 'react';
import { LabEntry, ModelRecord } from '../types';
import { Search, ExternalLink, Cpu, Wrench, Terminal, Layers, HelpCircle, BookOpen, Minus, Plus } from 'lucide-react';

interface LabMatrixViewProps {
  labs: LabEntry[];
  models?: ModelRecord[];
  onSelectLabForBenchmark?: (creatorName: string) => void;
  lang?: 'de' | 'en';
}

type LabGroup = 'all' | 'top10' | 'contender' | 'tweakers' | 'small' | 'harness';
type WeightsFilter = 'all' | 'open' | 'hybrid' | 'closed';

export const WEIGHTS_CONCEPTS = {
  open: {
    id: 'weights-open',
    titleEn: 'Open Weights',
    titleDe: 'Open Weights',
    tagEn: 'Open',
    tagDe: 'Offen',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
    tooltipEn: 'Parameters are downloadable. Users run, inspect, or modify the model on their own hardware.',
    tooltipDe: 'Parameter sind downloadbar. Ausführung, Inspektion und Anpassung auf eigener Hardware.',
    bulletsEn: [
      'Model parameters are published for download.',
      'Execution occurs on user-owned hardware or servers.',
      'Fine-tuning and code inspection are unrestricted by the creator.',
    ],
    bulletsDe: [
      'Die Modellparameter stehen als Download bereit.',
      'Der Betrieb erfolgt auf eigenen Geräten oder Servern.',
      'Code-Inspektion und Anpassungen sind ohne Anbieter-Einschränkungen möglich.',
    ],
    examples: 'Meta (Llama), Alibaba (Qwen), Mistral, DeepSeek',
  },
  hybrid: {
    id: 'weights-hybrid',
    titleEn: 'Hybrid',
    titleDe: 'Hybrid',
    tagEn: 'Hybrid',
    tagDe: 'Hybrid',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    dotClass: 'bg-purple-500',
    tooltipEn: 'The vendor provides both downloadable weights and cloud API models.',
    tooltipDe: 'Der Anbieter vertreibt sowohl downloadbare Modelle als auch Cloud-APIs.',
    bulletsEn: [
      'The vendor maintains two distribution paths simultaneously.',
      'Smaller or baseline models are published as downloads.',
      'Flagship models remain restricted to cloud APIs.',
    ],
    bulletsDe: [
      'Der Anbieter nutzt zwei Vertriebswege parallel.',
      'Kleinere Basismodelle sind als Download verfügbar.',
      'Spitzenmodelle bleiben auf Cloud-Schnittstellen beschränkt.',
    ],
    examples: 'Google (Gemma vs. Gemini), Microsoft (Phi vs. Copilot)',
  },
  closed: {
    id: 'weights-closed',
    titleEn: 'Closed Weights',
    titleDe: 'Closed Weights',
    tagEn: 'Closed',
    tagDe: 'Geschlossen',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dotClass: 'bg-slate-500',
    tooltipEn: 'Parameters remain on vendor servers. Access is strictly via web interface or API.',
    tooltipDe: 'Parameter verbleiben auf Servern des Anbieters. Zugriff nur über API oder Webchat.',
    bulletsEn: [
      'Model parameters remain on vendor servers.',
      'Users interact solely through API calls or web interfaces.',
      'Files cannot be downloaded, inspected, or hosted independently.',
    ],
    bulletsDe: [
      'Die Modellparameter verbleiben auf Servern des Anbieters.',
      'Die Nutzung erfolgt ausschließlich über Schnittstellen (API) oder Webchat.',
      'Ein Download oder unabhängiger Betrieb ist ausgeschlossen.',
    ],
    examples: 'OpenAI (GPT-4o), Anthropic (Claude), xAI (Grok)',
  },
};

export interface GlossaryTermDef {
  id: string;
  termEn: string;
  termDe: string;
  badgeEn: string;
  badgeDe: string;
  shortEn: string;
  shortDe: string;
  detailEn: string;
  detailDe: string;
  category: 'architecture' | 'agentic' | 'infrastructure';
}

export const GLOSSARY_TERMS: GlossaryTermDef[] = [
  {
    id: 'term-llm',
    termEn: 'LLM',
    termDe: 'LLM',
    badgeEn: 'Core Model',
    badgeDe: 'Kernmodell',
    shortEn: 'Large Language Model. Neural network trained on text to predict word tokens.',
    shortDe: 'Großes Sprachmodell. Neuronales Netz, trainiert um Wort-Tokens vorherzusagen.',
    detailEn: 'A deep learning model trained on large text corpora. Computes probabilities for subsequent words. It does not act independently without a harness.',
    detailDe: 'Ein neuronales Netz, das auf großen Textmengen trainiert wurde. Berechnet Wahrscheinlichkeiten für Folgewörter. Ohne Steuerung agiert es nicht selbstständig.',
    category: 'architecture',
  },
  {
    id: 'term-parameter',
    termEn: 'Parameters & Weights',
    termDe: 'Parameter & Gewichte',
    badgeEn: 'Size Metric',
    badgeDe: 'Größenmaß',
    shortEn: 'Numerical values in the neural network storing learned knowledge (Billions B / Trillions T).',
    shortDe: 'Numerische Werte im neuronalen Netz, die das Wissen speichern (Milliarden Mrd. / Billionen Bio.).',
    detailEn: 'Variables adjusted during model training. Higher parameter count requires more compute memory (VRAM) and enables higher reasoning complexity.',
    detailDe: 'Variablen, die beim Training angepasst werden. Mehr Parameter erfordern mehr Rechenspeicher (VRAM) und erlauben komplexere Denkmuster.',
    category: 'architecture',
  },
  {
    id: 'term-token',
    termEn: 'Token',
    termDe: 'Token',
    badgeEn: 'Text Units',
    badgeDe: 'Texteinheiten',
    shortEn: 'Basic unit of text processed by an LLM (typically 3 to 4 characters or parts of a word).',
    shortDe: 'Grundeinheit von Text, die ein LLM verarbeitet (meist 3 bis 4 Zeichen oder Wortsilben).',
    detailEn: 'Words are split into tokens before processing. As a rule of thumb, 1000 tokens equal approximately 750 English words.',
    detailDe: 'Texte werden vor der Verarbeitung in Tokens zerlegt. Als Richtwert entsprechen 1000 Tokens etwa 750 Wörtern.',
    category: 'architecture',
  },
  {
    id: 'term-harness',
    termEn: 'Harness',
    termDe: 'Harness',
    badgeEn: 'Runtime Control',
    badgeDe: 'Laufzeitsteuerung',
    shortEn: 'Software framework connecting the model to tools, memory, execution loops, and safety checks.',
    shortDe: 'Softwaregerüst, das das Modell mit Werkzeugen, Gedächtnis, Schleifen und Rechten verbindet.',
    detailEn: 'The runtime scaffolding around the model. Manages prompt generation, tool registries, file system access, and error retry loops.',
    detailDe: 'Die Laufzeitumgebung um das Modell. Verwaltet Prompts, Werkzeugaufrufe, Dateisystem-Zugriffe und Wiederholungen bei Fehlern.',
    category: 'agentic',
  },
  {
    id: 'term-agent',
    termEn: 'Agent',
    termDe: 'Agent',
    badgeEn: 'Autonomous Loop',
    badgeDe: 'Autonome Schleife',
    shortEn: 'Model + harness running in a loop toward a goal. Can plan, use tools, and execute actions.',
    shortDe: 'Modell + Steuerung (Harness), die in einer Schleife planvoll Werkzeuge nutzt und Aufgaben löst.',
    detailEn: 'An autonomous loop that perceives environment state, plans steps, invokes tools (terminal, browser, APIs), and evaluates results until finished.',
    detailDe: 'Eine Schleife, die den Zustand analysiert, Schritte plant, Werkzeuge (Terminal, Browser, APIs) aufruft und Ergebnisse prüft, bis das Ziel erreicht ist.',
    category: 'agentic',
  },
  {
    id: 'term-ade',
    termEn: 'ADE',
    termDe: 'ADE',
    badgeEn: 'Agentic Editor',
    badgeDe: 'Agenten-Editor',
    shortEn: 'Agentic Development Environment. Code editor with an agent working directly in the project.',
    shortDe: 'Agentic Development Environment. Code-Editor, in dem ein KI-Agent direkt im Projekt arbeitet.',
    detailEn: 'A development editor where an AI coding agent operates as a peer programmer: edits files across the repository, runs commands, and inspects test output.',
    detailDe: 'Ein Code-Editor, in dem ein KI-Agent als Partner arbeitet: Er editiert Dateien im gesamten Projekt, führt Befehle aus und prüft Testergebnisse.',
    category: 'agentic',
  },
  {
    id: 'term-ide',
    termEn: 'IDE',
    termDe: 'IDE',
    badgeEn: 'Development Environment',
    badgeDe: 'Entwicklungsumgebung',
    shortEn: 'Integrated Development Environment. Desktop application combining code editor, build tools, and debugger.',
    shortDe: 'Integrated Development Environment. Desktop-Software mit Code-Editor, Build-Tools und Debugger.',
    detailEn: 'Traditional software application for writing code (e.g. VS Code, PyCharm, Xcode). Often augmented with AI plugins or completions.',
    detailDe: 'Klassische Programmierumgebung (z. B. VS Code, PyCharm, Xcode). Oft durch KI-Erweiterungen für Autovervollständigung ergänzt.',
    category: 'agentic',
  },
  {
    id: 'term-cli',
    termEn: 'CLI',
    termDe: 'CLI',
    badgeEn: 'Terminal',
    badgeDe: 'Terminal',
    shortEn: 'Command Line Interface. Text-based terminal where commands and agents run directly.',
    shortDe: 'Command Line Interface. Textbasiertes Terminal, in dem Befehle und Agenten direkt laufen.',
    detailEn: 'A text-based console without a graphical user interface (GUI). AI CLI tools (e.g. Aider, Claude Code) modify files via terminal commands.',
    detailDe: 'Eine Textkonsole ohne grafische Benutzeroberfläche. KI-CLI-Werkzeuge (z. B. Aider, Claude Code) bearbeiten Code direkt über Terminalbefehle.',
    category: 'agentic',
  },
  {
    id: 'term-api',
    termEn: 'API',
    termDe: 'API',
    badgeEn: 'Network Interface',
    badgeDe: 'Schnittstelle',
    shortEn: 'Application Programming Interface. Protocol to query remote models over the network.',
    shortDe: 'Programmierschnittstelle. Protokoll, um Modelle über das Netzwerk abzufragen.',
    detailEn: 'A standardized HTTP endpoint through which applications transmit prompts and receive structured text responses from servers.',
    detailDe: 'Ein standardisierter HTTP-Endpunkt, über den Anwendungen Prompts senden und strukturierte Antworten von Servern empfangen.',
    category: 'infrastructure',
  },
  {
    id: 'term-cloud',
    termEn: 'Cloud',
    termDe: 'Cloud',
    badgeEn: 'Hosting / Compute',
    badgeDe: 'Rechenzentrum',
    shortEn: 'Remote data centers hosting models on GPU clusters. No local compute required.',
    shortDe: 'Rechenzentren mit GPU-Clustern, die Modelle betreiben. Keine lokale Hardware nötig.',
    detailEn: 'Server infrastructure operated by providers (e.g. AWS, GCP, Azure). Executes model inference remotely without requiring consumer GPU hardware.',
    detailDe: 'Serverinfrastruktur bei Anbietern (z. B. AWS, GCP, Azure). Führt Modellberechnungen aus, ohne dass Nutzer eigene Grafikkarten benötigen.',
    category: 'infrastructure',
  },
  {
    id: 'term-stack',
    termEn: 'Tooling & Agent-Stack',
    termDe: 'Werkzeuge & Agenten-Stack',
    badgeEn: 'Software Layer',
    badgeDe: 'Software-Schicht',
    shortEn: 'The software layers built on top of raw models: SDKs, daily assistants, and coding agents.',
    shortDe: 'Software-Schichten über den reinen Modellen: SDKs, Alltagsassistenten und Coding-Agenten.',
    detailEn: 'The comprehensive software ecosystem that transforms raw neural network weights into practical user applications.',
    detailDe: 'Das gesamte Software-Ökosystem aus Werkzeugen, Bibliotheken und Schnittstellen, das aus reinen Modellgewichten nutzbare Produkte formt.',
    category: 'infrastructure',
  },
];

interface TierDef {
  key: keyof LabEntry['parameterSizes'];
  nameEn: string;
  nameDe: string;
  paramCountEn: string;
  paramCountDe: string;
  level: number; // 1 to 5 for mini scale meter
  colorClass: string;
}

// Ordered strictly from smallest to largest parameter size
const PARAMETER_TIERS: TierDef[] = [
  { key: 'micro', nameEn: 'Micro', nameDe: 'Mikro', paramCountEn: '< 0.5B Parameters', paramCountDe: '< 0,5 Mrd. Parameter', level: 1, colorClass: 'bg-emerald-500' },
  { key: 'mini', nameEn: 'Mini', nameDe: 'Mini', paramCountEn: '< 2B Parameters', paramCountDe: '< 2 Mrd. Parameter', level: 1, colorClass: 'bg-emerald-500' },
  { key: 'tiny', nameEn: 'Tiny', nameDe: 'Winzig', paramCountEn: '< 8B Parameters', paramCountDe: '< 8 Mrd. Parameter', level: 2, colorClass: 'bg-teal-500' },
  { key: 'small', nameEn: 'Small', nameDe: 'Klein', paramCountEn: '< 32B Parameters', paramCountDe: '< 32 Mrd. Parameter', level: 2, colorClass: 'bg-cyan-500' },
  { key: 'medium', nameEn: 'Medium', nameDe: 'Mittel', paramCountEn: '< 128B Parameters', paramCountDe: '< 128 Mrd. Parameter', level: 3, colorClass: 'bg-blue-500' },
  { key: 'large', nameEn: 'Large', nameDe: 'Groß', paramCountEn: '< 256B Parameters', paramCountDe: '< 256 Mrd. Parameter', level: 3, colorClass: 'bg-indigo-500' },
  { key: 'massive', nameEn: 'Massive', nameDe: 'Massiv', paramCountEn: '< 512B Parameters', paramCountDe: '< 512 Mrd. Parameter', level: 4, colorClass: 'bg-violet-500' },
  { key: 'colossal', nameEn: 'Colossal', nameDe: 'Kolossal', paramCountEn: '< 1.5T Parameters', paramCountDe: '< 1,5 Bio. Parameter', level: 4, colorClass: 'bg-purple-500' },
  { key: 'planetary', nameEn: 'Planetary', nameDe: 'Planetar', paramCountEn: '< 5T Parameters', paramCountDe: '< 5 Bio. Parameter', level: 5, colorClass: 'bg-rose-500' },
  { key: 'singularity', nameEn: 'Singularity', nameDe: 'Singularität', paramCountEn: '< 15T Parameters', paramCountDe: '< 15 Bio. Parameter', level: 5, colorClass: 'bg-rose-600' },
  { key: 'godTier', nameEn: 'God Tier', nameDe: 'God Tier', paramCountEn: '< 45T Parameters', paramCountDe: '< 45 Bio. Parameter', level: 5, colorClass: 'bg-amber-500' },
];

export interface SizeCategoryDef {
  key: string;
  nameEn: string;
  nameDe: string;
  shortEn: string;
  shortDe: string;
  descEn: string;
  descDe: string;
  tiers: Array<keyof LabEntry['parameterSizes']>;
  color: string;
  dotClass: string;
  badgeClass: string;
}

// 4 Main Parameter Size Categories + 'All Sizes'
export const SIZE_CATEGORIES: SizeCategoryDef[] = [
  {
    key: 'all',
    nameEn: 'All Sizes',
    nameDe: 'Alle Größen',
    shortEn: 'All Sizes',
    shortDe: 'Alle Größen',
    descEn: 'Show all model sizes',
    descDe: 'Modelle aller Größen anzeigen',
    tiers: [],
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
  },
  {
    key: 'planetary_singularity',
    nameEn: 'Planetary / Singularity',
    nameDe: 'Planetar / Singularität',
    shortEn: 'Planetary / Singularity',
    shortDe: 'Planetar / Singularität',
    descEn: 'Megascale & frontier models (≥ 1.5T to 45T parameters: Planetary, Singularity, God Tier)',
    descDe: 'Frontier- & Megascale-Modelle (≥ 1,5 Bio. bis 45 Bio. Parameter: Planetar, Singularität, God Tier)',
    tiers: ['planetary', 'singularity', 'godTier'],
    color: '#e11d48', // Rose-600
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-600 text-white',
  },
  {
    key: 'massive_colossal',
    nameEn: 'Massive / Colossal',
    nameDe: 'Massiv / Kolossal',
    shortEn: 'Massive / Colossal',
    shortDe: 'Massiv / Kolossal',
    descEn: 'Heavyweight models (256B to 1.5T parameters: Massive, Colossal)',
    descDe: 'Schwergewichte & Großmodelle (256 Mrd. bis 1,5 Bio. Parameter: Massiv, Kolossal)',
    tiers: ['massive', 'colossal'],
    color: '#9333ea', // Purple-600
    dotClass: 'bg-purple-500',
    badgeClass: 'bg-purple-600 text-white',
  },
  {
    key: 'medium_large',
    nameEn: 'Medium / Large',
    nameDe: 'Mittel / Groß',
    shortEn: 'Medium / Large',
    shortDe: 'Mittel / Groß',
    descEn: 'Production & enterprise workhorses (32B to 256B parameters: Medium, Large)',
    descDe: 'Produktions- & Standardmodelle (32 Mrd. bis 256 Mrd. Parameter: Mittel, Groß)',
    tiers: ['medium', 'large'],
    color: '#2563eb', // Blue-600
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-600 text-white',
  },
  {
    key: 'small_tiny',
    nameEn: 'Small / Tiny',
    nameDe: 'Klein / Winzig',
    shortEn: 'Small / Tiny',
    shortDe: 'Klein / Winzig',
    descEn: 'Efficient edge & local models (2B to 32B parameters: Tiny, Small)',
    descDe: 'Effiziente Edge- & Lokalmodelle (2 Mrd. bis 32 Mrd. Parameter: Winzig, Klein)',
    tiers: ['tiny', 'small'],
    color: '#06b6d4', // Cyan-600
    dotClass: 'bg-cyan-500',
    badgeClass: 'bg-cyan-600 text-white',
  },
  {
    key: 'mini_micro',
    nameEn: 'Mini / Micro',
    nameDe: 'Mini / Mikro',
    shortEn: 'Mini / Micro',
    shortDe: 'Mini / Mikro',
    descEn: 'Ultra-compact on-device models (< 0.5B to 2B parameters: Micro, Mini)',
    descDe: 'Ultrakompakte On-Device-Modelle (< 0,5 Mrd. bis 2 Mrd. Parameter: Mikro, Mini)',
    tiers: ['micro', 'mini'],
    color: '#059669', // Emerald-600
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-600 text-white',
  },
];

export interface GranularSizeDef {
  key: string;
  nameEn: string;
  nameDe: string;
  shortEn: string;
  shortDe: string;
  rangeBadgeEn: string;
  rangeBadgeDe: string;
  descEn: string;
  descDe: string;
  tiers: Array<keyof LabEntry['parameterSizes']>;
  color: string;
  dotClass: string;
}

// Granular slider steps: exactly ONE single category per step (from < 0.5B to >= 15T)
export const GRANULAR_SLIDER_STEPS: GranularSizeDef[] = [
  {
    key: 'all',
    nameEn: 'All Sizes',
    nameDe: 'Alle Größen',
    shortEn: 'All Sizes',
    shortDe: 'Alle Größen',
    rangeBadgeEn: 'All',
    rangeBadgeDe: 'Alle',
    descEn: 'Show all model sizes',
    descDe: 'Modelle aller Größen anzeigen',
    tiers: [],
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
  },
  {
    key: 'micro',
    nameEn: 'Micro',
    nameDe: 'Mikro',
    shortEn: 'Micro',
    shortDe: 'Mikro',
    rangeBadgeEn: '< 0.5B',
    rangeBadgeDe: '< 0,5 Mrd.',
    descEn: 'Ultra-compact edge models (< 0.5B parameters: Micro)',
    descDe: 'Ultrakompakte Edge-Modelle (< 0,5 Mrd. Parameter: Mikro)',
    tiers: ['micro'],
    color: '#10b981',
    dotClass: 'bg-emerald-500',
  },
  {
    key: 'mini',
    nameEn: 'Mini',
    nameDe: 'Mini',
    shortEn: 'Mini',
    shortDe: 'Mini',
    rangeBadgeEn: '< 2B',
    rangeBadgeDe: '< 2 Mrd.',
    descEn: 'Mobile & on-device lightweight models (< 2B parameters: Mini)',
    descDe: 'Mobile & On-Device-Leichtgewichte (< 2 Mrd. Parameter: Mini)',
    tiers: ['mini'],
    color: '#10b981',
    dotClass: 'bg-emerald-500',
  },
  {
    key: 'tiny',
    nameEn: 'Tiny',
    nameDe: 'Winzig',
    shortEn: 'Tiny',
    shortDe: 'Winzig',
    rangeBadgeEn: '< 8B',
    rangeBadgeDe: '< 8 Mrd.',
    descEn: 'Efficient edge & local models (< 8B parameters: Tiny)',
    descDe: 'Effiziente Edge- & Lokalmodelle (< 8 Mrd. Parameter: Winzig)',
    tiers: ['tiny'],
    color: '#14b8a6',
    dotClass: 'bg-teal-500',
  },
  {
    key: 'small',
    nameEn: 'Small',
    nameDe: 'Klein',
    shortEn: 'Small',
    shortDe: 'Klein',
    rangeBadgeEn: '< 32B',
    rangeBadgeDe: '< 32 Mrd.',
    descEn: 'Local on-device models (< 32B parameters: Small)',
    descDe: 'Lokale On-Device-Modelle (< 32 Mrd. Parameter: Klein)',
    tiers: ['small'],
    color: '#06b6d4',
    dotClass: 'bg-cyan-500',
  },
  {
    key: 'medium',
    nameEn: 'Medium',
    nameDe: 'Mittel',
    shortEn: 'Medium',
    shortDe: 'Mittel',
    rangeBadgeEn: '< 128B',
    rangeBadgeDe: '< 128 Mrd.',
    descEn: 'Fast production models (< 128B parameters: Medium)',
    descDe: 'Schnelle Produktionsmodelle (< 128 Mrd. Parameter: Mittel)',
    tiers: ['medium'],
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
  },
  {
    key: 'large',
    nameEn: 'Large',
    nameDe: 'Groß',
    shortEn: 'Large',
    shortDe: 'Groß',
    rangeBadgeEn: '< 256B',
    rangeBadgeDe: '< 256 Mrd.',
    descEn: 'Enterprise reasoning models (< 256B parameters: Large)',
    descDe: 'Enterprise Reasoning-Modelle (< 256 Mrd. Parameter: Groß)',
    tiers: ['large'],
    color: '#6366f1',
    dotClass: 'bg-indigo-500',
  },
  {
    key: 'massive',
    nameEn: 'Massive',
    nameDe: 'Massiv',
    shortEn: 'Massive',
    shortDe: 'Massiv',
    rangeBadgeEn: '< 512B',
    rangeBadgeDe: '< 512 Mrd.',
    descEn: 'Heavyweight reasoning & coding models (< 512B parameters: Massive)',
    descDe: 'Schwere Reasoning- & Coding-Modelle (< 512 Mrd. Parameter: Massiv)',
    tiers: ['massive'],
    color: '#8b5cf6',
    dotClass: 'bg-violet-500',
  },
  {
    key: 'colossal',
    nameEn: 'Colossal',
    nameDe: 'Kolossal',
    shortEn: 'Colossal',
    shortDe: 'Kolossal',
    rangeBadgeEn: '< 1.5T',
    rangeBadgeDe: '< 1,5 Bio.',
    descEn: 'Megascale frontier models (< 1.5T parameters: Colossal)',
    descDe: 'Megascale Frontier-Modelle (< 1,5 Bio. Parameter: Kolossal)',
    tiers: ['colossal'],
    color: '#a855f7',
    dotClass: 'bg-purple-500',
  },
  {
    key: 'planetary',
    nameEn: 'Planetary',
    nameDe: 'Planetar',
    shortEn: 'Planetary',
    shortDe: 'Planetar',
    rangeBadgeEn: '< 5T',
    rangeBadgeDe: '< 5 Bio.',
    descEn: 'Super-frontier flagship models (< 5T parameters: Planetary)',
    descDe: 'Super-Frontier-Flaggschiffe (< 5 Bio. Parameter: Planetar)',
    tiers: ['planetary'],
    color: '#e11d48',
    dotClass: 'bg-rose-500',
  },
  {
    key: 'singularity',
    nameEn: 'Singularity',
    nameDe: 'Singularität',
    shortEn: 'Singularity',
    shortDe: 'Singularität',
    rangeBadgeEn: '≥ 15T',
    rangeBadgeDe: '≥ 15 Bio.',
    descEn: 'Highest scale apex frontier models (≥ 15T to 45T parameters: Singularity, God Tier)',
    descDe: 'Höchste Modellstufen (≥ 15 Bio. bis 45 Bio. Parameter: Singularität, God Tier)',
    tiers: ['singularity', 'godTier'],
    color: '#be123c',
    dotClass: 'bg-rose-600',
  },
];

export const GRANULAR_SLIDER_KEYS: string[] = GRANULAR_SLIDER_STEPS.map((s) => s.key);

export const getSizeFilterTiers = (key: string): Array<keyof LabEntry['parameterSizes']> => {
  if (!key || key === 'all') return [];
  const combined = SIZE_CATEGORIES.find((c) => c.key === key);
  if (combined) return combined.tiers;
  const granular = GRANULAR_SLIDER_STEPS.find((s) => s.key === key);
  if (granular) return granular.tiers;
  return [];
};

/**
 * Visual mini scale meter gauge indicating model parameter size (1 to 5 bars)
 */
const MiniScaleMeter: React.FC<{ level: number; colorClass?: string }> = ({
  level,
  colorClass = 'bg-blue-500',
}) => {
  return (
    <div className="flex items-end gap-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((bar) => {
        const heightPct = `${bar * 20}%`;
        const isActive = bar <= level;
        return (
          <span
            key={bar}
            className={`w-0.5 rounded-full transition-colors ${
              isActive ? colorClass : 'bg-slate-200 dark:bg-slate-700'
            }`}
            style={{ height: heightPct }}
          />
        );
      })}
    </div>
  );
};

export const LabMatrixView: React.FC<LabMatrixViewProps> = ({
  labs,
  onSelectLabForBenchmark,
  lang = 'de',
}) => {
  // Default to 'all' as requested
  const [activeGroup, setActiveGroup] = useState<LabGroup>('all');
  const [weightsFilter, setWeightsFilter] = useState<WeightsFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [simplifiedSizeView, setSimplifiedSizeView] = useState<boolean>(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);

  const isSimplifiedView = sizeFilter !== 'all' && simplifiedSizeView;

  // Group counts
  const allCount = labs.length;
  const top10Count = labs.filter((l) => l.group === 'top10').length;
  const contenderCount = labs.filter((l) => l.group === 'contender').length;
  const tweakersCount = labs.filter((l) => l.group === 'tweakers').length;
  const smallCount = labs.filter((l) => l.group === 'small').length;
  const harnessCount = labs.filter((l) => l.group === 'harness').length;

  const handleGroupChange = (group: LabGroup) => {
    setActiveGroup(group);
    if (selectedCountry !== 'all') {
      const targetLabs = group === 'all' ? labs : labs.filter((l) => l.group === group);
      const hasCountry = targetLabs.some((l) => l.country === selectedCountry);
      if (!hasCountry) {
        setSelectedCountry('all');
      }
    }
  };

  // Slider helpers: granular single-category steps (0 to 10)
  const currentSliderIndex = useMemo(() => {
    const directIdx = GRANULAR_SLIDER_KEYS.indexOf(sizeFilter);
    if (directIdx !== -1) return directIdx;
    // Map 2-category-combined pill selections to their base slider positions
    if (sizeFilter === 'planetary_singularity') return 9;
    if (sizeFilter === 'massive_colossal') return 7;
    if (sizeFilter === 'medium_large') return 5;
    if (sizeFilter === 'small_tiny') return 3;
    if (sizeFilter === 'mini_micro') return 1;
    if (sizeFilter === 'small_micro') return 3; // backward compatibility fallback
    return 0;
  }, [sizeFilter]);

  const handleSliderChange = (newIndex: number) => {
    const safeIdx = Math.max(0, Math.min(GRANULAR_SLIDER_KEYS.length - 1, newIndex));
    setSizeFilter(GRANULAR_SLIDER_KEYS[safeIdx]);
  };

  const handleSliderStep = (delta: number) => {
    const nextIdx = Math.max(0, Math.min(GRANULAR_SLIDER_KEYS.length - 1, currentSliderIndex + delta));
    setSizeFilter(GRANULAR_SLIDER_KEYS[nextIdx]);
  };

  // Aggregate distinct countries with flags and lab counts for active group
  const countries = useMemo(() => {
    const targetLabs = activeGroup === 'all' ? labs : labs.filter((l) => l.group === activeGroup);
    const map = new Map<string, { country: string; flag: string; count: number }>();
    targetLabs.forEach((l) => {
      const raw = l.country?.trim();
      if (!raw || raw.toLowerCase().startsWith('small llm')) return;
      const existing = map.get(raw);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(raw, { country: raw, flag: l.countryFlag || '🌐', count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [labs, activeGroup]);

  // Aggregate lab counts per model size category based on active group, weights, and country filter
  const sizeCategoryCounts = useMemo(() => {
    const baseLabs = labs.filter((l) => {
      if (activeGroup !== 'all' && l.group !== activeGroup) return false;
      if (weightsFilter === 'open' && l.weightsType !== 'open') return false;
      if (weightsFilter === 'hybrid' && l.weightsType !== 'hybrid') return false;
      if (weightsFilter === 'closed' && l.weightsType !== 'closed') return false;
      if (selectedCountry !== 'all' && l.country !== selectedCountry) return false;
      return true;
    });

    const counts: Record<string, number> = {
      all: baseLabs.length,
    };

    SIZE_CATEGORIES.forEach((cat) => {
      if (cat.key === 'all') return;
      counts[cat.key] = baseLabs.filter((lab) => {
        return cat.tiers.some((tierKey) => {
          const val = lab.parameterSizes[tierKey];
          return Boolean(val && val.trim() && val.trim() !== '-');
        });
      }).length;
    });

    GRANULAR_SLIDER_STEPS.forEach((step) => {
      if (step.key === 'all') return;
      counts[step.key] = baseLabs.filter((lab) => {
        return step.tiers.some((tierKey) => {
          const val = lab.parameterSizes[tierKey];
          return Boolean(val && val.trim() && val.trim() !== '-');
        });
      }).length;
    });

    return counts;
  }, [labs, activeGroup, weightsFilter, selectedCountry]);

  // Filtered labs list based on Group, Weights Filter, Size Filter, Country, and Search Query
  const filteredLabs = useMemo(() => {
    const list = labs.filter((lab) => {
      // 1. Group filter
      if (activeGroup !== 'all' && lab.group !== activeGroup) return false;

      // 2. Weights filter (Vendor level: All, Open, Hybrid, Closed)
      if (weightsFilter === 'open') {
        if (lab.weightsType !== 'open') return false;
      } else if (weightsFilter === 'hybrid') {
        if (lab.weightsType !== 'hybrid') return false;
      } else if (weightsFilter === 'closed') {
        if (lab.weightsType !== 'closed') return false;
      }

      // 3. Country filter
      if (selectedCountry !== 'all') {
        if (lab.country !== selectedCountry) return false;
      }

      // 4. Model Size Filter (Parameter Size Category or Granular Single Category)
      if (sizeFilter !== 'all') {
        const targetTiers = getSizeFilterTiers(sizeFilter);
        if (targetTiers.length > 0) {
          const hasMatchingTier = targetTiers.some((tierKey) => {
            const val = lab.parameterSizes[tierKey];
            return Boolean(val && val.trim() && val.trim() !== '-');
          });
          if (!hasMatchingTier) return false;
        }
      }

      // 5. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        lab.creator.toLowerCase().includes(q) ||
        lab.country.toLowerCase().includes(q) ||
        (lab.engineName && lab.engineName.toLowerCase().includes(q)) ||
        (lab.basedOn && lab.basedOn.toLowerCase().includes(q)) ||
        (lab.harness && lab.harness.toLowerCase().includes(q)) ||
        (lab.form && lab.form.toLowerCase().includes(q)) ||
        (lab.note && lab.note.toLowerCase().includes(q)) ||
        (lab.famousFor && lab.famousFor.toLowerCase().includes(q)) ||
        (lab.specialties && lab.specialties.toLowerCase().includes(q)) ||
        Object.values(lab.parameterSizes).some((v) => v && v.toLowerCase().includes(q))
      );
    });

    // Always sort labs alphabetically by vendor / creator name (A-Z) across all filter states
    return [...list].sort((a, b) =>
      a.creator.localeCompare(b.creator, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [labs, activeGroup, weightsFilter, sizeFilter, selectedCountry, searchQuery]);

  const scrollToWeightsExplainer = (targetId?: string) => {
    const targetElementId = targetId || 'weights-explainer-section';
    const el = document.getElementById(targetElementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500');
      }, 2500);
    }
  };

  const scrollToGlossary = (targetId?: string) => {
    const targetElementId = targetId || 'glossary-section';
    const el = document.getElementById(targetElementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500');
      }, 2500);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {lang === 'de' ? 'LLM-Labs & Modell-Ökosystem' : 'LLM Labs & Model Ecosystem'}
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {lang === 'de'
              ? 'Strukturierte Übersicht der führenden LLM-Entwickler, ihrer Modellfamilien nach Größenstufen (von Micro/Small bis Singularity) und ihrer Software- & Agenten-Ökosysteme.'
              : 'Structured overview of leading LLM developers, their model families stacked by size tiers (from Micro/Small to Singularity), and their agent software ecosystems.'}
          </p>
        </div>

        {/* Source Link */}
        <div className="shrink-0 flex items-center gap-2">
          <a
            href="https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=355721692#gid=355721692"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title={lang === 'de' ? 'Original-Tabelle in neuem Tab öffnen' : 'Open original spreadsheet in new tab'}
          >
            <span>{lang === 'de' ? 'Original-Sheet' : 'Original Sheet'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Control Bar: Extended Tabs, Open/Closed Toggle & Search */}
      <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Segmented Filter: "All Labs" is first / default on the far left */}
          <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => handleGroupChange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Alle Labore (${allCount})` : `All Labs (${allCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('top10')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'top10'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Top 10 LLM-Labore (${top10Count})` : `Top 10 LLM Labs (${top10Count})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('contender')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'contender'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `24 Herausforderer (${contenderCount})` : `24 Contenders (${contenderCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('tweakers')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'tweakers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `12 Modell-Optimierer (${tweakersCount})` : `12 Model Tweakers (${tweakersCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('small')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'small'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Labore kleiner Modelle (${smallCount})` : `Small Model Labs (${smallCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('harness')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'harness'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Reine Harness-Labore (${harnessCount})` : `Harness Only Labs (${harnessCount})`}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Open / Hybrid / Closed Weights Segmented Toggle Button */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'de' ? 'Gewichte:' : 'Weights:'}</span>
                <button
                  type="button"
                  onClick={() => scrollToWeightsExplainer()}
                  className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                  title={lang === 'de' ? 'Erklärung zu Open, Hybrid und Closed anzeigen' : 'Show explanation of Open, Hybrid, and Closed'}
                  aria-label="Weights explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => setWeightsFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  weightsFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'de' ? 'Alle' : 'All'}
              </button>

              {/* Open Button with Tooltip */}
              <div className="relative group/tip inline-flex">
                <button
                  type="button"
                  onClick={() => setWeightsFilter('open')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    weightsFilter === 'open'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  {lang === 'de' ? 'Offen' : 'Open'}
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/tip:flex flex-col gap-1 w-56 p-2.5 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-[11px] z-50 pointer-events-auto">
                  <div className="flex items-center justify-between text-slate-200 font-semibold border-b border-slate-700 pb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{lang === 'de' ? WEIGHTS_CONCEPTS.open.titleDe : WEIGHTS_CONCEPTS.open.titleEn}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToWeightsExplainer('weights-open');
                      }}
                      className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {lang === 'de' ? 'Details ↓' : 'Details ↓'}
                    </button>
                  </div>
                  <p className="text-slate-300 leading-snug pt-0.5">
                    {lang === 'de' ? WEIGHTS_CONCEPTS.open.tooltipDe : WEIGHTS_CONCEPTS.open.tooltipEn}
                  </p>
                </div>
              </div>

              {/* Hybrid Button with Tooltip */}
              <div className="relative group/tip inline-flex">
                <button
                  type="button"
                  onClick={() => setWeightsFilter('hybrid')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    weightsFilter === 'hybrid'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                  }`}
                >
                  Hybrid
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/tip:flex flex-col gap-1 w-56 p-2.5 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-[11px] z-50 pointer-events-auto">
                  <div className="flex items-center justify-between text-slate-200 font-semibold border-b border-slate-700 pb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>{lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.titleDe : WEIGHTS_CONCEPTS.hybrid.titleEn}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToWeightsExplainer('weights-hybrid');
                      }}
                      className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {lang === 'de' ? 'Details ↓' : 'Details ↓'}
                    </button>
                  </div>
                  <p className="text-slate-300 leading-snug pt-0.5">
                    {lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.tooltipDe : WEIGHTS_CONCEPTS.hybrid.tooltipEn}
                  </p>
                </div>
              </div>

              {/* Closed Button with Tooltip */}
              <div className="relative group/tip inline-flex">
                <button
                  type="button"
                  onClick={() => setWeightsFilter('closed')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    weightsFilter === 'closed'
                      ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de' ? 'Geschlossen' : 'Closed'}
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/tip:flex flex-col gap-1 w-56 p-2.5 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-[11px] z-50 pointer-events-auto">
                  <div className="flex items-center justify-between text-slate-200 font-semibold border-b border-slate-700 pb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>{lang === 'de' ? WEIGHTS_CONCEPTS.closed.titleDe : WEIGHTS_CONCEPTS.closed.titleEn}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToWeightsExplainer('weights-closed');
                      }}
                      className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {lang === 'de' ? 'Details ↓' : 'Details ↓'}
                    </button>
                  </div>
                  <p className="text-slate-300 leading-snug pt-0.5">
                    {lang === 'de' ? WEIGHTS_CONCEPTS.closed.tooltipDe : WEIGHTS_CONCEPTS.closed.tooltipEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Link to Glossary */}
            <button
              type="button"
              onClick={() => scrollToGlossary()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              title={lang === 'de' ? 'Glossar & Begriffs-Erklärungen anzeigen (ADE, Harness, Agent, LLM, CLI etc.)' : 'Show glossary & concept definitions (ADE, Harness, Agent, LLM, CLI etc.)'}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>{lang === 'de' ? 'Glossar' : 'Glossary'}</span>
            </button>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'de'
                    ? 'Lab, Modellfamilie, Tooling oder Land filtern...'
                    : 'Filter by lab, model family, tooling or country...'
                }
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Model Size Filter (Slider & Quick Category Pills) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
          {/* Left: Size Slider with [-] and [+] step buttons and active size indicator */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              <span>{lang === 'de' ? 'Modellgröße:' : 'Model Size:'}</span>
            </div>

            {/* Range slider with step buttons */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSliderStep(-1)}
                disabled={currentSliderIndex === 0}
                aria-label="Decrease model size filter"
                className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                <Minus className="w-3 h-3" />
              </button>

              <input
                type="range"
                min={0}
                max={GRANULAR_SLIDER_KEYS.length - 1}
                step={1}
                value={currentSliderIndex}
                onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                className="w-24 sm:w-36 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                aria-label={lang === 'de' ? 'Granularer Modellgrößen-Schieberegler' : 'Granular model size slider'}
              />

              <button
                type="button"
                onClick={() => handleSliderStep(1)}
                disabled={currentSliderIndex === GRANULAR_SLIDER_KEYS.length - 1}
                aria-label="Increase model size filter"
                className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>

              {/* Active size indicator badge */}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[84px] text-center whitespace-nowrap">
                {sizeFilter === 'all'
                  ? (lang === 'de' ? 'Alle' : 'All')
                  : sizeFilter === 'planetary_singularity'
                  ? (lang === 'de' ? 'Planetar / Sing.' : 'Planetary / Sing.')
                  : sizeFilter === 'massive_colossal'
                  ? (lang === 'de' ? 'Massiv / Kolossal' : 'Massive / Colossal')
                  : sizeFilter === 'medium_large'
                  ? (lang === 'de' ? 'Mittel / Groß' : 'Medium / Large')
                  : sizeFilter === 'small_tiny'
                  ? (lang === 'de' ? 'Klein / Winzig' : 'Small / Tiny')
                  : sizeFilter === 'mini_micro'
                  ? (lang === 'de' ? 'Mini / Mikro' : 'Mini / Micro')
                  : (lang === 'de'
                      ? `${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.nameDe || ''} (${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.rangeBadgeDe || ''})`
                      : `${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.nameEn || ''} (${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.rangeBadgeEn || ''})`)}
              </span>
            </div>
          </div>

          {/* Right: Quick filter buttons for the 5 primary 2-category-combined pills + All */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
            {SIZE_CATEGORIES.map((cat) => {
              const isExact = sizeFilter === cat.key;
              const isSubSelected =
                (cat.key === 'planetary_singularity' && (sizeFilter === 'planetary' || sizeFilter === 'singularity')) ||
                (cat.key === 'massive_colossal' && (sizeFilter === 'massive' || sizeFilter === 'colossal')) ||
                (cat.key === 'medium_large' && (sizeFilter === 'medium' || sizeFilter === 'large')) ||
                (cat.key === 'small_tiny' && (sizeFilter === 'tiny' || sizeFilter === 'small')) ||
                (cat.key === 'mini_micro' && (sizeFilter === 'micro' || sizeFilter === 'mini'));
              const isSelected = isExact || isSubSelected;
              const count = sizeCategoryCounts[cat.key] ?? 0;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSizeFilter(isExact && cat.key !== 'all' ? 'all' : cat.key)}
                  title={lang === 'de' ? cat.descDe : cat.descEn}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isExact
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : isSubSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-2 border-blue-500 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {cat.key !== 'all' && (
                    <span className={`w-2 h-2 rounded-full ${cat.dotClass} shrink-0`} />
                  )}
                  <span>{lang === 'de' ? cat.nameDe : cat.nameEn}</span>
                  <span className={`text-[10px] ${isExact ? 'text-blue-100' : isSubSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}

            {/* Clear size filter button if active */}
            {sizeFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSizeFilter('all')}
                className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer shrink-0"
                title={lang === 'de' ? 'Größenfilter aufheben' : 'Clear size filter'}
              >
                ✕ {lang === 'de' ? 'Zurücksetzen' : 'Reset'}
              </button>
            )}
          </div>
        </div>

        {/* Informative banner when a specific size filter is active */}
        {sizeFilter !== 'all' && (() => {
          const activeInfo =
            GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter) ||
            SIZE_CATEGORIES.find((c) => c.key === sizeFilter);
          return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                <span className="font-bold shrink-0">
                  {lang === 'de' ? activeInfo?.nameDe : activeInfo?.nameEn}:
                </span>
                <span className="text-blue-700 dark:text-blue-300 truncate">
                  {lang === 'de' ? activeInfo?.descDe : activeInfo?.descEn}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSimplifiedSizeView((prev) => !prev)}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  title={
                    lang === 'de'
                      ? 'Karten auf Vendor, Modellfamilie & gewähltes Modell reduzieren oder Vollansicht anzeigen'
                      : 'Toggle reduced cards (Vendor, Model Family & selected model) vs. full cards'
                  }
                >
                  {simplifiedSizeView
                    ? (lang === 'de' ? 'Kompakte Ansicht: An' : 'Compact View: On')
                    : (lang === 'de' ? 'Vollansicht: An' : 'Full View: On')}
                </button>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {filteredLabs.length} {lang === 'de' ? 'Labore' : 'labs'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Country Filter Strip (Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs scrollbar-thin">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <span>🌐</span>
            <span>{lang === 'de' ? 'Land:' : 'Country:'}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedCountry('all')}
            title={lang === 'de' ? 'Alle Länder (alphabetisch nach Vendor-Name sortiert)' : 'All Countries (sorted alphabetically by vendor name)'}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCountry === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {lang === 'de' ? 'Alle Länder (A-Z)' : 'All Countries (A-Z)'}
          </button>
          {countries.map((c) => {
            const isSelected = selectedCountry === c.country;
            return (
              <button
                key={c.country}
                type="button"
                onClick={() => setSelectedCountry(isSelected ? 'all' : c.country)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.country}</span>
                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  ({c.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Lab Cards (Responsive 1 to 4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLabs.map((lab) => {
          const isExpanded = expandedLabId === lab.id;

          // Collect available model size tiers for this lab, strictly ordered from smallest to largest
          const availableTiers = PARAMETER_TIERS.filter((tier) => {
            const val = lab.parameterSizes[tier.key];
            return Boolean(val && val.trim() && val.trim() !== '-');
          });

          // In simplified view (when size filter is active), show only the models in the selected size category or granular step
          const targetTiers = getSizeFilterTiers(sizeFilter);
          const displayTiers =
            isSimplifiedView && targetTiers.length > 0
              ? availableTiers.filter((tier) => targetTiers.includes(tier.key))
              : availableTiers;

          return (
            <div
              key={lab.id}
              className={`flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs hover:shadow-md ${
                isSimplifiedView ? 'p-3.5' : 'p-4'
              }`}
            >
              <div>
                {/* Lab Card Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none" title={lab.country}>
                      {lab.countryFlag}
                    </span>
                    <div>
                      {onSelectLabForBenchmark ? (
                        <button
                          type="button"
                          onClick={() => onSelectLabForBenchmark(lab.creator)}
                          className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors text-left cursor-pointer"
                          title={lang === 'de' ? `Benchmark-Modelle von ${lab.creator} anzeigen` : `Show benchmark models for ${lab.creator}`}
                        >
                          <span>{lab.creator}</span>
                        </button>
                      ) : (
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {lab.creator}
                        </h3>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {lab.country}
                      </div>
                    </div>
                  </div>

                  {/* Weights Badge with anchor link to explainer (hidden in compact size view) */}
                  {!isSimplifiedView && lab.weightsType && (
                    <button
                      type="button"
                      onClick={() => scrollToWeightsExplainer(`weights-${lab.weightsType}`)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                        lab.weightsType === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : lab.weightsType === 'hybrid'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                      title={
                        lab.weightsType === 'open'
                          ? (lang === 'de' ? WEIGHTS_CONCEPTS.open.tooltipDe : WEIGHTS_CONCEPTS.open.tooltipEn)
                          : lab.weightsType === 'hybrid'
                          ? (lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.tooltipDe : WEIGHTS_CONCEPTS.hybrid.tooltipEn)
                          : (lang === 'de' ? WEIGHTS_CONCEPTS.closed.tooltipDe : WEIGHTS_CONCEPTS.closed.tooltipEn)
                      }
                    >
                      {lab.weightsType === 'open'
                        ? (lang === 'de' ? 'Offen' : 'Open')
                        : lab.weightsType === 'hybrid'
                        ? 'Hybrid'
                        : (lang === 'de' ? 'Geschlossen' : 'Closed')}
                    </button>
                  )}
                </div>

                {/* Primary Engine / ChatBot name or Harness Only Lab */}
                {(lab.engineName || lab.harness) && lab.engineName !== '-' && (
                  <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                      {lab.group === 'harness'
                        ? (lang === 'de' ? 'Reines Harness-Lab' : 'Harness Only Lab')
                        : lang === 'de'
                        ? 'Modell-Familie'
                        : 'Model Family'}
                    </div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {lab.group === 'harness' ? (lab.harness || lab.engineName) : lab.engineName}
                    </div>
                  </div>
                )}

                {/* Group: Harness Only Labs Special Overview (hidden in simplified size view) */}
                {!isSimplifiedView && lab.group === 'harness' && (
                  <div className="space-y-2 mb-3">
                    {lab.form && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-500 text-[11px]">Form:</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-800 dark:text-slate-200">
                          {lab.form}
                        </span>
                      </div>
                    )}
                    {lab.note && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {lang === 'de' ? 'Hinweis: ' : 'Note: '}
                        </span>
                        <span>{lab.note}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Group: Model Tweakers - Based on OpenWeights note (hidden in simplified size view) */}
                {!isSimplifiedView && lab.group === 'tweakers' && lab.basedOn && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 mb-2.5">
                    <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      {lang === 'de' ? 'Basiert auf OpenWeights' : 'Based on Open Weights'}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {lab.basedOn}
                    </div>
                  </div>
                )}

                {/* Famous for / Specialties (hidden in simplified size view) */}
                {!isSimplifiedView && lab.group !== 'harness' && (lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}` && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2.5 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {lab.famousFor
                        ? (lang === 'de' ? 'Bekannt für: ' : 'Famous for: ')
                        : (lang === 'de' ? 'Besonderheiten: ' : 'Specialties: ')}
                    </span>
                    <span>{lab.famousFor || lab.specialties}</span>
                  </div>
                )}

                {/* Models */}
                {displayTiers.length > 0 && (
                  <div className={`space-y-1 ${isSimplifiedView ? 'mb-1' : 'mb-3'}`}>
                    <div className="flex flex-col gap-1">
                      {displayTiers.map((tier) => {
                        const modelVal = lab.parameterSizes[tier.key];
                        if (!modelVal) return null;

                        // Check open/closed status for this specific size or lab
                        const isOpen =
                          lab.openWeights && lab.openWeights[tier.key] !== undefined
                            ? lab.openWeights[tier.key]
                            : lab.weightsType === 'open';

                        // Check if this tier matches the active size category or granular step filter
                        const isMatchingSizeFilter =
                          sizeFilter !== 'all' &&
                          getSizeFilterTiers(sizeFilter).includes(tier.key);

                        return (
                          <div
                            key={tier.key}
                            className={`group relative flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
                              isSimplifiedView
                                ? 'bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 shadow-2xs'
                                : isMatchingSizeFilter
                                ? 'bg-blue-50/90 dark:bg-blue-950/60 border-2 border-blue-500 shadow-xs'
                                : 'bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                          >
                            {/* Left: Mini Scale Meter + Friendly Tier Name */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <MiniScaleMeter level={tier.level} colorClass={tier.colorClass} />
                              <span
                                className={`font-bold text-[11px] cursor-help ${
                                  isSimplifiedView
                                    ? 'text-blue-900 dark:text-blue-200'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {lang === 'de' ? tier.nameDe : tier.nameEn}
                              </span>

                              {/* Tooltip on hover showing parameter count */}
                              <div className="absolute left-2 -top-8 hidden group-hover:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg text-[10px] font-mono pointer-events-none z-30 whitespace-nowrap">
                                <span className="font-bold">{lang === 'de' ? tier.nameDe : tier.nameEn}:</span>
                                <span>{lang === 'de' ? tier.paramCountDe : tier.paramCountEn}</span>
                              </div>
                            </div>

                            {/* Center: Model Name(s) */}
                            <span
                              className={`font-mono text-[11px] text-right truncate flex-1 ${
                                isSimplifiedView
                                  ? 'font-bold text-slate-900 dark:text-slate-100'
                                  : 'font-semibold text-slate-800 dark:text-slate-200'
                              }`}
                              title={modelVal}
                            >
                              {modelVal}
                            </span>

                            {/* Right: Open / Closed Badge (hidden in compact size view) */}
                            {!isSimplifiedView && isOpen !== undefined && (
                              <span
                                className={`text-[8.5px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${
                                  isOpen
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                              >
                                {isOpen ? (lang === 'de' ? 'Offen' : 'Open') : (lang === 'de' ? 'Geschlossen' : 'Closed')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tooling / Agents Collapsible Details (hidden in simplified view) */}
                {!isSimplifiedView && (lab.codingAgent || lab.dailyAgent || lab.harnessSdk || lab.subscriptionTiers) && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedLabId(isExpanded ? null : lab.id)}
                      className="w-full flex items-center justify-between py-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold cursor-pointer transition-colors group select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="group-hover:underline">
                          {lang === 'de' ? 'Werkzeuge & Agenten-Stack' : 'Tooling & Agent-Stack'}
                        </span>
                      </span>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal normal-case tracking-normal flex items-center gap-1">
                        <span>{isExpanded ? (lang === 'de' ? 'ausblenden' : 'hide') : (lang === 'de' ? 'Details' : 'Details')}</span>
                        <span className="text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                      </span>
                    </button>

                    {/* Full tooling and agent stack revealed when clicked */}
                    {isExpanded && (
                      <div className="text-xs space-y-1.5 pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg transition-all">
                        {lab.codingAgent && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">
                              {lang === 'de' ? 'Coding-Agent:' : 'Coding Agent:'}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.codingAgent}
                            </span>
                          </div>
                        )}
                        {lab.dailyAgent && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">
                              {lang === 'de' ? 'Alltags-Agent:' : 'Daily Agent:'}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.dailyAgent}
                            </span>
                          </div>
                        )}
                        {lab.harnessSdk && (
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">
                              Harness / SDK:
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.harnessSdk}
                            </span>
                          </div>
                        )}
                        {lab.subscriptionTiers && (
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">
                              {lang === 'de' ? 'Abo-Stufen:' : 'Subscription Tiers:'}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.subscriptionTiers}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredLabs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            {lang === 'de'
              ? 'Keine LLM-Labs gefunden, die den Filterkriterien entsprechen.'
              : 'No LLM labs found matching the search criteria.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveGroup('all');
              setSelectedCountry('all');
              setWeightsFilter('all');
              setSizeFilter('all');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            {lang === 'de' ? 'Alle Filter zurücksetzen' : 'Reset all filters'}
          </button>
        </div>
      )}

      {/* Weights Concepts Explainer Section */}
      <section
        id="weights-explainer-section"
        className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        aria-label={lang === 'de' ? 'Erklärung der Bereitstellungsmodelle' : 'Distribution models explanation'}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {lang === 'de' ? 'Konzepte: Open vs. Hybrid vs. Closed' : 'Concepts: Open vs. Hybrid vs. Closed'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {lang === 'de' ? 'Definition der Bereitstellungs- und Betriebsmodelle' : 'Definition of model distribution and access models'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Open Weights Card */}
          <div
            id="weights-open"
            className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 transition-all scroll-mt-20"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.open.titleDe : WEIGHTS_CONCEPTS.open.titleEn}</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                {lang === 'de' ? 'Offen' : 'Open'}
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mb-3">
              {(lang === 'de' ? WEIGHTS_CONCEPTS.open.bulletsDe : WEIGHTS_CONCEPTS.open.bulletsEn).map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-emerald-500 shrink-0 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/40 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Beispiele: ' : 'Examples: '}
              </span>
              <span>{WEIGHTS_CONCEPTS.open.examples}</span>
            </div>
          </div>

          {/* Hybrid Card */}
          <div
            id="weights-hybrid"
            className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 transition-all scroll-mt-20"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.titleDe : WEIGHTS_CONCEPTS.hybrid.titleEn}</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                Hybrid
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mb-3">
              {(lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.bulletsDe : WEIGHTS_CONCEPTS.hybrid.bulletsEn).map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-purple-500 shrink-0 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-purple-100 dark:border-purple-900/40 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Beispiele: ' : 'Examples: '}
              </span>
              <span>{WEIGHTS_CONCEPTS.hybrid.examples}</span>
            </div>
          </div>

          {/* Closed Weights Card */}
          <div
            id="weights-closed"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 transition-all scroll-mt-20"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.closed.titleDe : WEIGHTS_CONCEPTS.closed.titleEn}</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                {lang === 'de' ? 'Geschlossen' : 'Closed'}
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mb-3">
              {(lang === 'de' ? WEIGHTS_CONCEPTS.closed.bulletsDe : WEIGHTS_CONCEPTS.closed.bulletsEn).map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-slate-400 shrink-0 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Beispiele: ' : 'Examples: '}
              </span>
              <span>{WEIGHTS_CONCEPTS.closed.examples}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Glossary & Key Concepts Explainer Section */}
      <section
        id="glossary-section"
        className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        aria-label={lang === 'de' ? 'Glossar und Fachbegriffe' : 'Glossary and key terms'}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {lang === 'de' ? 'Glossar: Fachbegriffe & Abkürzungen' : 'Glossary: Key AI Concepts & Acronyms'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {lang === 'de'
              ? 'Kurze, sachliche Definitionen der wichtigsten Kernbegriffe'
              : 'Short, factual definitions for key model and ecosystem terms'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {GLOSSARY_TERMS.map((term) => (
            <div
              key={term.id}
              id={term.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all scroll-mt-20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {lang === 'de' ? term.termDe : term.termEn}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {lang === 'de' ? term.badgeDe : term.badgeEn}
                  </span>
                </div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 leading-snug mb-2">
                  {lang === 'de' ? term.shortDe : term.shortEn}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'de' ? term.detailDe : term.detailEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
