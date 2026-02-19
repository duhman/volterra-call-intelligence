/**
 * Swedish Phone Number Utilities
 *
 * Handles the various formats Swedish phone numbers appear in:
 * - E.164: +46732000004
 * - Local (0-prefix): 0732000004
 * - Country code without +: 46732000004
 * - International dialing: 0046732000004
 * - Spaced variants: 073 200 00 04, 073 - 200 00 04
 */

/**
 * Check if a phone number appears to be Swedish
 * Matches +46, 46, 0046, or 07/08/09 (Swedish mobile/landline prefixes)
 */
export function isSwedishNumber(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, "");

  // +46 or 46 prefix (9+ digits after country code)
  if (digits.startsWith("46") && digits.length > 9) {
    return true;
  }

  // 0046 international dialing prefix
  if (digits.startsWith("0046") && digits.length > 11) {
    return true;
  }

  // Swedish local format: 07, 08, 09 (mobile/landline)
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) {
    const areaCode = digits.slice(0, 2);
    return ["07", "08", "09", "01", "02", "03", "04", "05", "06"].includes(
      areaCode,
    );
  }

  return false;
}

/**
 * Normalize any Swedish phone format to canonical E.164 (+46...)
 * Returns the cleaned number if not Swedish
 *
 * Examples:
 * - "073 - 200 00 04" → "+46732000004"
 * - "0732000004" → "+46732000004"
 * - "+46732000004" → "+46732000004"
 * - "46732000004" → "+46732000004"
 */
export function normalizeToE164(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/[^0-9]/g, "");

  // Already has + prefix - just clean it
  if (phone.trim().startsWith("+")) {
    return "+" + digits;
  }

  // 0046 international dialing → +46
  if (digits.startsWith("0046") && digits.length > 11) {
    return "+46" + digits.slice(4);
  }

  // 46 prefix (country code without +)
  if (digits.startsWith("46") && digits.length > 9) {
    return "+" + digits;
  }

  // 0-prefix Swedish local number → +46
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) {
    return "+46" + digits.slice(1);
  }

  // Not a recognized Swedish format, return cleaned digits
  return digits;
}

/**
 * Generate all Swedish phone format variants for HubSpot search
 *
 * HubSpot contacts may store numbers in any format:
 * - "073 - 200 00 04" (common Swedish format)
 * - "+46732000004" (E.164)
 * - "0732000004" (local)
 *
 * This generates all variants to maximize match probability.
 */
export function getSwedishPhoneVariants(phone: string): string[] {
  if (!phone) return [];

  // Remove all non-digits
  const digits = phone.replace(/[^0-9]/g, "");
  const variants: string[] = [];

  // Original format (for exact matches)
  variants.push(phone);

  // Just digits
  variants.push(digits);

  // Determine the Swedish local number (0-prefix version)
  let localNumber = "";

  // Handle various input formats
  if (digits.startsWith("0046") && digits.length > 11) {
    // 0046XXXXXXXXX → 0XXXXXXXXX
    localNumber = "0" + digits.slice(4);
    variants.push(localNumber);
    variants.push("+46" + digits.slice(4));
    variants.push("46" + digits.slice(4));
  } else if (digits.startsWith("46") && digits.length > 9) {
    // 46XXXXXXXXX or +46XXXXXXXXX → 0XXXXXXXXX
    localNumber = "0" + digits.slice(2);
    variants.push(localNumber);
    variants.push("+46" + digits.slice(2));
    variants.push("0046" + digits.slice(2));
  } else if (
    digits.startsWith("0") &&
    digits.length >= 9 &&
    digits.length <= 11
  ) {
    // Already Swedish local format
    localNumber = digits;
    variants.push("+46" + digits.slice(1));
    variants.push("46" + digits.slice(1));
    variants.push("0046" + digits.slice(1));
  }

  // Generate formatted Swedish variants if we have a 10-digit local number
  if (localNumber && localNumber.length === 10 && localNumber.startsWith("0")) {
    // Common Swedish mobile format: 073 - 200 00 04
    const p1 = localNumber.slice(0, 3); // 073
    const p2 = localNumber.slice(3, 6); // 200
    const p3 = localNumber.slice(6, 8); // 00
    const p4 = localNumber.slice(8); // 04

    // Various spacing/dash formats used in Sweden
    variants.push(`${p1} ${p2} ${p3} ${p4}`); // 073 200 00 04
    variants.push(`${p1} - ${p2} ${p3} ${p4}`); // 073 - 200 00 04 (HubSpot format!)
    variants.push(`${p1}-${p2} ${p3} ${p4}`); // 073-200 00 04
    variants.push(`${p1}-${p2}${p3}${p4}`); // 073-2000004
    variants.push(`${p1} ${p2}${p3}${p4}`); // 073 2000004
  }

  // Remove duplicates while preserving order
  return [...new Set(variants)];
}
