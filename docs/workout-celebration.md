# Workout Celebration — overwinningsmoment na opslaan

Plan voor een “victory screen” na het afronden van een workout, geïnspireerd door apps als Strong, maar in de eigen visuele taal van deze app. Geen implementatie in dit document — alleen onderzoek, keuzes, open vragen en een gefaseerde aanpak.

---

## Context & inspiratie

**Strong (referentie):** na “Finish workout” verschijnt een fullscreen celebratie:

- Achtergrond: subtiele confetti / sterren-animatie
- Boven: 3 sterren + “Congratulations! That’s your 19th workout!”
- Midden: recap-card met titel, datum, tijd, aantal PR’s, totaal volume
- Onder: per oefening de “best set” met optionele delta t.o.v. historie

**Doel voor onze app:** hetzelfde _gevoel_ — dopamine, trots, overzicht — maar:

- Paars/wit design system als **basis** (`--color-primary`, cards, trends)
- Nederlandse copy — hier **bewust speels en energiek**, mag afwijken van de neutrale toon elders in de app
- **Geen 1-op-1 kopie** van Strong (layout/copy), maar wél feestelijk met **gelaagde confetti**: licht bij een gewone workout, voller bij PR’s en milestones

**Beslissing (Tijmen):** de app voelt nu wat saai; animaties en naamgeving mogen op dit scherm expressief zijn. **Confetti-intensiteit schaalt mee:** klein bij een gewone workout, voller bij PR’s en milestones (zie [Confetti-intensiteit](#confetti-intensiteit)).

---

## Huidige stand in de codebase

| Onderdeel            | Status                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Workout opslaan      | `saveWorkout()` in `useWorkouts.ts`: lege sets weg, lege oefeningen weg, `status: 'saved'`                  |
| Navigatie na opslaan | `WorkoutSessionView` → `/workout/history/:id` (detailpagina)                                                |
| Starttijd            | `workouts.created_at` (aanmaakmoment van de draft)                                                          |
| Eindtijd             | **Niet aanwezig** — geen `saved_at` / `finished_at` kolom                                                   |
| Workout-teller       | `totalWorkouts` via paginering; geen dedicated “jouw N-de workout” helper                                   |
| e1RM                 | `epley1RM`, `bestSetE1RM`, `roundE1RM` in `utils/e1rm.ts`; chart op oefening-detail                         |
| PR-detectie          | **Niet geïmplementeerd** — oefening-detail toont all-time best e1RM, maar geen “nieuwe PR” vlag             |
| Templates            | `workouts.template_id`; `fetchWorkoutsByTemplate()`; template-detail met eerste/laatste sessie per oefening |
| Volume / analytics   | Bewust uitgesteld als **Fase 6** in `docs/workout-dashboard.md`                                             |
| Oefeningtypes        | `strength` (kg × reps) en `endurance` (tijd × km)                                                           |

**Belangrijk:** een workout is na opslaan nog steeds bewerkbaar via het sessiescherm (`WorkoutDetailView` → “Oefeningen en sets aanpassen”). Dat betekent dat statistieken die bij opslaan berekend worden **verouderd kunnen raken** als de gebruiker later sets wijzigt. Zie [Persistente stats vs. herberekenen](#persistente-stats-vs-herberekenen).

---

## Voorgestelde user flow

```
WorkoutSessionView
  └─ "Workout opslaan"
       └─ saveWorkout() (bestaande logica)
            ├─ deleted → /workout (geen celebration)
            └─ saved → /workout/celebration/:id   ← nieuw
                    └─ knop "Naar workout" → /workout/history/:id
                    └─ knop "Terug naar dashboard" → /workout
```

De celebration is een **eigen route**, niet een modal boven het sessiescherm. Voordelen:

- Deeplinkbaar (later: “bekijk je recap opnieuw”)
- Animatie speelt één keer af bij binnenkomst
- Scheiding tussen “loggen” (sessie) en “reflecteren” (celebration)

Optioneel later: vanuit `WorkoutDetailView` een link “Recap bekijken” als de workout ooit via celebration is opgeslagen.

---

## Schermopbouw (v1-concept)

### Laag 1 — Celebratie (boven)

- **Gelaagde confetti-animatie** — intensiteit hangt af van wat je bereikt hebt (zie [Confetti-intensiteit](#confetti-intensiteit)); altijd _iets_ te vieren, maar PR’s en milestones krijgen duidelijk meer
- **Sterren** — alleen bij PR’s en/of milestones (niet bij een standaard workout): animated fill / scale-in (denk Strong, maar paars)
- **Headline** — wisselende copy; pool per tier (standaard vs. PR vs. milestone)
- **Subtekst** — altijd workout-nummer (“Dat was je 19e workout”); extra flair bij milestones (“Double digits!”)
- Extra regels bij PR/milestone (“3 PR’s vandaag”, “Eerste keer dit template” — fase 2+)
- Respecteert `prefers-reduced-motion`: dan statisch scherm, zelfde copy en data

### Laag 2 — Recap-card (midden)

| Veld                  | Bron                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Titel                 | `workout.name` of fallback datum                                                         |
| Datum                 | `workout.date` (nl-NL formatting, zoals elders)                                          |
| Duur                  | `saved_at − created_at` (na migratie) of nu: benadering via laatste set-timestamp        |
| PR’s                  | Aantal oefeningen met minstens één nieuwe PR deze sessie                                 |
| Volume                | Som `weight_kg × reps` over alle strength-sets (zie definitie hieronder)                 |
| Template-vergelijking | Alleen als `template_id` gezet — zie [Template-vergelijkingen](#template-vergelijkingen) |

### Laag 3 — Oefeningenlijst (onder)

Per gelogde oefening (sort_order):

- Naam
- **Best set** — strength: hoogste e1RM-set (`bestSetE1RM`); endurance: snelste pace of langste afstand (definitie kiezen)
- Delta-indicator: ▲/▼ + percentage t.o.v. referentie (kleur via `--color-up` / `--color-down`)

Compacte rij, geen volledige set-tabel — detail blijft op `WorkoutDetailView`.

---

## Berekeningen & definities

### Volume (strength)

```
volume_kg = Σ (weight_kg × reps)   // alleen sets met beide waarden > 0
```

- **Endurance:** geen kg-volume; tonen totale tijd en/of totale km
- **Gemengde workout:** strength-volume + endurance-samenvatting apart

### Best set per oefening

- **Strength:** set met hoogste `epley1RM` in deze sessie (bestaande `bestSetE1RM`)
- **Endurance:** nog te kiezen — opties:
  - Langste `duration_seconds` bij vaste afstand
  - Snelste pace (`duration / distance`) bij vergelijkbare afstand
  - Hoogste `distance_km` bij vergelijkbare duur

### PR (Personal Record)

Een PR is **per oefening, per metric**, wanneer de best set van _deze_ workout beter is dan alle eerdere saved workouts (exclusief huidige).

| Type      | PR-metric (voorstel v1)        | PR-metric (uitbreiding)                                                       |
| --------- | ------------------------------ | ----------------------------------------------------------------------------- |
| Strength  | Nieuwe hoogste e1RM            | Zwaarste single-set gewicht (zelfde reps), hoogste sessie-volume per oefening |
| Endurance | Langste afstand / snelste pace | Per afstand-categorie                                                         |

**PR-badge op celebration:** “2 PR’s” = 2 oefeningen waar minstens één PR-metric gehaald is.

**Let op:** e1RM-PR ≠ “zwaarste gewicht ooit”. 80 kg × 8 kan een hogere e1RM geven dan 85 kg × 5. In UI duidelijk maken: “Geschatte 1RM PR” i.p.v. alleen “PR”.

### Delta t.o.v. “beste ooit” (jouw idee)

Percentage naast best set:

```
delta = (huidige_best − all_time_best) / all_time_best × 100
```

- Positief → groen/omhoog (nieuwe PR of dichtbij)
- Negatief → rood/omlaag (“−8% t.o.v. PR”)

**Misleidende context (jij noemde dit):** biceps early vs. late in workout, slaap, etc. **Aanpak:**

- Tooltip of subtiele footnote: “Vergelijking met je beste sessie ooit — kan per workout volgorde verschillen”
- Alternatief (minder misleidend): vergelijk met **vorige keer dezelfde oefening** i.p.v. all-time (sluit aan bij “Vorige keer” in `WorkoutExerciseCard`)
- Of beide tonen: “vs vorige keer” primair, “vs PR” secundair

### Workoutduur

**Voorkeur:** nieuwe kolom `saved_at timestamptz` zetten bij `saveWorkout()`:

```
duur = saved_at − created_at
```

`created_at` = moment dat draft start (via `startWorkout`). Accuraat genoeg; gebruiker kan tussendoor de app sluiten — dat is acceptabel.

**Fallback zonder migratie:** `max(exercise_sets.created_at)` − `workouts.created_at` — minder betrouwbaar (sets kunnen achteraf toegevoegd worden).

### Workout-nummer (“19e workout”)

```sql
count(*) from workouts where user_id = ? and status = 'saved' and id <= current_id
```

Of: positie in chronologische lijst op `saved_at` / `created_at`.

---

## Template-vergelijkingen

Templates maken vergelijkingen **makkelijker** omdat je een stabiele oefeningenlijst hebt (`template_exercises`) en een reeks sessies (`fetchWorkoutsByTemplate`).

### Wat vergelijken we?

| Metric                 | Beschrijving                                                                              | Edge cases                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Totaal volume**      | Som kg×reps over alle strength-sets in de sessie                                          | Extra oefeningen buiten template, geskipte oefeningen, minder sets              |
| **Gemiddelde e1RM**    | Gemiddelde van per-oefening best-set e1RM, **alleen template-oefeningen die gelogd zijn** | Oefening overgeslagen → exclude from avg, niet als 0 tellen                     |
| **Per-oefening delta** | Best set nu vs. vorige sessie met zelfde template                                         | Template gewijzigd sinds vorige sessie — oefeningen kunnen ontbreken/toegevoegd |

### Normalisatie bij ongelijke sessies (jouw edge case)

Als vorige keer 4 sets bench en nu 3 (1 geskipt):

| Strategie                                  | Pro                                             | Con                                       |
| ------------------------------------------ | ----------------------------------------------- | ----------------------------------------- |
| **A. Raw total volume**                    | Simpel, eerlijk over wat je deed                | Lagere volume ≠ per se slechtere training |
| **B. Volume per gelogde set (gemiddelde)** | Minder bestraft voor minder sets                | Verbergt dat je minder werk deed          |
| **C. Alleen overlappende oefeningen**      | Eerlijke vergelijking bij gedeeltelijke workout | Complexer; moet duidelijk gelabeld        |
| **D. “Template completion” %**             | X van Y template-oefeningen gelogd              | Geen kwaliteitsmetric, wel context        |

**Voorstel v1:** **A + D** — toon raw volume + “5/6 template-oefeningen gelogd”. Geen gemiddelde e1RM op celebration tot we normalisatie goed getest hebben.

**Voorstel fase 3+:** gemiddelde e1RM over overlappende oefeningen (strategie C), eventueel grafiek op template-detail.

### Grafiek op template-detail (jouw idee — edge case)

Lijndiagram volume en/of avg e1RM over alle template-sessies (client-side uit `exercise_sets`).

**Voorwaarden om het nuttig te maken:**

- Minimaal 3 datapunten
- Tooltip per punt: datum, volume, #oefeningen gelogd, #sets
- Waarschuwing als template sindsdien gewijzigd is (“Template gewijzigd op … — vergelijkingen vóór die datum zijn indicatief”)
- Filter: “alleen sessies met ≥ N template-oefeningen” (optioneel)

Dit is expliciet **niet** v1 — sluit aan bij uitgestelde Fase 6 in `workout-dashboard.md`.

---

## Persistente stats vs. herberekenen

Omdat workouts na opslaan bewerkbaar blijven:

| Optie                        | Beschrijving                                    |
| ---------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| **A. Altijd live berekenen** | Celebration + detail herberekenen bij elke view | Consistent, geen extra DB; queries iets zwaarder                  |
| **B. Snapshot bij opslaan**  | `workout_stats` JSON kolom of aparte tabel      | Celebration blijft “moment of truth”; detail kan afwijken na edit |
| **C. Hybrid**                | Snapshot voor celebration-animatie; detail live | Best of both; meer complexiteit                                   |

**Voorstel:** **A (live berekenen)** voor v1 — simpel, geen migratie behalve `saved_at`. Celebration is idempotent bij herladen. Als later “frozen recap” gewenst is → optie B.

---

## Visueel design — expressief, wel herkenbaar

**Principe:** celebration is het enige scherm waar we bewust **meer show** maken dan de rest van de app. Functionele schermen blijven clean; dit moment mag visueel en qua copy **duidelijk feestelijker** zijn.

Passend bij bestaande tokens (`tokens.css`), maar met **uitbreidingen toegestaan** voor dit scherm:

- **Achtergrond:** diepe paarse gradient + confetti bij binnenkomst (particles in `--color-primary`, wit; goud/geel accent vooral bij PR/milestone tiers)
- **Confetti-intensiteit** — bepaald vóór render; `CelebrationBackground` krijgt een `tier` prop (zie tabel hieronder)
- **Gedeelde animaties (alle tiers):**
  - Headline: scale + fade stagger
  - Recap-card: slide-up met slight overshoot (spring easing)
  - Per oefening: rij-voor-rij fade-in (stagger 50–80ms)
- **Extra bij PR/milestone tiers:**
  - Animated sterren (1–3)
  - PR-badge: pop + pulse/glow
  - Recap-card: extra shadow, gradient border of “shine” sweep
- **Trends:** `--color-down` (groen) voor omhoog, `--color-up` (rood) voor omlaag — consistent met weight-chart
- **Copy & tone:** informeel, energiek; headline-pool per tier
- **Reduced motion:** geen animaties, wel volle copy en kleur — geen kale fallback
- **Geluid/haptics (fase 5+):** optioneel; zwaardere haptic bij PR/milestone tier

### Confetti-intensiteit

**Beslissing (Tijmen):** kleine confetti bij een normale workout; meer/vollere confetti bij PR’s en milestones.

Tier wordt client-side bepaald uit workout-stats **vóór** de animatie start:

| Tier            | Wanneer                                | Confetti                                                        | Sterren             | Duur intro | Headline-voorbeeld                 |
| --------------- | -------------------------------------- | --------------------------------------------------------------- | ------------------- | ---------- | ---------------------------------- |
| **`normal`**    | Geen PR, geen milestone                | Licht — ~20 particles, smalle spread, paars/wit                 | Geen                | ~2s        | “Lekker bezig!”, “Dat was hem!”    |
| **`pr`**        | ≥1 PR, geen milestone                  | Medium — ~50 particles, bredere spread, + goud accent           | 1–3 (op PR-count)   | ~3s        | “Nieuwe PR’s!”, “Record verbroken” |
| **`milestone`** | Ronde workout-nummers (5, 10, 25, 50…) | Vol — ~90 particles, full-screen burst, goud + paars            | 3 sterren           | ~4s        | “10 workouts!”, “Double digits!”   |
| **`epic`**      | PR **én** milestone tegelijk           | Maximum — ~120 particles, dubbele burst (0s + 1.5s), glow flash | 3 sterren + PR-glow | ~4–5s      | “PR’s én milestone — beast mode!”  |

**Milestone-definitie v1:** workout-nummer in `{ 5, 10, 25, 50, 100, … }` (configureerbare lijst). “19e workout” blijft in subtekst, geen extra confetti.

**Prioriteit bij meerdere triggers:** `epic` > `milestone` > `pr` > `normal`. PR telt altijd mee voor zwaardere tier dan `normal`.

**Technisch:** `useWorkoutStats` exporteert `celebrationTier: 'normal' | 'pr' | 'milestone' | 'epic'`. Bij herladen van celebration:zelfde tier (live stats, geen snapshot).

### Mogelijke headline-pool (voorbeelden)

| Trigger               | Voorbeelden                                                       |
| --------------------- | ----------------------------------------------------------------- |
| Standaard (`normal`)  | “Lekker bezig!”, “Dat was hem!”, “Klaar. Sterk werk.”             |
| PR (`pr`)             | “Nieuwe PR’s!”, “Record verbroken”, “Je bent sterker geworden”    |
| Milestone             | “10 workouts!”, “Double digits!”, “Halverwege de 20 — keep going” |
| Epic (PR + milestone) | “PR’s én {N} workouts!”, “On fire vandaag”                        |

---

## Technische architectuur (indicatief)

### Nieuwe bestanden (bij implementatie)

```
src/views/WorkoutCelebrationView.vue      # UI
src/composables/useWorkoutStats.ts        # volume, PRs, duration, template deltas
src/utils/volume.ts                       # Σ kg×reps, endurance totals
src/utils/prDetection.ts                  # vergelijk met historie
src/components/CelebrationBackground.vue  # confetti/particles; prop `tier`: normal | pr | milestone | epic
src/utils/celebrationTier.ts              # tier bepalen uit PR-count + workout-nummer
```

### Route

```ts
{ path: '/workout/celebration/:id', name: 'workout-celebration', meta: { requiresAuth: true, navDepth: 3 } }
```

### Migratie (minimaal)

```sql
-- migration_007_workout_saved_at.sql
alter table workouts add column if not exists saved_at timestamptz;
update workouts set saved_at = created_at where status = 'saved' and saved_at is null;
-- saved_at zetten in saveWorkout() bij status = 'saved'
```

### Data ophalen (één composable)

1. Load workout + exercises + sets (zelfde join als detail)
2. Load user workout count (saved)
3. Load template history als `template_id` gezet
4. Load all-time / previous bests per exercise_id (queries parallel)

### Tests (Vitest)

- `volume.ts`: mixed sets, empty sets, endurance excluded
- `prDetection.ts`: nieuwe e1RM PR, geen PR, first time exercise
- `celebrationTier.ts`: normal vs pr vs milestone vs epic
- `useWorkoutStats`: template delta met geskipte oefening
- Route: save → celebration redirect

---

## Open vragen — input gewenst

Beantwoord wat relevant is; onbesliste punten kunnen met een default in v1.

### Celebratie & UX

1. ~~**Elke workout of alleen milestones?**~~ → **Besloten:** altijd celebration; **confetti-intensiteit schaalt** — klein (`normal`), medium (`pr`), vol (`milestone`/`epic`)
2. **Overslaan?** “Ga verder →” die animatie direct stopt — nodig voor `prefers-reduced-motion` en power users.
3. **Recap later opnieuw bekijken?** Link vanuit workout-detail, of is celebration eenmalig?
4. **Na celebration standaard naar detail of dashboard?** Nu: detail. Celebration maakt detail misschien redundant op korte termijn.

### PR’s & metrics

1. **Wat telt als PR?** Alleen e1RM (v1-voorstel), of ook “zwaarste 5 reps ooit”, “meeste volume in sessie”?
2. **Endurance PR:** pace, afstand, of duur — wat is het belangrijkst voor jou?
3. **Delta-referentie:** all-time PR, vorige keer (zelfde oefening), of vorige keer **zelfde template**?

### Template & volume

1. **Volume op celebration:** totale workout of alleen template-oefeningen?
2. **Template gewijzigd:** vergelijkingen stil houden, waarschuwing tonen, of vergelijking resetten?
3. **Grafiek template-detail:** volume, avg e1RM, of beide? Vanaf hoeveel sessies tonen?

### Gamification (nice-to-have)

1. **Streaks** (dagen/weeks achter elkaar trainen)?
2. **Badges** (“100k kg volume totaal”, “50 workouts”)?
3. **Delen** (screenshot-vriendelijke card, export)?

### Copy & tone

1. ~~**Nederlands informeel** (“Lekker bezig!”) vs. neutraal (“Workout opgeslagen”)?~~ → **Besloten: informeel & energiek**, wisselende headlines (zie headline-pool)
2. ~~**Milestone-tonen:** “19e workout” altijd, of extra flair bij ronde getallen?~~ → **Besloten:** exact nummer altijd in subtekst; **zwaardere confetti/sterren** alleen bij ronde milestones (5, 10, 25, 50…)

---

## Afgekapte scope (bewust niet in v1)

- Push-notificaties / haptic feedback (Capacitor later)
- Social sharing
- AI-samenvatting van de workout op celebration
- Grafieken op celebration zelf (alleen op template-detail in latere fase)
- Opgeslagen snapshot-tabel voor stats
- “Workout bewerken” vanuit celebration (via detail/sessie)

---

## Implementatie in fasen

### Fase 1 — Celebration MVP

**Doel:** emotionele beloning + basis-recap. Animatie en copy mogen hier **meteen** opvallen — niet pas in latere fasen.

- [ ] Migratie `saved_at` + zetten in `saveWorkout()`
- [ ] Route `WorkoutCelebrationView` + redirect na opslaan
- [ ] `celebrationTier.ts` + `CelebrationBackground` met tier-prop (normal = kleine confetti)
- [ ] Headline-pool per tier + workout-nummer in subtekst
- [ ] Recap-card: titel, datum, duur, oefening-count, strength-volume
- [ ] Oefeningenlijst met best set (geen delta’s yet)
- [ ] Staggered card/lijst reveal + reduced-motion fallback
- [ ] Knoppen: “Bekijk workout”, “Naar dashboard”
- [ ] Unit tests: `volume`, `celebrationTier` (normal + milestone; `pr`/`epic` in fase 2)

**Fase 1 dekt:** `normal` + `milestone` tiers (workout-nummer). `pr` / `epic` volgen zodra PR-detectie in fase 2 landt — tot die tijd fallback naar `normal`/`milestone`.

**Geschatte omvang:** medium — 1 view, 1 composable, 1 migratie, router-wijziging.

---

### Fase 2 — PR’s & deltas

**Doel:** de “Strong magic” — PR-telling en vergelijking per oefening.

- [ ] `prDetection.ts`: e1RM-PR per strength-oefening
- [ ] PR-detectie activeert `pr` / `epic` tier (meer confetti + sterren)
- [ ] Endurance PR-definitie implementeren
- [ ] PR-count op recap-card
- [ ] Delta % naast best set (referentie: keuze uit open vragen — default: vorige keer zelfde oefening)
- [ ] Visuele PR-badge per oefening-regel
- [ ] Tests voor PR-randen ( eerste keer, gelijke e1RM, rounding )

---

### Fase 3 — Template-aware vergelijking

**Doel:** context wanneer workout van template startte.

- [ ] Template-naam op recap-card
- [ ] “X/Y template-oefeningen gelogd”
- [ ] Volume delta t.o.v. vorige sessie met **zelfde template_id**
- [ ] Avg e1RM over overlappende template-oefeningen (met exclude skipped)
- [ ] Footnote als template sinds vorige sessie gewijzigd is
- [ ] Tests: geskipte oefening, extra oefening, template rename

---

### Fase 4 — Template analytics (uitgesteld, was Fase 6 dashboard)

**Doel:** grafieken op template-detail — alleen als fase 3 stabiel is.

- [ ] Volume-over-tijd lijnchart (hergebruik `E1RMChart`-patroon)
- [ ] Optioneel: avg e1RM-over-tijd
- [ ] Datapunt-metadata (sets count, exercises logged)
- [ ] Minimum 3 sessies; empty state
- [ ] Documentatie-update in `workout-dashboard.md` (Fase 6 → done)

---

### Fase 5 — Polish & milestones

**Doel:** extra dopamine zonder core-logica te wijzigen.

- [ ] Milestone copy (10e, 25e, 50e workout)
- [ ] Eerste workout met template / eerste PR ever
- [ ] Optionele streak (week met ≥1 workout)
- [ ] “Recap opnieuw bekijken” vanuit detail
- [ ] Zwaardere haptic bij `pr` / `milestone` / `epic` tier

---

## Besproken ideeën (samenvatting)

| Idee                                          | Bron            | Fase | Opmerking                                                        |
| --------------------------------------------- | --------------- | ---- | ---------------------------------------------------------------- |
| Gelaagde confetti (klein → vol)               | Strong / Tijmen | 1    | `normal` / `pr` / `milestone` / `epic` tiers                     |
| “N-de workout” headline                       | Strong / user   | 1    | Query op saved workouts                                          |
| Recap-card (titel, datum, tijd, PR’s, volume) | Strong / user   | 1–2  | Duur via `saved_at`                                              |
| Oefeningen + best set                         | User            | 1    | `bestSetE1RM` bestaat al                                         |
| % delta t.o.v. beste ooit                     | User            | 2    | Misleidend bij volgorde — disclaimer of vorige-keer vergelijking |
| Template: avg 1RM / volume vergelijking       | User            | 3    | Normalisatie nodig bij geskipte sets                             |
| Template-detail grafiek volume/e1RM           | User            | 4    | Edge-case heavy; sterke labeling                                 |
| Tijd via created_at → saved                   | User            | 1    | `saved_at` kolom aanbevolen                                      |
| Expressieve stijl, mag buiten lijntjes        | Tijmen          | 1    | Celebration = feestelijk; rest app blijft functioneel            |

---

## Relatie met bestaande docs

- **`docs/workout-dashboard.md` Fase 6** (template volume & analytics) wordt deels opgepakt in **Fase 3–4** van dit document. Celebration levert de **user-facing** reden om volume/e1RM te berekenen; template-detail krijgt de **historische** grafiek.
- **`WorkoutDetailView`** blijft de plek voor volledige set-tabellen en bewerken; celebration is de **samenvatting op het moment van afronden**.

---

## Default beslissingen (voor als open vragen blijven liggen)

| Onderwerp          | Default v1                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| PR-definitie       | Hoogste e1RM ooit per oefening                                                    |
| Delta-referentie   | Vorige keer dezelfde oefening (niet all-time)                                     |
| Volume             | Totale strength volume van hele workout                                           |
| Celebration        | Altijd tonen; confetti **tiered** (klein standaard, voller bij PR/milestone)      |
| Confetti tiers     | `normal` ~20 particles · `pr` ~50 · `milestone` ~90 · `epic` ~120 + dubbele burst |
| Milestone-getallen | Extra tier bij 5, 10, 25, 50, 100… (subtekst toont altijd exact nummer)           |
| Copy & tone        | **Informeel, energiek**, wisselende headlines                                     |
| Visuele boldness   | **Mag buiten lijntjes** op celebration; paars/goud palette                        |
| Na celebration     | Primary CTA → workout-detail                                                      |
| Endurance best set | Hoogste `distance_km`; PR = langste afstand                                       |
| Stats persistentie | Live herberekenen, geen snapshot                                                  |

---

## Volgende stap

1. Open vragen beantwoorden (vooral PR-definitie, delta-referentie, endurance).
2. Akkoord op fasering → start **Fase 1** implementatie.
3. Na Fase 1: e2e-test “workout loggen → opslaan → celebration zichtbaar → detail bereikbaar”.

<!-- Nog wat kleine notes naderhand: -->

Notes plan

1-op-1 kopie van Strong mag best, MITS dat de beste uitwerking is. Idealiter komt claude met mooie idee"en.

Bij strong is ook een "tijd" die hier getoond wordt, gewoon het aantal minuten. OOk leuk om mee te pakken. Kan berekend worden adhv created_at vs tijd bij "saven".

Bij voorgestelde user flow zie ik iets van voorden Deeplinkbaar, dat lijkt me overkill, zit niemand op te wachten denk ik?

Voor confetti miss gewoon confetti.js script gebruiken en dit lazy loaden wanneer nodig? Niet handig als dat in chunks etc mee komt

Endurance doen we nu niet super veel mee, kunnen we mogelijk achterwege laten.
Misschien moet heel endurance een eigen tabje krijgen namelijk.

Over:
Misleidende context (jij noemde dit): biceps early vs. late in workout, slaap, etc. Aanpak:
Als je biceps als eerste doet of als laatste oefening na een heavy back day zal het heel erg verschillen.
Misschien kunnen we een soort check doen of het in de eerste 50% van de workout (van excercises) of laatste zit.
Maar het moet allemaal niet te complex worden, misschien moeten we dit gewoon voor lief nemen. Een tooltip met "kan verschillen obv volgorde" boeit ook niemand, de user zal niet huilen als hij hier een PR zet of een lage t.o.v. vorige workout.

Persistente stats vs. herberekenen => Dit klinkt een beetje overkill. Het hoeft niet te complex te worden, het is gewoon een fun feature.
