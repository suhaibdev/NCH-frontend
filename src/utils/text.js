export const toTitleCaseInput = (value = "") => String(value).replace(/(^|\s)(\S)/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
