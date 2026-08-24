# FSL Web — fslleague.cz

Webová aplikace Floorball Stars Ligy. Plná funkční parita s mobilní aplikací
(`fsl-mobile`) + veřejná SEO část pro fanoušky. Komunikuje se stejným backendem
(`fsl-backhand`) jako mobilní aplikace.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** — design tokeny převzaté z mobilní aplikace
- **TanStack Query** — server state, polling živých zápasů
- **Zustand** — auth store
- **axios** — API klient s českými chybovými hláškami
- **Google Identity Services** — přihlášení

## Rychlý start

```bash
npm install
cp .env.example .env.local     # vyplň API URL a Google Client ID
npm run dev                    # http://localhost:3000
```

### Vývoj bez produkčního backendu

V repozitáři je jednoduchý mock API server s testovacími daty (týmy, hráči,
zápasy, statistiky, draft, platby, administrace):

```bash
cd mock-api && npm install && node server.js   # http://localhost:4000/api
```

a v `.env.local` nastav `NEXT_PUBLIC_API_URL=http://localhost:4000/api`.
Volitelně `NEXT_PUBLIC_DEV_LOGIN=1` zobrazí na přihlašovací stránce tlačítko
„Testovací přihlášení".

## Proměnné prostředí

| Proměnná | Popis |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL backendu včetně `/api` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth **Web** Client ID (musí být povolený i na backendu jako `GOOGLE_WEB_CLIENT_ID`) |
| `NEXT_PUBLIC_DEV_LOGIN` | `1` = zobrazí testovací přihlášení (jen pro lokální vývoj) |

## Typografie

Web používá **Inter** (variabilní řez, optical sizing) načítaný z Google Fonts přes
`<link>` v `layout.tsx`. Systémové písmo slouží jako okamžitý fallback, takže text je
čitelný i než se Inter stáhne.

Pomocné třídy v `globals.css`:

- `.tabular` — číslice stejné šířky (tabulky, skóre, statistiky)
- `.num-display` — velká čísla se sevřenějším prostrkáním
- `.label-caps` — kapitálkové popisky sekcí s volnějším prostrkáním

Pokud bys chtěl nulové externí requesty, dá se Inter self-hostovat přes
`next/font/local` — stáhnout `.woff2` řezy do `src/app/fonts/` a nahradit `<link>`.

## Struktura

```
src/
├── app/
│   ├── (veřejné)     tabulka, zapasy, statistiky, tymy, hraci, rozhodci,
│   │                 pavouk, porovnani, hledat, aktuality, aplikace, právní
│   ├── prihlaseni    Google Sign-In
│   ├── registrace    onboarding (hráč / vedoucí / rozhodčí)
│   ├── muj-ucet      rozcestník podle rolí
│   ├── muj-profil, nastaveni, oznameni, platby, zadost
│   ├── draft         draft pool, karta hráče, vlastní profil
│   ├── tym/          soupiska, pozvánka, sestava, po-zápasový formulář
│   ├── zapasy/[id]/skore   live scoring pro rozhodčí
│   └── admin/        dashboard, týmy, zápasy, rozlosování, rozhodčí,
│                     platby, aktuality, žádosti
├── components/       UI knihovna (karty, chipy, modály, skeletony, toasty)
├── hooks/            divize, sezóny, stav v URL
├── lib/              API klient, typy, formátování, validace
└── store/            auth (role hráč / vedoucí / rozhodčí / supervisor)
```

## Přehled rolí

| Role | Odvození | Přístup |
|---|---|---|
| Host | nepřihlášen | veřejná část |
| Hráč | `user.player` | profil, platby, draft, oznámení |
| Vedoucí | `user.manager.length > 0` | soupiska, pozvánka, sestavy, po-zápas |
| Rozhodčí | `user.referee` | nasazení, profil, live scoring |
| Supervisor | `user.player.isSupervisor` | celá administrace |

Role jsou aditivní — jeden účet může mít všechny současně. Klientské kontroly
jsou jen UX vrstva, oprávnění vynucuje backend.

## Nasazení

Viz [DEPLOY.md](./DEPLOY.md).
