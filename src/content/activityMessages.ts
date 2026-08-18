import type { ActivityEvent } from '@/types/fitness'

export const activityMessages = {
  workout: [
    'Lekker bezig pik!',
    'Niet lullen maar poetsen.',
    'Die kan weer in de boeken.',
    'Keurig gewerkt, chef.',
    'De bank heeft hem in ieder geval niet gezien.',
    'Hoppa, weer sterker dan gisteren.',
    'Geen excuses, gewoon gegaan.',
    'De spieren hebben weer post gehad.',
    'Dat biertje is alvast verdiend.',
    'Om te smullen wordt hij',
  ],
  workoutPr: [
    'Wat een kk beest',
    'Niet normaal deze vent!!',
    'Mama mia hij wordt sexy',
    'Om te smullen wordt hij',
    'De gewichten vragen om genade.',
    'Iemand moet hem even afremmen.',
    'De gym is officieel gewaarschuwd.',
    'Deze man kent geen plafond.',
    'PR-machine op volle toeren.',
    'Dit begint gewoon eng te worden.',
  ],
  weightLoss: [
    'Wat een lekker ding',
    'De weegschaal kan het amper bijhouden.',
    'Hij smelt waar je bij staat.',
    'Strakker dan de planning.',
    'De zomer kan komen hoor.',
    'Dat shirt krijgt steeds meer ruimte.',
    'Lichter, maar zeker niet minder sterk.',
    'De cut doet zijn werk.',
    'Kijk hem eens lekker gaan.',
    'Er verdwijnt gewicht en verschijnt pure klasse.',
  ],
  weightStable: [
    'Zo stabiel als een huis.',
    'Geen grammetje paniek.',
    'De weegschaal houdt de adem in.',
    'Cruisecontrol staat aan.',
    'Precies in balans, chef.',
    'Geen beweging in te krijgen.',
    'Rust in de tent en op de weegschaal.',
    'Deze lijn is rechter dan zijn planning.',
    'Onder controle, zoals altijd natuurlijk.',
    'Stabiel blijven is ook een kunst.',
  ],
  weightGain: [
    'Meer mens om van te houden.',
    'De bulk heeft de memo ontvangen.',
    'Er komt massa bij, en hoe.',
    'Die spieren wegen blijkbaar ook wat.',
    'De weegschaal maakt overuren.',
    'Groter, breder, gezelliger.',
    'De gain train dendert door.',
    'Dat wordt een stevige unit.',
    'Geen paniek, dit heet strategische massa.',
    'Hij groeit gewoon uit zijn voegen.',
  ],
} as const

function pick(messages: readonly string[], variant: number): string {
  const index = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) % messages.length : 0
  return messages[index]!
}

function workoutLabel(name?: string): string {
  if (!name || name.toLowerCase() === 'workout') return 'een workout'
  return `workout “${name}”`
}

function formatDelta(value?: number): string {
  return Math.abs(value ?? 0).toLocaleString('nl-NL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export function renderActivityMessage(event: ActivityEvent): string {
  const variant = event.payload.variant ?? 0
  if (event.event_type === 'workout_completed') {
    const prCount = event.payload.pr_count ?? 0
    const suffix = pick(prCount > 0 ? activityMessages.workoutPr : activityMessages.workout, variant)
    const prs = prCount > 0 ? ` ${prCount} nieuwe PR${prCount === 1 ? '' : "'s"}.` : '.'
    return `${event.actor_nickname} heeft ${workoutLabel(event.payload.workout_name)} afgerond${prs} ${suffix}`
  }

  const delta = formatDelta(event.payload.delta_kg)
  if (event.payload.category === 'loss') {
    return `${event.actor_nickname} is ${delta} kg afgevallen deze week! ${pick(activityMessages.weightLoss, variant)}`
  }
  if (event.payload.category === 'gain') {
    return `${event.actor_nickname} is ${delta} kg aangekomen deze week. ${pick(activityMessages.weightGain, variant)}`
  }
  return `${event.actor_nickname} is deze week stabiel gebleven. ${pick(activityMessages.weightStable, variant)}`
}
