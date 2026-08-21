import { Page } from "@/components/layout/container";
import { LinkButton } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Page size="narrow">
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <span className="text-6xl font-black text-go">404</span>
        <h1 className="text-2xl font-bold text-wh">Stránka nenalezena</h1>
        <p className="max-w-sm text-[15px] text-mu">
          Odkaz je nejspíš zastaralý nebo záznam už v lize neexistuje.
        </p>
        <LinkButton href="/" className="mt-2">
          Zpět na úvod
        </LinkButton>
      </div>
    </Page>
  );
}
