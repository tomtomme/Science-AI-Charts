# Science AI-Arena: KI-Chatbots für Studium & Forschung

**Hinweis**: Diese README und die Web-App wurden KI-generiert. Die Daten, auf denen die Auswertung beruht, sind handverlesen.

> **Web-App**: [tomtomme.github.io/Science-AI-Charts](https://tomtomme.github.io/Science-AI-Charts/)  
> **Google Sheet (Benchmarks)**: [Tabelle öffnen](https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=170267419#gid=170267419)  
> **Google Sheet (Labs & Ökosystem)**: [Tabelle öffnen](https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=355721692#gid=355721692)  
> **GitHub**: [github.com/tomtomme/Science-AI-Charts](https://github.com/tomtomme/Science-AI-Charts)

---

## Worum geht es?

Viele KI-Tests prüfen vor allem, wie gut ein Chatbot programmiert oder flüssig formuliert. Für Studium und Forschung (z. B. in der Psychologie) zählen andere Fähigkeiten:

* ob ein Modell Fakten erfindet („halluziniert“), wenn es etwas nicht weiß,
* ob es Diagramme und Abbildungen richtig abliest,
* ob es über lange Fachtexte hinweg den roten Faden behält,
* ob es mit Tabellen und Aufgaben aus Statistik und Arbeitsalltag zurechtkommt.

Die App fasst Ergebnisse aus mehreren unabhängigen Testreihen zusammen (gemessen auf der höchsten jeweils verfügbaren Denkstufe). Alle Zahlen und Begleittexte werden aus dem verlinkten Google Sheet geladen und regelmäßig abgeglichen. Über **DE / EN** oben rechts lässt sich die Sprache jederzeit wechseln.

---

## Ansichten in der App

### 1. Balkendiagramm
Vergleicht die Chatbots direkt miteinander.

* **Score-Regler**: Wechselt zwischen den drei Gesamtwerten und den acht Einzeltests:
  * **Neuer Score**: Durchschnitt aus allen 8 aktuellen Tests.
  * **Alter Score**: Durchschnitt aus 5 älteren Tests, der weiter in die Vergangenheit zurückreicht.
  * **Worst Case**: Multipliziert den Leistungsdurchschnitt mit der Faktentreue – Modelle, die häufiger raten oder Dinge erfinden, fallen hier stark ab.
  * **Einzeltests (`#1` bis `#8`)**: Zeigt gezielt nur eine Fähigkeit (z. B. Diagrammanalyse oder Faktentreue) und sortiert danach.
* **Preis- und Zugangsfilter (`Free API | Free Chat | Paid | All`)**: Unterscheidet zwischen Modellen, die nur im Browser kostenlos sind (`Free Chat`), und Modellen mit kostenlosem **API-Zugang** (eine Schnittstelle, über die sich eine KI z. B. direkt in Statistikprogrammen wie JASP einbinden lässt; erkennbar am blauen Globus-Symbol über dem Balken).
* **Balken-Details**: Fährt man mit der Maus über einen Balken, teilt sich der Balken in die einzelnen Testwerte auf. Ein Klick auf den Modellnamen öffnet den jeweiligen Chat; das Globus-Symbol führt zum kostenlosen API-Schlüssel.
* **Filter & Sortierung**: Nach Anbietern filtern, die Anzahl der angezeigten Modelle anpassen oder nach Punktzahl bzw. Erscheinungsdatum sortieren.

### 2. Zeitreihe
Zeigt, wie sich die Testergebnisse über die Monate entwickelt haben. Hier lassen sich neben den aktuellen Tests auch vier frühere Tests ansehen (z. B. `SimpleBench` mit räumlichen Denk- und Fangfragen). Mit „Pioniere“ werden nur Modelle hervorgehoben, die zu ihrer Zeit einen neuen Bestwert aufgestellt haben.

### 3. Korrelationen
Stellt jeweils zwei Tests gegeneinander dar – entweder als Punktwolke (Streudiagramm) oder als **Heatmap** (Farbmatrix aller Testkombinationen). So lässt sich ablesen, ob Modelle, die in einem Bereich stark sind, auch in einem anderen gut abschneiden (`Pearson r` und `Spearman Rho`).

### 4. Ökosystem & Glossar
Gibt einen Überblick über die KI-Anbieter, Modellgrößen und verfügbaren Werkzeuge. Im **Glossar** darunter werden Fachbegriffe aus Statistik, Wissenschaftstheorie und KI (z. B. *Halluzination*, *Regression*, *Konfidenzband*, *API*) mit Alltagsvergleichen ohne Vorkenntnisse erklärt.

### 5. Anleitung & Tipps (unter den Diagrammen)
Enthält Erklärungen zu jedem Test und praktische Hinweise zum Umgang mit Chatbots im Studium, direkt aus dem Google Sheet übernommen. Über die kleinen Link-Symbole an den Achsen und Reglern springt die Seite direkt zum passenden Abschnitt.

---

## Die 8 Einzeltests im Überblick

| Nr. | Test / Bereich | Was wird geprüft? |
|:---:|:---|:---|
| 1 | **IQ** (`AA-Intelligence Index`) | Gemischte Aufgaben aus Logik, Recherche, Rechnen und Programmieren |
| 2 | **Faktentreue** (`Non-Hallucination Rate`) | Wie oft ein Modell ehrlich passt, statt bei Nichtwissen etwas zu erfinden |
| 3 | **Faktenwissen** (`AA-Omniscience Accuracy`) | Wissenschaftliches Fachwissen aus 6 Gebieten |
| 4 | **Diagrammanalyse** (`MMMU-Pro`) | Ablesen und Interpretieren von Grafiken, Plots und Abbildungen |
| 5 | **Diagnostik** (`MLCR-AA`) | Widerspruchsfreies Schließen über sehr lange klinische Fachtexte hinweg |
| 6 | **Excel-Analyst** (`AA-AnalystAgent`) | Auswerten und Bearbeiten von Daten in Tabellenkalkulationen |
| 7 | **Experimenting & Engineering** (`GDPx`) | Eigenständiges Bearbeiten von Fachaufgaben aus Technik, Naturwissenschaft, Finanzen und Recht |
| 8 | **Wirtschaft & Recht** (`Vals.ai`) | Mehrstufige Aufgaben aus Finanzen, Recht und Datenverarbeitung |

---

## Hinweise zur Anpassung

* **Daten & Erklärtexte** lassen sich direkt im verlinkten Google Sheet pflegen und über den **Sync**-Button in der App neu laden.
* **Oberflächentexte** (Schaltflächen, Menüs, Hinweise) liegen gebündelt auf Deutsch und Englisch in `src/utils/i18n.ts`.
* **Technik**: React, TypeScript, Vite und Tailwind CSS.
