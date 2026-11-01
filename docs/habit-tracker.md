# Habit tracker — kleine dingen in je leven verbeteren

Spec en beslissingen voor de habit tracker (v1). Uitgewerkt in een grill-sessie op 1 november 2026. Dit document legt vast **wat** er gebouwd is en **waarom**. De code staat in `src/utils/habitWeek.ts`, `src/stores/habits.ts`, `src/views/Habit*.vue` en `supabase/migration_015_habits.sql`.

---

## Uitgangspunt (Tijmen)

- Een habit is "een klein stukje in mijn leven dat ik kan verbeteren". Je hoeft de term niet al te serieus te nemen: er zit geen deadline aan en geen "na een maand is het een gewoonte".
- Een habit is het **middel**, en het "zodat…" is het doel: *4x per week sporten, zodat ik me fitter voel*.
- Waar het kan, wordt een habit gekoppeld aan data die de app al heeft (workouts, gewicht), zonder dat het te complex wordt.
- Het loggen mag nooit irritant voelen. Niets is verplicht, en achteraf invullen moet makkelijk zijn.

---

## Habit-typen

Je voert nergens een getal per dag in. Alles werkt per kalenderweek (ma–zo), met lokale datums.

| Type | Vakje standaard | Doel | Voorbeeld |
|---|---|---|---|
| **Doen** (`do`) | uit; vink aan wat je deed | minstens N dagen per week (1–7) | 4x per week sporten |
| **Laten** (`avoid`) | aan; vink uit als het niet lukte | hoogstens N dagen per week niet gelukt (0–6) | max 1 dag alcohol |
| **Gewichtsdoel** (`weight`) | geen vakjes | weekgemiddelde verandert hoogstens X kg per week (negatief = afvallen) | lean bulk: max +0,3 kg/week |

- Een habit als "4 uur aan mijn side project" is een gewone doen-habit met doel 1: je vinkt de dag aan waarop je je uren haalde. Een apart "weekvakje"-type kwam er bewust niet (YAGNI).
- **Automatisch afvinken** (alleen bij doen-habits) kan op dagen met een opgeslagen workout, of op dagen dat je je gewicht logt. Zo maak je "elke ochtend wegen" automatisch.

### Hoe een dag wordt bepaald

1. Heb je het vakje zelf gezet, dan telt dat.
2. Zo niet, en is er een automatische bron met een rij op die datum, dan is de dag gedaan.
3. Anders geldt de standaard van het type: uit bij doen, aan bij laten.

Je kunt dus altijd overrulen, in beide richtingen. Twee workouts op één dag tellen als één dag.

### Gewichtsdoel

- Het gemiddelde van alle metingen in een week wordt vergeleken met het gemiddelde van de vorige week **met** metingen. Dat mag ook een week van vóór de start van de habit zijn.
- Weken zonder meting krijgen het tempo tussen de metingen eromheen. Stel: je weegt in week 1 en week 4. Dan krijgen week 2, 3 en 4 elk (gem. week 4 − gem. week 1) / 3. Die weken heten "geschat".
- Zonder eerdere meting is er geen uitslag ("geen data").
- Per week kun je zelf "behaald" of "niet behaald" zetten. Tik op de weekcel; die wisselt tussen automatisch → behaald → niet behaald → automatisch.
- Metingen in pond worden omgerekend naar kilo.

---

## Weekstatus

| Status | Wanneer |
|---|---|
| Behaald | doen: doel gehaald (kan midden in de week al). laten: week voorbij en binnen het maximum |
| Niet behaald | doen: week voorbij onder het doel. laten: maximum overschreden (kan al eerder) |
| Bezig | lopende week, nog niet beslist |
| Geen data | gewichtsdoel zonder vergelijking |

- **"x/y weken behaald"** telt alleen weken die voorbij zijn en vol meetellen. De lopende week telt pas na zondag mee.
- **De eerste halve week** (start niet op een maandag) zie je wel, maar telt niet mee.
- **Toekomstige dagen** zijn leeg en niet aan te klikken, ook bij laten-habits, zodat een week nooit vooraf "perfect" oogt.
- **Onvolledig:** een verstreken dag zonder dagelijkse check-in krijgt een rood stipje in de dagbalk, en de week heet "onvolledig" in het detailscherm. Voor de telling verandert er niets. Zo zie je wel welke dagen je vergeten bent, en kan een latere correlatie alleen "afgesloten" dagen gebruiken.
- **Gearchiveerde habits** stoppen op hun archiefdatum. Latere weken tellen nooit als gemist.

### Wijzigen

| Veld | Wijzigbaar | Effect |
|---|---|---|
| Naam, zodat… | ja | geen historie |
| Doel | ja | geldt vanaf de huidige week, oudere weken houden hun doel (`habit_targets`); twee keer wijzigen in dezelfde week overschrijft |
| Type | nee | een opgeslagen vinkje betekent bij doen het omgekeerde van bij laten; maak een nieuwe habit |
| Automatische bron | ja | geldt met terugwerkende kracht (het is een bron van feiten); wat je zelf hebt overruled blijft staan |
| Startdatum | ja | om eerdere dagen in te vullen; niet in de toekomst |

Stoppen betekent archiveren, en je kunt een habit weer hervatten. Definitief verwijderen is een aparte actie met bevestiging, en verwijdert ook alle logs.

---

## Happiness en journal

- Per dag een cijfer van 1 tot 10 (tik nog eens op hetzelfde cijfer om het te wissen) en een vrije journal (max. 10.000 tekens). Beide mag je leeg laten.
- De journal wordt alleen opgehaald voor de dag die op het scherm staat, nooit in bulk. Opslaan gebeurt 0,8 s na het typen en bij het verlaten van het veld.

---

## Schermen

- **Home:** de knop "Habits" staat onder "Oefeningen beheren" en is zichtbaar voor iedereen.
- **Weekscherm (`/habits`):**
  - een dagbalk ma–zo, met vandaag gemarkeerd en een stipje bij een ontbrekende check-in;
  - per habit 7 vakjes, of één weekcel voor een gewichtsdoel;
  - de weekstand ("2/4") en "x/y weken behaald";
  - een rij met happiness-cijfers en daaronder de dagkaart (standaard vandaag);
  - pijlen om naar vorige weken te gaan (niet voorbij de huidige week);
  - slepen via ⠿ om habits te sorteren;
  - elke tik wordt direct opgeslagen.
- **Detail (`/habits/:id`):**
  - "x/y weken behaald", "loopt sinds" en het huidige doel;
  - een staafdiagram van de laatste 12 weken: groen behaald, rood niet behaald, grijs bezig, met een gestippeld doel per week;
  - een lijst per week;
  - knoppen voor archiveren/hervatten en verwijderen.
- **Formulier (`/habits/new`, `/habits/:id/edit`):** naam, zodat…, type, doel, automatische bron en startdatum.

---

## Datamodel en architectuur

Vier tabellen: `habits`, `habit_targets`, `habit_logs` en `daily_checkins`. De interessante keuzes:

1. **We slaan alleen op wat je aanraakt (A1).** In `habit_logs` komt alleen een rij als je zelf een vakje zet. Een week zonder alcohol kost nul rijen, en overrulen volgt vanzelf uit de regels hierboven.
2. **Geen join, foreign key of trigger naar `workouts`/`Weight` (A2).** De koppeling op datum gebeurt bij het ophalen. Afgeleide data bereken je, die kopieer je niet. De datum van een workout is te wijzigen en een workout kun je verwijderen, dus een kopie zou uit de pas raken.
3. **Eigen `user_id` op elke tabel, plus een samengestelde foreign key `(habit_id, user_id) → habits(id, user_id)` (A3).** De RLS-regel blijft een simpele vergelijking. De constraint garandeert dat een log nooit naar de habit van iemand anders wijst, ook voor schrijvers die RLS omzeilen, zoals een toekomstige backend met service-role key. RLS regelt wie erbij mag, constraints regelen dat de data klopt.
4. **Natuurlijke sleutels `(habit_id, date)` en `(user_id, date)` (A4).** De database garandeert één stand per dag, en je kunt met één upsert opslaan.
5. **RLS (A5):** één regel per actie, met `(select auth.uid())` zodat het één keer per query wordt uitgerekend. Een upsert heeft zowel een insert- als een update-regel nodig (de les van migratie 007). `user_id` heeft als standaardwaarde `auth.uid()`, dus de app stuurt het niet mee.
6. **De weekberekening is een pure functie (A6)** (`utils/habitWeek.ts`), en weekresultaten worden niet opgeslagen. Opslaan zou betekenen dat je ze opnieuw moet berekenen bij elke ingevulde oude dag, elk gewijzigd doel en elke aangepaste workout. De data is klein.
7. **De store laadt alles in één keer**, met de nieuwste rijen eerst. PostgREST geeft standaard maximaal 1000 rijen terug, dus bij een lange historie vallen de oudste rijen weg, niet de weken op je scherm.
8. **Optimistisch opslaan:** het scherm verandert meteen. Mislukt het opslaan, dan wordt de tik teruggedraaid, tenzij er alweer een nieuwere tik is. Tikken op hetzelfde vakje gaan op volgorde naar de database.
9. **Een nieuwe habit kost twee inserts zonder transactie** (de habit en daarna het eerste doel). Mislukt het doel, dan wordt de habit weer verwijderd.

---

## Privacy

- RLS op alle vier de tabellen: je ziet alleen je eigen rijen.
- Habits en check-ins komen **niet** op het newsboard.
- Habits en happiness zitten in v1 **niet** in de AI-export. Komt dat later, dan gaat de journal alleen mee als je dat per export aanvinkt (standaard uit).
- Een service-role key omzeilt RLS. Gebruik er nooit een om productiedata te bekijken met een AI-tool.

---

## Tests

Er zijn alleen Vitest-tests, want er is nog geen werkende e2e-opzet:
- `habitWeek.spec.ts`: de acceptatiecriteria. Bijvoorbeeld:
  - een laten-habit zonder logs telt elke verstreken dag als gelukt;
  - zelf uitvinken wint van een workout;
  - een doelwijziging laat oude weken met rust;
  - de eerste halve week telt niet mee;
  - toekomstige dagen tellen nooit mee;
  - gewichtsdoel: tempo verdelen over weken zonder meting, een negatief maximum voor een cut, en overrulen.
- `habits.store.spec.ts`: laden en omrekenen, aanmaken met terugdraaien, doelhistorie, optimistisch toggelen met terugdraaien, volgorde van dubbele tikken, de override-cyclus en check-ins.
- `HabitsView.spec.ts`: het weekraster, vandaag, een tik slaat op, de standaarden van laten, de gewichtscel, de lege staat, weeknavigatie en gearchiveerde habits.

---

## Niet in v1

- Habits en happiness in de AI-export (v1.1)
- Correlatie-analyse
- Notificaties
- Streaks (bewust weggelaten: één gemiste dag die een reeks breekt is precies het irritante gevoel dat je wilt vermijden)
- Andere periodes dan een week
- Een apart weekvakje-type
- Een ondergrens voor het gewichtsdoel
- E2e-tests

---

## Uitrollen

1. Draai `supabase/migration_015_habits.sql` in de Supabase SQL-editor.
2. Test lokaal: `npm run dev` en dan `/habits`.
