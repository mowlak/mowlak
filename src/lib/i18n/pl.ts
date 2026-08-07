import type { Strings } from './types';

// Polish is the first market and the language of the teaching content, so
// it is written first and English is translated from it.
export const pl: Strings = {
	landing: {
		lede: 'Spokojna aplikacja do nauki mówienia dla najmłodszych.',
		open: 'Otwórz aplikację'
	},
	app: {
		player: {
			picture: 'Posłuchaj',
			advance: 'Następna karta',
			gate: 'Ustawienia dla rodzica — przytrzymaj'
		},
		panel: {
			title: 'Dla rodzica',
			levelLegend: 'Poziom',
			levelOnomatopoeia: 'dźwięki (hau hau)',
			levelWord: 'słowa (pies)',
			leave: 'Wróć na stronę',
			close: 'Zamknij'
		},
		trouble: 'Nie udało się wczytać kart.',
		retry: 'Spróbuj ponownie'
	}
};
