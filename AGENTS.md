# AGENTS.md

du darfst nicht die features.md die agents.md und die architecture.md umschreiben !
außerdem musst du sie befolgen
## Zweck
- Diese Datei definiert Arbeitsregeln fuer KI-Agents und andere automatisierte Tools.
- Ziel ist der Schutz bestehender Features, Dateien, Strukturen und Schnittstellen.
- Prioritaet haben Stabilitaet, nachvollziehbare Aenderungen und modulare Zusammenarbeit.

## Kernprinzipien
- Bestandsschutz hat Vorrang vor Umbau.
- Additive Aenderungen sind destruktiven Aenderungen vorzuziehen.
- Agents arbeiten moeglichst lokal im zugewiesenen Bereich.
- Bestehende Funktionalitaet darf nicht stillschweigend veraendert werden.
- Jede Aenderung muss fuer andere Bearbeiter klar nachvollziehbar bleiben.

## Bestandsschutz
- Bestehende Features duerfen nicht stillschweigend geaendert, entfernt oder umgebaut werden.
- Bestehende Datei-, Ordner- und Modulstrukturen duerfen nicht ohne klare Begruendung veraendert werden.
- Bestehende Schnittstellen, Datenfluesse und oeffentliche APIs duerfen nicht ohne explizite Benennung angefasst werden.
- Funktionierende Systeme sollen nicht ersetzt werden, wenn das Ziel lokal ergaenzt werden kann.

## Pflicht vor Eingriffen in Bestehendes
- Vor Aenderungen an bestehender Logik, Struktur oder bestehenden Dateien ist klar zu benennen:
  - welche Datei geaendert werden soll
  - warum die Aenderung notwendig ist
  - welche Auswirkungen auf bestehende Features moeglich sind
- Wenn ein Eingriff ausserhalb des eigenen Bereichs notwendig ist, darf er nicht stillschweigend erfolgen.
- Solche Eingriffe muessen zuerst klar benannt und technisch begruendet werden.

## Bevorzugte Aenderungsstrategie
- Neue Funktionen, Helper, Dateien oder klar abgegrenzte Erweiterungen bevorzugen.
- Bestehende Logik nur dann anpassen, wenn eine additive Loesung nicht sinnvoll moeglich ist.
- Lokale Anpassungen sind globalen Refactorings vorzuziehen.
- Unnoetige Umbenennungen vermeiden.
- Unnoetige Datei-Verschiebungen vermeiden.
- Unnoetige Strukturumbauten vermeiden.

## Verbotene oder unerwuenschte Eingriffe
- Keine stillschweigenden Refactorings ueber mehrere Module hinweg.
- Keine grossflaechigen Umbenennungen ohne zwingenden Grund.
- Keine Verschiebung bestehender Dateien nur aus Ordnungsgruenden.
- Keine Aenderung bestehender Schnittstellen nur zur persoenlichen Vereinfachung.
- Keine Entfernung bestehender Dateien oder Features ohne explizite Begruendung.

## Arbeiten nach Ordnerzustaendigkeit
- Die Ordnerstruktur ist die primaere Orientierung fuer Zustaendigkeiten.
- Wenn ein Bereich vorgegeben ist, z. B. `Map`, wird schwerpunktmaessig nur in diesem Ordner und seinem direkten fachlichen Kontext gearbeitet.
- Andere Ordner sollen nur geprueft oder geaendert werden, wenn das zwingend erforderlich ist.
- Bereichsfremde Aenderungen muessen vorab klar benannt und begruendet werden.
- Ein Agent soll keine stillschweigende Querschnittsreorganisation ueber mehrere Ordner hinweg durchfuehren.

## Erwartungen an lokale README.md
- In Haupt-Unterordnern soll eine kurze, klar strukturierte `README.md` vorhanden sein.
- Diese `README.md` soll schnell scanbar sein, besonders fuer KI-Agents und andere Tools.
- Die Datei beschreibt den jeweiligen Ordner als Arbeitskontext.

## Inhalt lokaler README.md
- Zweck des Ordners oder Moduls.
- Welche Dateien, Systeme oder Verantwortlichkeiten dort liegen.
- Was in diesem Bereich geaendert werden darf.
- Was in diesem Bereich nicht geaendert werden soll.
- Wichtige Abhaengigkeiten oder Schnittstellen.
- Kurzer aktueller Stand, falls sinnvoll.

## Umgang mit fehlender Kontextdokumentation
- Wenn in einem relevanten Haupt-Unterordner keine `README.md` existiert, soll das als Dokumentationsluecke betrachtet werden.
- Eine neue lokale `README.md` darf additiv angelegt werden, sofern dadurch keine bestehende Struktur veraendert wird.
- Eine lokale `README.md` ist Dokumentation und kein Vorwand fuer Umbauten im zugehoerigen Modul.

## Arbeitsweise fuer Agents
- Vor dem Implementieren zuerst pruefen, welche Dateien und Ordner direkt betroffen sind.
- Moeglichst nur im eigenen Zielbereich arbeiten.
- Bestehende Muster des Projekts respektieren.
- Keine impliziten Architekturentscheidungen in fachfremden Bereichen treffen.
- Keine bestehenden Regeln aus `FEATURES.md`, `ARCHITECTURE.md` oder lokalen `README.md` ignorieren.

## Kommunikation von Auswirkungen
- Wenn eine Aenderung bestehende Features beeinflussen kann, muss das klar benannt werden.
- Wenn eine Aenderung andere Module oder Teams beruehrt, muss die Schnittstelle klar beschrieben werden.
- Wenn eine Aufgabe nur mit Eingriff in fremde Bereiche loesbar ist, muss die Notwendigkeit explizit dokumentiert werden.

## Aufgabenorganisation
- Diese Datei definiert keine Aufgabenliste.
- Es wird bewusst keine `TASKS.md` oder andere zentrale Aufgabenverwaltung in dieser Datei eingefuehrt.
- Zustaendigkeiten ergeben sich aus Ordnerstruktur, Arbeitsbereich und konkreter Zuweisung.

## Minimale Sicherheitsregeln fuer Aenderungen
- Erst lesen, dann lokal eingrenzen, dann gezielt aendern.
- Vorhandene Dateien nicht ersetzen, wenn eine Erweiterung ausreicht.
- Keine Nebenbaustellen aufmachen.
- Keine kosmetischen Umbauten ohne funktionalen Grund.
- Jede Aenderung soll fuer den naechsten Bearbeiter eindeutig lesbar bleiben.

## Referenzen
- Features werden in `FEATURES.md` beschrieben.
- Architekturvorgaben werden in `ARCHITECTURE.md` beschrieben, falls vorhanden.
- Lokale Modulregeln werden in `README.md` der jeweiligen Unterordner beschrieben.
