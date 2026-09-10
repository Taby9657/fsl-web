"use client";

/**
 * Košík — jedna platba za všechny poplatky naráz.
 *
 * Sedí nahoře na Platbách, protože je to jediné místo, odkud se doopravdy
 * platí. Karty pod ním do košíku jen přidávají.
 */

import { ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { errMsg, paymentsApi } from "@/lib/api";
import { czk } from "@/lib/format";
import { Button, Card, SectionTitle } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useCart, useCartActions } from "./cart";
import { TransferSection } from "./payments-client";

export function CartSection() {
  const cart = useCart();
  const { odebrat } = useCartActions();
  const [platim, setPlatim] = useState(false);
  const [prevod, setPrevod] = useState<string | null>(null);

  const items = cart.data?.items ?? [];
  if (items.length === 0) return null;

  async function zaplatit() {
    setPlatim(true);
    try {
      const res = await paymentsApi.cartCheckout();
      if (res.data?.url) window.location.assign(res.data.url);
      else toast.error("Chyba platby", "Server nevrátil platební odkaz.");
    } catch (e) {
      toast.error("Chyba platby", errMsg(e));
    } finally {
      setPlatim(false);
    }
  }

  return (
    <>
      <SectionTitle className="mt-2">Košík</SectionTitle>
      <Card className="mb-6 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-go/15 text-go">
            <ShoppingCart size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-wh">
              {items.length} {items.length === 1 ? "položka" : items.length < 5 ? "položky" : "položek"}
            </p>
            <p className="text-[12px] text-mu">Jedna platba místo několika</p>
          </div>
          <span className="tabular shrink-0 text-[20px] font-bold text-wh">
            {czk(cart.data?.total ?? 0)}
          </span>
        </div>

        <div className="mt-4 divide-y divide-bd border-t border-bd">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-wh">{i.label}</p>
                <p className="truncate text-[12px] text-mu">
                  {i.team?.name
                    ? i.team.name
                    : i.zaJineho && i.player
                      ? `za ${i.player.firstName} ${i.player.lastName}`
                      : (i.season ?? "")}
                </p>
              </div>
              <span className="tabular shrink-0 text-[14px] font-medium text-wh">
                {czk(i.amount)}
              </span>
              <button
                onClick={() => odebrat.mutate(i.id)}
                disabled={odebrat.isPending}
                aria-label={`Odebrat ${i.label}`}
                className="shrink-0 cursor-pointer rounded-lg p-1.5 text-mu transition-colors hover:bg-c2 hover:text-red disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <Button className="mt-4 w-full" loading={platim} onClick={zaplatit}>
          Zaplatit {czk(cart.data?.total ?? 0)} kartou
        </Button>

        {/* Převod je pro ligu zdarma, karta ne — proto to tady stojí. */}
        {cart.data?.id ? (
          <TransferSection
            id="cart"
            type="cart"
            entityId={cart.data.id}
            fallbackAmount={cart.data.total}
            fallbackMsg="FSL platba"
            open={prevod}
            onToggle={setPrevod}
          />
        ) : null}

        <p className="mt-3 text-[12px] leading-5 text-mu">
          Převodem je platba bez poplatku. U karty si platební brána bere pevnou
          částku z každé transakce — proto se vyplatí zaplatit všechno najednou.
        </p>
      </Card>
    </>
  );
}
