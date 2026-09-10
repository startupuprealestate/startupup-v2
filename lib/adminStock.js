import { normalizeHouseKey, normalizeProjectKey } from './masterStock.js';
import { PROPERTY_OWNERS, getPropertyOwner } from './propertyOwners.js';

// Existing website records use shortened names and these legacy spellings.
// Keep matching conservative: phase numbers must agree when both names have them.
const stockProjectKey = value => normalizeProjectKey(value)
  .replace(/^(?:โครงการ|หมู่บ้าน|บ้าน)+/, '')
  .replace(/\([^)]*\)/g, '')
  .replace(/ไทยสมบรูณ์/g, 'ไทยสมบูรณ์')
  .replace(/ไพร์ม/g, 'ไพรม์')
  .replace(/กรีนกาเด้น/g, 'กรีนการ์เด้น')
  .replace(/บูรพาวิลล่า/g, 'บูรพา');

const sameProject = (left, right) => {
  if (!left || !right) return false;
  if (left === right) return true;
  const leftPhase = left.match(/\d+/g)?.join('/');
  const rightPhase = right.match(/\d+/g)?.join('/');
  if (leftPhase && rightPhase && leftPhase !== rightPhase) return false;
  return Math.min(left.length, right.length) >= 4
    && (left.startsWith(right) || right.startsWith(left));
};

export function getPendingStockHouses(stockIndex, properties) {
  const rows = stockIndex?.pending || [];
  const listed = new Set();
  properties.forEach((property) => {
    const key = normalizeHouseKey(property.house_number);
    const project = stockProjectKey(property.project_name);
    if (!key || !/[0-9๐-๙]/.test(key) || !project) return;
    // House numbers are reused across villages. Require the project as well,
    // regardless of which owner the website record was originally saved under.
    const candidates = rows.filter(row => sameProject(stockProjectKey(row.project), project));
    const exact = candidates.filter(row => row.key === key);
    if (exact.length === 1) {
      listed.add(exact[0]);
      return;
    }
    if (exact.length) return;
    // Support 904 -> 11/904 only when one side is abbreviated and the match
    // points to one house. Never conflate two full numbers like 11/904 and 12/904.
    const aliases = candidates.filter(row => row.key.includes('/') !== key.includes('/')
      && row.key.split('/').pop() === key.split('/').pop());
    if (aliases.length === 1) listed.add(aliases[0]);
  });
  return rows.filter(row => !listed.has(row));
}

export function groupAdminStock(properties, pending, searchTerm = '') {
  const search = searchTerm.trim().toLowerCase();
  const matches = (values) => values.some(value => String(value || '').toLowerCase().includes(search));
  return PROPERTY_OWNERS.map(owner => ({
    owner,
    items: properties.filter(property => getPropertyOwner(property) === owner
      && matches([property.project_name, property.house_number, property.custom_id, owner])),
    pending: pending.filter(row => row.owner === owner
      && matches([row.project, row.houseNumber, row.zone, owner])),
  }));
}
