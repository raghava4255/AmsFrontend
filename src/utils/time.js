export const formatTime24h = (timeStr) => {
  if (!timeStr) return '';
  const hasAMPM = timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm');
  if (!hasAMPM) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const h = parts[0].trim().padStart(2, '0');
      const m = parts[1].trim().slice(0, 2).padStart(2, '0');
      return `${h}:${m}`;
    }
    return timeStr;
  }
  const isPM = timeStr.toLowerCase().includes('pm');
  const cleanStr = timeStr.replace(/am|pm/gi, '').trim();
  const parts = cleanStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].trim().slice(0, 2).padStart(2, '0');
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};
