# Gym Tracker: Dokumentation

Stand: 12.11.2026

## Was es ist

Eine eigenständige Web-App (PWA) zum Tracken des Trainings. Sie wird über GitHub Pages gehostet (https://mariosch08.github.io/gymtracker/), läuft offline und lässt sich auf den Homescreen legen. Alle Daten bleiben auf dem Gerät.

## Funktionen

- **Training:** PPL-Rotation (der nächste Tag wird automatisch vorgeschlagen), freies Training und «Nur Cardio».
- **Eingabe:** Pro Satz kg und Wdh. mit −/+ Knöpfen. Die Werte vom letzten Mal werden angezeigt und vorausgefüllt. Das Gewicht steigt automatisch, wenn alle Wdh. geschafft wurden.
- **Pausen-Timer:** Startet automatisch, mit Ton, Restzeit-Balken und ±15 s. Die Pause ist pro Übung einstellbar.
- **Flexibel:** Übungen tauschen (nur heute oder dauerhaft im Plan), hinzufügen, umsortieren und entfernen. Eigene Übungen lassen sich anlegen.
- **Einseitige Übungen:** Links und Rechts werden getrennt erfasst.
- **Notizen:** pro Übung (z. B. Sitzeinstellung) und pro Training.
- **Ausführung:** Bildanimation (zwei Fotos im Wechsel), 3 Technik-Tipps und ein Link zur YouTube-Suche nach der Übung. Die Bibliothek hat 66 Kraftübungen, alle mit Bildern.
- **Cardio:** 8 Arten mit passenden Feldern (Stairmaster, Laufband, Velo/Ergometer, Crosstrainer, Rudergerät, Laufen draussen, Spazieren, Andere).
- **Auswertung:** Rekorde (🏆 nach dem Training), Verlaufskurve pro Übung, Körpergewicht (7/30 Tage), Cardio-Minuten pro Woche und ein nach Wochen gruppierter Verlauf.
- **Plan-Editor:** Tage und Übungen bearbeiten, Sätze, Wdh., Pause und Cardio-Ziel einstellen.
- **Einstellungen:** Gewichtsschritt, Auto-Timer, Auto-Steigerung, Bildschirm anlassen, Ton und Vibration, Standardwerte.
- **Daten:** Backup als JSON-Datei herunterladen und wieder einlesen, mit Erinnerung nach 14 Tagen. Beim Einlesen lässt sich wählen: zusammenführen (ergänzt Fehlendes) oder ersetzen.
- **Korrigieren:** Gespeicherte Trainings lassen sich nachträglich bearbeiten, inklusive Datum und Zeit.
- **Bedienung wie eine App:** Tab-Leiste unten, die Zurück-Taste bzw. Wischgeste schliesst Fenster und führt zur Startseite, Zahlenfelder werden beim Antippen markiert, und ein Hinweis erklärt die Installation auf dem Homescreen.
- **Offline:** Die App startet sofort aus dem Speicher, auch bei schlechtem Empfang. Alle Übungsbilder werden beim ersten Start im Hintergrund gespeichert. Gibt es eine neue Version, erscheint auf der Startseite «Neue Version verfügbar».

## Technik

Reines HTML, CSS und JavaScript, ohne Framework und ohne Build.

| Datei | Inhalt |
|---|---|
| `index.html` | Die ganze App (etwa 690 Zeilen) |
| `exercises.js` | Übungsbibliothek (`CATALOG`) und Cardio-Arten (`CARDIO`), selbst editierbar |
| `sw.js` | Service Worker für den Offline-Modus: App-Dateien kommen sofort aus dem Cache `gym-tracker-v4` und werden im Hintergrund erneuert, Bilder liegen im Cache `gym-tracker-img` |
| `manifest.webmanifest`, Icons | Für die Installation auf dem Homescreen |
| `img/` | Übungsbilder `<id>_0.jpg` und `<id>_1.jpg` aus [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Public Domain), etwa 2,6 MB |

### Datenspeicherung

Die Daten liegen im localStorage des Browsers:

| Schlüssel | Inhalt |
|---|---|
| `gt_db` | Alle dauerhaften Daten in einem Eintrag: Plan, Trainings, Bibliothek, Notizen, Einstellungen, Körpergewicht |
| `gt_draft2` | Das laufende, noch nicht abgeschlossene Training |
| `gt_timer` | Zustand des Pausen-Timers |
| `gt_lastBackup` | Zeitpunkt des letzten Backups |
| `gt_hintOff` | Installationshinweis wurde weggetippt |
| `gt_imgCache` | Merker, dass alle Bilder offline gespeichert sind |

Der Zugriff auf `gt_db` läuft an einer Stelle zusammen (`LocalDB` in `index.html`). Das erleichtert einen späteren Wechsel auf IndexedDB.

## Getroffene Entscheidungen

### Training

| Entscheidung | Warum |
|---|---|
| PPL rotierend, 3–4 Tage | Kurze Sessions mit wenigen Muskeln. Jeder Muskel kommt trotzdem etwa 1,5-mal pro Woche dran. |
| Gegen PHUL / Upper-Lower | Pro Session wären zu viele Muskeln dran gewesen. Spass hatte Vorrang vor dem Optimum. |
| Lieblingsübungen plus RDL | Spass ist wichtig. RDL ergänzt Po und Beinbeuger und ist einfacher als klassisches Kreuzheben. |
| Doppelte Progression (+2,5 kg) | Einfache, bewährte Regel, die man im Gym nicht durchdenken muss. |
| Pausen 2 Min. bei Grundübungen, 1–1,5 Min. bei Isolation | Gute Balance zwischen Leistung und kurzen Sessions. |
| Fettabbau über die Ernährung, Cardio locker | Ein Defizit mit viel Protein ist der Hebel. 10–20 Min. Stairmaster schonen die Erholung. |

### Technik

| Entscheidung | Warum / Trade-off |
|---|---|
| Zuerst ein Claude-Artefakt mit Cloud-Speicher | Die Daten liessen sich direkt lesen und anpassen. Gewünscht war aber eine App ohne Claude. |
| Eigenständige PWA mit localStorage | Kein Login, offline, gratis. Nachteil: keine Synchronisierung. |
| GitHub Pages, öffentliches Repo | Gratis HTTPS (Pflicht für die PWA). Der Code ist öffentlich, die Daten nicht. |
| Homelab-Hosting verschoben | Mehr Aufwand (Tailscale, LXC). Sinnvoll erst mit Synchronisierung. |
| Vanilla JS statt React o. Ä. | Kein Build nötig, Dateien lassen sich direkt bearbeiten. |
| Bilder im Repo statt echter GIFs oder Videos | Frei lizenziert, funktioniert offline, keine Abhängigkeit von fremden Servern. Für Videos gibt es den YouTube-Link. |
| Service Worker «Cache zuerst, im Hintergrund aktualisieren» | Die App startet sofort, auch bei schlechtem Empfang im Gym. Nachteil: Ein Update ist erst nach «Aktualisieren» bzw. beim übernächsten Start aktiv. Zuvor galt «Netzwerk zuerst», was bei schwachem Netz den Start verzögerte. |
| JSON-Export | Backup und ein späterer Umzug, z. B. zu PocketBase, sind damit möglich. |

## Bekannte Schwächen

- **Datenverlust möglich:** Die Daten liegen nur auf einem Gerät. Wer die Browserdaten löscht oder das Handy wechselt, braucht ein Backup. Auf dem iPhone kann Safari Daten nicht installierter Webseiten nach etwa 7 Tagen ohne Nutzung löschen. Deshalb unbedingt über den Homescreen nutzen.
- **Timer im Hintergrund:** Ist der Bildschirm gesperrt oder die App im Hintergrund, kommt kein Ton (iOS pausiert JavaScript). «Bildschirm anlassen» hilft als Workaround. Auf Android lässt sich in den Einstellungen eine Benachrichtigung am Pausenende einschalten; sie kann im Hintergrund verzögert kommen.
- **Bilder ungenau:** Ein paar zeigen eine Variante, z. B. Kurzhantel statt Kabel beim Seitheben. Die Fotos haben einen weissen Hintergrund im dunklen Design. Die Cardio-Arten haben ein Symbol statt eines Bildes.
- **Code:** Alles steht in einer grossen Datei, und es gibt keine automatischen Tests im Repo.
- **Nicht auf einem echten Handy getestet:** Getestet in Chrome mit simulierten Handys (iPhone 14, Pixel 7), nicht in Safari und nicht auf einem echten Gerät.
- **Aufräumen:** Das alte Repo `gym-tracker` und das Claude-Artefakt können gelöscht werden, falls sie noch existieren.

## Verbesserungsideen (nach Priorität)

### 1. Daten absichern

- IndexedDB statt localStorage: mehr Speicher und robuster.
- Synchronisierung: PocketBase im Homelab plus Tailscale. Dann sind die Daten auf allen Geräten verfügbar.
- Automatisches Backup in eine Datei oder die Cloud.

### 2. Fürs Training

- Sätze pro Muskelgruppe und Woche: die wichtigste Kennzahl für den Muskelaufbau (Ziel etwa 10–20 Sätze).
- RIR/RPE pro Satz (wie viele Wdh. noch gegangen wären) für eine bessere Steigerung.
- Aufwärmsätze, die nicht in die Statistik zählen.
- Supersätze (zwei Übungen im Wechsel), damit die Sessions noch kürzer werden.
- Deload-Hinweis, wenn die Werte mehrere Wochen stagnieren.

### 3. Bedienung

- Zuverlässige Benachrichtigung am Ende der Pause auf iOS (braucht einen Server für Push-Nachrichten).
- Körpermasse (Bauchumfang) und Fortschrittsfotos, die lokal bleiben. Beim Fettabbau sind sie aussagekräftiger als die Waage.

### 4. Technik

- Code in Module aufteilen und einen Playwright-Test per GitHub Actions bei jedem Push laufen lassen.
- Einen Garmin-Export importieren, z. B. für Cardio-Puls und Kalorien.
