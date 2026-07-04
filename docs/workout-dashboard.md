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
- [ ] **Fase 4 — Read-only workout-detail** (`/workout/history/:id`)
- [ ] **Fase 5 — Templates** (`migration_005`, `useWorkoutTemplates`, start-vanaf-template)

## Migraties draaien
In de Supabase SQL editor, in volgorde: `migration_004_workout_sessions.sql` (fase 1),
`migration_005_workout_templates.sql` (fase 5).

## Bekende aandachtspunten
- "Vorige keer"-referentie (`useExerciseSets.fetchPreviousSets`, `useExportWorkout`) filtert op
  `workout.date < vandaag`, dus eerdere sessies van dezelfde dag tellen niet mee. Later te verfijnen.
- Geen "afronden"-status; elke workout blijft bewerkbaar via het sessiescherm.
