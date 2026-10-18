# Film Roulette

Aplikacja Node.js z dwiema stronami: Film Roulette oraz Session Helper. Film Roulette losuje kategorie i wyświetla propozycje filmów dla wybranej kategorii.

## Uruchomienie lokalne

Wymagany jest Node.js 20 lub nowszy.

```powershell
npm start
```

Strony będą dostępne domyślnie pod adresami:

- Film Roulette: `http://localhost:8000/film_roulette/`
- Sesja: `http://localhost:8000/session_helper/`

Adres główny (`http://localhost:8000`) otwiera Film Roulette. Obie strony korzystają ze wspólnego arkusza stylów w katalogu głównym.

## Wdrożenie na Railway

1. Umieść projekt w repozytorium GitHub.
2. W panelu Railway wybierz **New Project** → **Deploy from GitHub repo**.
3. Wskaż repozytorium z tym projektem.
4. Railway odczyta ustawienia z `railway.json`, zbuduje projekt przez Railpack i uruchomi `npm start`.
5. W ustawieniach usługi otwórz **Networking** i wybierz **Generate Domain**.

Nie trzeba ręcznie ustawiać zmiennej `PORT` — Railway wstrzykuje ją automatycznie, a serwer już z niej korzysta.

Endpoint `/health` służy Railway do sprawdzenia, czy nowa wersja aplikacji uruchomiła się prawidłowo.

## Pliki wdrożeniowe

- `film_roulette/` — strona Film Roulette oraz jej skrypt i dane kategorii,
- `session_helper/` — strona ustawień sesji oraz jej skrypt,
- `styles.css` — wspólne style obu stron,
- `server.js` — serwer i endpointy API,
- `railway.json` — konfiguracja budowania, uruchamiania i healthchecku,
- `package.json` — komenda startowa i wymagana wersja Node.js,
- `.gitignore` — pliki pomijane przez Git i wdrożenie.
