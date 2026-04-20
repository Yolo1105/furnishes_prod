// ─── Budget calculator ────────────────────────────────────────────────────────

const ROOM_BASE: Record<string, [number, number]> = {
  "b2a-lr": [5000, 15000],
  "b2a-br": [3000, 10000],
  "b2a-ho": [2000, 8000],
  "b2a-dr": [3000, 12000],
  "b2a-st": [4000, 12000],
};

const SIZE_MULT: Record<string, number> = {
  "b2b-sm": 0.7,
  "b2b-md": 1,
  "b2b-lg": 1.4,
};

const QUALITY_MULT: Record<string, number> = {
  "b2e-bud": 0.5,
  "b2e-mid": 1,
  "b2e-hi": 2,
};

const DURATION_MULT: Record<string, number> = {
  "b2d-sh": 0.6,
  "b2d-md": 1,
  "b2d-lg": 1.3,
};

const START_MULT: Record<string, number> = {
  "b2c-em": 1.2,
  "b2c-so": 1,
  "b2c-fw": 0.5,
};

const SHOP_MULT: Record<string, number> = {
  "b2f-hunt": 0.7,
  "b2f-bal": 0.85,
  "b2f-conv": 1,
};

export function computeBudgetRange(
  roomType: string,
  size: string,
  start: string,
  duration: string,
  quality: string,
  shopping: string,
): [number, number] {
  const base = ROOM_BASE[roomType] ?? [5000, 15000];
  const m =
    (SIZE_MULT[size] ?? 1) *
    (QUALITY_MULT[quality] ?? 1) *
    (DURATION_MULT[duration] ?? 1) *
    (START_MULT[start] ?? 1) *
    (SHOP_MULT[shopping] ?? 1);
  return [
    Math.round((base[0] * m) / 100) * 100,
    Math.round((base[1] * m) / 100) * 100,
  ];
}
