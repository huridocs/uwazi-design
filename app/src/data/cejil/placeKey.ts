/** The field key for a place an entity reached through a connection.
 *
 *  Its own module because both ends need it and neither should import the
 *  other: `adapt.ts` puts it on the card field, `profile.ts` puts it on the
 *  record field the card's click scrolls to. A shared constant is the only
 *  thing that keeps a synthesized key honest — the alternative is two string
 *  literals that agree until one of them is edited. */
export const PLACE_INHERITED_KEY = "cejil-place-inherited";
