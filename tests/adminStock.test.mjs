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

test('same house number in different projects does not hide an unlisted Naphat home', () => {
  const property = { house_number: '89/34', project_name: 'พฤกษาวิลล์ 41/1', property_owner: 'เจ๊หมวย' };
  const row = { key: '89/34', project: 'ไทยสมบูรณ์ 3', owner: 'Naphat' };
  assert.deepEqual(getPendingStockHouses({ pending: [row] }, [property]), [row]);
});

test('89/294 is listed once and appears under Naphat after its saved owner is corrected', () => {
  const property = { house_number: '89/294', project_name: 'พฤกษาวิลล์ 41/1', property_owner: 'Naphat' };
  const row = { key: '89/294', project: 'พฤกษาวิลล์ 41/1', owner: 'Naphat' };
  const pending = getPendingStockHouses({ pending: [row] }, [property]);
  const group = groupAdminStock([property], pending).find(g => g.owner === 'Naphat');
  assert.deepEqual(group.items, [property]);
  assert.deepEqual(group.pending, []);
});

test('two full house numbers with the same suffix remain separate homes', () => {
  const property = { house_number: '11/904', project_name: 'Village' };
  const row = { key: '12/904', project: 'Village' };
  assert.deepEqual(getPendingStockHouses({ pending: [row] }, [property]), [row]);
});

test('an ambiguous abbreviated house number does not hide either candidate', () => {
  const property = { house_number: '904', project_name: 'Village' };
  const rows = [{ key: '11/904', project: 'Village' }, { key: '12/904', project: 'Village' }];
  assert.deepEqual(getPendingStockHouses({ pending: rows }, [property]), rows);
});

test('placeholder house numbers are never used to match unrelated stock rows', () => {
  const property = { house_number: '-', project_name: 'Village' };
  const row = { key: '/', project: 'Village' };
  assert.deepEqual(getPendingStockHouses({ pending: [row] }, [property]), [row]);
});

test('legacy spellings and shorter project names still identify existing listings', () => {
  const pairs = [
    ['บูรพา 12 ดอนเมือง', 'บูรพาวิลล่า 12 ดอนเมือง'],
    ['ไทยสมบูรณ์ 3', 'ไทยสมบรูณ์ 3'],
    ['พฤกษา 115 ไพรม์', 'พฤกษา 115 ไพร์ม'],
    ['แอร์วิลล่า', 'โครงการแอร์วิลล่า'],
    ['กรีนการ์เด้น', 'กรีนกาเด้น'],
    ['ไลโอ รังสิต', 'ไลโอ'],
    ['บดินธร 3 (แฝดกึ่งเดี่ยว)', 'บดินธร 3'],
    ['เอื้ออาทรคลองสาม', 'บ้านเอื้ออาทร'],
  ];
  pairs.forEach(([master, web]) => {
    assert.deepEqual(getPendingStockHouses({ pending: [{ key: '1/99', project: master }] },
      [{ house_number: '1/99', project_name: web }]), [], `${master} / ${web}`);
  });
});

test('similar project names in different phases cannot match', () => {
  const row = { key: '1/99', project: 'พฤกษา 12' };
  assert.deepEqual(getPendingStockHouses({ pending: [row] },
    [{ house_number: '1/99', project_name: 'พฤกษา 1' }]), [row]);
});
