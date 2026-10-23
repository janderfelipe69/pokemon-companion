
"use client";

import { useCallback, useEffect, useState } from "react";
import { TIERS } from "@/types/pokemon";

type TierPrice = {
  tier_code: string;
  price_kk: number | null;
  price_brl: number | null;
};

export function TierPricesManager() {
  const [prices, setPrices] = useState<Record<string, TierPrice>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/tier-prices", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar os preços.");
      }

      const mapped: Record<string, TierPrice> = {};

      for (const tier of TIERS) {
        mapped[tier] = {
          tier_code: tier,
          price_kk: null,
          price_brl: null,
        };
      }

      for (const item of data.prices as TierPrice[]) {
        mapped[item.tier_code] = item;
      }

      setPrices(mapped);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao carregar os preços."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  function updatePrice(
    tier: string,
    field: "price_kk" | "price_brl",
    value: string
  ) {
    setPrices((current) => ({
      ...current,
      [tier]: {
        ...current[tier],
        [field]: value === "" ? null : value as unknown as number,
      },
    }));
  }

  async function savePrice(tier: string) {
    setSaving(tier);
    setMessage("");

    const item = prices[tier];

    try {
      const response = await fetch("/api/admin/tier-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierCode: tier,
          priceKk: item.price_kk,
          priceBrl: item.price_brl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível salvar.");
      }

      setMessage(`Preços do tier ${tier} salvos com sucesso.`);
      await loadPrices();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao salvar os preços."
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-bold">Preços padrão por tier</h2>
      <p className="mt-2 text-sm text-gray-400">
        Deixe um campo vazio quando não houver preço padrão. Preços individuais
        dos Pokémon continuam tendo prioridade.
      </p>

      {message && (
        <p role="status" className="mt-4 rounded-lg bg-white/5 p-3 text-sm">
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-gray-400">Carregando preços...</p>
      ) : (
        <div className="mt-6 space-y-4">
          {TIERS.map((tier) => {
            const item = prices[tier];

            return (
              <div
                key={tier}
                className="grid gap-3 border-b border-white/10 pb-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <div>
                  <p className="font-semibold">{tier}</p>
                  <p className="text-xs text-gray-500">Preço padrão</p>
                </div>

                <label className="text-sm text-gray-300">
                  Valor em KK
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={item?.price_kk ?? ""}
                    onChange={(event) =>
                      updatePrice(tier, "price_kk", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white"
                    placeholder="Não definido"
                  />
                </label>

                <label className="text-sm text-gray-300">
                  Valor em R$
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item?.price_brl ?? ""}
                    onChange={(event) =>
                      updatePrice(tier, "price_brl", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-white"
                    placeholder="Não definido"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void savePrice(tier)}
                  disabled={saving !== null}
                  className="rounded-lg bg-purple-600 px-4 py-2 font-medium transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {saving === tier ? "Salvando..." : "Salvar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
