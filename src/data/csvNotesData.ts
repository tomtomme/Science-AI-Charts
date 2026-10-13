import { CsvParagraph } from '../types';

export interface CsvNoteSection {
  titleEn: string;
  titleDe: string;
  paragraphsEn: CsvParagraph[];
  paragraphsDe: CsvParagraph[];
}

export const CSV_NOTES_DATA: {
  columnsGuide: CsvNoteSection;
  practicalGuide: CsvNoteSection;
} = {
  columnsGuide: {
    titleEn: 'How To Read',
    titleDe: 'Anleitung zum Lesen',
    paragraphsEn: [
      {
        text: 'If you have no time, skip to column L "Final Score NEW". The bots scores was measured with max reasoning / thinking dial if not mentioned otherwise - while most of the time a setting below (high / xhigh) will give you similar or sometimes even slightly better results. Also make sure you activate internet search capabilities if the bot does not activate this per default. Notes on the timeline below: Scroll down to find the complete history / timeline of us "talking to computers". Non-Bold numbers in the score columns are estimates based on earlier results within the model family and / or results of correlated evals (evaluations). Sometimes the numbers are white, sometimes black: This is just for readability.',
      },
      {
        heading: 'Column A',
        text: 'The Logo of the company behind the ChatBot',
      },
      {
        heading: 'Column B',
        text: 'The Top10 above is limited to ChatBots that are currently free to use in germany (for some amount of time or requests per day). Also the list is limited to bots with full vision aka image input. This means, that the bot actually can analyze all kinds of images, not just scan the text that might be within the image. The Top 10 list is mostly sorted top to bottom from worse to better. Beware: Free chat does not mean free API - so to use a bot for free e.g. in JASP look out for the blue background. The full list below is not restricted to the limitations "being free" and "having vision"',
      },
      {
        heading: 'Column C',
        text: 'Who released the Bot (company name) and when (month and year).',
      },
      {
        heading: 'Column D',
        text: 'This is the percentage score of the “Artificial Analysis Intelligence Index” (AA-II). This is the most cited benchmark aka IQ-Test for Bots. Its evaluations contain thousands of tasks from all disciplines all Bots try to solve. The resulting score is a weighted percentage of correctly solved tasks. This benchmark evaluates English language / text only. Thus the following columns contain further benchmarks important to researchers and data analysts from the medical realm. With time the Bots get better at solving tasks (partly due to leaked answers), thus the evaluations are updated or replaced with new ones regularily.',
        link: { url: 'https://artificialanalysis.ai', label: 'artificialanalysis.ai' },
      },
      {
        heading: 'Column E',
        text: 'Non-Hallucination Rate in %: The Bots were trained on a fixed set of data / knowledge. There are many things unknown to humanity and thus the bots. If you ask the bot unknown stuff it tends to invent / hallucinate less often, if the non-hallucination-rate is high. This rate is already included in the score of column C (AA-II), but its weight there is only 5 %. For science it is much more important that a bot sincerely tells us if he does not know something.',
      },
      {
        heading: 'Column F',
        text: 'Column E again contains the "non-hallucination-rate" with 33% weight within the column, and it also contains scientific knowledge tasks (weighted 67%) which in combination gives us the “AA-Omniscience” score. AA-Omniscience rewards correct answers, penalizes hallucinations, and has no penalty for refusing to answer. Scores range from -100 to 100, where 0 means as many correct as incorrect answers. For the final scores this score is rescaled to percent (0 to 100 %).',
      },
      {
        heading: 'Column G',
        text: 'This contains the MMMU Pro "image reading" score in %. For statistical data analysis we need graph / plot analysis. Consequently “MMMU Pro” asks 1.7k questions which require interpreting and reasoning over images. Some MMMU Pro estimated of MMMU non-Pro scores, some reflect MMMU Pro score of bolted on Vision model (if main model is text only). Because the lowest score besides 0 is 29, the score is rescaled to assume the bottom of 29 as the real 0.',
      },
      {
        heading: 'Column H',
        text: 'The Medical Long Context Reasoning Score in % assesses long-context reasoning across clinical literature. Long context means to reason across hundreds of pages and to never loose the plot or the hints from the beginning of the book. So this benchmark penalizes contradicitons along a reasoning chain of thought.',
      },
      {
        heading: 'Column I',
        text: 'This data analysis benchmark measures the percentage of correctly solved tasks within Excel.',
      },
      {
        heading: 'Column J',
        text: 'The "SimpleBench" score gives us the correctly solved percentage of 200 single choice (1 of 6) trick questions. They contain spatial reasoning and common sense easy for humans to solve, but hard to solve for bots. They require a spatial imagination that is natural to us because we grow up in the physical world while the training data of bots is lacking in regard to (three-dimensional) hearing, seeing, touching, smelling, tasting, and social intelligence. Because choosing the correct answer of 1 in 6 by purely guessing is 16.67%, the score is rescaled to reflect this as the real 0.',
        link: { url: 'https://simplebench.com', label: 'SimpleBench.com' },
      },
      {
        heading: 'Column K',
        text: 'The "Vals.ai" score gives us the correctly solved percentage accross thousands of tasks including finance (Excel), coding, and legal work. It is similar to column C (AA-II) in regard to its evaluations being updated or replaced regularily. To solve the tasks the bots need to execute multi-step quantitative workflows, process structured datasets, and assist with statistical software environments such as Excel.',
        link: { url: 'https://vals.ai', label: 'Vals.ai' },
      },
      {
        heading: 'Column L',
        text: 'The "Final Score OLD" averages 5 benchmarks which reach back to 23 (columns C, D, E, F, I). The weight for the "non-hallucination-rate" is fairly high with 27.6 %.',
      },
      {
        heading: 'Column M',
        text: 'The "Final Score NEW" averages all 8 benchmarks. The resulting weight of the "non-hallucination-rate" is 17.25 %. To sum up, this measures data analysis & tool use, (medical) scientific knowledge, long-context reasoning, vision comprehension of plots, factual accuracy & reliability, spatial reasoning, and resistance to trick questions.',
      },
      {
        heading: 'Column N',
        text: 'The "Final Score Worst-Case" averages 7 benchmarks. The exception is column D "Non-Hallucination-Rate". Instead the 7-bench average is multiplied by D.',
      },
      {
        heading: 'Why?',
        text: 'Imagine you have a complicated project (like a thesis) that involves a couple of hard tasks you try to solve with the bot. The mean percentage of tasks the bot should solve is given by the average of the 7 capability benchmarks. Imagine now that the worst case kicks in: That is the situation that there is no real solution yet developed by mankind for all of these tasks (so the bot can solve 0% instead of e.g. 50%). That may be, because bots in many cases cannot yet generalize, or develop completely new techniques on their own. Heck, the tasks might in themselves not be solvable at all - ever -, because they would need to violate some kind of physics law, or because the task is not formulated precisely enough, or contains a logical error etc. In this situation the full hallucination rate will kick in (e.g. 20%) and the bot will start to make things up (it will lie to you). But because of public benchmarks like this one the Bot still thinks that he is a big brain who can solve 50% of the tasks (arrogance par excelence). This leaves the percentage of tasks covered by the non-hallucination-rate (e.g. 80%), where the bot honestly trys to develop a solution but in the end tells you that this is not known to mankind / not solvable yet. So 50% IQ times 80% non-hallucination rate gives you 40% honest „Sorry, cannot do this yet“ answers and 10% hallucinated bullshit "solutions". What about the rest of the tasks, the other 50%? The Bot will try but fail more obvious because he expects to fail at 50% of hard tasks on average. You might want to rate them as more honest attempts, but the result will still be wrong and thus can be added to the 10% hallucinated bullshit "solutions". In the end you have 40% "Sorry, no solution for this", and 60% stuff which might or might not look like a solution. You still need to read / check these and then realize it was all a waste of time and resources!',
      },
      {
        heading: 'Column O',
        text: 'The Storyline contains how I perceived the bots\' release within the historical context.',
      },
      {
        heading: 'Column P and further',
        text: 'Should be self explanatory or reletively unimportant',
      },
    ],
    paragraphsDe: [
      {
        text: 'Wenn Sie keine Zeit haben, springen Sie direkt zu Spalte L „Final Score NEW“. Die Punktzahlen der Bots wurden, sofern nicht anders angegeben, mit maximaler Denkzeit / Reasoning gemessen – während meistens eine Stufe darunter (high / xhigh) ähnliche oder manchmal sogar etwas bessere Ergebnisse liefert. Stellen Sie außerdem sicher, dass Sie die Internetsuche aktivieren, falls der Bot dies nicht standardmäßig tut. Hinweise zur Zeitleiste unten: Scrollen Sie nach unten, um die vollständige Geschichte / Zeitleiste unserer „Gespräche mit Computern“ zu finden. Nicht-fettgedruckte Zahlen in den Score-Spalten sind Schätzungen basierend auf früheren Ergebnissen innerhalb der Modellfamilie und / oder Ergebnissen korrelierter Evaluationen. Manchmal sind die Zahlen weiß, manchmal schwarz: Dies dient rein der besseren Lesbarkeit.',
      },
      {
        heading: 'Spalte A',
        text: 'Das Logo des Unternehmens hinter dem ChatBot',
      },
      {
        heading: 'Spalte B',
        text: 'Die Top 10 oben ist auf ChatBots beschränkt, die in Deutschland derzeit kostenlos nutzbar sind (für ein gewisses Zeitkontingent oder Anfragen pro Tag). Außerdem ist die Liste auf Bots mit voller Vision bzw. Bildeingabe beschränkt. Das bedeutet, dass der Bot tatsächlich alle Arten von Bildern analysieren kann und nicht nur den Text scannt, der sich möglicherweise im Bild befindet. Die Top-10-Liste ist größtenteils von oben nach unten von schlechter zu besser sortiert. Achtung: Kostenloser Chat bedeutet nicht kostenlose API – um einen Bot kostenlos z. B. in JASP zu nutzen, achten Sie auf den blauen Hintergrund. Die vollständige Liste unten ist nicht auf die Einschränkungen „kostenlos“ und „Vision vorhanden“ beschränkt.',
      },
      {
        heading: 'Spalte C',
        text: 'Wer hat den Bot veröffentlicht (Unternehmensname) und wann (Monat und Jahr).',
      },
      {
        heading: 'Spalte D',
        text: 'Dies ist der prozentuale Wert des „Artificial Analysis Intelligence Index“ (AA-II). Dies ist der meistzitierte Benchmark bzw. IQ-Test für Bots. Seine Evaluationen umfassen Tausende von Aufgaben aus allen Fachbereichen, die alle Bots zu lösen versuchen. Das resultierende Ergebnis ist ein gewichteter Prozentsatz der korrekt gelösten Aufgaben. Dieser Benchmark bewertet ausschließlich englische Sprache / Text. Daher enthalten die folgenden Spalten weitere Benchmarks, die für Forschende und Datenanalysten aus dem medizinischen Bereich wichtig sind. Mit der Zeit werden die Bots immer besser beim Lösen von Aufgaben (teilweise durch durchgesickerte Antworten), daher werden die Evaluationen regelmäßig aktualisiert oder durch neue ersetzt.',
        link: { url: 'https://artificialanalysis.ai', label: 'artificialanalysis.ai' },
      },
      {
        heading: 'Spalte E',
        text: 'Non-Hallucination-Rate in %: Die Bots wurden auf einem festen Satz von Daten / Wissen trainiert. Es gibt viele Dinge, die der Menschheit und somit auch den Bots unbekannt sind. Fragt man den Bot nach unbekannten Dingen, neigt er bei hoher Non-Hallucination-Rate seltener dazu, Dinge zu erfinden / zu halluzinieren. Diese Rate ist bereits im Score von Spalte C (AA-II) enthalten, aber ihr Gewicht liegt dort bei lediglich 5 %. Für die Wissenschaft ist es viel wichtiger, dass ein Bot uns aufrichtig sagt, wenn er etwas nicht weiß.',
      },
      {
        heading: 'Spalte F',
        text: 'Spalte E enthält erneut die „Non-Hallucination-Rate“ mit 33 % Gewichtung innerhalb der Spalte und enthält zudem wissenschaftliche Fachaufgaben (mit 67 % gewichtet), was in Kombination den Score „AA-Omniscience“ ergibt. AA-Omniscience belohnt korrekte Antworten, bestraft Halluzinationen und verhängt keine Strafe für die Verweigerung einer Antwort. Die Werte reichen von -100 bis 100, wobei 0 genauso viele richtige wie falsche Antworten bedeutet. Für die finalen Scores wird dieser Wert auf Prozent (0 bis 100 %) umskaliert.',
      },
      {
        heading: 'Spalte G',
        text: 'Dies enthält den MMMU-Pro-Score für „Bildlesen“ in %. Für die statistische Datenanalyse benötigen wir Graph- / Plot-Analysen. Dementsprechend stellt „MMMU Pro“ 1.700 Fragen, die das Interpretieren von und logische Schlussfolgern über Bilder erfordern. Einige MMMU-Pro-Werte sind Schätzungen aus MMMU-Non-Pro-Scores, einige spiegeln den MMMU-Pro-Score eines angeflanschten Vision-Modells wider (falls das Hauptmodell rein textbasiert ist). Da der niedrigste Wert neben 0 bei 29 liegt, wird der Wert so umskaliert, dass der Tiefstwert von 29 als echte 0 angenommen wird.',
      },
      {
        heading: 'Spalte H',
        text: 'Der Medical Long Context Reasoning Score in % bewertet das logische Denken über lange Kontexte hinweg in klinischer Fachliteratur. Langer Kontext bedeutet, über Hunderte von Seiten hinweg zu schlussfolgern und niemals den Faden oder die Hinweise vom Anfang des Buches zu verlieren. Dieser Benchmark bestraft daher Widersprüche entlang einer Gedankenkette.',
      },
      {
        heading: 'Spalte I',
        text: 'Dieser Datenanalyse-Benchmark misst den Prozentsatz der korrekt gelösten Aufgaben innerhalb von Excel.',
      },
      {
        heading: 'Spalte J',
        text: 'Der Score „SimpleBench“ gibt den korrekt gelösten Prozentsatz von 200 Single-Choice-Fangfragen (1 aus 6) an. Sie enthalten räumliches Vorstellungsvermögen und gesunden Menschenverstand, die für Menschen leicht, für Bots jedoch schwer zu lösen sind. Sie erfordern eine räumliche Vorstellungskraft, die für uns natürlich ist, weil wir in der physischen Welt aufwachsen, während es den Trainingsdaten der Bots an (dreidimensionalem) Hören, Sehen, Fühlen, Riechen, Schmecken und sozialer Intelligenz mangelt. Da das Auswählen der richtigen Antwort von 1 aus 6 durch reines Raten 16,67 % beträgt, wird der Score so umskaliert, dass dies die reale 0 widerspiegelt.',
        link: { url: 'https://simplebench.com', label: 'SimpleBench.com' },
      },
      {
        heading: 'Spalte K',
        text: 'Der Score „Vals.ai“ gibt den korrekt gelösten Prozentsatz über Tausende von Aufgaben hinweg an, darunter Finanzen (Excel), Programmierung und juristische Arbeit. Er ähnelt Spalte C (AA-II) darin, dass seine Evaluationen regelmäßig aktualisiert oder ersetzt werden. Um die Aufgaben zu lösen, müssen die Bots mehrstufige quantitative Arbeitsabläufe ausführen, strukturierte Datensätze verarbeiten und bei statistischen Softwareumgebungen wie Excel unterstützen.',
        link: { url: 'https://vals.ai', label: 'Vals.ai' },
      },
      {
        heading: 'Spalte L',
        text: 'Der „Final Score OLD“ bildet den Durchschnitt aus 5 Benchmarks, die bis ins Jahr 2023 zurückreichen (Spalten C, D, E, F, I). Die Gewichtung für die „Non-Hallucination-Rate“ ist mit 27,6 % recht hoch.',
      },
      {
        heading: 'Spalte M',
        text: 'Der „Final Score NEW“ bildet den Durchschnitt aller 8 Benchmarks. Die resultierende Gewichtung der „Non-Hallucination-Rate“ liegt bei 17,25 %. Zusammenfassend misst dies Datenanalyse & Tool Use, (medizinisches) wissenschaftliches Fachwissen, logisches Denken im langen Kontext, visuelles Verständnis von Plots, faktische Genauigkeit & Zuverlässigkeit, räumliches Denken und Resistenz gegen Fangfragen.',
      },
      {
        heading: 'Spalte N',
        text: 'Der „Final Score Worst-Case“ bildet den Durchschnitt aus 7 Benchmarks. Die Ausnahme ist Spalte D „Non-Hallucination-Rate“. Stattdessen wird der 7-Benchmark-Durchschnitt mit D multipliziert.',
      },
      {
        heading: 'Warum?',
        text: 'Stellen Sie sich vor, Sie haben ein kompliziertes Projekt (wie eine Abschlussarbeit), das einige schwierige Aufgaben beinhaltet, die Sie mit dem Bot zu lösen versuchen. Der durchschnittliche Prozentsatz an Aufgaben, die der Bot lösen sollte, ergibt sich aus dem Mittelwert der 7 Fähigkeits-Benchmarks. Stellen Sie sich nun vor, dass der Worst Case eintritt: Das ist die Situation, dass von der Menschheit für alle diese Aufgaben noch gar keine wirkliche Lösung entwickelt wurde (der Bot kann also 0 % statt z. B. 50 % lösen). Das kann daran liegen, dass Bots in vielen Fällen noch nicht generalisieren oder völlig neue Techniken eigenständig entwickeln können. Verflixt, die Aufgaben könnten an sich überhaupt nicht lösbar sein – jemals –, weil sie irgendein physikalisches Gesetz verletzen müssten, oder weil die Aufgabe nicht präzise genug formuliert ist, einen logischen Fehler enthält usw. In dieser Situation schlägt die volle Halluzinationsrate zu (z. B. 20 %) und der Bot fängt an, Dinge zu erfinden (er lügt Sie an). Doch aufgrund öffentlicher Benchmarks wie diesem hier glaubt der Bot immer noch, er sei ein Superhirn, das 50 % der Aufgaben lösen kann (Arroganz par excellence). Dies hinterlässt den Prozentsatz an Aufgaben, der durch die Non-Hallucination-Rate abgedeckt ist (z. B. 80 %), bei denen der Bot ehrlich versucht, eine Lösung zu entwickeln, Ihnen aber am Ende sagt, dass dies der Menschheit nicht bekannt bzw. noch nicht lösbar ist. 50 % IQ mal 80 % Non-Hallucination-Rate ergibt also 40 % ehrliche „Tut mir leid, kann ich noch nicht“-Antworten und 10 % halluzinierte Bullshit-„Lösungen“. Was ist mit den restlichen Aufgaben, den anderen 50 %? Der Bot wird es versuchen, aber offensichtlicher scheitern, weil er erwartet, bei durchschnittlich 50 % der schwierigen Aufgaben zu scheitern. Man könnte diese als ehrlichere Versuche werten, aber das Ergebnis ist dennoch falsch und kann somit zu den 10 % halluzinierten Bullshit-„Lösungen“ hinzugezählt werden. Am Ende haben Sie 40 % „Tut mir leid, keine Lösung dafür“ und 60 % Zeug, das wie eine Lösung aussehen könnte oder auch nicht. Sie müssen diese immer noch lesen / prüfen und dann feststellen, dass alles eine Verschwendung von Zeit und Ressourcen war!',
      },
      {
        heading: 'Spalte O',
        text: 'Die Storyline enthält, wie ich die Veröffentlichung der Bots im historischen Kontext wahrgenommen habe.',
      },
      {
        heading: 'Spalte P und weitere',
        text: 'Sollte selbsterklärend oder relativ unwichtig sein.',
      },
    ],
  },
  practicalGuide: {
    titleEn: "What Bots can & can't do for you",
    titleDe: 'Was Bots für Sie tun können & was nicht',
    paragraphsEn: [
      {
        heading: 'Censorship & Data Privacy',
        text: 'Most bots are politically and culturally censored and sometimes reflect discriminatory and stereotyping views that are dominant in the training dataset. Furthermore, you should not share sensitive information, as it is used for subsequent training of improved bots and could become public on the internet via clever prompts or hacks.',
      },
      {
        heading: 'IQ & Benchmarks',
        text: 'One can measure how well or poorly bots perform in IQ tests / benchmark parcours. There are parcours for a wide variety of disciplines. Accordingly, some providers such as https://artificialanalysis.ai or EpochAI prepare the whole picture as a meta-analysis from multiple benchmark parcours. Everything from science, banking, healthcare, coding to law is covered. The resulting percentages (see below) tell how many of the tasks / questions were answered correctly by the bot.',
      },
      {
        heading: 'Frugal Tip',
        text: 'Paid models (Plus / Pro / Ultra / Max / Super) bring fewer limits and sometimes more IQ. You can find them in the history below the "Top 10" of free bots. I recommend not paying unless it is about data privacy. Furthermore, avoid third-party resellers who pretend that you can use the expensive model XY much cheaper. This is usually fraud, and cheaper models secretly reply in the background even if it doesn\'t look like it on the surface. There are plenty of free bots, so when reaching the limit, you can simply hop to the next official provider.',
      },
      {
        heading: '"Saturation" Problem',
        text: 'Leaked questions & answers of benchmarks repeatedly enter the training datasets of bots. The percentage of solved tasks can therefore appear more impressive than it really is. To counteract this, completely solved benchmark parcours (saturated) are published for everyone (e.g. MMMU-Pro) and revised whenever possible. Only a few manage to keep questions & answers secret over years (e.g. SimpleBench.com).',
      },
      {
        heading: 'Conversation Tip',
        text: 'Where available, it is recommended to use buttons like "Deep Think" etc. Avoid modes like Instant/Fast. Those use less computing power (reasoning) and/or smaller neural networks. Sound professional when you ask questions, and you will receive more professional answers. Do not ask questions that nobody can answer, or on topics where you have no knowledge at all and do not know how you could verify / check the bot\'s statements. To request more computing power (practically forcing more "thinking time"), it helps to prompt tasks / questions step by step. However, after a certain conversation length, "context rot" sets in and the bot forgets older context or confuses things.',
      },
      {
        heading: 'Anti-Bullshit Tip',
        text: 'Therefore, check answers critically against credible sources and/or at least with another bot (e.g. a US bot against a Chinese one, or a more hallucinating bot against a less hallucinating one). Does that produce contradictory statements? Are source citations missing? Then hallucinations / fake news may be present. AIs hallucinate when you challenge them too much / push them into a corner, or demand things that nobody can know. Like some humans or like the training data, bots sometimes dislike admitting not knowing something or not being able to solve it. So make it clear that it is fine if the solution is unknown. If you find that too unreliable: "I\'ll Google it" can bring up half-truths just as well if you cannot judge the quality of the sources and do not cross-check with a second / third source. In case of doubt, bots can often Google better than you, as long as you instruct the bot to restrict itself to scientific sources.',
      },
      {
        heading: 'When to use AI and when not?',
        text: 'Especially for more complex questions / tasks in a field in which one is fundamentally knowledgeable, it can be more worthwhile to ask a bot than to Google / go to the library – which would, of course, be more resource-efficient and more sustainable for one\'s own learning. For inspiration, bots are good – especially the ones prone to hallucinating. They are also useful for repetitive tasks to increase efficiency, provided no sensitive data is processed. For fact-checking, I would only use them if I subsequently verify the original sources, or once bots eventually achieve <1% hallucination rate. Summarizing and evaluating long texts (>20 pages) or reading complex diagrams works somewhat unreliably, especially with cheaper bots. They read too superficially and fail to recognize connections between text passages that are further apart (keyword "context rot"). Transfer tasks are also difficult for AI, or anything not contained in the training data, such as new concepts, art, creativity. A clever recombination of existing knowledge can also be interpreted as a creative accomplishment, but experience shows this is limited. Because modern AIs were trained on the basis of the entire internet\'s knowledge + X, and we personally only know a tiny fraction of it, AIs may seem more creative at first glance than they really are. AIs are statistical machines (neural networks, for an explanation see: https://flowingdata.com/26/09/09/terence-tao-on-the-paradox-of-solving-mathematical-problems ), which in text models (chatbots) calculate probabilities for the most fitting next syllable. Nothing more, but also nothing less.\n\nFurthermore, below is a quote from Prof. Lischke (many thanks for permission): "As far as I can survey in my environment, the trend is that evaluation standards for BA / MA theses are being raised due to the use of AI. The uncritical adoption of AI outputs is sometimes severely penalized. The rationale is that a BA / MA thesis is intended to prove that a person can work scientifically. This includes the critical reflection of one\'s own and others\' findings as well as the independent verification of sources and arguments. Anyone who adopts AI outputs unchecked fails to meet this standard. The problem is therefore not the use of AI as such, but the renunciation of scientific quality control. I know instructors who fail BA / MA theses in such cases. Some even treat it as an attempt to deceive. In short: The more naturally AI is used, the more the ability to critically verify its results and take scientific responsibility for them matters." - I see it the exact same way.',
      },
    ],
    paragraphsDe: [
      {
        heading: 'Zensur & Datenschutz',
        text: 'Die meisten Bots sind politisch kulturell zensiert und geben mitunter diskriminierende und stereotypisierende Sichtweisen wieder, die im Trainingsdatensatz dominant vorliegen. Zudem sollte man keine sensiblen Informationen teilen, da sie für das Folgetraining verbesserter Bots genutzt werden und so über geschickte Abfragen oder über Hacks internetöffentlich werden könnten.',
      },
      {
        heading: 'IQ',
        text: 'Man kann messen, wie gut oder schlecht Bots in IQ-Tests / Benchmark-Parcours abschneiden. Es gibt Parcoure für verschiedenste Disziplinen. Entsprechend bereiten manche wie https://artificialanalysis.ai oder EpochAI das ganze als Meta-Analyse aus X Benchmark-Parcouren auf. Von Wissenschaft über, Banking, Health Care, Programmieren bis Juristerei wird alles abgedeckt. Die sich ergebenden Prozentzahlen (s.u.) sagen, wieviele der Aufgaben / Fragen vom Bot korrekt beantwortet werden konnten.',
      },
      {
        heading: 'Sparfuchs-Tipp',
        text: 'Kostenpflichtige Modelle (Plus / Pro / Ultra / Max / Super) bringen geringere LImits und teils mehr IQ. Sie finden jene in der Historie unter den "Top10" der kostenlosen Bots. Ich empfehle nicht zu zahlen, außer es geht um Datenschutz. Meiden Sie zudem Drittanbieter, welche z.B. vorgeben, dass Sie das teure Modell XY auch viel günstiger nutzen können. Das ist meist Betrug und es antworten dann heimlich günstigere Modelle, auch wenn es oberflächlich nicht so aussieht. Es gibt genügend kostenlose Bots, so dass man beim Erreichen des LImits zum nächsten offiziellen Anbieter springen kann.',
      },
      {
        heading: '"Saturation"-Problem',
        text: 'Es geraten immer wieder geleakte Fragen & Antworten der Benchmarks in den Trainingsdatensatz der Bots. Die Prozentzahl gelöster Aufgaben kann also beeindruckender erscheinen als Sie wirklich ist. Um dem entgegenzutreten werden vollständig gelöste Benchmark-Parcoure (saturated) für alle veröffentlicht (z.B. MMMU-Pro) und wenn das möglich ist überarbeitet. Nur wenige schaffen es die Fragen & Antworten über Jahre hinweg geheim zu halten (z.B. SimpleBench.com).',
      },
      {
        heading: 'Konversations-Tipp',
        text: 'Soweit verfügbar empfiehlt es sich Knöpfe wie "Deep Think" etc. zu nutzen. Vermeiden Sie Modi wie Sofort/Fast. Jene nutzen weniger Rechenkapazität (Reasoning) und / oder kleinere neuronale Netze. Klingen Sie professionell, wenn Sie Fragen stellen, dann erhalten Sie professionellere Antworten. Stellen Sie keine Fragen, die niemand beantworten kann oder zu Themen, bei denen Sie sich gar nicht auskennen und nicht wissen, wie Sie die Aussagen des Bots verifizieren / prüfen könnten. Um mehr Rechenkapazität anzufordern (quasi mehr "Denkzeit" zu forcieren), hilft es die Aufgaben / Fragen Schritt für Schritt anzufordern. Allerdings tritt nach einer gewissen Konversationslänge "Context-Rot" ein und der Bot vergisst länger zurückliegendes oder wirft etwas durcheinander.',
      },
      {
        heading: 'Anti-Bullshit-Tipp',
        text: 'Prüfen Sie daher die Antworten kritisch anhand glaubwürdiger Quellen und / oder zumindest mit einem anderen Bot (z.B. einen US-amerikanischen Bot gegen einen chinesischen oder einen stärker halluzinierenden gegen einen weniger halluzinierenden). Produziert das widersprüchliche Aussagen? Fehlen Quellenangaben? Dann liegt evtl. Halluzinationen / FakeNews vor. KIs haluzinieren, wenn Sie sie zu sehr fordern / in eine Ecke drängen, Dinge fordern, die niemand wissen kann. Wie manche Menschen bzw. wie die Trainingsdaten, geben Bots teils ungern zu, etwas nicht zu wissen oder nicht lösen zu können. Machen Sie also klar, dass es in Ordnung ist, wenn die Lösung unbekannt ist. Wenn Sie das zu unzuverlässig finden: "Ich google mir das" kann genauso Halbwahrheiten zu Tage fördern, wenn Sie die Qualität der Quellen nicht einschätzen können und nicht mit zweiter / dritter Quelle gegenprüfen. Im Zweifel können die Bots oft besser googeln als Sie, solange Sie dem Bot mitgeben, dass er sich auf wissenschatliche Quellen beschränken soll.',
      },
      {
        heading: 'Wann KI nutzen und wann nicht?',
        text: 'Vor allem bei komplexeren Fragen / Aufgaben eines Themengebietes in dem man sich zugleich grundlegend auskennt, kann es lohnenswerter sein einen Bot zu fragen, als zu googeln / in die Bib zu gehen - was aber natürlich resourcenschonender und für den eigenen Lerneffekt nachhaltiger wäre. Zwecks Inspiration taugen Bots gut - gerade die gern halluzinierenden. Auch für repetetive Aufgaben, zwecks Effizienzsteigerung sind sie nützlich, wenn dabei keine sensiblen Daten verarbeitet werden. Zwecks Faktenprüfung würde ich sie einsetzen, wenn ich im Anschluss die Originalquellen prüfe oder die Bots irgendwann <1% Halluzinationsrate haben. Das Zusammenfassen und auswerten langer Texte (>20 Seiten) oder lesen komplexer Diagramme funktioniert teils unzuverlässig, insbesondere bei günstigeren Bots. Die lesen zu oberflächlich und erkennen Zusamemnhänge zwischen Textpassagen nicht, die weiter auseinanderliegen (Stichwort "Context-Rot"). Auch Transferaufgaben fallen KI schwer bzw. alles, was nicht in den Trainingsdaten enthalten ist, wie neue Konzepte, Kunst, Kreatives. Auch ein geschicktes Neuzusammenstellen bekannten Wissens kann als kreative Leistung interpretiert werden, jene ist aber erfahrungsgemäß begrenzter. Weil die KIs heute auf Basis des gesammten Internetwissens+X trainiert wurden und wir davon persönlich nur einen winzigen Ausschnitt kennen, wirken KIs auf den ersten Blick evtl. kreativer als sie wirklich sind. KIs sind statistische Maschinen (neuronale Netze, zwecks Erläuterung siehe: https://flowingdata.com/26/09/09/terence-tao-on-the-paradox-of-solving-mathematical-problems ), welche bei Textmodellen (ChatBots) Wahrscheinlichkeiten für die passendste nächste Wortsilbe berechnen. Nicht mehr, aber auch nicht weniger. Außerdem im Folgenden ein Zitat von Prof. Lischke (besten Dank für die Freigabe): "Soweit ich das in meinem Umfeld überblicken kann, geht der Trend dahin, dass aufgrund des KI-Einsatzes die Bewertungsstandards für BA / MAs angehoben werden. Die unkritische Übernahme von KI-Outputs wird mitunter scharf geahndet. Begründet wird das damit, dass eine BA / MA nachweisen soll, dass eine Person wissenschaftlich arbeiten kann. Dazu gehört die kritische Reflexion eigener und fremder Befunde sowie die eigenständige Prüfung von Quellen und Argumenten. Wer KI-Outputs ungeprüft übernimmt, erfüllt diesen Anspruch nicht. Das Problem ist daher nicht die Nutzung von KI als solche, sondern der Verzicht auf wissenschaftliche Qualitätskontrolle. Ich kenne Lehrende, die in solchen Fällen BA / MAs als nicht bestanden bewerten. Manche werten das sogar als Täuschungsversuch. Kurzum: Je selbstverständlicher KI genutzt wird, desto stärker zählt die Fähigkeit, ihre Ergebnisse kritisch zu prüfen und wissenschaftlich zu verantworten." - Ich sehe das genauso.',
      },
    ],
  },
};
