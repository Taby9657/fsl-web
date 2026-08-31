import type { Metadata } from "next";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { Prose } from "@/components/prose";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů",
  description:
    "Zásady ochrany osobních údajů Floorball Stars Ligy — jaké údaje zpracováváme a proč.",
};

export default function PrivacyPage() {
  return (
    <Page size="narrow">
      <PageTitle
        title="Zásady ochrany osobních údajů"
        subtitle="Floorball Stars Liga (web fslleague.cz a mobilní aplikace FSL) · poslední aktualizace 21. 8. 2026"
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
          <li>e-mailová adresa (z přihlášení přes Google nebo Apple),</li>
          <li>jméno a příjmení zadané při registraci,</li>
          <li>číslo dresu, pozice, datum narození a telefon (dobrovolné údaje hráče),</li>
          <li>profilová fotografie a logo týmu, pokud je nahrajete,</li>
          <li>herní statistiky — góly, asistence, tresty, účast v zápasech,</li>
          <li>
            u rozhodčích navíc adresa, rodné číslo a bankovní spojení — výhradně pro výplatu
            odměn za odřízené zápasy,
          </li>
          <li>
            stav plateb licencí a registračních poplatků včetně variabilního symbolu,
          </li>
          <li>push token zařízení pro zasílání notifikací (jen v mobilní aplikaci).</li>
        </ul>

        <h2>3. Účel a právní základ</h2>
        <p>
          Údaje zpracováváme pro plnění smlouvy o účasti v lize (evidence hráčů, soupisek a
          výsledků), pro oprávněný zájem na fungování soutěže a pro plnění právních povinností
          souvisejících s vyplácením odměn rozhodčím. Zasílání notifikací je dobrovolné a lze
          jej kdykoli vypnout.
        </p>

        <h2>4. Veřejně dostupné údaje</h2>
        <p>
          Jméno, příjmení, číslo dresu, pozice, tým a herní statistiky hráčů jsou veřejně
          viditelné na webu i v aplikaci — jde o standardní součást sportovní soutěže.
          Kontaktní údaje, datum narození, rodné číslo ani bankovní spojení veřejné nejsou.
        </p>

        <h2>5. Předávání třetím stranám</h2>
        <p>
          Osobní údaje neprodáváme a nesdílíme pro komerční účely. Využíváme tyto zpracovatele:
        </p>
        <ul>
          <li>Google a Apple — přihlášení (OAuth),</li>
          <li>Railway — provoz serveru a databáze,</li>
          <li>Vercel — provoz webu,</li>
          <li>Cloudinary — ukládání fotek a videí,</li>
          <li>Stripe — zpracování online plateb kartou,</li>
          <li>Sentry — sledování chyb aplikace.</li>
        </ul>

        <h2>6. Doba uchování</h2>
        <p>
          Údaje uchováváme po dobu aktivního účtu a dále po dobu nezbytnou pro historii
          soutěže. Na požádání účet i osobní údaje smažeme — herní statistiky mohou zůstat v
          anonymizované podobě.
        </p>

        <h2>7. Zabezpečení</h2>
        <p>
          Veškerá komunikace probíhá přes HTTPS. Hesla neukládáme, přihlášení je výhradně přes
          Google nebo Apple. Přístup k citlivým údajům rozhodčích má pouze supervisor ligy.
        </p>

        <h2>8. Vaše práva</h2>
        <p>
          Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování a na
          přenositelnost. Žádosti posílejte na{" "}
          <a href="mailto:info@fslleague.cz">info@fslleague.cz</a>. Máte také právo
          podat stížnost u Úřadu pro ochranu osobních údajů.
        </p>
      </Prose>
    </Page>
  );
}
