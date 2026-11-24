/*
 * PREVIEW-ONLY mirror of NCH backend src/utils/gstInvoice.js.
 * The server computes and stores the real tax; the saved invoice is
 * authoritative. Prices are exclusive of GST; all amounts are paise.
 */
import { GST_RATE_PERCENTS, NCH_STATE_CODE, isValidStateCode } from "./gst";

const roundHalfUp = (numerator, denominator) =>
  Math.floor((2 * numerator + denominator) / (2 * denominator));

/** "intra" (CGST + SGST) for state 09, "inter" (IGST) otherwise, null without a valid state. */
export const determineTaxType = (stateCode) => {
  if (!isValidStateCode(stateCode)) return null;
  return stateCode === NCH_STATE_CODE ? "intra" : "inter";
};

export const TAX_TYPE_LABELS = { intra: "CGST + SGST", inter: "IGST" };

export const hasTaxMetadata = (item) =>
  Boolean(item?.hsnCode) &&
  item.gstRatePercent !== undefined &&
  item.gstRatePercent !== null &&
  GST_RATE_PERCENTS.includes(item.gstRatePercent);

/** lines: [{ gstRatePercent, taxablePaise }] -> breakdown, or null if any line is incomplete. */
export const previewInvoiceTax = (lines, taxType) => {
  if (!taxType || lines.some((line) => !GST_RATE_PERCENTS.includes(line.gstRatePercent))) {
    return null;
  }

  const groups = new Map();
  lines.forEach((line) => {
    groups.set(line.gstRatePercent, (groups.get(line.gstRatePercent) || 0) + line.taxablePaise);
  });

  const taxSummary = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([gstRatePercent, taxablePaise]) => {
      const bp = Math.round(gstRatePercent * 100);
      const half = taxType === "intra" ? roundHalfUp(taxablePaise * bp, 20000) : 0;
      const igstPaise = taxType === "inter" ? roundHalfUp(taxablePaise * bp, 10000) : 0;
      return {
        gstRatePercent,
        taxablePaise,
        cgstPaise: half,
        sgstPaise: half,
        igstPaise,
        taxPaise: half * 2 + igstPaise,
      };
    });

  const sum = (field) => taxSummary.reduce((total, row) => total + row[field], 0);
  const taxablePaise = sum("taxablePaise");
  const cgstPaise = sum("cgstPaise");
  const sgstPaise = sum("sgstPaise");
  const igstPaise = sum("igstPaise");
  const taxTotalPaise = cgstPaise + sgstPaise + igstPaise;
  const exactPaise = taxablePaise + taxTotalPaise;
  const totalPaise = roundHalfUp(exactPaise, 100) * 100;

  return {
    taxSummary,
    taxablePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    taxTotalPaise,
    roundOffPaise: totalPaise - exactPaise,
    totalPaise,
  };
};

/** Signed rupee text for the round-off line: +₹0.24 / -₹0.26. */
export const formatSignedPaise = (paise, formatPaise) =>
  `${paise < 0 ? "-" : "+"}${formatPaise(Math.abs(paise))}`;
