import type { Metadata } from "next";
import { sdileni } from "@/lib/og";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { Prose } from "@/components/prose";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů",
  description:
    "Zásady ochrany osobních údajů Floorball Stars Ligy — jaké údaje zpracováváme a proč.",
  ...sdileni({
    title: "Ochrana osobních údajů — Floorball Stars Liga",
    description:
      "Jaké údaje Floorball Stars Liga sbírá, proč je sbírá a kdo je zpracovává.",
    path: "/ochrana-osobnich-udaju",
  }),
};

export default function PrivacyPage() {
  return (
    <Page size="narrow">
      <PageTitle
        title="Zásady ochrany osobních údajů"
        subtitle="Floorball Stars Liga (web fslleague.cz a mobilní aplikace FSL) · poslední aktualizace 18. 9. 2026"
      />
      <Prose>
        <h2>1. Správce údajů</h2>
        <p>
          Správcem osobních údajů je <strong>Ninety Three Group s.r.o.</strong>, IČO 29933455, se sídlem 
          Roháčova 145/14, Žižkov, 130 00 Praha 3, zapsaná v obchodním rejstříku pod spisovou značkou C 454702 vedená u Městského soudu v Praze.
        </p>
        <p>
          Kontaktní e-mail: <a href="mailto:info@fslleague.cz">info@fslleague.cz</a>.
        </p>

        <h2>2. Jaké údaje zpracováváme</h2>
        <p>Zpracováváme pouze údaje nezbytné pro provoz florbalové ligy:</p>
        <ul>
          <li>e-mailová adresa (ze zakládání účtu nebo z přihlášení přes Google či Apple),</li>
          <li>heslo v podobě nevratného otisku, pokud si účet zakládáte e-mailem,</li>
          <li>jméno a příjmení zadané při registraci,</li>
          <li>
            <strong>datum narození — povinný údaj</strong>, slouží k ověření věkové hranice
            18 let,
          </li>
          <li>číslo dresu, pozice a telefon (dobrovolné údaje hráče),</li>
          <li>profilová fotografie a logo týmu, pokud je nahrajete,</li>
          <li>herní statistiky — góly, asistence, tresty, účast v zápasech,</li>
          <li>
            u rozhodčích navíc adresa, rodné číslo a bankovní spojení — výhradně pro výplatu
            odměn za odřízené zápasy,
          </li>
          <li>
            stav plateb licencí a registračních poplatků včetně variabilního symbolu,
          </li>
          <li>
            fotografie a videozáznamy ze zápasů, na kterých můžete být zachyceni —
            pouze pokud jste k tomu dali souhlas (viz bod 5),
          </li>
          <li>
            záznam o udělených souhlasech — co, kdy a jaké znění jste odsouhlasili,
          </li>
          <li>push token zařízení pro zasílání notifikací (jen v mobilní aplikaci).</li>
        </ul>

        <h2>3. Účel a právní základ</h2>
        <p>
          Údaje zpracováváme pro plnění smlouvy o účasti v lize (evidence hráčů, soupisek a
          výsledků), pro <strong>ověření věkové hranice 18 let</strong>, pro oprávněný zájem
          na fungování soutěže a pro plnění právních povinností souvisejících s vyplácením
          odměn rozhodčím. Zasílání notifikací je dobrovolné a lze jej kdykoli vypnout.
        </p>
        <p>
          Na <strong>souhlasu</strong> (čl. 6 odst. 1 písm. a GDPR) stojí jen dvě věci:
          zveřejňování fotografií a videí ze zápasů k propagaci ligy (bod 5) a zasílání
          e-mailů o dění v lize. Obojí je dobrovolné, účast v soutěži na tom nezávisí
          a souhlas lze kdykoli odvolat — odvolání nemá vliv na zpracování do té doby.
        </p>

        <h2>4. Veřejně dostupné údaje</h2>
        <p>
          Jméno, příjmení, číslo dresu, pozice, tým a herní statistiky hráčů jsou veřejně
          viditelné na webu i v aplikaci — jde o standardní součást sportovní soutěže.
          Kontaktní údaje, datum narození, rodné číslo ani bankovní spojení veřejné nejsou.
        </p>

        <h2>5. Fotografie a videa ze zápasů</h2>
        <p>
          Ze zápasů pořizujeme fotografie a videozáznamy a zveřejňujeme je na webu,
          v aplikaci a na sociálních sítích ligy (Instagram, Facebook) za účelem
          propagace soutěže. Děje se tak <strong>pouze na základě vašeho souhlasu</strong>,
          který udělujete v přihlášce do ligy a který zároveň představuje svolení
          s užitím podobizny podle § 84 a násl. občanského zákoníku.
        </p>
        <p>
          Souhlas je dobrovolný — <strong>bez něj hrát můžete</strong> a přihlášku to
          nijak neovlivní. Odvolat ho lze kdykoli e-mailem na{" "}
          <a href="mailto:info@fslleague.cz">info@fslleague.cz</a> nebo přes formulář
          &bdquo;Napsat nám&ldquo;. Po odvolání přestaneme nové záběry zveřejňovat a už zveřejněné
          na požádání stáhneme z vlastních kanálů; u obsahu, který mezitím sdílel někdo
          další, to zaručit nemůžeme.
        </p>
        <p>
          Záznamy ukládáme u zpracovatele Cloudinary (viz bod 6). Bez souhlasu je
          nepoužíváme k propagaci; pokud se objevíte na záběru ze zápasu jako součást
          dění na hřišti a souhlas jste nedali, takový záběr nezveřejníme nebo vás
          v něm znečitelníme.
        </p>

        <h2>6. Předávání třetím stranám</h2>
        <p>
          Osobní údaje neprodáváme a nesdílíme pro komerční účely. Využíváme tyto zpracovatele:
        </p>
        <ul>
          <li>Google a Apple — přihlášení (OAuth),</li>
          <li>Railway — provoz serveru a databáze,</li>
          <li>Vercel — provoz webu,</li>
          <li>Cloudinary — ukládání fotek a videí,</li>
          <li>Stripe — zpracování online plateb kartou,</li>
          <li>Resend — odesílání e-mailů (obnova hesla, oznámení z ligy),</li>
          <li>Sentry — sledování chyb aplikace,</li>
          <li>
            Meta Platforms Ireland — měření účinnosti reklam, jen s vaším
            souhlasem (viz oddíl 7).
          </li>
        </ul>

        <h2>7. Cookies a měření návštěvnosti</h2>
        <p>
          Web měří návštěvnost dvěma nástroji, které <strong>nepoužívají cookies
          ani neukládají nic do vašeho prohlížeče</strong> a nepotřebují proto
          váš souhlas: Vercel Analytics (počty návštěv a odkud přišly)
          a vlastní měření průchodu přihláškou, které si drží jen náhodné číslo
          platné po dobu otevřené stránky a neukládá nic z vyplněných polí.
        </p>
        <p>
          Nad rámec toho používáme <strong>Meta Pixel</strong> — měří, kolik lidí
          přišlo z našich reklam na Facebooku a Instagramu a kolik z nich se
          přihlásilo do ligy. Ukládá do prohlížeče cookie <code>_fbp</code>
          a předává společnosti Meta vaši IP adresu, adresu navštívené stránky
          a informaci o tom, zda jste dokončili přihlášku. Pixel se spouští
          <strong> až poté, co k tomu dáte souhlas</strong> na liště ve spodní
          části webu; bez souhlasu se nenačte vůbec a web funguje stejně.
        </p>
        <p>
          Právním základem je váš souhlas (čl. 6 odst. 1 písm. a) GDPR). Souhlas
          můžete kdykoli odvolat — smazáním dat webu v nastavení prohlížeče se
          uložená volba zruší a lišta se zeptá znovu. Meta zpracovává tyto údaje
          jako samostatný správce pro účely měření a cílení reklamy; podrobnosti
          jsou v jejích zásadách ochrany soukromí.
        </p>

        <h2>8. Doba uchování</h2>
        <p>
          Údaje uchováváme po dobu aktivního účtu a dále po dobu nezbytnou pro historii
          soutěže. Na požádání účet i osobní údaje smažeme — herní statistiky mohou zůstat v
          anonymizované podobě.
        </p>

        <h2>9. Zabezpečení</h2>
        <p>
          Veškerá komunikace probíhá přes HTTPS. Hesla neukládáme v čitelné podobě, ale
          výhradně jako nevratný otisk; přihlásit se lze i přes Google nebo Apple. Přístup
          k citlivým údajům rozhodčích má pouze supervisor ligy.
        </p>

        <h2>10. Vaše práva</h2>
        <p>
          Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování a na
          přenositelnost. Žádosti posílejte na{" "}
          <a href="mailto:info@fslleague.cz">info@fslleague.cz</a>. Máte také právo odvolat udělené souhlasy a
          podat stížnost u Úřadu pro ochranu osobních údajů.
        </p>
      </Prose>
    </Page>
  );
}
