"use client";

/**
 * Košík — společný stav pro celou stránku Plateb.
 *
 * Košík se skládá na dvou místech (karty poplatků nahoře, balíčky zápasů níž)
 * a obojí musí vidět totéž. Proto tady, ne v jedné z těch sekcí: jeden dotaz,
 * jeden klíč v cache, jedno místo, kde se po každé změně přepočítá.
 *
 * Proč vůbec košík: Stripe si u české karty bere **1,5 % + 6,50 Kč** a ta
 * pevná část jde za každou transakci zvlášť. Licence a balíček zaplacené
 * odděleně stojí ligu o 6,50 Kč víc než totéž najednou. Převodem je celý
 * košík zdarma.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errMsg, paymentsApi } from "@/lib/api";
import type { Cart, CartAdd } from "@/lib/types";
import { toast } from "@/components/ui/toast";

export const CART_KEY = ["payments", "cart"] as const;

export function useCart() {
  return useQuery({
    queryKey: CART_KEY,
    queryFn: async () => (await paymentsApi.cart()).data,
  });
}

export function useCartActions() {
  const qc = useQueryClient();

  /** Po každé změně košíku se musí přepočítat i stavy plateb a balíčků. */
  const osvez = (cart: Cart) => {
    qc.setQueryData(CART_KEY, cart);
    void qc.invalidateQueries({ queryKey: ["payments", "me"] });
    void qc.invalidateQueries({ queryKey: ["payments", "packs"] });
  };

  const pridat = useMutation({
    mutationFn: async (item: CartAdd) => (await paymentsApi.cartAdd(item)).data,
    onSuccess: (cart) => {
      osvez(cart);
      toast.success("Přidáno do košíku", "Zaplatíš to spolu se zbytkem — ušetříš na poplatcích.");
    },
    onError: (e) => toast.error("Nepodařilo se přidat", errMsg(e)),
  });

  const odebrat = useMutation({
    mutationFn: async (itemId: string) => (await paymentsApi.cartRemove(itemId)).data,
    onSuccess: osvez,
    onError: (e) => toast.error("Nepodařilo se odebrat", errMsg(e)),
  });

  return { pridat, odebrat };
}

/** Je tahle položka už v košíku? Karty podle toho přepnou tlačítko. */
export function vKosiku(
  cart: Cart | undefined,
  kind: CartAdd["kind"],
  id?: string | null,
) {
  return (cart?.items ?? []).some(
    (i) =>
      i.kind === kind
      && (!id || i.player?.id === id || i.team?.id === id),
  );
}
