# FEATURES.md

## Spielüberblick

### High Concept
- Top-Down-Arcade-Action im Stil von GTA2 + Twisted Metal.
- Setting: Zombie-Apokalypse in einer urbanen Stadtkarte.
- Gegner sind ausschließlich zombie-gesteuerte Fahrzeuge mit Dieselantrieb.
- Der Spieler fährt ein E-Auto und liefert Pizza unter Zeit- und Bedrohungsdruck aus.
- Multiplayer wird von Anfang an als Kernanforderung berücksichtigt.

### Design-Prinzipien
- Fokus auf kurze, intensive Runs mit klarer Core Loop.
- Fahrzeug-zu-Fahrzeug-Action, keine Fußgänger-Zombies.
- Akku ist zentrale Ressource für Bewegung, Boost und Einsatzdruck.
- Vorgegebene, handgebaute Karte mit glaubwürdiger Straßenführung.
- Systeme modular aufbauen, damit mehrere Entwickler parallel arbeiten können.
- Architektur früh multiplayerfähig anlegen, kein Singleplayer-Sonderweg.

## MVP

### MVP-Ziel
- Spielbare Runde mit 1 bis 4 Spielern.
- Befahrbare Stadtkarte mit Straßen, Kreuzungen und klaren POIs.
- Spieler kann fahren, ausweichen, schießen, Akku verbrauchen und aufladen.
- Lieferaufträge können angenommen, angefahren und abgeschlossen werden.
- Zombie-Fahrzeuge greifen aktiv an und blockieren Lieferwege.
- Runde bleibt durch Combat-, Akku- und Zeitdruck konstant unter Spannung.

### MVP-Inhalt
- 1 spielbares E-Auto für Spieler.
- 2 bis 3 Gegnertypen als zombie-gesteuerte Diesel-Fahrzeuge.
- 1 feste Stadtkarte mit Lieferzielen, Ladestationen und Boost-Spuren.
- 1 Waffenbasis-System.
- 1 Liefermissions-Loop.
- Koop-Multiplayer-Grundfunktion.
- Basis-HUD, Audio-Feedback und visuelle Treffer-/Ladeeffekte.

## Core Gameplay Loop

### Primäre Schleife
1. Spieler spawnt oder startet an sicherem Einstiegspunkt.
2. Spieler nimmt einen Pizza-Lieferauftrag an.
3. Spieler navigiert durch die Stadt zum Ziel.
4. Spieler managt Akku, nutzt Boost-Spuren und Ladestationen.
5. Spieler weicht Zombie-Fahrzeugen aus oder bekämpft sie.
6. Lieferung wird am Zielpunkt abgeschlossen.
7. Belohnung, Schwierigkeitsanstieg und nächster Auftrag.

### Laufende Spannungsquellen
- Akkuverbrauch durch Bewegung und Systemnutzung.
- Gegnerdruck durch Verfolgung, Blockade und Beschuss.
- Zeitdruck durch Lieferfenster oder Effizienzbewertung.
- Positionsdruck durch Straßennetz, Engstellen und POIs.

## Systemübersicht

## Fahrzeug- und Player-System

### Ziel
- Spielerfahrzeug als zentrale Spielfigur definieren.
- Fahrmodell muss mit realistischeren Fahrphysik-Systemen kompatibel sein.

### Anforderungen
- Spieler steuert ein E-Auto aus Top-Down-Perspektive.
- Fahrzeugstatus umfasst Position, Rotation, Geschwindigkeit, Schaden und Akku.
- Fahrverhalten ist nicht rein arcadig, sondern berücksichtigt Trägheit, Kurvenverhalten und Kontrollverlust unter Last.
- Kollisionen mit Umwelt und Fahrzeugen müssen sauber verarbeitet werden.
- Spieleraktionen: Lenken, Beschleunigen, Bremsen, Rückwärtsfahren, Schießen, Interagieren mit Missionszielen.

### Modulgrenzen
- Input-Verarbeitung getrennt von Physik und Gameplay-Status.
- Fahrphysik getrennt von Rendering.
- Fahrzeugzustand netzwerksynchronisierbar modellieren.

## Ressourcenmanagement

### Kernressource Akku
- Akku ersetzt klassischen Treibstoff vollständig.
- Akkuverbrauch ist permanenter Bestandteil jeder Fahrt.
- Akku beeinflusst Mobilität, Risikomanagement und Missionsplanung.

### Akku-Verbraucher
- Beschleunigung und hohe Geschwindigkeit.
- Boost-Nutzung.
- Optionale aktive Systeme wie Spezialfähigkeiten oder starke Waffen.

### Akku-Quellen
- Statische Ladestationen als POIs.
- Induktions- oder Busspuren mit Energie- oder Boost-Funktion.
- Optionale Powerups.

### Design-Anforderungen
- Akku-Status muss jederzeit klar kommuniziert werden.
- Leerer Akku darf das Fahrzeug stark einschränken, aber nicht unlesbar machen.
- Kritischer Akku-Bereich muss Druck erzeugen, ohne die Runde sofort zu beenden.

## Boost-System

### Ziel
- Straßenbezogene Hochgeschwindigkeitsoption mit Kartenbindung.

### Funktionen
- Busspuren oder induktive Fahrstreifen liefern temporären Boost.
- Boost-Zonen sind fest in der Karte platziert.
- Boost kann für Flucht, Abkürzung oder Lieferoptimierung genutzt werden.

### Anforderungen
- Aktivierung klar lesbar über Bodenmarkierung und VFX.
- Boost muss mit Akku-System zusammenspielen.
- Boost darf riskant sein, z. B. durch höhere Kollisionsgefahr oder exponierte Streckenführung.

## Combat / Shooting

### Ziel
- Fahrzeugkampf als zweite zentrale Handlung neben Lieferung.

### Basisfunktionen
- Spieler kann während der Fahrt schießen.
- Treffer verursachen Schaden an Gegnerfahrzeugen.
- Trefferfeedback muss visuell und akustisch eindeutig sein.

### Anforderungen
- Waffenlogik von Fahrlogik trennen.
- Projektil- oder Hitscan-System klar definieren.
- Friendly Fire im Koop früh entscheidbar und technisch vorbereitbar.
- Waffen müssen netzwerkfähig und deterministisch oder sauber replizierbar sein.

### MVP-Umfang
- 1 Standardwaffe.
- 1 klar lesbarer Projektiltyp.
- Basis-Cooldown oder Feuerrate.

## Gegner-System

### Grundsatz
- Es gibt keine separaten Zombies zu Fuß.
- Zombies existieren ausschließlich als Fahrer gegnerischer Fahrzeuge.

### Gegnertypen
- Leichte Verfolger mit hoher Geschwindigkeit.
- Schwere Diesel-Fahrzeuge mit hoher Masse und Ram-Fokus.
- Optionale Distanzgegner mit Fernbeschuss.

### Gegnerverhalten
- Verfolgung auf Straßennetz.
- Blockieren von Routen und Lieferzielen.
- Angriff durch Rammen, Verdrängen oder Beschuss.
- Reaktion auf Spielerposition, Missionstatus und Bedrohungsradius.

### Technische Anforderungen
- Gegnernavigation muss auf der vorgegebenen Straßenkarte funktionieren.
- KI darf nicht auf Grid-Logik basieren, wenn die Karte nicht rasterförmig ist.
- Gegnerzustände modular halten: Idle, Patrol, Chase, Attack, Recover, Destroyed.

## Map + POIs

### Kartenprinzip
- Keine generische Rasterkarte.
- Straßenstruktur soll wie eine echte Stadt oder glaubwürdige urbane Zone wirken.
- Zeichne ein paar straßen und gebäude durch die man nicht durchfahren kann

### Kartenanforderungen
- Kurven, Hauptstraßen, Nebenstraßen, Kreuzungen und Engstellen.
- Lesbare Stadtblöcke statt symmetrischer Grid-Map.
- Unterschiedlich riskante Routen.
- Gute Orientierung durch markante Gebiete.

### Pflicht-POIs
- Ladestationen.
- Lieferziele.
- Missions-Startpunkte oder Dispatch-Punkte.
- Boost-Spuren / Induktionsfelder.
- Gefährliche Zonen oder Gegner-Hotspots.

### Technische Anforderungen
- POIs als Datenobjekte statt hart verdrahteter Sonderlogik.
- Karte muss Navigationsdaten für Spielerhinweise und KI bereitstellen.
- Karte muss multiplayergeeignet sein, inklusive Spawn- und Resync-Punkte.

## Navigation

### Spieler-Navigation
- Spieler benötigt klare Zielführung zu Lieferorten und Ladestationen.
- Navigationshilfe darf die Sicht nicht überladen.

### Mögliche UI-Elemente
- Richtungsmarker zum aktiven Ziel.
- Minimap oder kompakter Radar.
- Hervorhebung von Ladestationen bei niedrigem Akku.

### Technische Anforderungen
- Zielsystem muss mit festen Straßen und POIs arbeiten.
- Navigationsdaten von Missionssystem und Kartenlogik getrennt halten.
- Multiplayer: Jeder Spieler kann eigenes Ziel, Status und Marker besitzen.

## Mission / Lieferung

### Missionskern
- Pizza-Lieferungen sind primäres Spielziel.
- Missionen erzeugen die Route, den Zeitdruck und die Risikoverteilung.

### Missionsablauf
1. Auftrag verfügbar.
2. Auftrag wird angenommen.
3. Zieladresse wird markiert.
4. Spieler fährt zum Ziel.
5. Lieferung wird innerhalb definierter Bedingungen abgeschlossen.
6. Belohnung und nächster Auftrag oder Eskalation.

### Missionsvariablen
- Distanz zum Ziel.
- Zeitlimit.
- Gegnerdichte entlang der Route.
- Zielgebiet-Risiko.
- Belohnung.

### Koop-Anforderungen
- Gemeinsame oder aufgeteilte Lieferaufträge möglich.
- Missionsstatus muss für alle Spieler konsistent sein.
- Relevante Ereignisse müssen synchronisiert werden: Annahme, Fortschritt, Abschluss, Fehlschlag.

## Powerups

### Ziel
- Kurze taktische Vorteile für Dynamik und Run-Varianz.

### MVP-Kandidaten
- Sofortladung für Akku.
- Temporärer Schild.
- Kurzzeit-Schadensboost.
- Reparatur-Kit.

### Anforderungen
- Powerups müssen klar lesbar auf der Karte platziert sein.
- Spawn-Regeln und Wirkung zentral konfigurierbar halten.
- Im Multiplayer müssen Aufnahme und Effektzustand synchron sein.

## Effects / Feedback

### Visuelles Feedback
- Trefferblitze und Schadenseffekte.
- Funken, Rauch, Explosionen.
- Akku-Warnzustände.
- Ladeeffekte an Stationen.
- Bodenfeedback für Boost-Zonen.

### HUD-Feedback
- Akkuanzeige.
- Fahrzeugschaden.
- Aktive Mission.
- Zielrichtung.
- Koop-Status anderer Spieler.

### Anforderungen
- Feedback priorisiert Lesbarkeit bei hoher Geschwindigkeit.
- Kritische Zustände müssen ohne Text verständlich sein.
- Netzwerkereignisse dürfen visuell nicht doppelt oder widersprüchlich auftreten.

## Audio

### Musik
- Treibender Arcade-/Apokalypse-Sound.
- Musik kann Gefahr oder Missionsdruck unterstützen.

### Soundeffekte
- E-Auto-Fahrgeräusche.
- Gegnerische Diesel-Motoren klar unterscheidbar.
- Waffen, Treffer, Kollisionen, Explosionen.
- Akku leer, Laden aktiv, Boost aktiv.
- Missionsannahme, Erfolg, Fehlschlag.

### Anforderungen
- Audio muss Gameplay-Zustände verstärken.
- Gegnerfahrzeuge sollen akustisch früh erkennbar sein.
- Koop-relevante Signale müssen für alle Spieler nachvollziehbar bleiben.

## Multiplayer

### Grundsatz
- Multiplayer ist Kernbestandteil der Architektur.
- Kein nachträgliches Add-on.
- Fokus auf Koop, PvP nur als optionale spätere Erweiterung.

### Mindestanforderungen
- Mehrere Spieler können gleichzeitig auf derselben Karte fahren.
- Spielerzustände werden synchronisiert: Position, Rotation, Geschwindigkeit, Schaden, Akku, Waffenstatus.
- Gegnerzustände werden synchronisiert.
- Missionszustände werden synchronisiert.
- Relevante Pickup-, Lade- und Trefferereignisse werden synchronisiert.

### Architektur-Anforderungen
- Autoritative Spiellogik oder klar definierte Ownership-Regeln.
- Replizierbare Entitäten: Spielerfahrzeuge, Gegnerfahrzeuge, Projektile, Missionen, Powerups, POIs.
- Prediction/Interpolation früh mitdenken, auch wenn im Jam nur einfach umgesetzt.
- Singleplayer darf technisch als Spezialfall derselben Architektur laufen.

### Koop-Gameplay-Ziele
- Gemeinsame Lieferung unter Druck.
- Rollenaufteilung möglich: Fahrer, Eskorte, Aggro-Ziehung, Akku-Sicherung.
- Respawn-, Join- und Wiederanbindungslogik früh berücksichtigen.

## Meta-Variablen / Balancing

### Ziel
- Schnelles Tuning ohne Code-Umbauten.

### Konfigurierbare Werte
- Fahrzeuggeschwindigkeit.
- Beschleunigung, Bremskraft, Drift-/Grip-Werte.
- Akku-Kapazität und Verbrauchsraten.
- Ladegeschwindigkeit.
- Boost-Stärke und Boost-Dauer.
- Waffenschaden, Feuerrate, Projektilgeschwindigkeit.
- Gegner-Lebenspunkte, Aggressivität, Spawnrate.
- Missionszeitlimits und Belohnungen.
- Powerup-Spawnrate.

### Anforderungen
- Werte zentral in Datenobjekten oder Konfigurationsdateien halten.
- Balancing muss getrennt von Spiellogik angepasst werden können.

## Technische Modulaufteilung

### Empfohlene Hauptmodule
- Fahrzeugsteuerung.
- Fahrphysik-Anbindung.
- Combat-System.
- Akku- und Ressourcenlogik.
- Missionssystem.
- Gegner-KI.
- Karten- und POI-Verwaltung.
- Navigationssystem.
- Multiplayer-/Netcode-Schicht.
- HUD / Feedback.
- Audio-System.
- Balancing-/Config-Daten.

### Schnittstellenprinzipien
- Jedes Modul besitzt klaren State und klar definierte Events.
- Rendering, Simulation und Netzwerkzustand trennen.
- Systeme sollen unabhängig testbar sein.

## Optionale Erweiterungen

### Gameplay-Erweiterungen
- Weitere Waffen und alternative Feuermodi.
- Fahrzeugfähigkeiten mit Akku-Kosten.
- Verschiedene Pizza-Auftragstypen.
- Eskalierende Wellen oder Heat-System.
- Boss-Fahrzeuge.

### Karten-Erweiterungen
- Dynamische Straßensperren.
- Zerstörbare Objekte.
- Zusätzliche Stadtbezirke.
- Wetter- oder Sichtbehinderungen.

### Koop-/Meta-Erweiterungen
- Rollenbasierte Team-Boni.
- Fahrzeug-Upgrades zwischen Runs.
- Punktesystem und Sternebewertung.
- PvP- oder Versus-Modus.
- Online-Lobby und Match-Reconnect.

## Abgrenzungen
- Keine Zombies als eigenständige Einheiten zu Fuß.
- Keine generische Grid-Map.
- Kein klassisches Fuel-System.
- Multiplayer ist nicht optional.
- Fahrverhalten wird nicht als reines Arcade-Fahren spezifiziert, sondern muss mit realistischeren Fahrzeugparametern kompatibel sein.
