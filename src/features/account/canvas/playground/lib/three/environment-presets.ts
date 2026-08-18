import type { EnvPreset } from "@studio/store/ui-flags-slice";

/** Self-hosted HDRI files (pmndrs/drei-assets). Avoids blocked CDNs + CSP. */
export const ENV_HDRI_PATH = "/studio/hdri/";

export const ENV_PRESET_FILES: Record<EnvPreset, string> = {
  apartment: "lebombo_1k.hdr",
  city: "potsdamer_platz_1k.hdr",
  dawn: "kiara_1_dawn_1k.hdr",
  forest: "forest_slope_1k.hdr",
  lobby: "st_fagans_interior_1k.hdr",
  night: "dikhololo_night_1k.hdr",
  park: "rooitou_park_1k.hdr",
  studio: "studio_small_03_1k.hdr",
  sunset: "venice_sunset_1k.hdr",
  warehouse: "empty_warehouse_01_1k.hdr",
};

export function environmentPropsForPreset(preset: EnvPreset) {
  return {
    files: ENV_PRESET_FILES[preset],
    path: ENV_HDRI_PATH,
  };
}
