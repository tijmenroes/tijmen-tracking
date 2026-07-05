# Workout-tab → dashboard + losse actieve-workout flow

Herstructurering van `/workout` naar een dashboard met een apart actief-logscherm,
workout-historie, detailpagina en templates. Wordt per fase opgeleverd zodat elk stuk los
te testen is.

## Status per fase

- [x] **Fase 1 — Meerdere-sessies-model + apart actief-logscherm**
  - `migration_004_workout_sessions.sql`: `unique(user_id, date)` verwijderd, `name` toegevoegd.
  - `useWorkouts`: `startWorkout`, `loadWorkout`, `deleteWorkout` (vervangt `fetchOrCreateTodayWorkout`).
  - `WorkoutSessionView.vue` (`/workout/session/:id`): actief loggen.
  - `WorkoutView.vue`: tijdelijk minimaal dashboard met "Workout starten".
- [x] **Fase 2 — Dashboard met recente historie**
  - `useWorkouts.fetchRecentWorkouts(limit)` + `recentWorkouts` (met `exercise_count` via nested `workout_exercises(count)`).
  - `WorkoutView.vue`: sectie "Recente workouts" (laatste 5); klik opent voorlopig het sessiescherm (read-only detail volgt in fase 4).
- [x] **Fase 3 — Historie-pagina met paginering**
  - `useWorkouts.fetchWorkoutsPage(offset, limit)` (`.range()` + `count: 'exact'`) + `workoutsPage`/`totalWorkouts`.
  - `WorkoutHistoryView.vue` (`/workout/history`): lijst + Vorige/Volgende (10/pagina). Lege workouts weggefilterd via `!inner`.
  - Dashboard: "Alle workouts ›"-link naar de historie-pagina.
- [x] **Fase 4 — Read-only workout-detail**
  - `WorkoutDetailView.vue` (`/workout/history/:id`): `loadWorkout` + sets per oefening, read-only tabellen, oefeningnaam → oefening-detail, verwijderen via `ConfirmModal`.
  - Dashboard en historie linken naar detail i.p.v. sessiescherm.
- [x] **Fase 5 — Templates**
  - `migration_005_workout_templates.sql`: `workout_templates`, `template_exercises`, `workouts.template_id`.
  - `useWorkoutTemplates`: CRUD + `createTemplateFromWorkout`.
  - `startWorkout({ templateId })` kopieert oefeningen; `fetchWorkoutsByTemplate` voor template-historie.
  - Dashboard: templates-sectie (klik = start workout), `WorkoutTemplatesView`, `TemplateDetailView`, `TemplateEditView`.
  - `WorkoutEditModal`: checkbox "Opslaan als template" (standaard uit).
  - Template-detail: per oefening sets van **eerste en laatste** workout met dit template (kg-reps tabel).
- [ ] **Fase 6 — Template volume & analytics** (uitgesteld)

## Fase 6 — Template volume (uitgesteld)

Volume-tracking per template klinkt nuttig maar is in v1 bewust basic gehouden:

- **Extra sets in een workout** — telt die mee of alleen template-oefeningen? Verschillende users loggen verschillend.
- **Template wijzigt** — historische workouts houden `template_id` maar de oefeningenlijst leeft los; volume over tijd vergelijken wordt dubbelzinnig.
- **Wat is "volume"?** — som kg×reps per sessie? per oefening? alleen strength?

**V1-aanpak:** `workouts.template_id` linkt een sessie aan het template waarmee je startte; template-detail toont die workout-historie. Geen geaggregeerd volume. Fase 6 kan later per-sessie volume berekenen (client-side uit `exercise_sets`) zonder het template zelf te muteren.

## Migraties draaien

In de Supabase SQL editor, in volgorde: `migration_004_workout_sessions.sql` (fase 1),
`migration_005_workout_templates.sql` (fase 5).

## Bekende aandachtspunten

- "Vorige keer"-referentie (`useExerciseSets.fetchPreviousSets`) zoekt de meest recente
  eerdere sessie voor dezelfde oefening (exclusief huidige workout), niet per template.
- `useExportWorkout` filtert historie nog op `workout.date < huidige datum` (export-context).
- Geen "afronden"-status; elke workout blijft bewerkbaar via het sessiescherm.

Workout-tab → dashboard + losse actieve-workout flow
Context
De /workout-tab is nu één scherm dat automatisch "de workout van vandaag" aanmaakt en
daarin direct sets laat loggen. Dat is niet logisch als container. De gewenste opzet:

/workout wordt een dashboard/container met: je templates beheren, je recente
workout-geschiedenis (laatste 5), en een "Workout starten"-knop.
"Workout starten" brengt je naar een apart actief-logscherm waar je sets/reps logt.
Klik op een workout in de geschiedenis → workout-detailpagina (alle gelogde sets/reps,
read-only). Klik daar op een oefening → bestaande oefening-detail (/exercises/:id/detail).
"Meer" bij geschiedenis → aparte history-pagina met paginering.
Bevestigde keuzes:

Meerdere workouts per dag — de workouts.unique(user_id, date)-constraint vervalt; een
workout wordt een expliciete sessie (met optionele naam + created_at als starttijd).
Templates = alleen een geordende oefeningenlijst (geen streef-sets/reps in v1).
Nog geen grafiek op oefening-detail — de bestaande tabellen per sessie blijven; grafiek later.
De aanpak volgt bestaande patronen: user-owned RLS zoals workouts/Weight, composables in de
vorm { items, loading, error, fetch…, create… } (zie useWorkouts.ts,
useWeights.ts), en herbruik van ExercisePicker.vue,
WorkoutExerciseCard.vue, BaseModal.vue,
ConfirmModal.vue en de metric-card/header-stijl uit HomeView.vue.

We werken dit per fase uit zodat elk stuk los te testen is. Bij implementatie voegen we een
docs/workout-dashboard.md toe die de fasen + status bijhoudt.

Doel-architectuur (routes)
Platte routes (geen gedeelde chrome nodig), toegevoegd in router/index.ts,
allemaal meta.requiresAuth:

Route Naam View Doel
/workout workout WorkoutView.vue (wordt dashboard) Dashboard: templates, recente historie, "starten"
/workout/session/:id workout-session WorkoutSessionView.vue (nieuw) Actief loggen van sets/reps
/workout/history workout-history WorkoutHistoryView.vue (nieuw) Alle workouts, paginering
/workout/history/:id workout-detail WorkoutDetailView.vue (nieuw) Read-only sets/reps van 1 workout
/workout/templates/:id template-edit TemplateEditView.vue (nieuw) Oefeningenlijst van 1 template bewerken
Template-beheer (lijst/aanmaken/verwijderen/hernoemen) leeft op het dashboard; het bewerken van
de oefeningenlijst van één template gebeurt op de aparte template-edit-pagina.

Fase 1 — Meerdere-sessies-model + apart actief-logscherm
Doel: de logging verhuist naar een eigen scherm dat op een workout-id werkt, en je kunt
meerdere workouts per dag hebben. Dashboard is nog minimaal (alleen een startknop).

SQL — supabase/migration_004_workout_sessions.sql (gebruiker draait dit):

-- Meerdere workouts per dag toestaan + optionele sessienaam
alter table workouts drop constraint if exists workouts_user_id_date_key;
alter table workouts add column if not exists name text;
De unique-constraint heet standaard workouts_user_id_date_key. Klopt de naam niet, dan even
\d workouts checken.

useWorkouts.ts — vervang het dag-model door sessie-functies (behoud de add/remove/update):

startWorkout(opts?: { name?: string }): Promise<Workout | null> — insert { user*id, date: today, name }, zet workout.value, return de rij. (Vervangt fetchOrCreateTodayWorkout.)
loadWorkout(id: number) — fetch één workout + fetchWorkoutExercises() (bestaande join '*, exercise:exercises(\_)').
deleteWorkout(id: number).
Behoud addExerciseToWorkout, removeExerciseFromWorkout, updateWorkoutExercise, fetchWorkoutExercises.
Views/routing:

Nieuw WorkoutSessionView.vue = de huidige WorkoutView.vue logging-UI
(header, WorkoutExerciseCard-lijst, ExercisePicker, en de "Exporteer voor AI"-sectie), maar
gebonden aan route.params.id via loadWorkout(id) i.p.v. fetchOrCreateTodayWorkout().
WorkoutView.vue wordt tijdelijk een simpel dashboard met één knop "Workout starten" die
startWorkout() aanroept en naar /workout/session/${id} navigeert.
Voeg de routes workout-session toe.
Test: start 2 workouts op dezelfde dag, log in elk sets → beide blijven bestaan en los bewerkbaar.

Fase 2 — Dashboard met recente historie
Doel: het echte dashboard.

useWorkouts.ts: fetchRecentWorkouts(limit = 5) —
select('\*, workout_exercises(count)') (of tel client-side) geordend op created_at desc, in een
aparte recentWorkouts ref.

WorkoutView.vue (dashboard): herbruik metric-card/header-stijl:

Primaire knop "Workout starten".
Sectie Templates (placeholder tot fase 5).
Sectie Recente workouts: laatste 5 (datum, naam, #oefeningen) → klik navigeert naar
/workout/history/:id; knop "Alle workouts" → /workout/history.
Test: dashboard toont de laatste workouts; klikken opent (nog lege) detailroute.

Fase 3 — Historie-pagina met paginering
Doel: alle workouts doorbladeren.

useWorkouts.ts: fetchWorkoutsPage(offset, limit) met Supabase .range(offset, offset+limit-1)
en { count: 'exact' } voor totaal (nieuw patroon; nu bestaat alleen .limit(...)). State:
workoutsPage, totalWorkouts.

WorkoutHistoryView.vue: lijst + "Vorige/Volgende" (of "Meer laden"). Elk item → detailpagina.

Test: met >5 workouts kun je door pagina's bladeren; totaal klopt.

Fase 4 — Workout-detail (read-only)
Doel: bekijk één afgeronde workout.

WorkoutDetailView.vue (/workout/history/:id): loadWorkout(id) + per workout_exercise de
exercise_sets ophalen (query zoals in ExerciseDetailView.vue /
useExportWorkout.ts). Toon read-only tabellen (kg/reps of
tijd/afstand, plus pijn/notities). Klik op een oefeningnaam → /exercises/${exercise_id}/detail.
Herbruik ConfirmModal voor "workout verwijderen" (roept deleteWorkout).

Test: open een workout uit historie → alle sets/reps zichtbaar; oefening aanklikken opent
oefening-detail.

Fase 5 — Templates
Doel: herbruikbare oefeningenlijsten; workout starten vanaf een template.

SQL — supabase/migration_005_workout_templates.sql (user-owned RLS zoals workouts; transitieve
RLS voor de join zoals exercise_sets):

create table if not exists workout_templates (
id bigint generated by default as identity primary key,
user_id uuid not null references auth.users (id) on delete cascade,
name text not null,
created_at timestamptz not null default now()
);
alter table workout_templates enable row level security;
create policy "Users can read own templates" on workout_templates for select using (auth.uid() = user_id);
create policy "Users can insert own templates" on workout_templates for insert with check (auth.uid() = user_id);
create policy "Users can update own templates" on workout_templates for update using (auth.uid() = user_id);
create policy "Users can delete own templates" on workout_templates for delete using (auth.uid() = user_id);

create table if not exists template_exercises (
id bigint generated by default as identity primary key,
template_id bigint not null references workout_templates (id) on delete cascade,
exercise_id bigint not null references exercises (id) on delete cascade,
sort_order int not null default 0,
created_at timestamptz not null default now()
);
alter table template_exercises enable row level security;
create policy "Users can read own template_exercises" on template_exercises for select
using (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()));
create policy "Users can insert own template_exercises" on template_exercises for insert
with check (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()));
create policy "Users can delete own template_exercises" on template_exercises for delete
using (exists (select 1 from workout_templates t where t.id = template_id and t.user_id = auth.uid()));

-- Herkomst van een workout (optioneel)
alter table workouts add column if not exists template_id bigint references workout_templates (id) on delete set null;
Types (types/fitness.ts): WorkoutTemplate { id, user_id, name, created_at, template_exercises?: TemplateExercise[] }
en TemplateExercise { id, template_id, exercise_id, sort_order, created_at, exercise?: Exercise }.

Nieuw useWorkoutTemplates.ts: fetchTemplates() ('_, template_exercises(_, exercise:exercises(\*))'),
createTemplate(name), deleteTemplate(id), renameTemplate(id, name), addExerciseToTemplate(templateId, exerciseId),
removeExerciseFromTemplate(templateExerciseId).

useWorkouts.startWorkout uitbreiden met { templateId? }: na het aanmaken van de workout de
template_exercises kopiëren naar workout_exercises (op sort_order), en workouts.template_id zetten.

UI:

Dashboard-sectie Templates: lijst + "Nieuwe template" (naam via BaseModal), verwijderen via
ConfirmModal, klik → template-edit.
TemplateEditView.vue: naam bewerken + oefeningen toevoegen/verwijderen via ExercisePicker.
Startflow met template: de "Workout starten"-knop opent een BaseModal met "Lege workout" of
een template kiezen → startWorkout({ templateId }) → navigeer naar de sessie.
Test: maak een template met 3 oefeningen, start ervan een workout → die 3 staan er meteen in; log
sets; template blijft ongewijzigd.

Bekende aandachtspunten
useExerciseSets.fetchPreviousSets en useExportWorkout filteren "vorige keer" op
workout.date < huidige datum, dus eerdere sessies van dezelfde dag tellen niet mee als
referentie. Acceptabel voor v1; eventueel later verfijnen naar created_at.
"Afronden" van een workout is er niet; elke workout blijft bewerkbaar via het sessiescherm. Kan
later met een finished_at-vlag.
Tests (per fase, Vitest, mock-patroon zoals useWeights.spec.ts)
Fase 1: useWorkouts.startWorkout / loadWorkout / deleteWorkout.
Fase 3: fetchWorkoutsPage (range + count).
Fase 5: useWorkoutTemplates CRUD + startWorkout({ templateId }) kopieert oefeningen.
Elke fase: npm run type-check, npm run lint, npm run test:unit.
Verificatie (end-to-end, na alle fasen)
Draai migration_004 en migration_005 in Supabase.
npm run dev: /workout toont dashboard. Start een lege workout → log sets → terug → start nog
een workout dezelfde dag (werkt dankzij het vervallen van de unique-constraint).
Maak een template, start ervan → oefeningen staan klaar.
Historie: >5 workouts → paginering werkt; detailpagina toont sets; oefening → oefening-detail.

Historie: >5 workouts → paginering werkt; detailpagina toont sets; oefening → oefening-detail.
