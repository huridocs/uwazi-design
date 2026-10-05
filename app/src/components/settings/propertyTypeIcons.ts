import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ExternalLink,
  Eye,
  Film,
  Fingerprint,
  Hash,
  Image,
  Link2,
  List,
  ListChecks,
  MapPin,
  Table,
  Text,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { PropertyType } from "../../data/templates/types";

/** One icon per property type, beside its label in the property table, the
 *  read-only Type box and the same-label table. */
export const TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  text: Type,
  markdown: Text,
  numeric: Hash,
  date: Calendar,
  multidate: CalendarDays,
  daterange: CalendarRange,
  multidaterange: CalendarRange,
  select: List,
  multiselect: ListChecks,
  relationship: Link2,
  link: ExternalLink,
  image: Image,
  preview: Eye,
  media: Film,
  geolocation: MapPin,
  generatedid: Fingerprint,
  nested: Table,
};
