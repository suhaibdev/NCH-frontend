/*
 * Mirrors NCH backend src/utils/gst.js and customerPricing.js for instant form
 * feedback. The backend stays authoritative for every rule here.
 */

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const NCH_STATE_CODE = "09";

export const STATE_OPTIONS = [
  ["01", "Jammu and Kashmir"],
  ["02", "Himachal Pradesh"],
  ["03", "Punjab"],
  ["04", "Chandigarh"],
  ["05", "Uttarakhand"],
  ["06", "Haryana"],
  ["07", "Delhi"],
  ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"],
  ["10", "Bihar"],
  ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"],
  ["14", "Manipur"],
  ["15", "Mizoram"],
  ["16", "Tripura"],
  ["17", "Meghalaya"],
  ["18", "Assam"],
  ["19", "West Bengal"],
  ["20", "Jharkhand"],
  ["21", "Odisha"],
  ["22", "Chhattisgarh"],
  ["23", "Madhya Pradesh"],
  ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"],
  ["27", "Maharashtra"],
  ["29", "Karnataka"],
  ["30", "Goa"],
  ["31", "Lakshadweep"],
  ["32", "Kerala"],
  ["33", "Tamil Nadu"],
  ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"],
  ["36", "Telangana"],
  ["37", "Andhra Pradesh"],
  ["38", "Ladakh"],
  ["97", "Other Territory"],
];

const STATE_NAMES = Object.fromEntries(STATE_OPTIONS);

export const GST_RATE_PERCENTS = [0, 0.25, 3, 5, 18, 40];
export const DEFAULT_GST_RATE_PERCENT = 5;

export const HSN_PATTERN = /^\d{4,8}$/;

export const isValidStateCode = (code) =>
  typeof code === "string" && Object.prototype.hasOwnProperty.call(STATE_NAMES, code);

export const isValidGstin = (value) =>
  typeof value === "string" && GSTIN_PATTERN.test(value) && isValidStateCode(value.slice(0, 2));

export const stateCodeFromGstin = (value) => (isValidGstin(value) ? value.slice(0, 2) : "");

/** "09" -> "09 - Uttar Pradesh"; unknown or empty -> "" */
export const formatState = (code) =>
  isValidStateCode(code) ? `${code} - ${STATE_NAMES[code]}` : "";

/** Rupee text with up to 2 decimals -> integer paise, or null when invalid. */
export const rupeesToPaise = (value) => {
  const source = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(source)) return null;
  const [whole, fraction = ""] = source.split(".");
  const paise = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null;
};

/** 12550 -> "125.50" (for inputs) */
export const paiseToRupeesInput = (paise) =>
  Number.isSafeInteger(paise) && paise >= 0
    ? `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`
    : "";

/** 12550 -> "₹125.50" (for display) */
export const formatPaise = (paise) =>
  Number.isFinite(Number(paise))
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(Number(paise) / 100)
    : "-";

/** Finished Goods without a stored rate are treated as 5%. */
export const effectiveGstRate = (item) =>
  item && item.gstRatePercent !== undefined && item.gstRatePercent !== null
    ? item.gstRatePercent
    : DEFAULT_GST_RATE_PERCENT;
