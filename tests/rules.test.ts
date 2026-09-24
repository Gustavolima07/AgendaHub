import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { ref, get, set } from 'firebase/database';
import { emptyAccount } from '../src/domain';
test('database isolates accounts and rejects invalid stock', async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-agendahub',
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: readFileSync('database.rules.json', 'utf8'),
    },
  });
  try {
    await env.clearDatabase();
    const own = env.authenticatedContext('alice').database(),
      other = env.authenticatedContext('bob').database(),
      anonymous = env.unauthenticatedContext().database();
    await assertSucceeds(set(ref(own, 'users/alice'), emptyAccount()));
    await assertSucceeds(get(ref(own, 'users/alice')));
    await assertFails(get(ref(other, 'users/alice')));
    await assertFails(set(ref(other, 'users/alice/settings/name'), 'Invader'));
    await assertFails(get(ref(anonymous, 'users/alice')));
    await assertFails(get(ref(own, 'users')));
    await assertFails(
      set(ref(own, 'users/alice/products/p'), {
        id: 'p',
        name: 'Produto',
        type: 'Teste',
        quantity: -1,
        price: 1,
      }),
    );
    await assertSucceeds(
      set(ref(own, 'users/alice/products/p'), {
        id: 'p',
        name: 'Produto',
        type: 'Teste',
        quantity: 3,
        price: 1,
      }),
    );
    await assertFails(set(ref(own, 'users/alice/unknown'), true));
  } finally {
    await env.cleanup();
  }
});
