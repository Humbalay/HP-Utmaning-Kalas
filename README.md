# HP-Ord utmaning

En enkel lokal prototyp inspirerad av Högskoleprovets ORD-del.

## Starta

Eftersom webbläsare normalt blockerar `fetch()` från lokala filer bör projektet köras via en liten lokal webbserver.

### Alternativ 1: Python

1. Öppna Terminal/Kommandotolken i den här mappen.
2. Kör:

```bash
python -m http.server 8000
```

3. Öppna `http://localhost:8000` i webbläsaren.

### Alternativ 2: VS Code

Installera tillägget **Live Server**, högerklicka på `index.html` och välj **Open with Live Server**.

## Filer

- `index.html` — appens struktur
- `style.css` — design
- `app.js` — spellogik
- `questions.json` — ord och svarsalternativ

## Ändra frågor

Lägg till objekt i `questions.json` enligt formatet:

```json
{
  "word": "exempelord",
  "options": ["rätt svar", "fel svar", "fel svar", "fel svar"],
  "correct": 0
}
```

`correct` är indexet för rätt alternativ och börjar på 0.


## Nya funktioner

- 90 sekunders speltid
- Lokal topplista med namn
- Resultaten sparas i webbläsarens localStorage
- Bakåtpil för att lämna en pågående utmaning


## Version 4

- Horisontell resultatsida med topplistan till höger
- Tillbaka-knapp från resultatsidan
- PIN-skyddad redigering av topplistan från startsidan
- Kod för redigering: 19966
- Möjlighet att ta bort enskilda resultat eller nollställa hela topplistan


## Version 5

- Kodfältet är nu maskerat
- Resultatrubriken visar ett slumpmässigt svenskt ord efter varje omgång
- Orden hämtas från en inbyggd lista för att appen ska fungera helt offline
