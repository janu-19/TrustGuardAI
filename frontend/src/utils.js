/**
 * Parse an ISO datetime string by enforcing UTC timezone parsing.
 * Naive database strings (without Z or offset) are treated as UTC,
 * allowing the browser to correctly convert them to the local timezone (e.g. IST).
 */
export const parseUTC = (dateStr) => {
  if (!dateStr) return new Date();
  
  // Check if string already has a timezone indicator (e.g., ends with Z or has an offset like +05:30)
  const hasTimezone = dateStr.endsWith('Z') || 
                      dateStr.includes('+') || 
                      (dateStr.includes('-') && dateStr.lastIndexOf('-') > 7);
                      
  const formattedStr = hasTimezone ? dateStr : `${dateStr}Z`;
  return new Date(formattedStr);
};
