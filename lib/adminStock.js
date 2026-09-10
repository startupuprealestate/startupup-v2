import { normalizeHouseKey, houseAliasKey } from './masterStock.js';
import { PROPERTY_OWNERS, getPropertyOwner } from './propertyOwners.js';

export function getPendingStockHouses(stockIndex, properties) {
  const rows = stockIndex?.pending || [];
  const webKeys = new Set();
  const webAliases = new Set();
  properties.forEach((property) => {
    const key = normalizeHouseKey(property.house_number);
    if (!key) return;
    webKeys.add(key);
    const alias = houseAliasKey(property.project_name, key);
    if (alias) webAliases.add(alias);
  });
  return rows.filter((row) => !webKeys.has(row.key)
    && !webAliases.has(houseAliasKey(row.project, row.key)));
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
