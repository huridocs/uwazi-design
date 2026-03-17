export interface EntityType {
  id: string;
  name: string;
  color: string;
}

export const entityTypes: EntityType[] = [
  { id: "person", name: "Person", color: "#7C3AED" },
  { id: "court_case", name: "Court Case", color: "#0891B2" },
  { id: "country", name: "Country", color: "#059669" },
  { id: "judgment", name: "Judgment", color: "#D97706" },
  { id: "violation", name: "Violation", color: "#E8432A" },
  { id: "right", name: "Right", color: "#2563EB" },
  { id: "organization", name: "Organization", color: "#7C3AED" },
  { id: "document", name: "Document", color: "#6B7280" },
];

export interface Entity {
  id: string;
  title: string;
  typeId: string;
}

export const entities: Entity[] = [
  { id: "e1", title: "Juan Carlos Abella", typeId: "person" },
  { id: "e2", title: "Argentina", typeId: "country" },
  { id: "e3", title: "Case 11.137", typeId: "court_case" },
  { id: "e4", title: "Right to Life", typeId: "right" },
  { id: "e5", title: "Right to Humane Treatment", typeId: "right" },
  { id: "e6", title: "Right to a Fair Trial", typeId: "right" },
  { id: "e7", title: "La Tablada Attack", typeId: "judgment" },
  { id: "e8", title: "Inter-American Commission", typeId: "organization" },
  { id: "e9", title: "Enforced Disappearance", typeId: "violation" },
  { id: "e10", title: "Extrajudicial Execution", typeId: "violation" },
  { id: "e11", title: "María Elena Almeida", typeId: "person" },
  { id: "e12", title: "Pedro Sánchez", typeId: "person" },
  { id: "e13", title: "Case 12.045", typeId: "court_case" },
  { id: "e14", title: "Torture and Cruel Treatment", typeId: "violation" },
  { id: "e15", title: "Colombia", typeId: "country" },
];

export function getEntityType(typeId: string): EntityType | undefined {
  return entityTypes.find((t) => t.id === typeId);
}

export function getEntity(id: string): Entity | undefined {
  return entities.find((e) => e.id === id);
}
