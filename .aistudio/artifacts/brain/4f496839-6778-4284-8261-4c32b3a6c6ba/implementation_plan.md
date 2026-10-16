# Implementierungsplan: Verlagerung der Steuerknöpfe in die Tab-Leiste

Die drei Steuerknöpfe (**Erweitert**, **Preis-Filter: Kostenlos / Kostenpflichtig / Alle**, **Explosion: an / teils / aus**) werden aus dem Diagramm-Header nach oben in die primäre Tab-Leiste verschoben. Dadurch steht im Diagramm-Header die volle Breite exklusiv für Modellnamen, Firmen, Datumsangaben und detaillierte Kriterienbeschreibungen zur Verfügung, ohne dass Texte bei höheren Zoomstufen hinter Buttons abgeschnitten werden.

---

## 1. Benutzeranforderung & Beschlüsse

Aus den Klärungsfragen:
1. **Platzierung**: Rechts in der Tab-Leiste (in derselben Zeile wie die beiden Tabs *Wissenschafts-IQ Benchmark* und *LLM-Labs & Ökosystem*).
2. **Sichtbarkeit**: Nur im Benchmark-Tab aktiv anzeigen (`activeTab === 'benchmark'`). Im Labs-Tab wird dieser Steuerungsbereich ausgeblendet.

---

## 2. Geplante Änderungen im Detail

### A. Primäre Tab-Leiste (`src/App.tsx`)
- In der fixierten Tab-Leiste (`sticky top-0`) werden die drei Steuerknöpfe auf der rechten Seite platziert (`ml-auto flex items-center gap-1.5`):
  - **Erweitert-Button** (`showAdvanced` Toggle) mit Icon (`SlidersHorizontal`) und Pfeilindikator.
  - **Preis-Filter** (`Kostenlos` / `Kostenpflichtig` / `Alle`) als segmentierter Schalter mit farblicher Status-Hervorhebung.
  - **Explosions-Schalter** (`an` / `teils` / `aus`) mit Tooltips und Statusfarben.
- Bedingte Anzeige: Die Kontrollgruppe wird nur gerendert, wenn `activeTab === 'benchmark'`.
- Der bestehende Freitextfilter-Hinweis (*„Aktiver Lab-/Modell-Filter: ...“*) wird harmonisch links neben den Knöpfen integriert.

### B. Diagramm-Header (`src/components/ExplodedBarChart.tsx`)
- Die rechte Kontrollgruppe wird aus dem Info-Header entfernt.
- **100% Breite für Modellinformationen**: Row 1 im Info-Header erhält nun die volle Containerbreite. 
  - Modellname, Favicon, externe Verlinkung
  - Hersteller / Company
  - Veröffentlichungsdatum
  - Detaillierter Benchmark-Segmentwert (Punkte & Rohprozent)
  - Quellenlink
- **Zero Layout Shift (CLS = 0)**:
  - Zeile 1 und Zeile 2 behalten ihre feste, verriegelte Höhe (`h-[32px]` bzw. `h-[38px]`), sodass das Diagramm auch bei schnellen Mausbewegungen oder extremen Zoomstufen (125%, 150%, 200%) absolut wackelfrei und unbeweglich bleibt.
  - Kein Text wird mehr von Buttons verdeckt.

---

## 3. Verifikationsplan

### Manuelle Tests & Sichtprüfung
1. **Sichtbarkeit & Tabs**:
   - Im Tab *„Wissenschafts-IQ Benchmark“*: Die drei Knöpfe erscheinen rechts in der Tab-Leiste.
   - Im Tab *„LLM-Labs & Ökosystem“*: Die drei Knöpfe werden ausgeblendet.
2. **Zoom- & Platztest**:
   - Browser-Zoom auf 125%, 150% und 175% testen.
   - Prüfen, dass Modellnamen und Kriterienbeschreibungen über die volle Breite lesbar sind und nicht mehr hinter Buttons verschwinden.
3. **Flacker- & Bewegungstest**:
   - Schnelles Hovern über verschiedene Balkenteile (insb. *Plot Reading* und *Science Knowledge*).
   - Sicherstellen, dass das Diagramm 0px vertikal verschiebt und kein Flackern auftritt.
4. **Funktionalität der Knöpfe**:
   - `Erweitert`: Blendet weiterhin die Schieberegler und Herstellerbuttons ein/aus.
   - `Preis`: Filtert zuverlässig zwischen Free, Paid und All.
   - `Explosion`: Schaltet korrekt zwischen `an`, `teils` und `aus`.

### Automatisierte Validierung
- Ausführung von `npm run lint` (`tsc --noEmit`).
- Ausführung von `compile_applet` (`vite build`).
