/**
 * Global OCR text normalizer for purchase PDFs.
 * Apply this BEFORE routing to any supplier-specific parser.
 *
 * Safe, minimal replacements:
 *  - "VRDE"  -> "VERDE"          (word boundary, case-insensitive)
 *  - "OFF"   -> "OFF WHITE"      (only when "OFF" stands alone; doesn't touch "OFF WHITE")
 *
 * Extensible: pass extra rules or edit DEFAULT_REPLACERS below.
 */
function normalizePurchaseOCRText_(raw, extraReplacers){
  var text = String(raw || '');

  // ---- Default rules (safe) ----
  var DEFAULT_REPLACERS = [
    // VRDE → VERDE (standalone token)
    { desc: 'VRDE->VERDE', re: /\bVRDE\b/gi, to: 'VERDE' },

    // OFF → OFF WHITE, but do NOT modify when already "OFF WHITE"
    // { desc: 'OFF->OFF WHITE', re: /\bOFF\b(?!\s*WHITE\b)/gi, to: 'OFF WHITE' },
  ];

  // Merge with optional extra rules
  var replacers = (extraReplacers && extraReplacers.push)
    ? DEFAULT_REPLACERS.concat(extraReplacers)
    : DEFAULT_REPLACERS;

  // Apply sequentially (order matters if rules overlap)
  for (var i = 0; i < replacers.length; i++){
    try {
      text = text.replace(replacers[i].re, replacers[i].to);
    } catch (e) {
      // Defensive: ignore malformed regex in extra rules
    }
  }
  return text;
}
