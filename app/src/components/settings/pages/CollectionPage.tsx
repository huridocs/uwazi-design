import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { ImageUp, Plus, X } from "lucide-react";
import { SettingsFormPage } from "../SettingsEditor";
import { SettingsFieldRow, SettingsSection } from "../SettingsSection";
import { SettingsField, TextInput } from "../SettingsField";
import { SettingsButton } from "../SettingsButton";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { CHECKERBOARD, FAVICON_RULE, ImagePickerModal } from "../../shared/ImagePickerModal";
import { MapPointPicker } from "../../shared/MapPointPicker";
import {
  collectionSettings,
  DEFAULT_VIEWS,
  MAP_LAYERS,
  type CollectionSettings,
  type CollectionFields,
  type DefaultLibraryView,
  type MapLayer,
  type MapProvider,
} from "../../../atoms/settingsSingletons";
import { uploadsAtom } from "../../../atoms/uploads";
import { resetLibraryViewChoiceAtom } from "../../../atoms/library";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { DATE_PATTERNS, datePatternLabel, type DatePattern } from "../../../utils/dateFormat";
import type { ValidationIssue } from "../../../utils/validation";
import { emailIssue, landingIssue, mapKeyIssue, matomoIssue, nameIssue, pointIssues } from "../../../utils/collectionRules";
import type { ActivityChange } from "../../../atoms/activityLog";

/** The form's value: the stored settings, with the starting point as the two
 *  inputs' text, so a half-filled pair is kept as typed until Save. */
type CollectionForm = Omit<CollectionFields, "mapStartingPoint"> & { lat: string; lon: string };

const toForm = (s: CollectionSettings): CollectionForm => {
  const { mapStartingPoint: p, ...rest } = s;
  return { ...rest, lat: p ? String(p.lat) : "", lon: p ? String(p.lon) : "" };
};

const VIEW_LABEL: Record<DefaultLibraryView, string> = { cards: "Cards", map: "Map", table: "Table" };

type FieldId = "name" | "landing" | "matomo" | "senderEmail" | "contactEmail" | "mapApiKey" | "lat" | "lon";
/** DOM order, for focusing the first invalid field. */
const FIELD_ORDER: FieldId[] = ["name", "landing", "matomo", "senderEmail", "contactEmail", "mapApiKey", "lat", "lon"];
const INPUT_ID: Record<FieldId, string> = {
  name: "collection-name",
  landing: "landing-page",
  matomo: "matomo-analytics",
  senderEmail: "sending-email",
  contactEmail: "receiving-email",
  mapApiKey: "map-key",
  lat: "map-latitude",
  lon: "map-longitude",
};

function validate(f: CollectionForm): Partial<Record<FieldId, string>> {
  const all: Partial<Record<FieldId, string | null>> = {
    name: nameIssue(f.name),
    landing: landingIssue(f.landing),
    matomo: matomoIssue(f.matomo),
    senderEmail: emailIssue(f.senderEmail),
    contactEmail: emailIssue(f.contactEmail),
    mapApiKey: mapKeyIssue(f.mapApiKey),
    ...pointIssues(f.lat, f.lon),
  };
  return Object.fromEntries(Object.entries(all).filter(([, m]) => m)) as Partial<Record<FieldId, string>>;
}

const err = (message: string | undefined): ValidationIssue | null => (message ? { severity: "error", message } : null);

/** What the log lists for a change, by field. */
const FIELD_LABEL: Partial<Record<keyof CollectionSettings, string>> = {
  name: "Collection Name",
  favicon: "Custom Favicon",
  defaultView: "Default View",
  dateFormat: "Default date format",
  landing: "Custom landing page",
  publicInstance: "Public instance",
  hideRestrictedRelationships: "Hide restricted relationships from public",
  cookiePolicy: "Show cookie policy",
  globalJs: "Global JS",
  googleAnalytics: "Google",
  matomo: "Matomo",
  senderEmail: "Sending email",
  contactEmail: "Contact form email",
  publicFormSubmitUrl: "Public Form submit URL",
  mapProvider: "Map Provider",
  mapApiKey: "Map API key",
  mapLayers: "Map Layers",
  mapStartingPoint: "Map starting point",
};

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (typeof v === "boolean") return v ? "On" : "Off";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    const p = v as { lat: number; lon: number };
    return `${p.lat}, ${p.lon}`;
  }
  return String(v);
};

function changesBetween(before: CollectionSettings, after: CollectionSettings): ActivityChange[] {
  return (Object.keys(FIELD_LABEL) as (keyof CollectionSettings)[])
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: FIELD_LABEL[k]!, before: show(before[k]), after: show(after[k]) }));
}

/** Uwazi's tooltip copy, as text under the control. `*x*` in the source
 *  renders italic. */
const Em = ({ children }: { children: ReactNode }) => <em className="not-italic font-mono text-ink-secondary">{children}</em>;

const LANDING_HELP = (
  <>
    <p>
      The landing page is the first page that visitors see when they come to your collection. The default landing
      page is your collection's library. You can set a different landing page by adding its relative URL here.
    </p>
    <p>For example:</p>
    <ul className="flex flex-col gap-0.5">
      <li>
        A page: <Em>/page/dicxg0oagy3xgr7ixef80k9</Em>
      </li>
      <li>
        A filtered view in Uwazi: <Em>/library/?searchTerm=test</Em>
      </li>
      <li>
        An entity: <Em>/entity/9htbkgpkyy7j5rk9</Em>
      </li>
      <li>
        A document: <Em>/entity/4y9i99fadjp833di</Em>
      </li>
    </ul>
    <p>
      Important: You must use relative URLs. These start with a forward slash and do not include the domain name. For
      example: In the address <Em>https://yoursite.com/landingpage</Em>, the relative URL is /landingpage
    </p>
  </>
);

const FAVICON_HELP = (
  <>
    <p>
      A favicon is a small icon that represents your collection in browser tabs and bookmarks. The default favicon is
      the Uwazi logo. To use your own:
    </p>
    <ol className="flex flex-col gap-0.5">
      <li>1. Upload your icon in Custom Uploads if needed.</li>
      <li>2. Open the favicon picker and pick a file (images from Custom Uploads only).</li>
      <li>3. Reload the page to see your favicon in action.</li>
    </ol>
  </>
);

const GLOBAL_JS_HELP = (
  <>
    <p>With great power comes great responsibility!</p>
    <p>
      This area allows you to append custom Javascript to the page. This opens up a new universe of possibilities.
      <br />
      It could also very easily break the app. Only write code here if you know exactly what you are doing.
    </p>
  </>
);

/** A setting that is on or off: checkbox, label, and its help as text. */
function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const helpId = useId();
  return (
    <label data-part="toggle" className="flex items-start gap-3 rounded-lg border border-border bg-paper px-4 py-3 cursor-pointer">
      <span className="pt-0.5">
        <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} ariaLabel={label} describedBy={helpId} />
      </span>
      <span className="min-w-0 flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span id={helpId} className="text-xs text-ink-tertiary text-pretty flex flex-col gap-1.5">
          {help}
        </span>
      </span>
    </label>
  );
}

/** Uwazi's multi-select card for map layers: the chosen layers as pills in
 *  the order they were chosen, and an add list in popover order. The last
 *  layer cannot be removed. */
function LayerPicker({ value, onChange }: { value: MapLayer[]; onChange: (v: MapLayer[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const last = value.length === 1;
  const toggle = (l: MapLayer) =>
    onChange(value.includes(l) ? (last ? value : value.filter((x) => x !== l)) : [...value, l]);

  return (
    <div
      ref={ref}
      className="relative flex flex-wrap items-center gap-1.5 min-h-10 rounded-md border border-border bg-warm px-2 py-1.5"
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
        }
      }}
    >
      {value.length === 0 && <span className="text-xs text-ink-muted">No options</span>}
      {value.map((l) => (
        <span key={l} className="inline-flex items-center gap-1 ps-2 pe-1 py-0.5 rounded-md bg-paper text-xs font-medium text-ink w-fit">
          {l}
          <button
            type="button"
            aria-label={`Remove ${l}`}
            disabled={last}
            onClick={() => toggle(l)}
            className="p-0.5 rounded-sm text-ink-tertiary hover:text-ink hover:bg-warm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label="Add map layer"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="ms-auto p-1 rounded-md text-ink-secondary hover:bg-parchment hover:text-ink cursor-pointer"
      >
        <Plus size={14} aria-hidden />
      </button>
      {open && (
        <fieldset
          id={listId}
          aria-label="Map layers"
          className="absolute end-0 top-full mt-1 z-20 min-w-[10rem] flex flex-col gap-0.5 p-1.5 rounded-md bg-paper border border-border shadow-lg"
        >
          {MAP_LAYERS.map((l) => (
            <label key={l} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink hover:bg-warm cursor-pointer">
              <Checkbox checked={value.includes(l)} disabled={last && value.includes(l)} onChange={() => toggle(l)} />
              {l}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

export function CollectionPage() {
  const { record } = useSettingsNotify();
  // The corpus's stored value (`atoms/settingsSingletons.ts`); the window
  // title, the favicon, the navbar and the Library's default view read it.
  const stored = useAtomValue(collectionSettings.valueAtom);
  const saveCollection = useSetAtom(collectionSettings.saveAtom);
  const resetLibraryView = useSetAtom(resetLibraryViewChoiceAtom);
  const allUploads = useAtomValue(uploadsAtom);
  const initial = useMemo(() => toForm(stored), [stored]);
  const { draft, update, dirty, markSaved, discard } = useSettingsDraft({
    id: "collection",
    label: "Collection settings",
    saved: initial,
  });
  const [attempted, setAttempted] = useState(false);
  const [picking, setPicking] = useState(false);

  const errors = attempted ? validate(draft) : {};
  const favicon = allUploads.find((u) => u.id === draft.favicon);
  const today = useMemo(() => new Date(), []);

  const setNumber = (key: "lat" | "lon", raw: string) => {
    const limit = key === "lat" ? 90 : 180;
    const n = Number(raw);
    update({ [key]: raw.trim() !== "" && Number.isFinite(n) && Math.abs(n) > limit ? String(Math.sign(n) * limit) : raw });
  };

  const save = () => {
    const issues = validate(draft);
    const first = FIELD_ORDER.find((k) => issues[k]);
    if (first) {
      setAttempted(true);
      // After the render that shows the messages.
      requestAnimationFrame(() => document.getElementById(INPUT_ID[first])?.focus());
      return;
    }
    setAttempted(false);
    const { lat, lon, ...rest } = draft;
    const trimmed = (s: string) => s.trim();
    const value: CollectionSettings = {
      ...rest,
      name: trimmed(rest.name),
      landing: trimmed(rest.landing),
      googleAnalytics: trimmed(rest.googleAnalytics),
      matomo: trimmed(rest.matomo),
      senderEmail: trimmed(rest.senderEmail),
      contactEmail: trimmed(rest.contactEmail),
      publicFormSubmitUrl: trimmed(rest.publicFormSubmitUrl),
      mapApiKey: trimmed(rest.mapApiKey),
      mapStartingPoint: lat.trim() !== "" && lon.trim() !== "" ? { lat: Number(lat), lon: Number(lon) } : null,
    };
    const changes = changesBetween(stored, value);
    saveCollection({ value });
    markSaved(toForm(value));
    if (value.defaultView !== stored.defaultView) resetLibraryView();
    record({
      method: "UPDATE",
      domain: "collection",
      noun: "settings",
      id: "collection",
      name: "Collection",
      summary: "Updated settings",
      message: "Settings updated",
      changes,
    });
  };

  return (
    <SettingsFormPage
      component="CollectionPage"
      title="Collection"
      dirty={dirty}
      onSave={save}
      onDiscard={() => {
        setAttempted(false);
        discard();
      }}
      footerStatus={<LastSavedLine domain="collection" id="collection" />}
      overlays={
        picking && (
          <ImagePickerModal
            title="Select favicon image"
            rule={FAVICON_RULE}
            value={draft.favicon}
            onClose={() => setPicking(false)}
            onPick={(u) => {
              update({ favicon: u.id });
              setPicking(false);
            }}
          />
        )
      }
    >
      <SettingsSection title="General">
        <SettingsFieldRow>
          <SettingsField label="Collection Name" issue={err(errors.name)}>
            <TextInput
              id={INPUT_ID.name}
              value={draft.name}
              issue={err(errors.name)}
              onChange={(e) => update({ name: e.target.value })}
            />
          </SettingsField>
          <FaviconField
            src={favicon?.src}
            name={favicon?.name}
            set={!!draft.favicon}
            onChoose={() => setPicking(true)}
            onClear={() => update({ favicon: "" })}
          />
        </SettingsFieldRow>
        <SettingsFieldRow>
          <SettingsField label="Default View">
            <Select
              id="default-view"
              value={draft.defaultView}
              onChange={(v) => update({ defaultView: v as DefaultLibraryView })}
              options={DEFAULT_VIEWS.map((v) => ({ value: v, label: VIEW_LABEL[v] }))}
              sheetTitle="Default View"
            />
          </SettingsField>
          <SettingsField label="Default date format">
            <Select
              id="date-format"
              value={draft.dateFormat}
              onChange={(v) => update({ dateFormat: v as DatePattern })}
              options={DATE_PATTERNS.map((p) => ({ value: p, label: datePatternLabel(p, today) }))}
              sheetTitle="Default date format"
            />
          </SettingsField>
        </SettingsFieldRow>
        <SettingsField label="Custom landing page" issue={err(errors.landing)} description={LANDING_HELP}>
          <TextInput
            id={INPUT_ID.landing}
            addon="https://yourdomain"
            value={draft.landing}
            issue={err(errors.landing)}
            onChange={(e) => update({ landing: e.target.value })}
          />
        </SettingsField>
        <div className="flex flex-col gap-2">
          <ToggleRow
            label="Public instance"
            help="Check to make this instance public (non-logged in users can see public documents and entities)"
            checked={draft.publicInstance}
            onChange={(v) => update({ publicInstance: v })}
          />
          <ToggleRow
            label="Hide restricted relationships from public"
            help="By default, relationships pointing to restricted entities are visible to anonymous users but not linked. When enabled, these relationships are completely hidden, preventing public users from knowing restricted content exists."
            checked={draft.hideRestrictedRelationships}
            onChange={(v) => update({ hideRestrictedRelationships: v })}
          />
          <ToggleRow
            label="Show cookie policy"
            help="When enabled, visitors must accept or reject non-essential cookies before they are set. Analytics and language preference cookies are blocked until accepted."
            checked={draft.cookiePolicy}
            onChange={(v) => update({ cookiePolicy: v })}
          />
          <ToggleRow label="Global JS" help={GLOBAL_JS_HELP} checked={draft.globalJs} onChange={(v) => update({ globalJs: v })} />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Analytics"
        description="If you want to track analytics related to your collection visits, Uwazi supports both Google Analytics and Matomo."
      >
        <SettingsFieldRow>
          <SettingsField label="Google">
            <TextInput id="google-analytics" value={draft.googleAnalytics} onChange={(e) => update({ googleAnalytics: e.target.value })} />
          </SettingsField>
          <SettingsField label="Matomo" issue={err(errors.matomo)} hint='JSON: {"id":"…","url":"…"}'>
            <TextInput
              id={INPUT_ID.matomo}
              dir="ltr"
              value={draft.matomo}
              issue={err(errors.matomo)}
              onChange={(e) => update({ matomo: e.target.value })}
            />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>

      <SettingsSection title="Forms and email configuration">
        <SettingsFieldRow>
          <SettingsField
            label="Sending email"
            issue={err(errors.senderEmail)}
            description={
              <p>
                This is the email address that will appear as the sender when an email is sent from your Uwazi
                collection to registered users. The default address is <em>no-reply@uwazi.io</em>. You can set a custom
                one by including your desired email address here.
              </p>
            }
          >
            <TextInput
              id={INPUT_ID.senderEmail}
              type="email"
              value={draft.senderEmail}
              issue={err(errors.senderEmail)}
              onChange={(e) => update({ senderEmail: e.target.value })}
            />
          </SettingsField>
          <SettingsField
            label="Contact form email"
            issue={err(errors.contactEmail)}
            description={
              <p>
                If you have a contact form, this is the email address that will receive the form's submissions.{" "}
                <a
                  href="https://docs.uwazi.io/docs/how-to/managing-your-instance/create-and-manage-pages/#add-a-contact-form-to-a-page"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-ink-secondary hover:text-ink"
                >
                  Learn how to add and configure a contact form on a webpage.
                </a>
              </p>
            }
          >
            <TextInput
              id={INPUT_ID.contactEmail}
              type="email"
              value={draft.contactEmail}
              issue={err(errors.contactEmail)}
              onChange={(e) => update({ contactEmail: e.target.value })}
            />
          </SettingsField>
        </SettingsFieldRow>
        <SettingsField
          label="Public Form submit URL"
          description="If you have configured a public form and would like a different Uwazi collection to receive the submissions, enter its URL here."
        >
          <TextInput
            id="public-form-destination"
            type="url"
            dir="ltr"
            value={draft.publicFormSubmitUrl}
            onChange={(e) => update({ publicFormSubmitUrl: e.target.value })}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Map">
        <SettingsFieldRow>
          <SettingsField label="Map Provider">
            <Select
              id="map-provider"
              value={draft.mapProvider}
              onChange={(v) => update({ mapProvider: v as MapProvider })}
              options={[
                { value: "mapbox", label: "Mapbox" },
                { value: "google", label: "Google" },
              ]}
              sheetTitle="Map Provider"
            />
          </SettingsField>
          <SettingsField
            label="Map API key"
            issue={err(errors.mapApiKey)}
            description="An API key is required to use Mapbox or Google Maps."
          >
            <TextInput
              id={INPUT_ID.mapApiKey}
              dir="ltr"
              value={draft.mapApiKey}
              issue={err(errors.mapApiKey)}
              onChange={(e) => update({ mapApiKey: e.target.value })}
            />
          </SettingsField>
        </SettingsFieldRow>
        <SettingsField
          label="Map Layers"
          group
          hint={draft.mapLayers.length === 1 ? "Map layers cannot be empty" : undefined}
          description="Here you can configure the map layers that will be available in the maps."
        >
          <LayerPicker value={draft.mapLayers} onChange={(mapLayers) => update({ mapLayers })} />
        </SettingsField>
        <div className="flex flex-col gap-3">
          <MapPointPicker
            label="Map starting point"
            point={
              draft.lat.trim() !== "" && draft.lon.trim() !== "" && Number.isFinite(+draft.lat) && Number.isFinite(+draft.lon)
                ? { lat: +draft.lat, lon: +draft.lon }
                : null
            }
            onPick={(p) => update({ lat: String(p.lat), lon: String(p.lon) })}
          />
          <SettingsFieldRow>
            <CoordinateField
              label="Latitude"
              id={INPUT_ID.lat}
              value={draft.lat}
              limit={90}
              issue={err(errors.lat)}
              onChange={(v) => setNumber("lat", v)}
              onClear={() => update({ lat: "", lon: "" })}
            />
            <CoordinateField
              label="Longitude"
              id={INPUT_ID.lon}
              value={draft.lon}
              limit={180}
              issue={err(errors.lon)}
              onChange={(v) => setNumber("lon", v)}
              onClear={() => update({ lat: "", lon: "" })}
            />
          </SettingsFieldRow>
        </div>
      </SettingsSection>
    </SettingsFormPage>
  );
}

/** Uwazi's custom upload image picker row: an empty value shows "Choose";
 *  a set one shows the preview tile, "Change" and "Clear". Clear empties the
 *  form value only; Save stores it. */
function FaviconField({
  src,
  name,
  set,
  onChoose,
  onClear,
}: {
  src?: string;
  name?: string;
  set: boolean;
  onChoose: () => void;
  onClear: () => void;
}) {
  const labelId = useId();
  const captionId = useId();
  const helpId = useId();
  return (
    <div role="group" aria-labelledby={labelId} data-component="SettingsField" className="flex flex-col gap-1.5">
      <span id={labelId} data-part="label" className="text-xs font-medium text-ink-secondary">
        Custom Favicon
      </span>
      <div className="flex items-center gap-2 min-h-10">
        {set && (
          <span
            data-part="preview"
            style={CHECKERBOARD}
            className="shrink-0 size-10 rounded-md border border-border-soft flex items-center justify-center overflow-hidden"
          >
            {src ? <img src={src} alt={name ? `Favicon: ${name}` : "Favicon"} className="max-w-full max-h-full object-contain" /> : null}
          </span>
        )}
        <SettingsButton
          variant="secondary"
          size="sm"
          icon={!set ? <ImageUp size={14} aria-hidden /> : undefined}
          aria-describedby={`${captionId} ${helpId}`}
          onClick={onChoose}
        >
          {set ? "Change" : "Choose"}
        </SettingsButton>
        {set && (
          <SettingsButton variant="danger" size="sm" onClick={onClear}>
            Clear
          </SettingsButton>
        )}
      </div>
      <span id={captionId} className="text-xs text-ink-tertiary">
        Recommended: 16x16 to 512x512 px (square)
      </span>
      <div id={helpId} className="text-xs text-ink-tertiary text-pretty flex flex-col gap-1.5">
        {FAVICON_HELP}
      </div>
    </div>
  );
}

/** A coordinate input with a clear X. Both X buttons clear the whole point,
 *  as in Uwazi. */
function CoordinateField({
  label,
  id,
  value,
  limit,
  issue,
  onChange,
  onClear,
}: {
  label: string;
  id: string;
  value: string;
  limit: number;
  issue: ValidationIssue | null;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const msgId = useId();
  return (
    <div data-component="SettingsField" className="flex flex-col gap-1.5">
      <label htmlFor={id} data-part="label" className={`text-xs font-medium ${issue ? "text-seal-label" : "text-ink-secondary"}`}>
        {label}
      </label>
      <div className="relative">
        <TextInput
          id={id}
          type="number"
          step="any"
          min={-limit}
          max={limit}
          dir="ltr"
          value={value}
          issue={issue}
          aria-invalid={!!issue || undefined}
          aria-describedby={issue ? msgId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="pe-9"
        />
        {value !== "" && (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()} and ${label === "Latitude" ? "longitude" : "latitude"}`}
            onClick={onClear}
            className="absolute end-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-parchment cursor-pointer"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>
      {issue && (
        <span id={msgId} className="text-meta text-seal-label">
          {issue.message}
        </span>
      )}
    </div>
  );
}
