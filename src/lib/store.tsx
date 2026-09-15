"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SEED_PRODUCTS } from "@/data/products";
import { seedProperties } from "@/data/seed-properties";
import { DEFAULT_ASSUMPTIONS, cloneAssumptions, mergeAssumptions } from "@/lib/assumptions";
import { createEmptyProperty } from "@/lib/defaults";
import { runUnderwriting, summarize, type PropertySummary, type UnderwritingResult } from "@/lib/engine";
import type { Assumptions, MowerProduct, Property } from "@/lib/types";

/**
 * MVP persistence layer.
 *
 * Deliberately a thin repository over localStorage so it can be swapped for a
 * real API/database later without touching any component: every read goes
 * through this context and every write goes through one of the actions below.
 */
const KEYS = {
  properties: "turfops.properties.v1",
  products: "turfops.products.v1",
  assumptions: "turfops.assumptions.v1",
} as const;

interface StoreValue {
  ready: boolean;
  properties: Property[];
  products: MowerProduct[];
  assumptions: Assumptions;
  getProperty: (id: string) => Property | undefined;
  createProperty: () => Property;
  updateProperty: (id: string, mutate: (draft: Property) => void) => void;
  replaceProperty: (property: Property) => void;
  deleteProperty: (id: string) => void;
  upsertProduct: (product: MowerProduct) => void;
  deleteProduct: (id: string) => void;
  resetProducts: () => void;
  updateAssumptions: (mutate: (draft: Assumptions) => void) => void;
  resetAssumptions: () => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the session keeps working in memory.
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [products, setProducts] = useState<MowerProduct[]>(SEED_PRODUCTS);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);

  // Hydrate once on the client. Seed data is written on first run only, so an
  // operator's edits to the example properties survive a reload.
  useEffect(() => {
    const storedProps = read<Property[] | null>(KEYS.properties, null);
    setProperties(storedProps && storedProps.length >= 0 ? storedProps : seedProperties());
    if (!storedProps) write(KEYS.properties, seedProperties());

    const storedProducts = read<MowerProduct[] | null>(KEYS.products, null);
    setProducts(storedProducts ?? SEED_PRODUCTS);

    setAssumptions(mergeAssumptions(read<unknown>(KEYS.assumptions, null)));
    setReady(true);
  }, []);

  const persistProperties = useCallback((next: Property[]) => {
    setProperties(next);
    write(KEYS.properties, next);
  }, []);

  const value = useMemo<StoreValue>(() => {
    return {
      ready,
      properties,
      products,
      assumptions,
      getProperty: (id) => properties.find((p) => p.id === id),
      createProperty: () => {
        const id = `prop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const property = createEmptyProperty(id);
        persistProperties([property, ...properties]);
        return property;
      },
      updateProperty: (id, mutate) => {
        const next = properties.map((p) => {
          if (p.id !== id) return p;
          const draft: Property = structuredClone(p);
          mutate(draft);
          draft.updatedAt = new Date().toISOString();
          return draft;
        });
        persistProperties(next);
      },
      replaceProperty: (property) => {
        persistProperties(properties.map((p) => (p.id === property.id ? property : p)));
      },
      deleteProperty: (id) => persistProperties(properties.filter((p) => p.id !== id)),
      upsertProduct: (product) => {
        const exists = products.some((p) => p.id === product.id);
        const next = exists ? products.map((p) => (p.id === product.id ? product : p)) : [...products, product];
        setProducts(next);
        write(KEYS.products, next);
      },
      deleteProduct: (id) => {
        const next = products.filter((p) => p.id !== id);
        setProducts(next);
        write(KEYS.products, next);
      },
      resetProducts: () => {
        setProducts(SEED_PRODUCTS);
        write(KEYS.products, SEED_PRODUCTS);
      },
      updateAssumptions: (mutate) => {
        const draft = cloneAssumptions(assumptions);
        mutate(draft);
        setAssumptions(draft);
        write(KEYS.assumptions, draft);
      },
      resetAssumptions: () => {
        const fresh = cloneAssumptions(DEFAULT_ASSUMPTIONS);
        setAssumptions(fresh);
        write(KEYS.assumptions, fresh);
      },
      resetAll: () => {
        const seeded = seedProperties();
        persistProperties(seeded);
        setProducts(SEED_PRODUCTS);
        write(KEYS.products, SEED_PRODUCTS);
        const fresh = cloneAssumptions(DEFAULT_ASSUMPTIONS);
        setAssumptions(fresh);
        write(KEYS.assumptions, fresh);
      },
    };
  }, [ready, properties, products, assumptions, persistProperties]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Runs the calculation engine for one property, memoized on its inputs. */
export function useUnderwriting(property: Property | undefined): UnderwritingResult | null {
  const { products, assumptions } = useStore();
  return useMemo(
    () => (property ? runUnderwriting(property, products, assumptions) : null),
    [property, products, assumptions],
  );
}

/** Runs the engine across the whole book. */
export function usePortfolio(): { results: UnderwritingResult[]; summaries: PropertySummary[] } {
  const { properties, products, assumptions } = useStore();
  return useMemo(() => {
    const results = properties.map((p) => runUnderwriting(p, products, assumptions));
    return { results, summaries: results.map(summarize) };
  }, [properties, products, assumptions]);
}
