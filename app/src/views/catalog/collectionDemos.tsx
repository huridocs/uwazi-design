import { useState } from "react";
import { StatsCard } from "../../components/shared/StatsCard";
import { DateInput } from "../../components/shared/DateInput";
import { MapPointPicker } from "../../components/shared/MapPointPicker";
import { FAVICON_RULE, ImagePickerModal } from "../../components/shared/ImagePickerModal";
import { SettingsButton } from "../../components/settings/SettingsButton";

export function StatsCardDemo() {
  return (
    <div className="grid sm:grid-cols-2 gap-3 max-w-[40rem]">
      <StatsCard label="Users" value={5} caption="total users" detail="1 Admins | 2 Editors | 2 Collaborators" onOpen={() => {}} />
      <StatsCard label="Storage" value="1.50 GB" caption="Files and database usage" />
    </div>
  );
}

export function DateInputDemo() {
  const [value, setValue] = useState("2026-10-04");
  return (
    <div className="flex flex-col gap-2 max-w-[16rem]">
      <DateInput
        aria-label="Date"
        value={value}
        onChange={setValue}
        className="w-full px-3 py-2 text-sm text-ink bg-warm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-carbon/20"
      />
      <span className="text-xs text-ink-tertiary" dir="ltr">
        value: {value || "(empty)"}
      </span>
    </div>
  );
}

export function MapPointPickerDemo() {
  const [point, setPoint] = useState<{ lat: number; lon: number } | null>({ lat: 46, lon: 6 });
  return (
    <div className="flex flex-col gap-2 max-w-[40rem]">
      <MapPointPicker point={point} onPick={setPoint} />
      <span className="text-xs text-ink-tertiary" dir="ltr">
        {point ? `${point.lat}, ${point.lon}` : "No point"}
      </span>
    </div>
  );
}

export function ImagePickerModalDemo() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState("");
  return (
    <div className="flex items-center gap-3">
      <SettingsButton variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Choose
      </SettingsButton>
      <span className="text-xs text-ink-tertiary">{picked || "Nothing picked"}</span>
      {open && (
        <ImagePickerModal
          title="Select favicon image"
          rule={FAVICON_RULE}
          value=""
          onClose={() => setOpen(false)}
          onPick={(u) => {
            setPicked(u.name);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
