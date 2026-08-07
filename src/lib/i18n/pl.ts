import type { Strings } from './types';

// Polish is the first market and the language of the teaching content, so
// it is written first and English is translated from it.
export const pl: Strings = {
	footer: {
		privacy: 'Prywatność',
		source: 'Kod źródłowy'
	},
	landing: {
		title: 'Mowlak — nauka mówienia dla najmłodszych',
		description:
			'Spokojna aplikacja do nauki mówienia dla najmłodszych. Bez reklam, bez nagród, bez pośpiechu. Za darmo, na zawsze.',
		tagline: 'Od niemowlaka do mowlaka.',
		lede: 'Spokojna aplikacja do nauki mówienia dla najmłodszych. Dziecko dotyka obrazka, ciepły głos mówi „hau hau” — a kiedy przyjdzie pora, także „pies”. Bez reklam, bez nagród, bez pośpiechu. Za darmo, na zawsze.',
		// A Polish reader is already holding the language the cards teach.
		note: null,
		open: 'Otwórz aplikację',
		calm: {
			heading: 'Dlaczego tak cicho?',
			intro:
				'Aplikacje dla maluchów prześcigają się w animacjach, dźwiękach i nagrodach. Logopedzi od lat powtarzają, że to przeszkadza, a nie pomaga: przebodźcowane dziecko przestaje słuchać. Mowlak działa odwrotnie.',
			pledges: [
				{
					claim: 'Jedna rzecz na ekranie.',
					detail: 'Nic nie miga, nic nie wyskakuje, nie ma czego przewijać.'
				},
				{
					claim: 'Głos mówi do końca.',
					detail:
						'Podczas odtwarzania stuknięcia nic nie robią — dźwięk wybrzmiewa, zanim cokolwiek się zmieni.'
				},
				{
					claim: 'Żadnych gwiazdek ani fanfar.',
					detail: 'Nagrodą jest mówienie.'
				},
				{
					claim: 'Zero reklam, zero śledzenia.',
					detail: 'Nic nie wychodzi z telefonu.'
				}
			]
		},
		how: {
			heading: 'Jak to działa?',
			body: 'Najpierw wyrażenia dźwiękonaśladowcze — w polskiej logopedii to klasyczna droga do pierwszych słów, bo „hau hau” jest łatwiejsze niż „pies”. Dziecko ogląda obrazek, słyszy ciepły ludzki głos — nie efekt dźwiękowy — i powtarza, kiedy samo zechce. Bez sprawdzania, bez oceniania. Gdy maluch jest gotowy, rodzic przełącza poziom na całe słowa.'
		},
		// Niemowlak and mowlak explain themselves to anyone reading this page
		// in Polish.
		name: null,
		parents: {
			heading: 'Dla rodziców',
			body: 'Mowlak jest do używania razem: siadacie, dziecko dotyka, głos mówi. Zanim telefon trafi w małe ręce, warto włączyć przypinanie ekranu (Android) albo Dostęp nadzorowany (iOS) — wtedy przycisk ekranu głównego nie przerwie zabawy. Ustawienia są schowane za bramką dla rodzica: wystarczy przytrzymać znaczek w rogu przez trzy sekundy.'
		},
		free: {
			heading: 'Za darmo, na zawsze',
			body: 'Mowlak to projekt pro bono — bez reklam, subskrypcji i wersji premium, z otwartym kodem. Jeśli wam pomaga, najlepszym podziękowaniem jest powiedzenie o nim komuś.'
		}
	},
	privacy: {
		title: 'Prywatność — Mowlak',
		description: 'Mowlak nie zbiera żadnych danych — ani o tobie, ani o dziecku.',
		heading: 'Prywatność',
		lede: 'Mowlak nie zbiera żadnych danych — ani o tobie, ani o dziecku.',
		points: [
			'Nie ma kont, logowania ani profili.',
			'Nie ma analityki, statystyk ani cookies.',
			'Aplikacja nie łączy się z żadnymi zewnętrznymi serwisami; po zainstalowaniu działa w całości bez internetu.',
			'Jedyne, co zapisuje, to ustawienia (na przykład wybrany poziom) — na twoim urządzeniu i tylko tam.'
		],
		outro:
			'Nie pytamy o zgodę na przetwarzanie danych, bo żadnych danych nie przetwarzamy. Kod Mowlaka jest otwarty — można to sprawdzić.',
		stamp: 'Stan na: sierpień 2026.'
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
