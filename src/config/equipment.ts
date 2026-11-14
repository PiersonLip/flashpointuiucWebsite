export type EquipmentSpec = {
  name: string;
  category: "digital" | "film" | "lens" | "equipment";
  subcategory: string;
  assetTag: string;
  lensMount: string;
  battery: string;
  notes?: string | null;
};

/** Club camera inventory — sourced from Flashpoint equipment spreadsheet */
export const EQUIPMENT_SPECS: EquipmentSpec[] = [
  {
    name: "Nikon D7000 #1",
    category: "digital",
    subcategory: "APS-C",
    assetTag: "FP-100",
    lensMount: "Nikon F",
    battery: "EN-EL15",
  },
  {
    name: "Nikon D7000 #2",
    category: "digital",
    subcategory: "APS-C",
    assetTag: "FP-101",
    lensMount: "Nikon F",
    battery: "EN-EL15",
  },
  {
    name: "Nikon D7000 #3",
    category: "digital",
    subcategory: "APS-C",
    assetTag: "FP-102",
    lensMount: "Nikon F",
    battery: "EN-EL15",
  },
  {
    name: "Nikon D7000 #4",
    category: "digital",
    subcategory: "APS-C",
    assetTag: "FP-103",
    lensMount: "Nikon F",
    battery: "EN-EL15",
  },
  {
    name: "Sony A200",
    category: "digital",
    subcategory: "APS-C",
    assetTag: "FP-104",
    lensMount: "Sony A",
    battery: "Infolithium M",
  },
  {
    name: "Sony A58",
    category: "digital",
    subcategory: "APS-C",
    assetTag: "FP-105",
    lensMount: "Sony A",
    battery: "Infolithium M",
  },
  {
    name: "Minolta XD5",
    category: "film",
    subcategory: "35mm film",
    assetTag: "FP-106",
    lensMount: "Minolta MD",
    battery: "2× LR44 / SR44",
  },
  {
    name: "Nikon N6006 #1",
    category: "film",
    subcategory: "35mm film",
    assetTag: "FP-107",
    lensMount: "Nikon F",
    battery: "CR-P2",
  },
  {
    name: "Nikon N6006 #2",
    category: "film",
    subcategory: "35mm film",
    assetTag: "FP-108",
    lensMount: "Nikon F",
    battery: "CR-P2",
  },
];

export function formatEquipmentNotes(spec: Pick<EquipmentSpec, "lensMount" | "battery">) {
  return `Mount: ${spec.lensMount} · Battery: ${spec.battery}`;
}

export const EQUIPMENT_SPECS_BY_TAG = Object.fromEntries(
  EQUIPMENT_SPECS.map((item) => [item.assetTag, item]),
) as Record<string, EquipmentSpec>;
