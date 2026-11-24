/*
 * Estimate display helpers. The backend is authoritative for every rule and
 * total; these only mirror it for instant feedback. Estimates have no GST/HSN.
 */

export const UNIT_LABELS = { pcs: "PCS", dozen: "Dozen" };

export const unitLabel = (unit) => UNIT_LABELS[unit] || unit || "";

export const STATUS_LABELS = {
  active: "Active",
  cancelled: "Cancelled",
  converted: "Converted",
};

export const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["upi", "UPI"],
  ["bank_transfer", "Bank Transfer"],
  ["cheque", "Cheque"],
  ["other", "Other"],
];

export const paymentMethodLabel = (method) =>
  (PAYMENT_METHODS.find(([value]) => value === method) || [method, method || "-"])[1];

export const MAX_QUANTITY = 100000;

/** Today's business date (Asia/Kolkata) as YYYY-MM-DD. */
export const getBusinessToday = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

/** Date-only values are stored as UTC midnight: "2026-11-24T00:00:00Z" -> "24/11/26". */
export const formatDateOnly = (value) => {
  if (!value) return "-";
  const key = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return match ? `${match[3]}/${match[2]}/${match[1].slice(2)}` : "-";
};

/** Timestamps (cancel time, void time) shown as DD/MM/YY in Asia/Kolkata. */
export const formatTimestamp = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

/** Whole number 1..MAX_QUANTITY from an input string, or null. */
export const parseQuantity = (value) => {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const quantity = Number(text);
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
    ? quantity
    : null;
};

export const lineTotalPaise = (quantity, pricePaise) =>
  Number.isSafeInteger(quantity) && Number.isSafeInteger(pricePaise) ? quantity * pricePaise : 0;

export const formatAddress = (address) => {
  if (!address) return "";
  return [address.line1, address.line2, address.city, address.pincode]
    .filter((part) => part && String(part).trim())
    .join(", ");
};

export const isCanceledRequest = (err, controller) =>
  err?.code === "ERR_CANCELED" || Boolean(controller?.signal?.aborted);
