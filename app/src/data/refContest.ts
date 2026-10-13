// What contests a link, for the evidence card and the Relationships panel's
// Contested filter. Built from a collection's stored references (Nepal, Vegas);
// each adapter passes its own lookups, and nothing here knows a corpus.
//
// A link is contested when the other side has something to show:
// - it supports (or disputes) a claim that sources dispute (or support): the
//   opposite-stance links are the other side, the claim's other links of the
//   same stance its side;
// - any other link to a claim that sources dispute: the disputing links, and
//   the supporting ones beside them;
// - a claim at its ends has a figure another claim contradicts;
// - Research paired it with other links or sources (`dispute`);
// - a disputed link shares both ends with another link, or a disputed claim
//   concerns one of its ends.
// A later count that replaces an earlier one (`supersedes`) is a succession,
// not a dispute, and is returned apart.
import type { ContestClaim, ContestLink, RefContest, RefSource, RefSuccession } from "./references";

/** A reference as the corpus files store it. */
export interface ContestStoredRef {
  id: string;
  from: string;
  to: string;
  type: string;
  verification?: string;
  quote?: string;
  /** A time in a recording (Vegas): such links on the same two ends are the
   *  same recording at other moments, not another account. */
  media?: unknown;
  dispute?: { basis?: string; note?: string; missing?: string; opposing?: string[]; paired?: string[]; conflicting?: string[] };
}

export interface ContestLookups<R extends ContestStoredRef> {
  /** The app's id for a stored reference ("np-…"). */
  appId: (r: R) => string;
  refsOf: (entityId: string) => R[] | undefined;
  refById: (id: string) => R | undefined;
  isClaim: (entityId: string) => boolean;
  titleOf: (entityId: string) => string;
  /** The Source record as the card shows it, or undefined for any other record. */
  sourceOf: (entityId: string) => RefSource | undefined;
  claim: (claimId: string) => ContestClaim;
  /** The claims whose figure cannot stand beside this claim's, or that
   *  Research linked to it as conflicting. */
  conflictsOf: (claimId: string) => ContestClaim[];
  /** The claim's own status ("disputed"). */
  claimStatus: (claimId: string) => string | undefined;
}

const STANCE = { supports: "disputes", disputes: "supports" } as const;
type Stance = keyof typeof STANCE;
const isStance = (t: string): t is Stance => t === "supports" || t === "disputes";

export function refContestFrom<R extends ContestStoredRef>(
  ref: R,
  k: ContestLookups<R>,
): { contest?: RefContest; succession?: RefSuccession } {
  const opposing = new Map<string, ContestLink>();
  const paired = new Map<string, ContestLink>();
  const link = (r: R, about: string): ContestLink => {
    const recordId = r.from === about ? r.to : r.from;
    const source = k.sourceOf(recordId);
    return {
      refId: k.appId(r),
      recordId,
      aboutId: about,
      relationType: r.type,
      ...(r.verification ? { verification: r.verification as ContestLink["verification"] } : {}),
      ...(r.quote ? { quote: r.quote } : {}),
      ...(source ? { source } : {}),
    };
  };
  const put = (into: Map<string, ContestLink>, r: R, about: string) => {
    if (r.id === ref.id || opposing.has(r.id) || paired.has(r.id)) return;
    into.set(r.id, link(r, about));
  };

  const claims = [ref.from, ref.to].filter((id, i, a) => a.indexOf(id) === i && k.isClaim(id));
  for (const c of claims) {
    // The stance links on the claim, by stance; only links into it from a
    // record that is not a claim (a source).
    const stances: Record<Stance, R[]> = { supports: [], disputes: [] };
    for (const r of k.refsOf(c) ?? []) if (r.to === c && isStance(r.type) && !k.isClaim(r.from)) stances[r.type].push(r);
    if (isStance(ref.type) && ref.to === c) {
      if (stances[STANCE[ref.type]].length === 0) continue;
      for (const r of stances[STANCE[ref.type]]) put(opposing, r, c);
      for (const r of stances[ref.type]) put(paired, r, c);
    } else if (stances.disputes.length > 0) {
      for (const r of stances.disputes) put(opposing, r, c);
      for (const r of stances.supports) put(paired, r, c);
    }
  }

  // A link between two conflicting claims lists their conflict once.
  const figures: RefContest["figures"] = [];
  for (const c of claims) {
    const conflicts = k.conflictsOf(c).filter((x) => !figures.some((f) => f.claim.claimId === x.claimId));
    if (conflicts.length) figures.push({ claim: k.claim(c), conflicts });
  }

  // Research's pairing, both ways: this link's own, and every link that
  // names this one.
  for (const id of ref.dispute?.paired ?? []) {
    const r = k.refById(id);
    if (r) put(opposing, r, r.from === ref.from || r.to === ref.from ? ref.from : ref.to);
  }
  const conflicting = new Set([...figures.flatMap((f) => f.conflicts.map((c) => c.claimId)), ...(ref.dispute?.conflicting ?? [])]);
  for (const s of ref.dispute?.opposing ?? []) {
    // The source's links to either end or to a conflicting claim, else the
    // source alone.
    const own = (k.refsOf(s) ?? []).filter(
      (r) => r.from === s && (r.to === ref.from || r.to === ref.to || conflicting.has(r.to)),
    );
    if (own.length) for (const r of own) put(opposing, r, r.to);
    else if (!opposing.has(`source:${s}`)) {
      const source = k.sourceOf(s);
      opposing.set(`source:${s}`, {
        refId: `source:${s}`,
        recordId: s,
        aboutId: ref.to,
        relationType: "disputes",
        ...(source ? { source } : {}),
      });
    }
  }
  for (const r of [...(k.refsOf(ref.from) ?? []), ...(k.refsOf(ref.to) ?? [])])
    if (r.dispute?.paired?.includes(ref.id)) put(opposing, r, r.from === ref.from || r.to === ref.from ? ref.from : ref.to);

  if (ref.verification === "disputed" && claims.length === 0) {
    for (const end of [ref.from, ref.to])
      for (const r of k.refsOf(end) ?? []) {
        const other = r.from === end ? r.to : r.from;
        // Another link on the same two ends.
        if ((r.from === ref.from && r.to === ref.to) || (r.from === ref.to && r.to === ref.from)) {
          if (!r.media && !ref.media) put(paired, r, end);
        }
        // A disputed claim about this end.
        else if (k.isClaim(other) && r.type === "concerns" && k.claimStatus(other) === "disputed") put(paired, r, end);
      }
  }

  const listed = new Set(figures.flatMap((f) => [f.claim.claimId, ...f.conflicts.map((c) => c.claimId)]));
  const competing = (ref.dispute?.conflicting ?? []).filter((id) => !listed.has(id)).map(k.claim);
  const { note, missing } = ref.dispute ?? {};
  const contest: RefContest | undefined =
    opposing.size || paired.size || figures.length || competing.length || note || missing
      ? {
          opposing: [...opposing.values()],
          paired: [...paired.values()],
          figures,
          competing,
          ...(note ? { note } : {}),
          ...(missing ? { missing } : {}),
          ...(ref.dispute?.basis === "claim-inherited" ? { claimInherited: true } : {}),
        }
      : undefined;
  // A link with only links on its own side and nothing against it is not
  // contested, unless it is disputed itself.
  const contested =
    contest &&
    (contest.opposing.length || contest.figures.length || competing.length || note || missing || ref.verification === "disputed");

  const succession: RefSuccession = [];
  const seenSucc = new Set<string>();
  for (const c of claims)
    for (const r of k.refsOf(c) ?? []) {
      if (r.type !== "supersedes" || seenSucc.has(r.id)) continue;
      seenSucc.add(r.id);
      succession.push({ newer: k.claim(r.from), older: k.claim(r.to) });
    }
  return {
    ...(contested ? { contest } : {}),
    ...(succession.length ? { succession } : {}),
  };
}
