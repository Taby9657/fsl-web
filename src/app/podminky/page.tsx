import type { Metadata } from "next";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { Prose } from "@/components/prose";

export const metadata: Metadata = {
  title: "Podmínky použití",
  description: "Podmínky použití webu a aplikace Floorball Stars Ligy.",
};

export default function TermsPage() {
  return (
    <Page size="narrow">
      <PageTitle
        title="Podmínky použití"
        subtitle="Platné pro web fslleague.cz i mobilní aplikaci FSL · poslední aktualizace 21. 8. 2026"
      />
      <Prose>
        <h2>1. Úvodní ustanovení</h2>
        <p>
          Tyto podmínky upravují používání webu fslleague.cz a mobilní aplikace FSL, které
          slouží ke správě a prezentaci amatérské florbalové soutěže Floorball Stars Liga.
          Vytvořením účtu s podmínkami souhlasíte.
        </p>

        <h2>2. Účet</h2>
        <p>
          Účet vzniká přihlášením přes Google nebo Apple. Zavazujete se uvádět pravdivé údaje,
          zejména jméno, příjmení a číslo dresu. Jeden člověk smí mít pouze jeden účet. Účet je
          nepřenosný.
        </p>

        <h2>3. Role a oprávnění</h2>
        <ul>
          <li>
            <strong>Hráč</strong> — připojuje se k týmu pozvánkovým kódem, spravuje svůj profil
            a platí licenci.
          </li>
          <li>
            <strong>Vedoucí týmu</strong> — zakládá tým, spravuje soupisku, odesílá sestavy
            před zápasem a vyplňuje po-zápasové formuláře.
          </li>
          <li>
            <strong>Rozhodčí</strong> — po schválení supervisorem zapisuje průběh zápasu.
          </li>
          <li>
            <strong>Supervisor</strong> — spravuje ligu, schvaluje týmy a rozhodčí, generuje
            rozlosování a eviduje platby.
          </li>
        </ul>

        <h2>4. Poplatky</h2>
        <p>
          Účast v soutěži je zpoplatněna: hráčská licence, volitelná super licence pro hraní
          i za cizí týmy, registrační poplatek týmu a balíček zápasů, ze kterého se každý
          odehraný start odečítá. Aktuální výše je uvedena v sekci Platby po přihlášení.
          Uvedené ceny jsou konečné a nic se k nim nepřipočítává. Platby probíhají kartou
          nebo bankovním převodem s variabilním symbolem; cena je v obou případech stejná.
        </p>
        <p>
          Starty se hradí za každý odehraný zápas stejně. Z těchto plateb pořadatel
          hradí organizaci soutěže.
        </p>
        <p>
          Za nedostavení se k zápasu nebo nesehnání sestavy může pořadatel zápas kontumovat
          a předepsat týmu pokutu; její výše je uvedena v ceníku. Do jejího uhrazení nemusí
          být týmu umožněno nastoupit k dalšímu zápasu.
        </p>
        <p>
          Zaplacené poplatky se nevracejí. <strong>Nevyčerpané starty z balíčku ale
          nepropadají</strong> — přenášejí se do play-off a do následující sezóny, pokud si
          v ní hráč zaplatí licenci. Při odstoupení jednotlivce před zařazením do týmu se
          vrací startovné bez licence; licence se nevrací, protože platí celou sezónu.
          Zruší-li se zápas, start se nezapočítá a zůstává v balíčku.
        </p>

        <h2>5. Pravidla chování</h2>
        <p>
          Uživatelé se zavazují nevkládat urážlivý, hanlivý nebo nepravdivý obsah, nefalšovat
          zápisy ze zápasů a nezneužívat cizí účty. Porušení může vést k pozastavení účtu nebo
          vyloučení týmu ze soutěže.
        </p>

        <h2>6. Obsah nahrávaný uživateli</h2>
        <p>
          Za fotografie a videa nahraná do aplikace (profilové fotky, sestřihy do draftu,
          highlighty) odpovídá uživatel a prohlašuje, že k nim má práva. Pořadatel je oprávněn
          takový obsah zobrazovat v rámci prezentace ligy.
        </p>

        <h2>7. Dostupnost služby</h2>
        <p>
          Služba je poskytována „tak, jak je". Pořadatel neručí za nepřetržitou dostupnost ani
          za škody vzniklé výpadkem, chybou v zápisu nebo ztrátou dat.
        </p>

        <h2>8. Změny podmínek</h2>
        <p>
          Podmínky lze měnit; o podstatných změnách budou uživatelé informováni v aplikaci nebo
          e-mailem.
        </p>

        <h2>9. Provozovatel a kontakt</h2>
        <p>
          Provozovatelem Floorball Stars Ligy, webu fslleague.cz i mobilní aplikace FSL je 
          <strong>Ninety Three Group s.r.o.</strong>, IČO 29933455, se sídlem Roháčova 145/14, Žižkov, 130 00 Praha 3, zapsaná v obchodním
          rejstříku pod spisovou značkou C 454702 vedená u Městského soudu v Praze.
        </p>
        <p>
          Kontaktní e-mail: <a href="mailto:info@fslleague.cz">info@fslleague.cz</a>
        </p>
      </Prose>
    </Page>
  );
}
