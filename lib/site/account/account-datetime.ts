/** Consistent SG-facing account UI dates (matches existing account views). */

const DT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

const D_ONLY: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

export function formatAccountDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-SG", DT).format(d);
}

export function formatAccountDate(d: Date): string {
  return new Intl.DateTimeFormat("en-SG", D_ONLY).format(d);
}

export function formatAccountDateTimeRange(from: Date, to: Date): string {
  const fmt = new Intl.DateTimeFormat("en-SG", DT);
  return `${fmt.format(from)} – ${fmt.format(to)}`;
}
