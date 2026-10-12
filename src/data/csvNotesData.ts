export interface CsvNoteSection {
  titleEn: string;
  titleDe: string;
  sourceCellHeader: string; // e.g. "B34" or "N34"
  sourceCellContent: string; // e.g. "C34" or "O34"
  paragraphsEn: { heading?: string; text: string; link?: { url: string; label: string } }[];
  paragraphsDe: { heading?: string; text: string; link?: { url: string; label: string } }[];
  quote?: {
    author: string;
    textDe: string;
    textEn: string;
  };
}

export const CSV_NOTES_DATA: {
  columnsGuide: CsvNoteSection;
  practicalGuide: CsvNoteSection;
} = {
  columnsGuide: {
    titleEn: 'How To Read: All columns from left to right',
    titleDe: 'Anleitung: Alle Spalten von links nach rechts lesen',
    sourceCellHeader: 'B34',
    sourceCellContent: 'C34',
    paragraphsEn: [
      {
        text: 'If you have no time, skip to column L "Final Score NEW". The bots scores were measured with max reasoning / thinking dial if not mentioned otherwise — while most of the time a setting below (high / xhigh) will give you similar or sometimes even slightly better results. Also make sure you activate internet search capabilities if the bot does not activate this per default.',
      },
      {
        heading: 'Notes on the timeline',
        text: 'Scroll down to find the complete history / timeline of us "talking to computers". Non-bold numbers in the score columns are estimates based on earlier results within the model family and / or results of correlated evaluations. Sometimes the numbers are white, sometimes black: This is just for readability.',
      },
      {
        heading: 'Column A · Company Logo',
        text: 'The logo of the company behind the chatbot.',
      },
      {
        heading: 'Column B · Top 10 Selection',
        text: 'The Top 10 is limited to chatbots that are currently free to use in Germany (for some amount of time or requests per day). Also the list is limited to bots with full vision (image input) — meaning the bot can actually analyze all kinds of images, not just scan text. Mostly sorted top to bottom from worse to better. Beware: Free chat does not mean free API (for free API usage, e.g. in JASP, look out for the blue background). The full timeline is not restricted by these filters.',
      },
      {
        heading: 'Column C · Creator & Release',
        text: 'Who released the bot (company name) and when (month and year).',
      },
      {
        heading: 'Column D · Artificial Analysis Intelligence Index (AA-II)',
        text: 'The percentage score of the "Artificial Analysis Intelligence Index" (AA-II) — the most cited benchmark/IQ test for bots containing thousands of tasks from all disciplines. Evaluates English text only.',
        link: { url: 'https://artificialanalysis.ai', label: 'artificialanalysis.ai' },
      },
      {
        heading: 'Column E · Non-Hallucination Rate (%)',
        text: 'Bots were trained on a fixed set of data. If you ask unknown stuff, bots with a high non-hallucination rate invent/hallucinate far less. In AA-II its weight is only 5%, but for science it is crucial that a bot sincerely admits when it does not know something.',
      },
      {
        heading: 'Column F · AA-Omniscience (Scientific Knowledge)',
        text: 'Combines non-hallucination rate (33% weight) and scientific knowledge tasks (67% weight). Rewards correct answers, penalizes hallucinations, with no penalty for refusing to answer. Rescaled to 0–100%.',
      },
      {
        heading: 'Column G · MMMU Pro (Image & Plot Comprehension)',
        text: 'Measures image reading and plot analysis across 1,700 questions requiring reasoning over figures and diagrams. Rescaled assuming the empirical baseline of 29% as 0%.',
      },
      {
        heading: 'Column H · Medical Long Context Reasoning',
        text: 'Assesses long-context reasoning across hundreds of pages of clinical literature, heavily penalizing contradictions along a multi-step chain of thought.',
      },
      {
        heading: 'Column I · Excel Data Analysis (FinanceBench)',
        text: 'Measures the percentage of correctly solved data analysis tasks executed within Excel environments.',
      },
      {
        heading: 'Column J · SimpleBench (Spatial Reasoning & Common Sense)',
        text: 'Evaluates 200 trick questions (1 of 6 choices) requiring spatial imagination and common sense that are natural to physical beings but difficult for LLMs. Rescaled with 16.67% random guessing as 0%.',
        link: { url: 'https://simplebench.com', label: 'SimpleBench.com' },
      },
      {
        heading: 'Column K · Vals.ai (Tool Use & Multi-step Workflows)',
        text: 'Correctly solved percentage across finance, coding, and legal tasks requiring multi-step quantitative workflows and structured datasets.',
        link: { url: 'https://vals.ai', label: 'Vals.ai' },
      },
      {
        heading: 'Column L · Final Score OLD',
        text: 'Averages 5 historical benchmarks dating back to 2023 (columns C, D, E, F, I) with a high non-hallucination weighting of 27.6%.',
      },
      {
        heading: 'Column M · Final Score NEW',
        text: 'Averages all 8 benchmarks (non-hallucination weight: 17.25%). Measures tool use, scientific knowledge, long-context reasoning, diagram comprehension, factual accuracy, and spatial reasoning.',
      },
      {
        heading: 'Column N · Worst-Case Score',
        text: 'Multiplies the 7-benchmark capability average by the Non-Hallucination Rate (Column D). Why? When tackling unprecedented problems with no known solution, capabilities drop to 0% and full hallucination takes over. A bot with 50% IQ and 80% factual reliability yields 40% honest "cannot solve yet" responses, but 10% hallucinated falsehoods. Adding failed attempts on the remaining 50%, you end up with 60% erroneous output that requires exhausting manual verification.',
      },
      {
        heading: 'Column O & Further',
        text: 'Column O contains the historical storyline and release context. Further columns provide meta links and API parameters.',
      },
    ],
    paragraphsDe: [
      {
        text: 'Wenn Sie wenig Zeit haben, springen Sie direkt zu Spalte L bzw. M „Final Score NEW“. Die Punktzahlen der Bots wurden – sofern nicht anders angegeben – mit maximaler Denkzeit / Reasoning gemessen, wobei eine Stufe darunter (high / xhigh) meist ähnliche oder teils sogar leicht bessere Ergebnisse liefert. Stellen Sie außerdem sicher, dass die Websuche aktiviert ist, falls der Bot dies nicht standardmäßig tut.',
      },
      {
        heading: 'Hinweise zur Zeitleiste',
        text: 'Scrollen Sie nach unten, um die vollständige Historie unserer Konversationen mit Computern zu sehen. Nicht-fettgedruckte Zahlen in den Score-Spalten sind Schätzungen basierend auf früheren Modellen der Familie oder korrelierten Evaluationen. Zahlen sind teils weiß, teils schwarz – rein zur besseren Lesbarkeit.',
      },
      {
        heading: 'Spalte A · Firmen-Logo',
        text: 'Das Logo des Unternehmens hinter dem ChatBot.',
      },
      {
        heading: 'Spalte B · Top-10-Auswahl',
        text: 'Die Top 10 oben ist beschränkt auf ChatBots, die in Deutschland derzeit kostenlos nutzbar sind (für ein gewisses Zeitkontingent oder Anfragen pro Tag) und über vollständige Vision-Fähigkeiten (Bildeingabe) verfügen. Der Bot analysiert Bilder tatsächlich, statt nur Text darin zu scannen. Sortiert von oben nach unten tendenziell von schwächer zu besser. Achtung: Kostenloser Chat bedeutet nicht kostenlose API – für kostenlose Nutzung z. B. in JASP auf blauen Hintergrund achten. Die Gesamtliste unten unterliegt keinen solchen Beschränkungen.',
      },
      {
        heading: 'Spalte C · Urheber & Erscheinungsdatum',
        text: 'Wer hat den Bot veröffentlicht (Unternehmensname) und wann (Monat und Jahr).',
      },
      {
        heading: 'Spalte D · Artificial Analysis Intelligence Index (AA-II)',
        text: 'Prozentwert des „Artificial Analysis Intelligence Index“ (AA-II) – der meistzitierte IQ-Test für Bots mit tausenden Aufgaben aus allen Disziplinen. Bewertet nur englischsprachigen Text.',
        link: { url: 'https://artificialanalysis.ai', label: 'artificialanalysis.ai' },
      },
      {
        heading: 'Spalte E · Faktentreue / Non-Hallucination Rate (%)',
        text: 'Prozentualer Anteil nicht-halluzinierter Antworten. KIs neigen bei unbekannten Dingen weniger zum Erfinden/Halluzinieren, wenn diese Rate hoch ist. Für die Wissenschaft ist entscheidend, dass ein Bot ehrlich zugibt, wenn er etwas nicht weiß.',
      },
      {
        heading: 'Spalte F · AA-Omniscience (Wissenschaft & Allwissenheit)',
        text: 'Kombiniert Faktentreue (33 %) und wissenschaftliche Fachaufgaben (67 %). Belohnt korrekte Antworten, bestraft Halluzinationen, keine Strafe für Nichtbeantwortung. Skaliert auf 0 bis 100 %.',
      },
      {
        heading: 'Spalte G · MMMU Pro (Bild- & Diagrammverständnis)',
        text: '1.700 Aufgaben zur Interpretation von Diagrammen und Plots. Skaliert von 29 % Baselinewert auf 0 bis 100 %.',
      },
      {
        heading: 'Spalte H · Medizinisches Langkontext-Denken (MedQA Long)',
        text: 'Bewertung des Langkontext-Verstehens über hunderte Seiten klinischer Fachliteratur. Bestraft Widersprüche in der Gedankenkette.',
      },
      {
        heading: 'Spalte I · Excel-Datenanalyse (FinanceBench)',
        text: 'Prozentual gelöste Aufgaben in Excel-Umgebungen.',
      },
      {
        heading: 'Spalte J · SimpleBench (Räumliches Denken & gesunder Menschenverstand)',
        text: '200 Fangfragen (1 aus 6) mit räumlicher Vorstellungskraft und gesundem Menschenverstand – leicht für Menschen, schwer für Bots. Skaliert auf 0 bis 100 % (Zufallswahrscheinlichkeit von 16,67 % als Nullpunkt).',
        link: { url: 'https://simplebench.com', label: 'SimpleBench.com' },
      },
      {
        heading: 'Spalte K · Vals.ai (Tool Use & mehrstufige Workflows)',
        text: 'Tausende praxisnahe Aufgaben in Finanzen, Programmierung und Recht mit mehrstufigen Workflows.',
        link: { url: 'https://vals.ai', label: 'Vals.ai' },
      },
      {
        heading: 'Spalte L · Final Score OLD',
        text: 'Durchschnitt aus 5 Benchmarks bis 2023 mit hoher Gewichtung der Faktentreue (27,6 %).',
      },
      {
        heading: 'Spalte M · Final Score NEW',
        text: 'Durchschnitt aller 8 modernen Benchmarks (Faktentreue mit 17,25 % gewichtet). Misst Datenanalyse, Fachwissen, Langkontext, Diagrammverständnis, Faktenzuverlässigkeit und räumliches Denken.',
      },
      {
        heading: 'Spalte N · Worst-Case Score',
        text: 'Multipliziert den 7-Benchmark-Durchschnitt mit der Faktentreue (D). Warum? Bei schwierigen Aufgaben, für die es noch keine bekannte Lösung gibt, sinkt die Lösungsquote auf 0 % und die volle Halluzinationsrate schlägt zu. Wenn ein Bot zu 50 % Aufgaben lösen kann und eine 80 % Faktentreue hat, liefert er 40 % ehrliche Antworten („nicht lösbar“), aber 10 % halluzinierten Unsinn. Bei den restlichen 50 % scheitert er und produziert weitere falsche Ergebnisse – am Ende hat man 60 % unbrauchbaren Output, den man mühsam prüfen muss.',
      },
      {
        heading: 'Spalte O & weitere',
        text: 'Spalte O enthält die historische Wahrnehmung der Bot-Releases im Zeitverlauf. Weitere Spalten liefern Metadaten und API-Details.',
      },
    ],
  },
  practicalGuide: {
    titleEn: "What Bots can & can't do for you",
    titleDe: 'Was Bots für Sie tun können & was nicht',
    sourceCellHeader: 'N34',
    sourceCellContent: 'O34',
    paragraphsEn: [
      {
        heading: 'Censorship & Privacy',
        text: 'Most bots are politically and culturally censored and sometimes reflect discriminatory and stereotyping views dominant in their training data. Furthermore, never share sensitive or confidential information: it is stored and used to train future iterations and can become exposed via clever prompts, leakage, or hacks.',
      },
      {
        heading: 'IQ & Benchmarks',
        text: 'One can measure how well bots score on IQ tests and benchmark suites. Evaluations exist across varied fields: science, banking, healthcare, coding, and law (e.g. ArtificialAnalysis.ai, EpochAI). The resulting percentages indicate how many problems the bot solved correctly.',
        link: { url: 'https://artificialanalysis.ai', label: 'artificialanalysis.ai' },
      },
      {
        heading: 'Thrifty Tip (Sparfuchs-Tipp)',
        text: 'Paid subscriptions (Plus / Pro / Ultra / Max / Super) offer higher rate limits and slightly higher reasoning power. However, paying is generally unnecessary unless enterprise data privacy is required. Avoid dubious third-party aggregators claiming to offer expensive models for pennies—they often secretly substitute cheaper models. You can easily rotate among official free providers when reaching usage caps.',
      },
      {
        heading: 'The "Saturation" Problem',
        text: 'Benchmark questions and answers frequently leak into LLM training corpora, making solved rates appear more impressive than they truly are in practice. Once a benchmark becomes fully saturated, sets are published (e.g. MMMU-Pro) and revised. Very few benchmarks successfully keep their test splits secret for years (e.g. SimpleBench.com).',
        link: { url: 'https://simplebench.com', label: 'SimpleBench.com' },
      },
      {
        heading: 'Conversation Strategy',
        text: 'Whenever available, engage "Deep Think" or reasoning modes. Avoid "Fast/Instant" modes, which deploy lower compute or smaller architectures. Frame your prompts professionally to receive higher-quality answers. Break complex requests down step-by-step. Be mindful of "Context-Rot" in extended dialogues, where bots begin to lose track of earlier premises or mix up details.',
      },
      {
        heading: 'Anti-Bullshit Verification',
        text: 'Always scrutinize outputs against authoritative sources or cross-verify using an alternative model (e.g. a US-developed model against a Chinese model, or an analytical model against a creative one). If claims conflict or lack citations, suspect hallucination. Like humans, bots dislike admitting ignorance—explicitly permit the model to say "I do not know".',
      },
      {
        heading: 'When to use AI and when not',
        text: 'AI excels at creative inspiration, drafting, and repetitive productivity tasks when no sensitive data is involved. It is particularly effective for complex problems where you already hold domain competence to evaluate the result. Conversely, summarizing long documents (>20 pages) or interpreting intricate diagrams remains prone to surface-level skimming ("Context-Rot"). Novel concepts, authentic transfer learning, and genuine art lie outside training corpora. Bots are statistical neural networks predicting the most probable next token — no more, but no less.',
        link: {
          url: 'https://flowingdata.com/26/09/09/terence-tao-on-the-paradox-of-solving-mathematical-problems',
          label: 'Terence Tao on Mathematical Problems',
        },
      },
    ],
    paragraphsDe: [
      {
        heading: 'Zensur & Datenschutz',
        text: 'Die meisten Bots sind politisch und kulturell zensiert und geben mitunter diskriminierende und stereotypisierende Sichtweisen wieder, die im Trainingsdatensatz dominant vorliegen. Zudem sollte man keine sensiblen Informationen teilen, da sie für das Folgetraining verbesserter Bots genutzt werden und so über geschickte Abfragen oder Hacks internetöffentlich werden könnten.',
      },
      {
        heading: 'IQ & Benchmark-Parcours',
        text: 'Man kann messen, wie gut oder schlecht Bots in IQ-Tests und Benchmark-Parcours abschneiden. Es gibt Parcours für verschiedenste Disziplinen von Wissenschaft über Banking und Health Care bis Programmieren und Juristerei (z. B. ArtificialAnalysis.ai, EpochAI). Die Prozentzahlen spiegeln den Anteil korrekt gelöster Aufgaben wider.',
        link: { url: 'https://artificialanalysis.ai', label: 'artificialanalysis.ai' },
      },
      {
        heading: 'Sparfuchs-Tipp',
        text: 'Kostenpflichtige Modelle (Plus / Pro / Ultra / Max / Super) bringen geringere Limits und teils mehr IQ. Sie finden jene in der Historie unter den „Top 10“ der kostenlosen Bots. Ich empfehle nicht zu zahlen, außer es geht um Datenschutz. Meiden Sie zudem Drittanbieter, die vorgeben, teure Modelle viel günstiger anzubieten – das ist meist Betrug mit heimlich billigeren Modellen. Es gibt genügend offizielle kostenlose Bots, um bei Limits einfach zum nächsten Anbieter zu wechseln.',
      },
      {
        heading: 'Das „Saturation“-Problem',
        text: 'Es geraten immer wieder Fragen und Antworten der Benchmarks in den Trainingsdatensatz der Bots. Die gelöste Prozentzahl kann also beeindruckender wirken als sie wirklich ist. Um dem zu begegnen, werden gesättigte Benchmarks veröffentlicht (z. B. MMMU-Pro) und überarbeitet. Nur wenige schaffen es, Testfragen über Jahre geheim zu halten (z. B. SimpleBench.com).',
        link: { url: 'https://simplebench.com', label: 'SimpleBench.com' },
      },
      {
        heading: 'Konversations-Tipp',
        text: 'Soweit verfügbar empfiehlt es sich, Modi wie „Deep Think“ zu nutzen und Sofort/Fast-Modi zu meiden. Klingen Sie professionell bei Fragen, um professionellere Antworten zu erhalten. Bitten Sie bei komplexen Aufgaben Schritt für Schritt vorzugehen. Beachten Sie „Context-Rot“: Bei langen Chats vergisst der Bot frühere Abschnitte oder wirft Fakten durcheinander.',
      },
      {
        heading: 'Anti-Bullshit-Tipp',
        text: 'Prüfen Sie Antworten stets kritisch anhand glaubwürdiger Quellen oder mit einem zweiten Bot (z. B. US-Modell gegen chinesisches Modell). KIs halluzinieren, wenn man sie überfordert. Machen Sie klar, dass es in Ordnung ist, wenn eine Lösung unbekannt ist. Bots können oft besser recherchieren als man selbst, sofern man sie auf wissenschaftliche Quellen festlegt.',
      },
      {
        heading: 'Wann KI nutzen und wann nicht?',
        text: 'Vor allem bei komplexen Fachfragen, bei denen man sich selbst grundlegend auskennt, ist ein Bot lohnend. Für Inspiration und repetitive Aufgaben ohne sensible Daten taugen Bots hervorragend. Lange Texte (>20 Seiten) oder komplexe Diagramme werden teils unzuverlässig und oberflächlich gelesen. Transferaufgaben und echte Neuerfindungen fallen KIs schwer. KIs sind statistische Maschinen (neuronale Netze), die Wahrscheinlichkeiten für die passendste nächste Wortsilbe berechnen – nicht mehr, aber auch nicht weniger.',
        link: {
          url: 'https://flowingdata.com/26/09/09/terence-tao-on-the-paradox-of-solving-mathematical-problems',
          label: 'Terence Tao zum Paradoxon mathematischer Probleme',
        },
      },
    ],
    quote: {
      author: 'Prof. Lischke',
      textDe:
        '„Soweit ich das in meinem Umfeld überblicken kann, geht der Trend dahin, dass aufgrund des KI-Einsatzes die Bewertungsstandards für BA / MAs angehoben werden. Die unkritische Übernahme von KI-Outputs wird mitunter scharf geahndet. Begründet wird das damit, dass eine BA / MA nachweisen soll, dass eine Person wissenschaftlich arbeiten kann. Dazu gehört die kritische Reflexion eigener und fremder Befunde sowie die eigenständige Prüfung von Quellen und Argumenten. Wer KI-Outputs ungeprüft übernimmt, erfüllt diesen Anspruch nicht. Das Problem ist daher nicht die Nutzung von KI als solche, sondern der Verzicht auf wissenschaftliche Qualitätskontrolle. Ich kenne Lehrende, die in solchen Fällen BA / MAs als nicht bestanden bewerten. Manche werten das sogar als Täuschungsversuch. Kurzum: Je selbstverständlicher KI genutzt wird, desto stärker zählt die Fähigkeit, ihre Ergebnisse kritisch zu prüfen und wissenschaftlich zu verantworten.“ — Ich sehe das genauso.',
      textEn:
        '"As far as I can see in my academic environment, assessment standards for Bachelor\'s and Master\'s theses are being raised due to AI use. The uncritical adoption of AI outputs is severely penalised. A thesis is meant to demonstrate that a person can work scientifically — including the critical reflection of one\'s own and external findings and the independent examination of sources and arguments. Those who adopt AI outputs unvetted fail to meet this standard. The problem is not the use of AI as such, but the omission of scientific quality control. Some educators grade such submissions as fail, or even treat them as academic dishonesty. In short: The more commonplace AI becomes, the more vital the ability to critically verify its results and take scientific responsibility for them." — I see it exactly the same way.',
    },
  },
};
