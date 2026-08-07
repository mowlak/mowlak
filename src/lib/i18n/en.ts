import type { Strings } from './types';

export const en: Strings = {
	footer: {
		privacy: 'Privacy',
		source: 'Source code'
	},
	landing: {
		title: 'Mowlak — a calm speech-learning app for toddlers',
		description:
			'A calm speech-learning app for toddlers. No ads, no rewards, no rush. Free, forever.',
		tagline: 'First words, at a calm pace.',
		lede: 'A calm speech-learning app for toddlers. Your child touches a picture, a warm voice says "hau hau" — and when the time comes, the word. No ads, no rewards, no rush. Free, forever.',
		// A reader who arrived in English has no way of knowing that the
		// cards are Polish, and would find out from the first one.
		note: 'Mowlak teaches Polish first words. The interface also speaks English — for mixed families and Polish families abroad.',
		open: 'Open the app',
		calm: {
			heading: 'Why so quiet?',
			intro:
				'Toddler apps compete in animations, sound effects and rewards. Speech therapists have long pointed out that this hinders more than it helps: an overstimulated child stops listening. Mowlak goes the other way.',
			pledges: [
				{
					claim: 'One thing on screen.',
					detail: 'Nothing blinks, nothing pops up, there is nothing to scroll.'
				},
				{
					claim: 'The voice finishes.',
					detail:
						'While a sound plays, taps do nothing — the word completes before anything changes.'
				},
				{
					claim: 'No stars, no fanfares.',
					detail: 'Speaking is the reward.'
				},
				{
					claim: 'No ads, no tracking.',
					detail: 'Nothing leaves the phone.'
				}
			]
		},
		how: {
			heading: 'How it works',
			// The two Polish words stay Polish: they are what the child will
			// hear, and the gloss beside them is the translation.
			body: 'Onomatopoeia first — in Polish speech-therapy practice this is the classic road to first words, because "hau hau" is easier than "piesek" (dog). Your child looks at a picture, hears a warm human voice — not a sound effect — and repeats when they feel like it. No testing, no grading. When the child is ready, a parent switches the level to full words.'
		},
		name: {
			heading: 'The name',
			body: 'Niemowlak is Polish for an infant — literally "the one who does not yet speak". Drop the nie- ("not") and a mowlak is the one who starts to.'
		},
		parents: {
			heading: 'For parents',
			body: 'Mowlak is meant to be used together: you sit down, the child touches, the voice speaks. Before the phone lands in small hands, it helps to turn on screen pinning (Android) or Guided Access (iOS), so the home button will not end the fun. Settings hide behind a parent gate: hold the small mark in the corner for three seconds.'
		},
		free: {
			heading: 'Free, forever',
			body: 'Mowlak is a pro bono project — no ads, no subscriptions, no premium tier, open source. If it helps your family, telling someone about it is the best thanks.'
		}
	},
	privacy: {
		title: 'Privacy — Mowlak',
		description: 'Mowlak collects no data — none about you, none about your child.',
		heading: 'Privacy',
		lede: 'Mowlak collects no data — none about you, none about your child.',
		points: [
			'No accounts, no sign-in, no profiles.',
			'No analytics, no statistics, no cookies.',
			'The app talks to no external services; once installed it works entirely offline.',
			'The only thing it stores is settings (like the chosen level) — on your device and nowhere else.'
		],
		outro:
			"We do not ask for consent to process data because no data is processed. Mowlak's code is open — this can be verified.",
		stamp: 'As of: August 2026.'
	},
	app: {
		player: {
			picture: 'Listen',
			advance: 'Next card',
			gate: 'Parent settings — press and hold'
		},
		panel: {
			// The examples stay Polish: they name what the child will hear,
			// and the teaching content has only one language.
			title: 'For the parent',
			levelLegend: 'Level',
			levelOnomatopoeia: 'sounds (hau hau)',
			levelWord: 'words (piesek)',
			leave: 'Back to the site',
			close: 'Close'
		},
		trouble: 'The cards could not be loaded.',
		retry: 'Try again'
	}
};
