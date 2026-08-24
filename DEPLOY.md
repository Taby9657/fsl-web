# Nasazení webu na fslleague.cz

Web běží na **Vercelu**, doména `fslleague.cz` je registrovaná u **Českého hostingu**.
Český hosting nabízí jen PHP + MariaDB, proto na něm Next.js běžet nemůže — doména se
proto pouze nasměruje DNS záznamy na Vercel. Registraci domény ani e-maily to nijak
neovlivní.

---

## 1. Nahrání kódu na GitHub

```bash
cd fsl-web
git init
git add .
git commit -m "FSL web – kompletní webová aplikace"
git branch -M main
git remote add origin https://github.com/Taby9657/fsl-web.git
git push -u origin main
```

Repozitář `fsl-web` si nejdřív vytvoř na github.com (může být i privátní).

---

## 2. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import repozitáře `fsl-web`.
2. Framework se detekuje automaticky (Next.js), build command i output nech výchozí.
3. **Environment Variables** → přidej pro *Production* i *Preview*:

```
NEXT_PUBLIC_API_URL=https://fsl-backhand-production.up.railway.app/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=485204684397-f5paghu6a59s4vq02jpqeil3l1mje677.apps.googleusercontent.com
```

> `NEXT_PUBLIC_DEV_LOGIN` na produkci **nenastavuj** — je to obejití přihlášení.

4. **Deploy.** Web poběží na `fsl-web-xxx.vercel.app`.

---

## 3. Doména fslleague.cz

### Na Vercelu
Project → **Settings → Domains** → přidej `fslleague.cz` i `www.fslleague.cz`.
Vercel zobrazí požadované DNS záznamy.

### V Českém hostingu
Klientská sekce → doména `fslleague.cz` → **DNS záznamy**. Nastav:

| Typ | Název | Hodnota |
|---|---|---|
| A | `@` (kořen domény) | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

> Přesné hodnoty vždy zkontroluj podle toho, co ukáže Vercel — může se lišit.
> Pokud je doména „zaparkovaná", parkování nejdřív zruš, jinak se DNS záznamy neprojeví.

Propsání DNS trvá typicky desítky minut až pár hodin. HTTPS certifikát (Let's Encrypt)
vystaví Vercel automaticky.

---

## 4. Úpravy backendu na Railway (nutné!)

Bez těchto dvou proměnných web nebude fungovat — prohlížeč zablokuje odpovědi kvůli CORS
a přihlášení přes Google selže.

Railway → služba `fsl-backhand` → **Variables**:

```
CLIENT_URL=https://fslleague.cz
GOOGLE_WEB_CLIENT_ID=485204684397-f5paghu6a59s4vq02jpqeil3l1mje677.apps.googleusercontent.com
BANK_IBAN=CZ6508000000192000145399
BANK_BIC=GIBACZPX
```

> ⚠️ **`CLIENT_URL` musí být jediná adresa, ne seznam oddělený čárkami.** Backend ji
> používá nejen pro CORS, ale i jako základ návratových adres Stripe
> (`${CLIENT_URL}/payment-success`, `${CLIENT_URL}/payments`). Se seznamem by vznikla
> rozbitá URL a platba kartou by se nevrátila zpět na web. Proto na Vercelu nastav
> `www.fslleague.cz` jako **redirect na `fslleague.cz`** (Settings → Domains → u www zvol
> „Redirect to fslleague.cz") — pak stačí jedna adresa i pro CORS.

> `BANK_IBAN` a `BANK_BIC` jsou potřeba pro QR platby. Bez nich endpoint
> `/payments/qr/...` skončí chybou a na webu se nezobrazí údaje k převodu.

Po uložení službu **restartuj** (Deployments → Redeploy).

---

## 5. Google Cloud Console

[console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services →
Credentials** → OAuth 2.0 Client ID typu **Web**:

- **Authorized JavaScript origins:**
  - `https://fslleague.cz`
  - `https://www.fslleague.cz`
  - `http://localhost:3000` (pro vývoj)

Bez toho se tlačítko „Přihlásit se přes Google" nezobrazí.

---

## 6. Kontrolní seznam po nasazení

- [ ] `https://fslleague.cz` se načte s HTTPS
- [ ] Tabulka a zápasy zobrazují reálná data z Railway
- [ ] Přihlášení přes Google funguje a vrátí uživatele s rolí
- [ ] Supervisor vidí `/admin` a data se načítají
- [ ] `https://fslleague.cz/sitemap.xml` a `/robots.txt` odpovídají
- [ ] Živý zápas se na `/zapasy` sám aktualizuje (polling 10 s)

---

## Platby — jak to na webu funguje

| Platba | Kartou (Stripe) | Převodem + QR |
|---|---|---|
| Hráčská licence 300 Kč | ✅ | ✅ |
| Super licence 300 Kč | ✅ | ✅ |
| Registrace týmu 10 000 Kč | — (backend nemá endpoint) | ✅ |
| Domácí zápas 2 200 Kč | ✅ | ✅ (viz upozornění níže) |

QR kódy se generují **přímo v prohlížeči** (knihovna `qrcode`), formát SPAYD, takže web
nezávisí na žádné externí QR službě. Platební údaje (IBAN, variabilní symbol, částka,
zpráva) si web bere z backendového endpointu `/payments/qr/:type/:id`, který zároveň
variabilní symbol přidělí, pokud ho platba ještě nemá.

Web má stránku `/payment-success` (kam se Stripe vrací po zaplacení) a `/payments`
přesměrovává na `/platby` (tam Stripe míří při zrušení platby).

### ⚠️ Dvě slabá místa v párování plateb na backendu

Při procházení `fsl-backhand` jsem narazil na dvě věci, které stojí za opravu — týkají se
**jen párování příchozích převodů**, kartou vše funguje:

1. **Super licence sdílí variabilní symbol s běžnou licencí.** `PlayerPayment` má jediný
   sloupec `variableSymbol`. Když už má hráč VS s prefixem `1` (licence), vrátí
   `ensurePlayerVS(id, 'SUPER_LICENSE')` ten stejný symbol. Funkce `inferPlayerPaymentType`
   pak podle prefixu `1` platbu započítá jako běžnou licenci, i když jde o super licenci.

2. **Poplatek za domácí zápas sdílí VS s registrací týmu.** `TeamPayment` má také jediný
   `variableSymbol` a `matchTransaction()` umí spárovat pouze `TEAM_REG`. Převod na 2 200 Kč
   se buď zamítne jako „nedostatečná částka" (2 200 < 10 000), nebo — pokud je registrace
   nezaplacená — nesprávně sníží dluh za registraci.

**Doporučená oprava:** přidat do `PlayerPayment` samostatný `superVariableSymbol` a do
`TeamPayment` `homeFeeVariableSymbol` (obojí `@unique`), generovat je s prefixy `2` a `4`
a v `matchTransaction()` je hledat zvlášť. Do té doby doporuč hráčům platit super licenci
a domácí zápasy **kartou**, kde je přiřazení jednoznačné přes Stripe metadata.

---

## Co ještě zbývá dořešit

**Přihlášení přes Apple na webu.** Backend v `verifyAppleToken` ověřuje audience proti
jediné hodnotě `APPLE_CLIENT_ID` (`cz.fsl.app`). Web ale potřebuje **Services ID**
(např. `cz.fsl.web`), takže by token neprošel. Řešení:

1. V Apple Developer účtu vytvořit Services ID a povolit u něj doménu `fslleague.cz`.
2. V `fsl-backhand/src/routes/auth.js` upravit `audience` na pole:
   ```js
   audience: [process.env.APPLE_CLIENT_ID, process.env.APPLE_WEB_CLIENT_ID].filter(Boolean),
   ```
3. Na Railway přidat `APPLE_WEB_CLIENT_ID`.

Do té doby web nabízí přihlášení přes Google (a v mobilní aplikaci zůstává Apple i Google).

**Push notifikace na webu.** Aplikace používá Expo push. Web zatím notifikace pouze
zobrazuje v sekci Oznámení; web push by vyžadoval service worker a nový endpoint na
backendu.
