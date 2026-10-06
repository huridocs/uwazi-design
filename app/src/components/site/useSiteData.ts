import { useEffect, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { cejilReadyAtom, dataSourceAtom, libraryEntitiesAtom } from "../../atoms/dataSource";
import { loadCejilData, cejilEsBySid, cejilRelsByEntity } from "../../data/cejil/load";
import { references } from "../../data/references";
import { getEntityProp } from "../../data/entityMetadata";
import { getEntityType } from "../../data/entities";
import type { SiteEntity } from "../../utils/sitePageRender";
import type { Entity } from "../../data/entities";

/** An entity's date in ms, from `createdAt` (playground's `utils/timeline.ts`
 *  `entityTime`; main has no timeline, so only this function came over). */
function entityTime(e: Entity): number | null {
  if (!e.createdAt) return null;
  const t = Date.parse(e.createdAt);
  return Number.isNaN(t) ? null : t;
}

/** The collection the public site shows: the Library's entities in the current
 *  data source, reduced to what a page component reads. CEJIL loads on demand,
 *  as it does in the Library. */
export function useSiteData() {
  const source = useAtomValue(dataSourceAtom);
  const [cejilReady, setCejilReady] = useAtom(cejilReadyAtom);
  useEffect(() => {
    if (source !== "cejil" || cejilReady) return;
    let alive = true;
    loadCejilData().then(() => alive && setCejilReady(true), () => {});
    return () => {
      alive = false;
    };
  }, [source, cejilReady, setCejilReady]);

  const library = useAtomValue(libraryEntitiesAtom);
  const entities = useMemo<SiteEntity[]>(() => {
    // Relationship counts ("most cited") and a status, per corpus.
    const sampleLinks = new Map<string, number>();
    if (source !== "cejil") {
      for (const r of references) {
        sampleLinks.set(r.sourceEntityId, (sampleLinks.get(r.sourceEntityId) ?? 0) + 1);
        sampleLinks.set(r.targetEntityId, (sampleLinks.get(r.targetEntityId) ?? 0) + 1);
      }
    }
    const rels = source === "cejil" ? cejilRelsByEntity() : null;
    const raw = source === "cejil" ? cejilEsBySid() : null;
    return library.map((e) => {
        const t = getEntityType(e.typeId);
        const estado = raw?.get(e.id)?.metadata?.estado?.[0] as { label?: string; value?: unknown } | undefined;
        return {
          id: e.id,
          title: e.title,
          typeId: e.typeId,
          typeName: t?.name ?? "Entity",
          color: t?.color ?? "#6B7280",
          country: e.country,
          lat: e.geo?.lat,
          lng: e.geo?.lng,
          date: entityTime(e) ?? undefined,
          links: rels ? (rels.get(e.id)?.length ?? 0) : (sampleLinks.get(e.id) ?? 0),
          status: estado ? (estado.label ?? String(estado.value ?? "")) || undefined : getEntityProp(e.id, "status", "EN"),
        };
      });
  }, [library, source]);

  // The collection's main template: the one with the most entities that is a
  // case (Court case / Causa), else simply the largest.
  const mainTemplate = useMemo(() => {
    const counts = new Map<string, { n: number; name: string }>();
    for (const e of entities) {
      const c = counts.get(e.typeId) ?? { n: 0, name: e.typeName };
      c.n++;
      counts.set(e.typeId, c);
    }
    const all = [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
    return (all.find(([, c]) => /case|causa/i.test(c.name)) ?? all[0])?.[0] ?? "";
  }, [entities]);

  const templates = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entities) if (!seen.has(e.typeId)) seen.set(e.typeId, e.typeName);
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [entities]);

  const countries = useMemo(
    () => [...new Set(entities.map((e) => e.country).filter((c): c is string => !!c))].sort(),
    [entities],
  );

  return {
    entities,
    mainTemplate,
    templates,
    countries,
    loading: source === "cejil" && !cejilReady,
    siteName: source === "cejil" ? "CEJIL · Summa" : "Inter-American Cases",
  };
}
