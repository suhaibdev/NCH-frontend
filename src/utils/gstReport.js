/*
 * GST report page helpers: period selection (month, financial year, custom
 * range) in the Asia/Kolkata business calendar. The server validates every
 * period; these only build the choices and the query.
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const SUPPLY_LABELS = {
  b2b: "B2B (customer has GSTIN)",
  b2c: "B2C (no GSTIN)",
};

/** "2026-11-24" -> "2026-27" (April to March). */
export const financialYearOf = (dateKey) => {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

/** The current FY and the four before it, newest first. */
export const financialYearOptions = (today) => {
  const current = Number(financialYearOf(today).slice(0, 4));
  return Array.from({ length: 5 }, (_, index) => {
    const start = current - index;
    return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  });
};

/** Months of a financial year (April to March) that have started by `today`. */
export const monthsOfFinancialYear = (fy, today) => {
  const start = Number(fy.slice(0, 4));
  return Array.from({ length: 12 }, (_, index) => {
    const monthIndex = (3 + index) % 12;
    const year = index < 9 ? start : start + 1;
    const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    return { value, label: `${MONTH_NAMES[monthIndex]} ${year}` };
  }).filter((month) => `${month.value}-01` <= today);
};

/** Period from the URL query; defaults to the current month. */
export const periodFromParams = (params, today) => {
  const mode = params.get("mode");
  if (mode === "fy" && params.get("fy")) return { mode: "fy", fy: params.get("fy") };
  if (mode === "range" && params.get("from") && params.get("to")) {
    return { mode: "range", from: params.get("from"), to: params.get("to") };
  }
  return { mode: "month", month: params.get("month") || today.slice(0, 7) };
};

/** API query for a period. */
export const periodQuery = (period) => {
  if (period.mode === "fy") return { fy: period.fy };
  if (period.mode === "range") return { from: period.from, to: period.to };
  return { month: period.month };
};

/** URL search params for a period. */
export const periodSearch = (period) => ({ mode: period.mode, ...periodQuery(period) });

/** Turns an error response that arrived as a Blob (CSV download) back into its message. */
export const blobErrorMessage = async (err, fallback) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || fallback;
};
