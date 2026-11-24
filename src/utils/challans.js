/*
 * Delivery challan display helpers. The backend is authoritative for the cap
 * and every rule; these only label values and give instant form feedback.
 * Challans carry no GST, prices or tax.
 */

export const DISPATCH_LABELS = {
  none: "Not dispatched",
  partial: "Partly dispatched",
  full: "Fully dispatched",
};

export const CHALLAN_STATUS_LABELS = {
  active: "Active",
  cancelled: "Cancelled",
};

/** "UP32AB1234" style: trimmed, single spaces, uppercase. */
export const normalizeVehicleNumber = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .toUpperCase();

/** Whole number >= 0 from an input string, or null when it is not one. */
export const parseDispatchQuantity = (value) => {
  const text = String(value ?? "").trim();
  if (text === "") return 0;
  if (!/^\d+$/.test(text)) return null;
  const quantity = Number(text);
  return Number.isSafeInteger(quantity) ? quantity : null;
};

export const sumQuantities = (lines) =>
  lines.reduce((total, line) => total + (Number(line.quantity) || 0), 0);
