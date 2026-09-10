import test from 'node:test';
import assert from 'node:assert/strict';
import { getPendingStockHouses, groupAdminStock } from '../lib/adminStock.js';

test('Naphat group includes the two saved homes and every unlisted Master Stock home', () => {
  const properties = [1, 2].map(n => ({ property_owner: 'Naphat', house_number: `10/${n}`, project_name: 'Village' }));
  const rows = Array.from({ length: 72 }, (_, i) => ({ owner: 'Naphat', key: `10/${i + 1}`, houseNumber: `10/${i + 1}`, project: 'Village' }));
  const pending = getPendingStockHouses({ pending: rows }, properties);
  const group = groupAdminStock(properties, pending).find(g => g.owner === 'Naphat');
  assert.equal(group.items.length, 2);
  assert.equal(group.pending.length, 70);
  assert.equal(group.items.length + group.pending.length, 72);
});

test('search finds a house that exists only in Master Stock', () => {
  const row = { owner: 'Naphat', houseNumber: '37/2090', project: 'พฤกษา 13' };
  const group = groupAdminStock([], [row], '37/2090').find(g => g.owner === 'Naphat');
  assert.deepEqual(group.pending, [row]);
  assert.equal(group.items.length, 0);
  assert.equal(groupAdminStock([], [row], 'missing').every(g => !g.pending.length), true);
});

test('already listed homes are excluded even with an abbreviated house number', () => {
  const properties = [{ house_number: '904', project_name: 'Village' }];
  const row = { key: '11/904', houseNumber: '11/904', project: 'Village' };
  assert.deepEqual(getPendingStockHouses({ pending: [row] }, properties), []);
});

test('unavailable stock data keeps saved properties visible', () => {
  const property = { property_owner: 'Naphat', project_name: 'Village' };
  const group = groupAdminStock([property], getPendingStockHouses(null, [property])).find(g => g.owner === 'Naphat');
  assert.deepEqual(group.items, [property]);
  assert.deepEqual(group.pending, []);
});
