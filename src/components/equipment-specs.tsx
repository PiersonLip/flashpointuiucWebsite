import { EQUIPMENT_SPECS_BY_TAG } from "@/config/equipment";

export function EquipmentSpecs({
  assetTag,
  notes,
}: {
  assetTag: string | null;
  notes: string | null;
}) {
  const spec = assetTag ? EQUIPMENT_SPECS_BY_TAG[assetTag] : undefined;

  if (spec) {
    return (
      <dl className="equip-specs">
        <div className="equip-spec-row">
          <dt>Mount</dt>
          <dd>{spec.lensMount}</dd>
        </div>
        <div className="equip-spec-row">
          <dt>Battery</dt>
          <dd>{spec.battery}</dd>
        </div>
        {spec.notes ? (
          <div className="equip-spec-row">
            <dt>Notes</dt>
            <dd>{spec.notes}</dd>
          </div>
        ) : null}
      </dl>
    );
  }

  if (!notes) return null;

  return <p className="equip-notes">{notes}</p>;
}
