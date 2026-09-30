import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyAccount,
  saveAppointment,
  saveDelivery,
  completeDelivery,
  cancelDelivery,
  reserved,
  generateMonthly,
  monthlyCsv,
  mapsUrls,
  availableSlots,
  validateSlot,
  optimizeRoute,
  stockShortages,
} from '../src/domain';
import { Delivery } from '../src/types';
function fixture() {
  const a = emptyAccount();
  a.products.p = {
    id: 'p',
    name: 'Pão artesanal',
    type: 'Alimento',
    quantity: 20,
    price: 12,
  };
  a.clients.c = {
    id: 'c',
    name: 'Ana',
    phone: '',
    email: '',
    address: 'Rua A, 10, São Paulo',
    notes: '',
    monthly: [
      {
        productId: 'p',
        name: 'Pão artesanal',
        type: 'Alimento',
        quantity: 2,
        price: 12,
      },
    ],
    day: 31,
    time: '09:00',
    latitude: -23.55,
    longitude: -46.63,
  };
  return a;
}
function delivery(id = 'd'): Delivery {
  return {
    id,
    clientId: 'c',
    clientName: 'Ana',
    address: 'Rua A, 10, São Paulo',
    date: '2026-09-24',
    time: '10:00',
    duration: 30,
    lines: fixture().clients.c.monthly,
    status: 'pending',
    notes: '',
    reminder: 15,
    order: 0,
  };
}
test('conflicts include appointments and deliveries but allow adjacent intervals', () => {
  const a = fixture();
  saveDelivery(a, delivery());
  assert.throws(
    () =>
      saveAppointment(a, {
        id: 'a',
        title: 'Reunião',
        date: '2026-09-24',
        time: '10:15',
        duration: 30,
        clientId: '',
        notes: '',
        reminder: 15,
        status: 'scheduled',
      }),
    /conflita/,
  );
  saveAppointment(a, {
    id: 'a',
    title: 'Reunião',
    date: '2026-09-24',
    time: '10:30',
    duration: 30,
    clientId: '',
    notes: '',
    reminder: 15,
    status: 'scheduled',
  });
  assert(!availableSlots(a, '2026-09-24').includes('10:00'));
  assert(availableSlots(a, '2026-09-24').includes('11:00'));
});
test('allows overstock demand, reports shortage, and blocks completion until replenished', () => {
  const a = fixture(),
    d = delivery();
  d.lines[0].quantity = 15;
  saveDelivery(a, d);
  assert.equal(reserved(a, 'p'), 15);
  const d2 = delivery('d2');
  d2.time = '12:00';
  d2.lines[0].quantity = 6;
  saveDelivery(a, d2);
  assert.equal(stockShortages(a)[0].missing, 1);
  completeDelivery(a, 'd');
  assert.equal(a.products.p.quantity, 5);
  assert.equal(stockShortages(a)[0].missing, 1);
  assert.throws(() => completeDelivery(a, 'd2'), /Estoque insuficiente/);
  a.products.p.quantity = 6;
  completeDelivery(a, 'd2');
  assert.equal(a.products.p.quantity, 0);
  assert.equal(reserved(a, 'p'), 0);
  assert.throws(() => completeDelivery(a, 'd'));
});
test('editing does not double-reserve; cancelling releases stock', () => {
  const a = fixture();
  saveDelivery(a, delivery());
  saveDelivery(a, { ...delivery(), time: '11:00' });
  assert.equal(reserved(a, 'p'), 2);
  a.deliveries.d.status = 'cancelled';
  assert.equal(reserved(a, 'p'), 0);
});
test('monthly orders clamp days and are idempotent including cancelled orders', () => {
  const a = fixture();
  assert.equal(generateMonthly(a, '2027-02'), 1);
  const d = Object.values(a.deliveries)[0];
  assert.equal(d.date, '2027-02-28');
  assert.equal(generateMonthly(a, '2027-02'), 0);
  d.status = 'cancelled';
  assert.equal(generateMonthly(a, '2027-02'), 0);
});
test('monthly CSV contains exactly three columns and combines product quantities', () => {
  const a = fixture();
  a.deliveries.d = delivery();
  a.deliveries.e = { ...delivery('e'), time: '11:00' };
  a.deliveries.f = { ...delivery('f'), status: 'cancelled' };
  const csv = monthlyCsv(a, '2026-09');
  assert.equal(csv, '\uFEFFNome;Tipo;Quantidade\r\n"Pão artesanal";"Alimento";4');
  a.deliveries.d.lines[0].name = '=SUM(1)';
  assert(monthlyCsv(a, '2026-09').includes('"\'=SUM(1)"'));
});
test('date and time validation rejects impossible dates and midnight crossing', () => {
  assert.throws(() => validateSlot('2026-02-30', '10:00', 30));
  assert.throws(() => validateSlot('2026-09-24', '24:00', 30));
  assert.throws(() => validateSlot('2026-09-24', '23:50', 30));
  validateSlot('2028-02-29', '23:30', 30);
});
test('navigation export keeps all stops through mobile-compatible segments', () => {
  const list = Array.from({ length: 8 }, (_, i) => ({
    ...delivery(String(i)),
    address: `Rua ${i}`,
  }));
  const urls = mapsUrls(list);
  assert.equal(urls.length, 3);
  assert.equal(new URL(urls[1]).searchParams.get('origin'), 'Rua 2');
  assert.equal(new URL(urls[2]).searchParams.get('destination'), 'Rua 7');
  assert.deepEqual(mapsUrls([]), []);
});
test('route proximity preserves first stop and requires complete coordinates', () => {
  const a = fixture();
  assert.deepEqual(
    optimizeRoute(a, [delivery()]).map((x) => x.id),
    ['d'],
  );
  delete a.clients.c.latitude;
  assert.throws(() => optimizeRoute(a, [delivery()]), /latitude/);
});

test('a stale screen cannot cancel or reopen a completed delivery', () => {
  const account = fixture(),
    pending = delivery();
  saveDelivery(account, pending);
  const stale = JSON.parse(JSON.stringify(pending));
  completeDelivery(account, pending.id);
  assert.throws(() => cancelDelivery(account, pending.id), /finalizada/);
  assert.throws(() => saveDelivery(account, stale), /finalizada/);
  assert.equal(account.products.p.quantity, 18);
  assert.equal(account.deliveries.d.status, 'delivered');
});

test('monthly generation leaves no partial batch after a conflict', () => {
  const account = fixture();
  account.clients.c2 = { ...account.clients.c, id: 'c2', name: 'Bruno' };
  assert.throws(() => generateMonthly(account, '2026-09'), /conflito/);
  assert.deepEqual(account.deliveries, {});
});
