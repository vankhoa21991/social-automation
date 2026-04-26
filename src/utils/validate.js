export function validateItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (!item.title || typeof item.title !== 'string' || !item.title.trim()) return false;
  const url = item.url || item.link;
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  if (!item.source || typeof item.source !== 'string') return false;
  return true;
}
