import React, { useState, useMemo } from 'react';
import { LabEntry, ModelRecord } from '../types';
import { Search, ExternalLink, Cpu, Wrench, Terminal, Layers, HelpCircle, BookOpen, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { Tooltip } from './Tooltip';

export type LabGroup = 'all' | 'top10' | 'contender' | 'tweakers' | 'small' | 'harness';

export interface LabMatrixViewProps {
  labs: LabEntry[];
  models?: ModelRecord[];
  onSelectLabForBenchmark?: (creatorName: string) => void;
  lang?: 'de' | 'en';
  activeGroup?: LabGroup;
  onActiveGroupChange?: (group: LabGroup) => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  hideHeaderControls?: boolean;
}

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
    examples: 'Alibaba (Qwen), DeepSeek, Zhipu (GLM), Mistral, Nvidia (Nemotron)',
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
    examples: 'Google (Gemma vs. Gemini), OpenAI, xAI (Grok), Microsoft (Phi vs. MAI)',
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
    examples: 'Anthropic (Claude), Amazon (Nova), Inception (Mercury)',
  },
};

export type GlossaryCategory =
  | 'foundations'
  | 'statistics'
  | 'architecture'
  | 'agentic'
  | 'evaluation'
  | 'infrastructure';

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
  category: GlossaryCategory;
}

export const GLOSSARY_TERMS: GlossaryTermDef[] = [
  // 1. Wissenschaftliche & Allgemeine Modellbegriffe
  {
    id: 'term-model-general',
    termEn: 'Model (General / Scientific Concept)',
    termDe: 'Modell (Allgemein / Wissenschaftstheorie)',
    badgeEn: 'Scientific Concept',
    badgeDe: 'Wissenschaftstheorie',
    shortEn: 'A deliberate simplification of reality (like a road map) to understand, explain, or predict complex phenomena.',
    shortDe: 'Eine bewusste Vereinfachung der Wirklichkeit (wie eine Landkarte), um Zusammenhänge zu verstehen, zu erklären oder vorherzusagen.',
    detailEn: 'Foundational rule: "The map is not the territory; it is useful precisely because it omits trees and pebbles." A 1:1 scale map would be unreadable and useless. In cognitive psychology, models are everywhere (e.g. the multi-store memory model by Atkinson & Shiffrin): it is not a physical box inside the skull, but an abstract framework that explains observable behavior. Every scientific model filters out noise to illuminate the critical drivers.',
    detailDe: 'Grundsatz: „Eine Landkarte ist nur deshalb nützlich, weil sie nicht jeden einzelnen Baum und Grashalm abbildet.“ Eine Karte im Maßstab 1:1 wäre unbrauchbar. In der Psychologie begegnen uns Modelle überall – etwa das Mehrspeichermodell des Gedächtnisses (Sensorik → Arbeitsgedächtnis → Langzeitgedächtnis): Es ist kein physischer Kasten im Gehirn, sondern ein gedankliches Hilfskonstrukt, das beobachtbares Verhalten erklärt. Jedes wissenschaftliche Modell filtert Störrauschen heraus, um die entscheidenden Hebel sichtbar zu machen.',
    category: 'foundations',
  },
  {
    id: 'term-model',
    termEn: 'Model (AI & Large Language Model)',
    termDe: 'Modell (KI & Sprachmodell / LLM)',
    badgeEn: 'Machine Learning',
    badgeDe: 'Künstliche Intelligenz',
    shortEn: 'A massive mathematical association network of billions of learned knobs (weights) trained to produce probable text continuations.',
    shortDe: 'Ein mathematisches Assoziationsnetz aus Milliarden gelernten Stellschrauben (Gewichten), das Texteingaben in passende Fortsetzungen übersetzt.',
    detailEn: 'Analogy: Like an immensely well-read smartphone predictive text engine that digested libraries of books, research papers, and code. It possesses no consciousness or personal intent; rather, it computes statistical word associations. Without an execution scaffold (harness), it remains a passive text-generation tool.',
    detailDe: 'Metapher: Wie ein extrem belesener Text-Vervollständiger auf dem Smartphone, der Millionen Fachbücher, Webseiten und Programmcode gelesen hat. Es „denkt“ nicht mit Bewusstsein wie ein Mensch, sondern berechnet nach statistischer Mustererkennung, welches nächste Wort (Token) am besten an die bisherigen Wörter anschließt. Ohne Steuerung (Harness) bleibt es ein stummes Textausgabe-Werkzeug.',
    category: 'architecture',
  },

  // 2. Statistische Modelle (aus den Modell-Slider Pop-ups)
  {
    id: 'term-linear-regression',
    termEn: 'Linear Regression (OLS Trend Model)',
    termDe: 'Lineare Regression (OLS-Trendmodell)',
    badgeEn: 'Statistical Model',
    badgeDe: 'Statistisches Modell',
    shortEn: 'The rigid wooden ruler: draws a straight line through a cloud of data points to estimate the average direction of change.',
    shortDe: 'Das starre Holzlineal: Zieht eine gerade Linie mitten durch eine Punktwolke, um die durchschnittliche Entwicklungsrichtung zu schätzen.',
    detailEn: 'Analogy: Laying a rigid wooden ruler across scattered data points such that squared distances to the edge are minimized (Ordinary Least Squares). Assumes a constant pace: each unit of time or compute yields an identical score gain. Highly intuitive, but blinds itself to saturation, plateaus, or exponential surges.',
    detailDe: 'Metapher: Man legt ein starres Holzlineal so zwischen verstreute Punkte auf Papier, dass die Gesamtabstände aller Punkte zur Kante minimal werden (Methode der kleinsten Quadrate / OLS). Die Grundannahme lautet: „Gleichmäßiger Takt – jede Einheit Zeit oder Rechenaufwand bringt einen festen Punktgewinn.“ Vorteil: Äußerst leicht zu verstehen und zu interpretieren (Steigung). Nachteil: Scheitert, wenn Entwicklungen abflachen, explodieren oder Kurven schlagen.',
    category: 'statistics',
  },
  {
    id: 'term-polynomial-regression',
    termEn: 'Polynomial Regression (Curvilinear Model)',
    termDe: 'Polynomielle Regression (Kurvenmodell)',
    badgeEn: 'Statistical Model',
    badgeDe: 'Statistisches Modell',
    shortEn: 'The bendable wire: flexes into parabolic arcs, inflection points, and slowdowns in the data trajectory.',
    shortDe: 'Der biegsame Draht statt des starren Lineals: Kann Bögen, Wendepunkte und Verlangsamungen im Trendverlauf nachzeichnen.',
    detailEn: 'Analogy: Swapping the rigid ruler for a bendable metal curve. Degree 2 permits a parabolic arch (initial burst followed by diminishing returns); Degree 3 permits an S-curve (inflection from takeoff to plateau). Caution: higher degrees risk overfitting by chasing random noise instead of real signal.',
    detailDe: 'Metapher: Statt eines Holzlineals verwendet man einen biegsamen Metalldraht. Der Parameter „Grad“ legt fest, wie oft der Draht die Richtung wechseln darf: Grad 2 erlaubt einen Bogen (Parabel, z. B. steiler Start mit späterer Ermüdung), Grad 3 einen S-förmigen Wendepunkt (langsamer Beginn, steiler Sprint, anschließendes Plateau). Psychologische Warnung: Wählt man einen zu hohen Grad, schmiegt sich der Draht an jeden einzelnen Zufallsausreißer an (Überanpassung / Overfitting) und verliert jede Vorhersagekraft.',
    category: 'statistics',
  },
  {
    id: 'term-loess-smoothing',
    termEn: 'LOESS Smoothing (Locally Estimated Smoothing)',
    termDe: 'LOESS-Glättung (Lokal gewichtetes Modell)',
    badgeEn: 'Statistical Model',
    badgeDe: 'Statistisches Modell',
    shortEn: 'The hiker with a magnifying glass: computes moving averages from immediate neighbors step-by-step without imposing a rigid global formula.',
    shortDe: 'Die Wanderin mit der Lupe: Berechnet an jeder Stelle einen gleitenden Mittelwert aus der direkten Nachbarschaft, ganz ohne starre Weltformel.',
    detailEn: 'Analogy: A hiker walking along the timeline with a magnifying glass. At each step, she pauses and inspects only the data points in her immediate vicinity. Closer neighbors carry heavy weight; distant ones fade out. The "span" parameter is the focal width: small spans (30%) detect sharp local turning points; wide spans (80%) smooth fluctuations into a gentle rolling wave.',
    detailDe: 'Metapher: Eine Wanderin geht Schritt für Schritt die Zeitachse entlang. An jedem Punkt nimmt sie die Lupe und betrachtet nur die Modelle im unmittelbaren Umkreis. Nahe Nachbarn wiegen schwer, weit entfernte Punkte werden ignoriert. Der Parameter „Span“ (Fensterbreite) ist die Zoomstufe der Lupe: Ein kleiner Span (z. B. 30 %) reagiert feinfühlig auf jeden lokalen Innovationssprung; ein großer Span (z. B. 80 %) glättet alles zu einer ruhigen Gesamtwelle.',
    category: 'statistics',
  },
  {
    id: 'term-confidence-band',
    termEn: '95% Confidence Band (Uncertainty Ribbon)',
    termDe: '95 %-Konfidenzband (Statistischer Unsicherheitsbereich)',
    badgeEn: 'Statistical Precision',
    badgeDe: 'Schätzgenauigkeit',
    shortEn: 'The headlight beam flanking a trend line: visually reveals where the true population trend lies with 95% statistical confidence.',
    shortDe: 'Der Scheinwerferkegel um die Trendlinie: Zeigt bildhaft, wo der wahre Trend mit 95 % statistischer Wahrscheinlichkeit liegt.',
    detailEn: 'Analogy: A car headlight cutting through fog. Where data points cluster densely, the beam narrows into a tight, confident corridor. Where data is scarce or volatile, the beam fans out widely into a cone, warning researchers: "Caution, estimation variance is high here due to sparse observations."',
    detailDe: 'Metapher: Ein Autoscheinwerfer im Nebel. Wo viele Testdaten dicht beieinander liegen (z. B. bei häufig getesteten Modellen), bündelt sich das Licht zu einem schmalen, verlässlichen Streifen: Wir sind uns statistisch sehr sicher. Wo Daten spärlich sind oder wild streuen, weitet sich der Kegel trichterförmig auf: Das breite schattierte Band warnt uns: „Vorsicht, hier beruht die Schätzung auf wenigen Datenpunkten!“',
    category: 'statistics',
  },
  {
    id: 'term-correlation',
    termEn: 'Correlation (Pearson r vs. Spearman Rho)',
    termDe: 'Korrelation (Pearson r vs. Spearman Rho)',
    badgeEn: 'Association Metric',
    badgeDe: 'Zusammenhangsmaß',
    shortEn: 'Dance partners in comparison: measures whether two variables move along a locked straight line or strictly by relative rank order.',
    shortDe: 'Tanzpartner im Vergleich: Misst, ob zwei Merkmale starr auf einer Geraden marschieren (Linear) oder rein nach Rangfolge gekoppelt sind (Monoton).',
    detailEn: 'Analogy: Dance partners moving across the floor. Pearson r checks for locked-step linear progression along a line. Spearman Rho simply checks rank hierarchy: "Did a larger input result in a higher place?", regardless of step sizes. Key psychological advantage: rogue outliers that warp Pearson leave Spearman Rho completely stable.',
    detailDe: 'Metapher: Tanzschritte auf dem Parkett. Pearson r prüft den starren Gleichschritt auf einer Geraden (doppelte Rechenkraft = exakt doppelte Punktzahl). Spearmans Rho ist pragmatischer: Es prüft nur die Rangfolge („Wer mehr lernt, landet weiter vorn“), egal ob in Schritten oder Sprüngen. Riesiger Vorteil von Spearman Rho in der empirischen Psychologie: Einzelne extreme Ausreißer verzerren Pearson r dramatisch, lassen Spearman Rho aber völlig unberührt.',
    category: 'statistics',
  },

  // 3. Evaluation & Meilensteine
  {
    id: 'term-frontier',
    termEn: 'Frontier Models (Pareto Boundary / Record Wall)',
    termDe: 'Pionier-Front (Pareto-Grenze / Rekordwand)',
    badgeEn: 'Efficiency Frontier',
    badgeDe: 'Effizienzgrenze',
    shortEn: 'The historical world-record wall: connects only those breakthrough models that set unmatched benchmarks at their time.',
    shortDe: 'Die ewige Bestenliste: Verbindet nur diejenigen Modelle, die zum Zeitpunkt ihres Erscheinens unübertroffen waren.',
    detailEn: 'Analogy: The Olympic world-record progression wall. A model qualifies as a pioneer only if no prior model achieved a higher score on that date. Graphically forms an ascending staircase of genuine breakthroughs; points below represent capable models that did not push the frontier forward.',
    detailDe: 'Metapher: Die Rekordtafel bei den Olympischen Spielen. Ein Modell ist ein „Pionier“, wenn es zum Zeitpunkt seiner Veröffentlichung kein anderes Modell gab, das gleichzeitig besser war. Im Diagramm erzeugt dies eine ansteigende Treppe nach oben: Jeder Sprung markiert einen echten Meilenstein des technisch Machbaren. Alle Punkte unterhalb der Linie waren solide Modelle, haben aber die historische Leistungsgrenze nicht verschoben.',
    category: 'evaluation',
  },
  {
    id: 'term-benchmark',
    termEn: 'Benchmark (Standardized Test Battery)',
    termDe: 'Benchmark (Standardisierter Leistungstest)',
    badgeEn: 'Standardized Test',
    badgeDe: 'Testbatterie',
    shortEn: 'Standardized test battery: a reproducible suite of tasks used to compare model abilities under controlled conditions.',
    shortDe: 'Standardisierte Testbatterie: Ein reproduzierbarer Aufgabenkatalog, um Modelle unter kontrollierten Bedingungen zu vergleichen.',
    detailEn: 'Analogy: A standardized psychometric battery (such as the WAIS intelligence scale). Every subject receives the exact same items under strictly identical conditions to produce objective, reproducible comparisons of reasoning and problem-solving skills.',
    detailDe: 'Metapher: Ein psychologischer Intelligenztest (wie der HAWIK oder die Raven-Matrizen). Allen Modellen werden exakt dieselben Aufgaben unter identischen Laborbedingungen gestellt. Das verhindert Ausreden und macht messbar, welches Modell logisch schlussfolgern, programmieren oder Fachwissen abrufen kann.',
    category: 'evaluation',
  },
  {
    id: 'term-eval',
    termEn: 'Eval (Empirical Assessment)',
    termDe: 'Evaluation (Empirische Güteprüfung)',
    badgeEn: 'Performance Assessment',
    badgeDe: 'Leistungsbewertung',
    shortEn: 'Empirical quality control: systematic measurement of accuracy, logical validity, and reliability in model outputs.',
    shortDe: 'Empirische Gütekontrolle: Die systematische Überprüfung, wie wahrheitsgetreu, logisch und nützlich Modellausgaben sind.',
    detailEn: 'Analogy: Double-blind sensory trials. Spans automated unit checks to blind pairwise evaluations (e.g. Chatbot Arena Elo ratings), where human raters judge two anonymized answers side-by-side without knowing which system generated which output.',
    detailDe: 'Metapher: Die Doppelblindstudie in der Psychologie oder Blindverkostung in der Sensorik. Reicht von automatischen Richtig/Falsch-Vergleichen bis hin zu Blindvergleichen (wie in der Chatbot Arena), bei denen zwei anonyme Modellantworten nebeneinander gezeigt werden und Menschen abstimmen, welche Antwort überzeugender ist.',
    category: 'evaluation',
  },
  {
    id: 'term-saturation-problem',
    termEn: 'Saturation Problem (Ceiling Effect)',
    termDe: 'Saturation-Problem (Deckeneffekt)',
    badgeEn: 'Ceiling Effect',
    badgeDe: 'Test-Deckeneffekt',
    shortEn: 'The psychometric ceiling effect: when tests become too easy and top models cluster near 100%, erasing discriminatory power.',
    shortDe: 'Der Deckeneffekt in der Testtheorie: Wenn ein Test so leicht wird, dass alle Spitzenmodelle fast 100 % erreichen und nicht mehr trennbar sind.',
    detailEn: 'Analogy: An exam where 90% of students receive an A+. The test hits a ceiling and loses its discriminatory power, making it impossible to separate true mastery from good preparation. Older benchmarks face this saturation, forcing researchers to design harder, uncontaminated tests.',
    detailDe: 'Metapher: Eine Statistik-Klausur, in der fast alle Studierenden eine 1,0 schreiben. Der Test verliert seine Trennschärfe: Man kann die Spitzenkönner nicht mehr vom soliden Durchschnitt unterscheiden. Ältere KI-Benchmarks wie MMLU oder GSM8K leiden unter diesem Deckeneffekt, weshalb Forscher ständig schwerere Tests (wie FrontierMath) entwickeln müssen.',
    category: 'evaluation',
  },

  // 4. KI- & LLM-Architektur
  {
    id: 'term-llm',
    termEn: 'LLM (Large Language Model)',
    termDe: 'LLM (Großes Sprachmodell)',
    badgeEn: 'Foundation Model',
    badgeDe: 'Kernmodell',
    shortEn: 'Large Language Model. A neural network trained on vast text corpora to predict probabilistic sequences of word tokens.',
    shortDe: 'Großes Sprachmodell. Ein gigantischer Textgenerator, der Wortbausteine auf Basis statistischer Wahrscheinlichkeiten aneinanderreiht.',
    detailEn: 'Analogy: A vast associative memory network. An LLM possesses neither consciousness nor intent; having digested terabytes of text, it knows with uncanny precision which words associate with which contexts, similar to human word association. Without an operational harness, it cannot take independent actions.',
    detailDe: 'Metapher: Ein Assoziationsgedächtnis gigantischen Ausmaßes. Ein LLM hat keine Gefühle, keine Absichten und kein Weltwissen wie ein Mensch. Es hat Millionen von Texten analysiert und weiß verblüffend genau, welche Wörter in einem bestimmten Kontext zueinander passen – genau wie Menschen beim freien Assoziieren („Nacht“ → „Dunkelheit“). Ohne Steuerungsgerüst (Harness) agiert es nicht selbstständig.',
    category: 'architecture',
  },
  {
    id: 'term-parameter',
    termEn: 'Parameters & Weights',
    termDe: 'Parameter & Gewichte (Stellschrauben)',
    badgeEn: 'Model Scale',
    badgeDe: 'Modellgröße',
    shortEn: 'Billions of tiny numerical sliders inside the network whose calibrated settings store the model\'s learned knowledge.',
    shortDe: 'Milliarden kleine Schieberegler im Rechennetz, in deren feiner Abstimmung das gesamte gelernte Wissen gespeichert ist.',
    detailEn: 'Analogy: An immense audio mixer with billions of faders. At the onset of training, every fader sits at random noise. With every sentence read, the sliders nudge minutely until coherent language emerges. More parameters allow richer reasoning patterns, but demand massive GPU memory.',
    detailDe: 'Metapher: Ein Tonmischpult mit Milliarden Fadern. Zu Beginn des Trainings stehen alle Regler auf Zufall (nur Rauschen). Mit jedem gelesenen Satz werden die Regler minimal nachjustiert, bis saubere Sätze entstehen. Je mehr Parameter ein Modell hat (z. B. 8 Milliarden vs. 70 Milliarden), desto komplexere Zusammenhänge kann es speichern – desto mehr Grafikspeicher (VRAM) braucht es aber auch.',
    category: 'architecture',
  },
  {
    id: 'term-token',
    termEn: 'Token (Text Units)',
    termDe: 'Token (Text-Bausteine)',
    badgeEn: 'Text Units',
    badgeDe: 'Texteinheiten',
    shortEn: 'Text building blocks: the syllables and 3-to-4 character chunks into which language models chop all input text.',
    shortDe: 'Wortbausteine: Die kleinen Silben und Häppchen von 3 bis 4 Buchstaben, in die Sprachmodelle jeden Satz zerhacken.',
    detailEn: 'Analogy: Scrabble tiles or syllable fragments. Models process neither single letters nor whole thoughts; they chop sentences into standardized token fragments (e.g. "psychology" into sub-word tokens). Rule of thumb: 1,000 tokens equal approximately 750 words.',
    detailDe: 'Metapher: Scrabble-Steinchen oder Buchstabensilben. Ein Modell liest Text nicht Buchstabe für Buchstabe und auch nicht in ganzen Gedanken, sondern teilt Wörter in genormte Tokens auf (z. B. wird „Psychologie“ zu „Psy-cho-lo-gie“). Als Daumenregel entsprechen 1.000 Tokens etwa 750 Wörtern.',
    category: 'architecture',
  },
  {
    id: 'term-reasoning-level',
    termEn: 'Reasoning / Thinking Level (System 1 vs. 2)',
    termDe: 'Reasoning / Denkstufe (System 1 vs. System 2)',
    badgeEn: 'Test-Time Compute',
    badgeDe: 'Denkzeit-Budget',
    shortEn: 'Inference-time thinking budget: how many hidden reasoning steps a model spends verifying logic before speaking.',
    shortDe: 'Das Denkzeit-Budget: Wie viele unsichtbare Zwischenschritte das Modell zum Nachdenken und Prüfen nutzt, bevor es antwortet.',
    detailEn: 'Analogy: Daniel Kahneman\'s System 1 (fast, intuitive gut reaction) vs. System 2 (deliberate, slow reasoning). Standard models shoot from the hip. Reasoning models pause: they draft hidden intermediate tokens, cross-check math, backtrack from dead ends, and only present verified answers.',
    detailDe: 'Metapher: System 1 (schnelles Bauchgefühl) vs. System 2 (langsames, logisches Denken) nach Daniel Kahneman. Normale Modelle feuern sofort das erstbeste Wort ab. Bei aktivierter Denkstufe hält das Modell inne: Es schreibt verdeckte Notizen, rechnet Proben, verwirft Sackgassen und antwortet erst, wenn die Logik wasserdicht ist.',
    category: 'architecture',
  },
  {
    id: 'term-context-rot',
    termEn: 'Context Rot (Working Memory Overload)',
    termDe: 'Context Rot (Arbeitsgedächtnis-Überlastung)',
    badgeEn: 'Context Dilution',
    badgeDe: 'Aufmerksamkeitsabfall',
    shortEn: 'Reasoning degradation in long contexts: details in the middle of giant documents get lost or instructions diluted.',
    shortDe: 'Qualitätsabfall bei Riesen-Texten: Details in der Mitte langer Verläufe werden übersehen oder Anweisungen geraten durcheinander.',
    detailEn: 'Analogy: A desk buried under mountains of paper (Working Memory Overload). While models can accept hundreds of pages in their context window, retrieval precision degrades across the middle sections ("Lost-in-the-Middle" effect) due to attention dilution.',
    detailDe: 'Metapher: Ein Schreibtisch voller Aktenberge (Working Memory Overload). Zwar können moderne Modelle theoretisch hunderte Seiten Text erfassen, doch mit zunehmender Länge sinkt die Aufmerksamkeit: Details in der Mitte werden übersehen („Lost-in-the-Middle“-Phänomen), genau wie bei einer Person nach stundenlangem Aktenstudium.',
    category: 'architecture',
  },

  // 5. Agenten, Steuerung & Praxis
  {
    id: 'term-harness',
    termEn: 'Harness (Agent Scaffolding & Runtime)',
    termDe: 'Harness (Zaumzeug & Ablaufsteuerung)',
    badgeEn: 'Agent Scaffolding',
    badgeDe: 'Ablaufsteuerung',
    shortEn: 'The harness for the model: the software scaffolding connecting the raw model to tools and keeping it in an active execution loop.',
    shortDe: 'Das Zaumzeug für das Modell: Die Software-Umgebung, die ein Sprachmodell mit Werkzeugen verbindet und in einer Arbeitsschleife hält.',
    detailEn: 'Analogy: A brain in a jar cannot act alone—it can only whisper thoughts. The harness provides the body and toolbelt: it accepts a complex prompt, breaks it into actionable sub-tasks, edits files, executes commands, intercepts errors, and sustains an autonomous loop until the work is verified.',
    detailDe: 'Metapher: Ein Gehirn im Glas kann allein nichts bewirken – es kann nur Gedanken flüstern. Das Harness ist der Körper und die Werkzeugkiste: Es nimmt eine Aufgabe an, zerlegt sie in Teilschritte, öffnet Dateien, startet das Terminal, fängt Fehlermeldungen ab und lässt das Modell in einer Schleife arbeiten, bis die Aufgabe tatsächlich gelöst ist.',
    category: 'agentic',
  },
  {
    id: 'term-agent',
    termEn: 'Agent (Autonomous Action Loop)',
    termDe: 'Agent (Autonome Handlungsschleife)',
    badgeEn: 'Action Loop',
    badgeDe: 'Handlungsschleife',
    shortEn: 'A model operating in a closed feedback loop: pursues goals, uses external tools, and self-corrects along the way.',
    shortDe: 'Ein Modell mit geschlossener Rückkopplung: Setzt sich Ziele, nutzt selbstständig Werkzeuge und korrigiert eigene Fehler.',
    detailEn: 'Analogy: The TOTE unit from cognitive psychology (Test – Operate – Test – Exit). A basic chatbot waits passively for user prompts. An agent actively experiments (Operate), inspects feedback (Test), and iterates until the objective is reached.',
    detailDe: 'Metapher: Das TOTE-Modell aus der Kognitionspsychologie (Test – Operate – Test – Exit). Ein einfacher Chatbot wartet passiv auf die nächste Frage. Ein Agent dagegen handelt aktiv: Er probiert einen Schritt aus (Operate), prüft das Ergebnis (Test) und wiederholt diesen Kreislauf so lange selbstständig, bis das gesetzte Ziel erreicht ist.',
    category: 'agentic',
  },
  {
    id: 'term-ade',
    termEn: 'ADE (Agentic Development Environment)',
    termDe: 'ADE (Agenten-Programmierumgebung)',
    badgeEn: 'Agentic Editor',
    badgeDe: 'Agenten-Werkbank',
    shortEn: 'A code editor where an AI agent works directly inside the repository as an active collaborative peer.',
    shortDe: 'Eine Programmierumgebung, in der ein KI-Agent als vollwertiger Partner direkt im Projektordner arbeitet.',
    detailEn: 'Analogy: A co-pilot at your workstation. Unlike simple text editors, the ADE grants the agent full workspace access to inspect project files, execute tests, and fix bugs autonomously.',
    detailDe: 'Metapher: Ein Co-Pilot am Schreibtisch. Im Gegensatz zu einfachen Schreibprogrammen hat die ADE Zugriff auf das gesamte Projekt: Der Agent liest mehrere Dateien gleichzeitig, führt Tests aus und korrigiert Fehler selbstständig.',
    category: 'agentic',
  },
  {
    id: 'term-ide',
    termEn: 'IDE (Integrated Development Environment)',
    termDe: 'IDE (Klassische Entwickler-Werkbank)',
    badgeEn: 'Developer Workbench',
    badgeDe: 'Entwickler-Werkbank',
    shortEn: 'The traditional programming workbench: combines text editor, debuggers, and build tools in one application.',
    shortDe: 'Die klassische Werkbank: Vereint Texteditor, Lupen zur Fehlersuche und Werkzeuge zum Bauen von Programmen.',
    detailEn: 'Analogy: The craftsman\'s workbench equipped with vice, magnifying lamp, and organized tools (e.g. VS Code, or RStudio for psychological statistics). Everything is arranged conveniently in one view.',
    detailDe: 'Metapher: Die Werkbank des Handwerkers mit Schraubstock, Lupenleuchte und Werkzeugwand (z. B. VS Code oder RStudio in der Psychologie-Statistik). Alle Werkzeuge liegen griffbereit an einem Ort.',
    category: 'agentic',
  },
  {
    id: 'term-cli',
    termEn: 'CLI (Command Line Interface)',
    termDe: 'CLI (Kommandozeile / Terminal)',
    badgeEn: 'Terminal',
    badgeDe: 'Text-Konsole',
    shortEn: 'The text-only console: instructions are typed as bare text commands without graphical buttons or windows.',
    shortDe: 'Die reine Text-Konsole: Befehle werden direkt als Textzeilen eingetippt, ganz ohne bunte Knöpfe oder Fenster.',
    detailEn: 'Analogy: A teletypewriter or telegraph. Instead of pointing and clicking graphical icons, you type exact text commands. Ideal for AI agents because textual instructions run with zero graphical overhead.',
    detailDe: 'Metapher: Ein Fernschreiber oder Telegramm. Statt mit der Maus auf Icons zu klicken, tippt man präzise Textbefehle ein. Für KI-Agenten ist die CLI ideal, weil Textbefehle extrem schnell und ohne grafische Umwege ausgeführt werden können.',
    category: 'agentic',
  },

  // 6. Grundlagen & Infrastruktur
  {
    id: 'term-neural-network',
    termEn: 'Neural Network (Computational Graph)',
    termDe: 'Neuronales Netz (Rechengeflecht)',
    badgeEn: 'Foundations',
    badgeDe: 'Grundlagen',
    shortEn: 'A layered mathematical network of nodes that progressively extracts patterns from massive training data.',
    shortDe: 'Ein mathematisches Schichtennetz aus Rechenknoten, das schrittweise Muster aus großen Datenmengen erlernt.',
    detailEn: 'Analogy: Biological neural circuits. Artificial neurons pass numerical signals through layered connections. Successful paths get reinforced during learning, echoing Donald Hebb\'s classic neuropsychological principle: "Neurons that fire together, wire together."',
    detailDe: 'Metapher: Ein biologisches Nervennetz. Viele kleine Recheneinheiten (künstliche Neuronen) sind in Schichten angeordnet. Eine Schicht reicht Signale an die nächste Schicht weiter. Beim Lernen verstärken sich diejenigen Verbindungen, die zu richtigen Ergebnissen führen – ganz nach dem psychologischen Lernprinzip von Donald Hebb („Neurons that fire together, wire together“).',
    category: 'foundations',
  },
  {
    id: 'term-generative-ai',
    termEn: 'Generative AI (Synthesizing Systems)',
    termDe: 'Generative KI (Schöpfende Systeme)',
    badgeEn: 'Technology',
    badgeDe: 'Technologie',
    shortEn: 'Systems that synthesize original outputs (text, imagery, audio, code) rather than merely filtering or classifying.',
    shortDe: 'Systeme, die eigenständig neue Inhalte erzeugen (Texte, Bilder, Töne, Code), statt Daten nur zu sortieren.',
    detailEn: 'Analogy: A painter rather than a bouncer. Discriminative AI acts like a bouncer: sorting inputs ("Spam or Not Spam?"). Generative AI acts like a creative writer or painter: recombining learned rules to synthesize a brand-new essay, program, or illustration.',
    detailDe: 'Metapher: Ein Maler oder Dichter statt eines Türstehers. Ein klassisches KI-System verhält sich wie ein Türsteher: Es sortiert Daten („Spam oder kein Spam?“, „Katze oder Hund?“). Generative KI verhält sich wie ein Maler: Sie erzeugt aus gelernten Mustern ein völlig neues Bild oder einen neuen Text, der so zuvor noch nie existiert hat.',
    category: 'foundations',
  },
  {
    id: 'term-api',
    termEn: 'API (Application Programming Interface)',
    termDe: 'API (Programmierschnittstelle)',
    badgeEn: 'Network Interface',
    badgeDe: 'Schnittstelle',
    shortEn: 'The digital order counter: enables external software to query remote models across the internet seamlessly.',
    shortDe: 'Der digitale Bestellkanal: Ermöglicht Programmen, fertige Modelle auf entfernten Großrechnern abzufragen.',
    detailEn: 'Analogy: The waiter in a restaurant. You do not walk into the kitchen (the remote server cluster); you hand your order (the prompt) to the waiter (the API), who returns with the prepared meal (the response). Allows external scripts (e.g. Python, JASP) to harness models on demand.',
    detailDe: 'Metapher: Die Kellnerin im Restaurant. Man geht als Gast nicht selbst in die Restaurantküche (das Rechenzentrum), sondern übergibt der Kellnerin (der API) die Bestellung (den Prompt). Die Kellnerin bringt kurz darauf das fertige Gericht (die Antwort) zurück an den Tisch. So können z. B. Statistikprogramme wie JASP oder Python-Skripte Modelle nutzen, ohne sie selbst betreiben zu müssen.',
    category: 'infrastructure',
  },
  {
    id: 'term-cloud',
    termEn: 'Cloud Computing',
    termDe: 'Cloud (Rechenzentren über Netz)',
    badgeEn: 'Data Center',
    badgeDe: 'Rechenzentrum',
    shortEn: 'Remote data centers executing massive models on specialized GPU clusters without local hardware requirements.',
    shortDe: 'Vernetzte Großrechenzentren: Führen gigantische Modelle auf Spezialchips aus, ohne dass man eigene Hardware benötigt.',
    detailEn: 'Analogy: The public electrical grid. Rather than running a private diesel generator in your basement (costly personal GPU server racks), you draw compute power on demand from the grid via the internet.',
    detailDe: 'Metapher: Das öffentliche Stromnetz. Statt einen eigenen Dieselgenerator im Keller aufzustellen (teure Spezial-Grafikkarten für zehntausende Euro), bezieht man Rechenleistung einfach flexibel nach Bedarf über das Internet aus der Steckdose.',
    category: 'infrastructure',
  },
  {
    id: 'term-runtime',
    termEn: 'Runtime Environment',
    termDe: 'Laufzeitumgebung (Arbeitsbühne)',
    badgeEn: 'Execution Context',
    badgeDe: 'Ausführungsumgebung',
    shortEn: 'The operating stage: the active software and memory environment required for models and code to run live.',
    shortDe: 'Die Arbeitsbühne: Der Hard- und Softwareraum, der bereitstehen muss, damit ein Modell live rechnen kann.',
    detailEn: 'Analogy: A concert hall with electricity, stage lighting, and instruments. The model is the musical score, but without the physical hall and orchestra (RAM, drivers, processors), no sound is produced.',
    detailDe: 'Metapher: Ein Konzertsaal mit Bühne, Strom und Instrumenten. Das Modell ist die Partitur, aber ohne den Saal, den Dirigenten und die Musiker (Arbeitsspeicher, Treiber, Prozessorkerne) erklingt kein einziger Ton.',
    category: 'infrastructure',
  },
  {
    id: 'term-framework',
    termEn: 'Framework (Software Scaffolding)',
    termDe: 'Framework (Vorgefertigtes Baugerüst)',
    badgeEn: 'Architecture',
    badgeDe: 'Programmiergerüst',
    shortEn: 'Prefabricated structural foundation: reusable code conventions and libraries preventing developers from reinventing the wheel.',
    shortDe: 'Das Fertighaus-Fundament: Vorgefertigte Software-Bausteine und Regeln, damit Entwickler nicht bei Null anfangen müssen.',
    detailEn: 'Analogy: A prefabricated building frame with pre-installed plumbing. You don\'t cast every brick yourself; you assemble proven components (e.g. PyTorch, React) and focus on your specific design.',
    detailDe: 'Metapher: Das Fertighaus-Gerüst mit gelegten Rohren und Anschlüssen. Man baut nicht jede Schraube und Steckdose selbst, sondern nutzt bewährte Bauteile (z. B. PyTorch oder React) und konzentriert sich auf die individuelle Gestaltung.',
    category: 'infrastructure',
  },
  {
    id: 'term-chatbot',
    termEn: 'Chatbot (Conversational Interface)',
    termDe: 'Chatbot (Gesprächs-Oberfläche)',
    badgeEn: 'Dialogue Interface',
    badgeDe: 'Benutzeroberfläche',
    shortEn: 'The conversational chat bubble window: allows humans to interact naturally with underlying models using plain language.',
    shortDe: 'Die Sprechblasen-Oberfläche: Ermöglicht es Menschen, sich in natürlicher Alltagssprache mit einem Modell zu unterhalten.',
    detailEn: 'Analogy: The customer service booth with a microphone (e.g. ChatGPT or Claude). It formats markdown, manages conversational history, and streams the model\'s generated text smoothly onto the screen.',
    detailDe: 'Metapher: Der Kundenschalter mit Sprechanlage (z. B. ChatGPT oder Claude). Der Chatbot formatiert Absätze, merkt sich den Gesprächsverlauf und sorgt dafür, dass die Textausgaben des Modells lesbar auf dem Bildschirm einlaufen.',
    category: 'infrastructure',
  },
  {
    id: 'term-ecosystem',
    termEn: 'AI Ecosystem',
    termDe: 'Ökosystem (Vernetztes Biotop)',
    badgeEn: 'Networked Fabric',
    badgeDe: 'Vernetztes Gefüge',
    shortEn: 'The interconnected network of chip makers, model labs, open-source communities, and independent evaluators.',
    shortDe: 'Das vernetzte Zusammenspiel: Chipbauer, Entwicklerfirmen, Open-Source-Gemeinschaften und Prüflabore.',
    detailEn: 'Analogy: A coral reef. No model functions in isolation: university researchers publish architectures, open-source communities fine-tune weights, commercial labs invest compute, and independent benchmarks audit claims.',
    detailDe: 'Metapher: Ein Korallenriff oder Wald. Kein Modell existiert im luftleeren Raum: Universitäten forschen, Open-Source-Tüftler passen Gewichte an, kommerzielle Labore investieren Milliarden und unabhängige Prüfstände messen objektiv nach. Erst dieses Miteinander treibt das Tempo des Fortschritts.',
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
  activeGroup: controlledActiveGroup,
  onActiveGroupChange,
  showAdvanced: controlledShowAdvanced,
  onToggleAdvanced,
  hideHeaderControls = false,
}) => {
  // Default to 'top10' (Top LLM Labs) as requested
  const [internalActiveGroup, setInternalActiveGroup] = useState<LabGroup>('top10');
  const [weightsFilter, setWeightsFilter] = useState<WeightsFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [simplifiedSizeView, setSimplifiedSizeView] = useState<boolean>(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalShowAdvanced, setInternalShowAdvanced] = useState<boolean>(false);
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);
  const [glossaryCategory, setGlossaryCategory] = useState<GlossaryCategory | 'all'>('all');
  const [glossarySearch, setGlossarySearch] = useState<string>('');

  const activeGroup = controlledActiveGroup ?? internalActiveGroup;
  const showAdvanced = controlledShowAdvanced ?? internalShowAdvanced;
  const toggleAdvanced = onToggleAdvanced ?? (() => setInternalShowAdvanced((prev) => !prev));

  const isSimplifiedView = sizeFilter !== 'all' && simplifiedSizeView;

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (weightsFilter !== 'all') count++;
    if (selectedCountry !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (sizeFilter !== 'all') count++;
    return count;
  }, [weightsFilter, selectedCountry, searchQuery, sizeFilter]);

  // Group counts
  const allCount = labs.length;
  const top10Count = labs.filter((l) => l.group === 'top10').length;
  const contenderCount = labs.filter((l) => l.group === 'contender').length;
  const tweakersCount = labs.filter((l) => l.group === 'tweakers').length;
  const smallCount = labs.filter((l) => l.group === 'small').length;
  const harnessCount = labs.filter((l) => l.group === 'harness').length;

  const handleGroupChange = (group: LabGroup) => {
    if (onActiveGroupChange) {
      onActiveGroupChange(group);
    } else {
      setInternalActiveGroup(group);
    }
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

  // Alphabetically sorted glossary terms according to active language (A-Z)
  const sortedGlossaryTerms = useMemo(() => {
    return [...GLOSSARY_TERMS].sort((a, b) => {
      const nameA = lang === 'de' ? a.termDe : a.termEn;
      const nameB = lang === 'de' ? b.termDe : b.termEn;
      return nameA.localeCompare(nameB, lang === 'de' ? 'de' : 'en', { sensitivity: 'base' });
    });
  }, [lang]);

  // Filtered glossary terms based on active category & search
  const filteredGlossaryTerms = useMemo(() => {
    return sortedGlossaryTerms.filter((term) => {
      if (glossaryCategory !== 'all' && term.category !== glossaryCategory) {
        return false;
      }
      if (glossarySearch.trim()) {
        const query = glossarySearch.toLowerCase().trim();
        const text = `${term.termDe} ${term.termEn} ${term.badgeDe} ${term.badgeEn} ${term.shortDe} ${term.shortEn} ${term.detailDe} ${term.detailEn}`.toLowerCase();
        return text.includes(query);
      }
      return true;
    });
  }, [sortedGlossaryTerms, glossaryCategory, glossarySearch]);

  // Horizontal mouse wheel scrolling for overflow button strips
  const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

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
    if (targetId && targetId !== 'glossary-section') {
      setGlossaryCategory('all');
      setGlossarySearch('');
    }
    const targetElementId = targetId || 'glossary-section';
    const el = document.getElementById(targetElementId);
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: targetElementId === 'glossary-section' ? 'start' : 'center',
      });
      el.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      }, 3500);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Top Bar: Permanently visible Category Tabs on the left, Glossary / Original Sheet / Advanced on the right */}
      {!hideHeaderControls && (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        {/* Segmented Filter: "All Labs" to "Agent Scaffolding" */}
        <div
          className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto scrollbar-none sm:scrollbar-thin max-w-full"
          onWheel={handleHorizontalWheel}
        >
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
            {lang === 'de' ? `Top LLM-Labore (${top10Count})` : `Top LLM Labs (${top10Count})`}
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
            {lang === 'de' ? `Herausforderer (${contenderCount})` : `Contenders (${contenderCount})`}
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
            {lang === 'de' ? `Modell-Optimierer (${tweakersCount})` : `Model Tweakers (${tweakersCount})`}
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
          <Tooltip
            title={lang === 'de' ? 'Agenten- & Steuergerüste (Harness)' : 'Agent Scaffolding & Harness'}
            badge={lang === 'de' ? 'Glossar' : 'Glossary'}
            align="center"
            width="w-72"
            content={
              <div>
                <p className="text-slate-300 leading-snug mb-2">
                  {lang === 'de'
                    ? 'Entwickler von Software-Umgebungen wie Aider, OpenHands oder Cursor. Sie bauen das Steuerungsgerüst („Zaumzeug“ / Harness): Sie statten LLMs mit Werkzeugen (Terminal, Dateizugriff) aus, zerlegen komplexe Aufgaben in Teilschritte und halten das Modell in einer autonomen Ausführungsschleife (ReAct-Loop), bis die Arbeit vollständig erledigt ist.'
                    : 'Developers of agentic runtime environments like Aider, OpenHands, or Cursor. Instead of training raw models, they build the execution scaffolding ("harness"): equipping LLMs with tools (terminal, file system), decomposing tasks into sub-steps, and running them in autonomous loops until finished.'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToGlossary('term-harness');
                  }}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                >
                  <span>{lang === 'de' ? 'Harness im Glossar nachschlagen ↓' : 'View Harness in Glossary ↓'}</span>
                </button>
              </div>
            }
          >
            <button
              type="button"
              onClick={() => handleGroupChange('harness')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'harness'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Agenten- & Steuergerüste (${harnessCount})` : `Agent Scaffolding (${harnessCount})`}
            </button>
          </Tooltip>
        </div>

        {/* Action Buttons: Glossary, Original Sheet, and Advanced toggle */}
        <div className="shrink-0 flex items-center gap-2 self-end xl:self-auto">
          <Tooltip
            title={lang === 'de' ? 'Glossar & Fachbegriffe' : 'Glossary & Terms'}
            align="right"
            width="w-64"
            content={
              lang === 'de'
                ? 'Zu den Definitionen springen (Neuronales Netz, Modell, Chatbot, Generative KI, Harness etc.)'
                : 'Jump to definitions (Neural Network, Model, Chatbot, Generative AI, Harness etc.)'
            }
          >
            <button
              type="button"
              onClick={() => scrollToGlossary()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>{lang === 'de' ? 'Glossar' : 'Glossary'}</span>
            </button>
          </Tooltip>

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

          {/* Advanced Button */}
          <button
            type="button"
            onClick={toggleAdvanced}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
              showAdvanced
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs'
            }`}
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${showAdvanced ? 'text-white' : 'text-blue-500'}`} />
            <span>{lang === 'de' ? 'Erweitert' : 'Advanced'}</span>
            {activeAdvancedFiltersCount > 0 && (
              <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                showAdvanced ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
              }`}>
                {activeAdvancedFiltersCount}
              </span>
            )}
            <span className={`text-xs ml-0.5 ${showAdvanced ? 'text-blue-200' : 'text-slate-400'}`}>
              {showAdvanced ? '▲' : '▼'}
            </span>
          </button>
        </div>
      </div>
      )}

      {/* Advanced Drawer: Revealed when showAdvanced is true */}
      {showAdvanced && (
        <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Country Filter Strip (Pills) positioned where categories used to be */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs scrollbar-thin max-w-full"
              onWheel={handleHorizontalWheel}
            >
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <span>🌐</span>
                <span>{lang === 'de' ? 'Land:' : 'Country:'}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCountry('all')}
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
                    <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      ({c.count})
                    </span>
                  </button>
                );
              })}
            </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Open / Hybrid / Closed Weights Segmented Toggle Button */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'de' ? 'Gewichte:' : 'Weights:'}</span>
                <Tooltip
                  title={lang === 'de' ? 'Modellgewichte' : 'Model Weights'}
                  align="center"
                  width="w-60"
                  content={
                    lang === 'de'
                      ? 'Erklärung zu Open, Hybrid und Closed anzeigen.'
                      : 'Show explanation of Open, Hybrid, and Closed weights.'
                  }
                >
                  <button
                    type="button"
                    onClick={() => scrollToWeightsExplainer()}
                    className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                    aria-label="Weights explanation"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
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
              <Tooltip
                title={
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{lang === 'de' ? WEIGHTS_CONCEPTS.open.titleDe : WEIGHTS_CONCEPTS.open.titleEn}</span>
                  </span>
                }
                badge={lang === 'de' ? 'Offen' : 'Open'}
                align="center"
                width="w-64"
                content={
                  <div>
                    <p className="text-slate-300 leading-snug mb-2">
                      {lang === 'de' ? WEIGHTS_CONCEPTS.open.tooltipDe : WEIGHTS_CONCEPTS.open.tooltipEn}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToWeightsExplainer('weights-open');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                    >
                      <span>{lang === 'de' ? 'Ausführliche Erklärung anzeigen ↓' : 'Show full explanation ↓'}</span>
                    </button>
                  </div>
                }
              >
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
              </Tooltip>

              {/* Hybrid Button with Tooltip */}
              <Tooltip
                title={
                  <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>{lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.titleDe : WEIGHTS_CONCEPTS.hybrid.titleEn}</span>
                  </span>
                }
                badge="Hybrid"
                align="center"
                width="w-64"
                content={
                  <div>
                    <p className="text-slate-300 leading-snug mb-2">
                      {lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.tooltipDe : WEIGHTS_CONCEPTS.hybrid.tooltipEn}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToWeightsExplainer('weights-hybrid');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                    >
                      <span>{lang === 'de' ? 'Ausführliche Erklärung anzeigen ↓' : 'Show full explanation ↓'}</span>
                    </button>
                  </div>
                }
              >
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
              </Tooltip>

              {/* Closed Button with Tooltip */}
              <Tooltip
                title={
                  <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span>{lang === 'de' ? WEIGHTS_CONCEPTS.closed.titleDe : WEIGHTS_CONCEPTS.closed.titleEn}</span>
                  </span>
                }
                badge={lang === 'de' ? 'Geschlossen' : 'Closed'}
                align="center"
                width="w-64"
                content={
                  <div>
                    <p className="text-slate-300 leading-snug mb-2">
                      {lang === 'de' ? WEIGHTS_CONCEPTS.closed.tooltipDe : WEIGHTS_CONCEPTS.closed.tooltipEn}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToWeightsExplainer('weights-closed');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                    >
                      <span>{lang === 'de' ? 'Ausführliche Erklärung anzeigen ↓' : 'Show full explanation ↓'}</span>
                    </button>
                  </div>
                }
              >
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
              </Tooltip>
            </div>

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
            <Tooltip
              title={lang === 'de' ? 'Modellgröße (Parameter)' : 'Model Size (Parameters)'}
              align="left"
              width="w-64"
              content={
                lang === 'de'
                  ? 'Filtert Modelle nach Parameteranzahl: von On-Device (< 0,5 Mrd. / Micro) bis zu Frontier-Giganten (≥ 15 Bio. / Singularity). Stufenlos über Schieberegler oder Schnellwahl-Kategorien wählbar.'
                  : 'Filter models by parameter count: from on-device (< 0.5B / Micro) to frontier megascale (≥ 15T / Singularity). Adjust via slider steps or quick-select categories.'
              }
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-help">
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                <span>{lang === 'de' ? 'Modellgröße:' : 'Model Size:'}</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </div>
            </Tooltip>

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
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[84px] text-center whitespace-nowrap">
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
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin"
            onWheel={handleHorizontalWheel}
          >
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
                  <span className={`text-xs ${isExact ? 'text-blue-100' : isSubSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}`}>
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
                <Tooltip
                  content={
                    lang === 'de'
                      ? 'Karten auf Vendor, Modellfamilie & gewähltes Modell reduzieren oder Vollansicht anzeigen'
                      : 'Toggle reduced cards (Vendor, chatbot family & selected model) vs. full cards'
                  }
                  align="right"
                  width="w-64"
                >
                  <button
                    type="button"
                    onClick={() => setSimplifiedSizeView((prev) => !prev)}
                    className="px-2 py-0.5 text-xs font-semibold rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  >
                    {simplifiedSizeView
                      ? (lang === 'de' ? 'Kompakte Ansicht: An' : 'Compact View: On')
                      : (lang === 'de' ? 'Vollansicht: An' : 'Full View: On')}
                  </button>
                </Tooltip>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {filteredLabs.length} {lang === 'de' ? 'Labore' : 'labs'}
                </span>
              </div>
            </div>
          );
        })()}

        </div>
      )}

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
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 cursor-pointer transition-transform hover:scale-105 ${
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
                    {lab.group === 'harness' ? (
                      <>
                        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                          {lang === 'de' ? 'Agenten- & Steuergerüst (Harness)' : 'Agent Scaffolding & Execution Harness'}
                        </div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {lab.harness || lab.engineName}
                        </div>
                      </>
                    ) : (
                      <div
                        className="text-sm font-semibold whitespace-nowrap truncate flex items-baseline gap-1.5"
                        title={
                          (lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}`
                            ? `${lab.engineName} chatbot family ${
                                lang === 'de' ? 'bekannt für' : 'famous for'
                              } ${lab.famousFor || lab.specialties}`
                            : `${lab.engineName} chatbot family`
                        }
                      >
                        <span className="text-blue-600 dark:text-blue-400 shrink-0">
                          {lab.engineName}
                        </span>
                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500 shrink-0">
                          chatbot family
                        </span>
                        {(lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}` && (
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate flex items-baseline gap-1 min-w-0">
                            <span className="text-slate-400 dark:text-slate-500 font-normal shrink-0">
                              {lang === 'de' ? 'bekannt für' : 'famous for'}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 truncate">
                              {lab.famousFor || lab.specialties}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Group: Harness Only Labs Special Overview (hidden in simplified size view) */}
                {!isSimplifiedView && lab.group === 'harness' && (
                  <div className="space-y-2 mb-3">
                    {lab.form && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-500 text-xs">Form:</span>
                        <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-800 dark:text-slate-200">
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
                    <div className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      {lang === 'de' ? 'Basiert auf OpenWeights' : 'Based on Open Weights'}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {lab.basedOn}
                    </div>
                  </div>
                )}

                {/* Fallback Famous for / Notes only if not already shown above with engineName */}
                {!isSimplifiedView && (!lab.engineName || lab.engineName === '-') && lab.group !== 'harness' && (lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}` && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2.5 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {lab.notesLabel?.toLowerCase().includes('note') || lab.group === 'contender' || lab.group === 'small'
                        ? (lang === 'de' ? 'Hinweise: ' : 'Notes: ')
                        : lab.famousFor
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
                                className={`font-bold text-xs cursor-help ${
                                  isSimplifiedView
                                    ? 'text-blue-900 dark:text-blue-200'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {lang === 'de' ? tier.nameDe : tier.nameEn}
                              </span>

                              {/* Tooltip on hover showing parameter count */}
                              <div className="absolute left-2 -top-8 hidden group-hover:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg text-xs font-mono pointer-events-none z-30 whitespace-nowrap">
                                <span className="font-bold">{lang === 'de' ? tier.nameDe : tier.nameEn}:</span>
                                <span>{lang === 'de' ? tier.paramCountDe : tier.paramCountEn}</span>
                              </div>
                            </div>

                            {/* Center: Model Name(s) */}
                            <span
                              className={`font-mono text-xs text-right truncate flex-1 ${
                                isSimplifiedView
                                  ? 'font-bold text-slate-900 dark:text-slate-100'
                                  : 'font-semibold text-slate-800 dark:text-slate-200'
                              }`}
                              title={modelVal}
                            >
                              {modelVal}
                            </span>

                            {/* Right: Open / Closed Badge (only shown for hybrid model families) */}
                            {!isSimplifiedView && lab.weightsType === 'hybrid' && isOpen !== undefined && (
                              <span
                                className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${
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
                      className="w-full flex items-center justify-between py-1 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold cursor-pointer transition-colors group select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="group-hover:underline">
                          {lang === 'de' ? 'Werkzeuge & Agenten' : 'Tooling & Agents'}
                        </span>
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-normal normal-case tracking-normal flex items-center gap-1">
                        <span>{isExpanded ? (lang === 'de' ? 'ausblenden' : 'hide') : (lang === 'de' ? 'Details' : 'Details')}</span>
                        <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
                      </span>
                    </button>

                    {/* Full tooling and agents revealed when clicked */}
                    {isExpanded && (
                      <div className="text-xs space-y-1.5 pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg transition-all">
                        {lab.codingAgent && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400 text-xs shrink-0 font-medium">
                              {lang === 'de' ? 'Coding-Agent:' : 'Coding Agent:'}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.codingAgent}
                            </span>
                          </div>
                        )}
                        {lab.dailyAgent && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400 text-xs shrink-0 font-medium">
                              {lang === 'de' ? 'Alltags-Agent:' : 'Daily Agent:'}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.dailyAgent}
                            </span>
                          </div>
                        )}
                        {lab.harnessSdk && (
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <span className="text-slate-400 text-xs shrink-0 font-medium">
                              Harness / SDK:
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.harnessSdk}
                            </span>
                          </div>
                        )}
                        {lab.subscriptionTiers && (
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <span className="text-slate-400 text-xs shrink-0 font-medium">
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
              handleGroupChange('all');
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {lang === 'de' ? 'Konzepte: Open vs. Hybrid vs. Closed' : 'Concepts: Open vs. Hybrid vs. Closed'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
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
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.open.titleDe : WEIGHTS_CONCEPTS.open.titleEn}</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
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
            <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-500 dark:text-slate-400">
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
              <span className="text-sm font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.titleDe : WEIGHTS_CONCEPTS.hybrid.titleEn}</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
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
            <div className="pt-2 border-t border-purple-100 dark:border-purple-900/40 text-xs text-slate-500 dark:text-slate-400">
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
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.closed.titleDe : WEIGHTS_CONCEPTS.closed.titleEn}</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
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
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
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
        className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        aria-label={lang === 'de' ? 'Glossar und Fachbegriffe' : 'Glossary and key terms'}
      >
        <div
          id="glossary-section"
          className="scroll-mt-24 flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {lang === 'de' ? 'Glossar: Fachbegriffe, Modelltypen & Methoden' : 'Glossary: Key Concepts, Model Types & Methods'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'de'
              ? 'Didaktisch aufbereitet für Erstsemester: Metaphern und Symbolbilder statt Fachchinesisch'
              : 'Intuitive explanations designed for first-semester students: visual metaphors over jargon'}
          </span>
        </div>

        {/* Filter-Leiste & Suchfeld für das Glossar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Kategorie-Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            {[
              { key: 'all', labelDe: 'Alle Begriffe', labelEn: 'All Terms' },
              { key: 'foundations', labelDe: 'Wissenschaftstheorie', labelEn: 'Science & Foundations' },
              { key: 'statistics', labelDe: 'Statistische Modelle & Regression', labelEn: 'Statistical Models' },
              { key: 'architecture', labelDe: 'Sprachmodelle & KI', labelEn: 'LLMs & AI Architecture' },
              { key: 'agentic', labelDe: 'Agenten & Steuerung', labelEn: 'Agents & Scaffolding' },
              { key: 'evaluation', labelDe: 'Tests & Benchmarks', labelEn: 'Tests & Benchmarks' },
              { key: 'infrastructure', labelDe: 'Infrastruktur & APIs', labelEn: 'Infrastructure' },
            ].map((cat) => {
              const count = cat.key === 'all'
                ? GLOSSARY_TERMS.length
                : GLOSSARY_TERMS.filter((t) => t.category === cat.key).length;
              const isActive = glossaryCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setGlossaryCategory(cat.key as GlossaryCategory | 'all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <span>{lang === 'de' ? cat.labelDe : cat.labelEn}</span>
                  <span className={`text-[10.5px] px-1 py-0.2 rounded-full font-mono ${isActive ? 'bg-blue-500/80 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Suchleiste */}
          <div className="relative min-w-[200px] sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              placeholder={lang === 'de' ? 'Begriff filtern...' : 'Filter concepts...'}
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            {glossarySearch && (
              <button
                type="button"
                onClick={() => setGlossarySearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                title="Suche leeren"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Karten-Raster der Begriffe */}
        {filteredGlossaryTerms.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            {lang === 'de'
              ? 'Kein Glossarbegriff entspricht dem aktuellen Filter.'
              : 'No glossary terms match your current filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGlossaryTerms.map((term) => {
              const badgeClass =
                term.category === 'statistics'
                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                  : term.category === 'foundations'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : term.category === 'architecture'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  : term.category === 'agentic'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : term.category === 'evaluation'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

              const detailText = lang === 'de' ? term.detailDe : term.detailEn;
              const hasMetaphor = detailText.includes('Metapher:') || detailText.includes('Grundsatz:') || detailText.includes('Analogy:') || detailText.includes('Foundational rule:');

              return (
                <div
                  key={term.id}
                  id={term.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all scroll-mt-24 flex flex-col justify-between shadow-2xs hover:shadow-xs"
                >
                  <div>
                    {/* Header: Name + Category Badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {lang === 'de' ? term.termDe : term.termEn}
                      </h4>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}>
                        {lang === 'de' ? term.badgeDe : term.badgeEn}
                      </span>
                    </div>

                    {/* Short summary definition */}
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 leading-snug mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                      {lang === 'de' ? term.shortDe : term.shortEn}
                    </p>

                    {/* Detailed explanation with highlighted metaphor / symbol */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5">
                      {hasMetaphor ? (
                        detailText.split(/(Grundsatz:|Metapher:|Analogy:|Foundational rule:)/g).map((part, i) => {
                          if (['Grundsatz:', 'Metapher:', 'Analogy:', 'Foundational rule:'].includes(part)) {
                            return (
                              <span key={i} className="font-bold text-slate-800 dark:text-slate-200 block pt-1 text-[11.5px]">
                                💡 {part}
                              </span>
                            );
                          }
                          return <span key={i}>{part}</span>;
                        })
                      ) : (
                        <span>{detailText}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
