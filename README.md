# Science AI-Top-30: Chatbot „Wissenschafts-IQ“ Ranking

🤖 **Hinweis**: Diese README-Dokumentation wurde KI-generiert.  Die **Live-Web-App** wurde ebenfalls KI-generiert. Die Daten auf welchen die App beruht sind allerdings handverlesen.

> **Live-Web-App**: [tomtomme.github.io/Science-AI-Charts](https://tomtomme.github.io/Science-AI-Charts/)  
> **Original Google Sheet (Benchmarks)**: [Google Sheets Tabelle (gid=170267419)](https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=170267419#gid=170267419)  
> **Original Google Sheet (Labs & Ökosystem)**: [Google Sheets Tabelle (gid=355721692)](https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=355721692#gid=355721692)  
> **GitHub Repository**: [github.com/tomtomme/Science-AI-Charts](https://github.com/tomtomme/Science-AI-Charts)


---

## 📌 Über das Projekt

Dieses interaktive Dashboard visualisiert den **Wissenschafts- und Datenanalyse-„IQ“ moderner KI-Chatbots** bei maximaler Denkstufe (*Reasoning*). 

Im Gegensatz zu herkömmlichen Benchmarks, die primär textbasierte Programmieraufgaben oder reine Sprachfähigkeiten messen, legt dieser Benchmark-Parcours den Fokus gezielt auf **Forschungs- und Wissenschaftsrelevanz**:
* **Multimodales Verstehen wissenschaftlicher Abbildungen & Plots** (MMMU-Pro)
* **Mathematische & tabellarische Datenanalyse** (Excel / FinanceBench)
* **Faktentreue & Non-Hallucination-Rate** (Ehrlichkeit bei Nichtwissen statt Erfinden)
* **Medizinisches Langkontext-Denken** über hunderte Seiten klinischer Fachliteratur
* **Räumliches Vorstellungsvermögen & gesunder Menschenverstand** (SimpleBench)
* **Automatisierte mehrstufige quantitative Workflows** (Vals.ai)

---

## ✨ Wichtigste Funktionen

### 1. Interaktives Explosions-Balkendiagramm (*Exploded Bar Chart*)
* **Mouse-Over-Explosion**: Beim Überfahren eines Modells fächert sich dessen Balken (zusammen mit den direkten Nachbarn) in die 8 individuellen Benchmark-Komponenten auf.
* **Permanente Kriterien-Details**: Verlässt die Maus den Balken, bleibt die detaillierte Beschreibung des zuletzt gewählten Kriteriums samt direkt anklickbarem Link zur offiziellen Primärquelle erhalten. Die Anzeige wechselt erst, wenn ein anderes Element überfahren oder der Kategorie-Schieberegler betätigt wird.
* **Volle Explosion (ON / OFF)**: Schalter, um alle Balken im gesamten Diagramm gleichzeitig aufgefächert darzustellen.
* **Nationale Identifikatoren**: Subtile Muster für Entwicklerherkunft (USA, Europa, China).

### 2. Modus-Schalter (*NEW Score vs. OLD Score*)
* **NEW Score**: Moderner 8-Benchmark-Standard (mit 17,25 % Gewichtung der Faktentreue).
* **OLD Score**: Historischer 5-Benchmark-Durchschnitt bis 2023 (mit 27,6 % Gewichtung der Faktentreue).

### 3. Modell-Umfang (*Current vs. All*)
* **Current**: Filtert die Anzeige auf Chatbots, die derzeit aktiv und öffentlich zugänglich sind.
* **All**: Zeigt den kompletten Datensatz inklusive historischer Meilensteine (z. B. GPT-4 Turbo von November 2023).

### 4. Platzsparender Kategorie-Schieberegler (*Category Slider*)
* Schieberegler von `0` bis `8` mit `-` und `+` Tasten:
  * `0`: **Alles** (Gesamtwertung über alle 8 Benchmarks)
  * `1` bis `8`: Isoliert eine einzelne Benchmark-Kategorie (z. B. nur Faktentreue oder nur MMMU-Pro). Die Balken werden automatisch nach der Punktzahl in diesem spezifischen Kriterium sortiert und zeigen den direkten Prozentwert.

### 5. Flexible Sortierung
* **Punktzahl**: Sortiert absteigend nach dem Gesamtscore oder der aktiven Einzelkategorie.
* **Datum**: Sortiert chronologisch nach dem Veröffentlichungsdatum des Chatbots (neueste Modelle zuerst).

### 6. Chatbot-Anzahl (*Count Slider*)
* Steuerung der angezeigten Modellanzahl in 5er-Schritten (5, 10, 15, 20, 25, 30 ... bis zum Maximum).

### 7. Hersteller-Schnellauswahl
* Direkte Filterknöpfe für führende LLM-Familien: `ChatGPT`, `Claude`, `DeepSeek`, `Gemini`, `GLM`, `Grok`, `Kimi`, `MiMo`, `MiniMax`, `Mistral`, `Muse`, `Qwen`.

### 8. Live Google-Sheets Synchronisation
* Das Dashboard lädt beim Start verzögerungsfrei die Daten und synchronisiert im Hintergrund stündlich (oder per Klick auf den **Sync**-Button) mit der Live-Google-Sheets-Tabelle.
* Synchronisiert werden neben den Modellen und Benchmark-Punktzahlen auch alle Titel und Texte:
  * **Titel & Untertitel**: Direkt aus den Zellen `A1`, `B2` und `C1`.
  * **Bereich 1 (Anleitung / How To Read)**: Titel direkt synchronisiert aus Zelle `A34`, Inhalt 1:1 aus Zelle `C34`.
  * **Bereich 2 (Was Bots können / What Bots can & can't do)**: Titel aus Zelle `N34`, Inhalt 1:1 aus Zelle `O34`.
* Ein Hover-Infokärtchen am Sync-Button zeigt das Datum der letzten Synchronisierung (ohne Uhrzeit).

### 9. Vollständige Zweisprachigkeit (DE / EN)
* Nahtloser Wechsel zwischen deutscher und englischer Sprache über den `DE / EN`-Schalter im Header.

### 10. Tab „LLM-Labs & Ökosystem“ (gid=355721692)
* **Zusätzlicher Navigations-Tab**: Ermöglicht den direkten Wechsel zwischen dem visuellen Benchmark-Balkendiagramm und einer strukturierten Ökosystem-Matrix.
* **Top 10 LLM Labs & 24 Contenders**: Schneller Wechsel zwischen den Top 10 Labs (Zeilen 2–17) und den 24 Contenders (Zeilen 19–28) oder allen 34 Organisationen.
* **Modellgrößen & Tooling-Matrix**: Visualisiert Parameterklassen (<32B bis 15T+), Software Development Kits (The Harness), Web-Agenten (Daily Agent), Coding-Agenten und Abonnement-Stufen.
* **Modell-Synchronisation**: Ein Klick auf ein Lab filtert und markiert die entsprechenden Modelle sofort im Benchmark-Diagramm.


---

## 🔬 Die 8 Benchmark-Komponenten im Detail

| Nr. | Benchmark | Disziplin & Fokus | Gewicht |
|:---:|:---|:---|:---:|
| 1 | **AA-Intelligence Index** (AA-II v4.3) | Umfassender Standard-IQ-Test aus tausenden Aufgaben aller Fachrichtungen | 12,5 % |
| 2 | **Faktentreue / Non-Hallucination Rate** | Prozentualer Anteil nicht erfundener Antworten bei unbekanntem Wissen | 17,25 % |
| 3 | **AA-Omniscience** | Wissenschaftliches Fachwissen (67 %) + Faktentreue (33 %) | 12,5 % |
| 4 | **MMMU-Pro** | Multimodales Verstehen von Diagrammen, Plots & wissenschaftlichen Abbildungen | 12,5 % |
| 5 | **Medical Long Context Reasoning** | Konsistenzprüfung über hunderte Seiten klinischer Literatur | 12,5 % |
| 6 | **Excel-Datenanalyse** (FinanceBench) | Tabellen- und Datenanalyse im Tabellenkalkulations-Kontext | 12,5 % |
| 7 | **SimpleBench** | 200 Fangfragen zu räumlichem Vorstellungsvermögen und Logik | 12,5 % |
| 8 | **Vals.ai** | Mehrstufige quantitative Workflows, Programmierung & Finanzen | 12,5 % |

---

## 🌐 Zentrale Sprachdatei (`src/utils/i18n.ts`)

Alle UI-Texte, Button-Beschriftungen, Tooltips, Statusmeldungen und Hilfetexte, **die nicht direkt aus den Zellen der CSV stammen**, sind zentral in folgender Datei gebündelt:

```
src/utils/i18n.ts
```

In dieser Datei können Sie sämtliche deutschen (`TRANSLATIONS.de`) und englischen (`TRANSLATIONS.en`) Strings direkt einsehen, prüfen und nach Ihren Wünschen anpassen.

---

## 🛠️ Technische Umsetzung

* **Framework**: React 18 mit Vite & TypeScript
* **Styling**: Tailwind CSS mit responsivem Design und Dark-Mode-Unterstützung
* **Grafik**: Reine, barrierefreie SVG-Vektorgrafiken für ultraschnelles Rendern ohne externe Charting-Abhängigkeiten
* **Icons**: Lucide React
* **Parser**: Eigener robuster RFC-4180 CSV-Streaming-Parser mit Anführungszeichen- und Sonderzeichenunterstützung

---

## 🚀 Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (Port 3000)
npm run dev

# Produktions-Build erstellen
npm run build
```
