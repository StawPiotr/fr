# Film Roulette

Aplikacja Node.js losująca kategorie i wyświetlająca propozycje filmów dla wybranej kategorii.

## Uruchomienie lokalne

Wymagany jest Node.js 20 lub nowszy.

```powershell
npm start
```

Strona będzie dostępna domyślnie pod adresem `http://localhost:8000`.

## Wdrożenie na Railway

1. Umieść projekt w repozytorium GitHub.
2. W panelu Railway wybierz **New Project** → **Deploy from GitHub repo**.
3. Wskaż repozytorium z tym projektem.
4. Railway odczyta ustawienia z `railway.json`, zbuduje projekt przez Railpack i uruchomi `npm start`.
5. W ustawieniach usługi otwórz **Networking** i wybierz **Generate Domain**.

Nie trzeba ręcznie ustawiać zmiennej `PORT` — Railway wstrzykuje ją automatycznie, a serwer już z niej korzysta.

Endpoint `/health` służy Railway do sprawdzenia, czy nowa wersja aplikacji uruchomiła się prawidłowo.

## Pliki wdrożeniowe

- `railway.json` — konfiguracja budowania, uruchamiania i healthchecku,
- `package.json` — komenda startowa i wymagana wersja Node.js,
- `.gitignore` — pliki pomijane przez Git i wdrożenie.
