// Egyptian Pound formatter — use this everywhere instead of `$${n}`
const _fmt = new Intl.NumberFormat('ar-EG', {
    style:    'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  /**
   * formatEGP(1500) → "١٬٥٠٠٫٠٠ ج.م."  (Arabic locale)
   * formatEGP(1500, true) → "EGP 1,500.00"  (Latin digits, better for tables)
   */
  export function formatEGP(value, latin = true) {
    const n = Number(value || 0);
    if (latin) {
      return 'EGP ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return _fmt.format(n);
  }
  
  // Short alias
  export const egp = formatEGP;