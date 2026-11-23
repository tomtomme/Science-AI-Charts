import { LabEntry } from '../types';

export const WEIGHTS_CONCEPTS = {
  open: {
    id: 'weights-open',
    titleEn: 'Open Weights',
    titleDe: 'Open Weights',
    tagEn: 'Open',
    tagDe: 'Offen',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    dotClass: 'bg-cyan-500',
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
    detailDe: 'Metapher: Wie ein extrem belesener Text-Vervollständiger auf dem Smartphone, der Millionen Fachbücher, Webseiten und Programmcode gelesen hat. Es „denkt“ nicht mit Bewusstsein wie ein Mensch, sondern berechnet nach statistischer Mustererkennung, welches nächste Wort (Token) am besten an die bisherigen Wörter anschließt. Ohne Agentensteuerung bleibt es ein stummes Textausgabe-Werkzeug.',
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
    detailDe: 'Metapher: Ein Assoziationsgedächtnis gigantischen Ausmaßes. Ein LLM hat keine Gefühle, keine Absichten und kein Weltwissen wie ein Mensch. Es hat Millionen von Texten analysiert und weiß verblüffend genau, welche Wörter in einem bestimmten Kontext zueinander passen – genau wie Menschen beim freien Assoziieren („Nacht“ → „Dunkelheit“). Ohne Agentensteuerung agiert es nicht selbstständig.',
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

  // 5. Agentensteuerung & Praxis
  {
    id: 'term-harness',
    termEn: 'Harness (Agent Scaffolding & Runtime)',
    termDe: 'Agentensteuerung',
    badgeEn: 'Agent Scaffolding',
    badgeDe: 'Agentensteuerung',
    shortEn: 'The harness for the model: the software scaffolding connecting the raw model to tools and keeping it in an active execution loop.',
    shortDe: 'Die Software-Umgebung, die ein Sprachmodell mit Werkzeugen verbindet und selbstständig in einer Arbeitsschleife steuert.',
    detailEn: 'Analogy: A brain in a jar cannot act alone—it can only whisper thoughts. The harness provides the body and toolbelt: it accepts a complex prompt, breaks it into actionable sub-tasks, edits files, executes commands, intercepts errors, and sustains an autonomous loop until the work is verified.',
    detailDe: 'Metapher: Ein Gehirn im Glas kann allein nichts bewirken – es kann nur Gedanken flüstern. Die Agentensteuerung ist der Körper und die Werkzeugkiste: Sie nimmt eine Aufgabe an, zerlegt sie in Teilschritte, öffnet Dateien, startet das Terminal, fängt Fehlermeldungen ab und lässt das Modell in einer Schleife arbeiten, bis die Aufgabe tatsächlich gelöst ist.',
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

export interface TierDef {
  key: keyof LabEntry['parameterSizes'];
  nameEn: string;
  nameDe: string;
  paramCountEn: string;
  paramCountDe: string;
  level: number; // 1 to 5 for mini scale meter
  colorClass: string;
}

// Ordered strictly from smallest to largest parameter size
export const PARAMETER_TIERS: TierDef[] = [
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

// 5 Main Parameter Size Categories + 'All Sizes'
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
    color: '#e11d48',
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
    color: '#9333ea',
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
    color: '#2563eb',
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
    color: '#06b6d4',
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
    color: '#059669',
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
