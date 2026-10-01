/** Merge a Realtime Database export into one account on the local emulators. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, goOffline, ref, set } from 'firebase/database';
import { emptyAccount, normalize } from '../src/domain';
import type { Account, Line } from '../src/types';

const email = 'importado@agendahub.test';
const password = 'AgendaHub-importacao-2026';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function mergeExport(raw: unknown): { account: Account; sourceCount: number } {
  if (!isRecord(raw) || !isRecord(raw.users))
    throw new Error('O JSON precisa conter um objeto "users" do Realtime Database.');

  const sources = Object.values(raw.users).filter(isRecord);
  if (!sources.length) throw new Error('O JSON não contém contas para importar.');

  const merged = emptyAccount();
  merged.settings.name = 'Dados importados (teste)';
  const nextOrderByDate: Record<string, number> = {};

  sources.forEach((source, sourceIndex) => {
    const account = normalize(source as Partial<Account>);
    const prefix = `origem${sourceIndex + 1}_`;
    const productId = (id: string) => (id ? `${prefix}${id}` : '');
    const clientId = (id: string) => (id ? `${prefix}${id}` : '');
    const lineForImport = (line: Line): Line => ({
      ...line,
      productId: productId(line.productId),
    });

    for (const [id, product] of Object.entries(account.products)) {
      const newId = productId(id);
      merged.products[newId] = { ...product, id: newId };
    }
    for (const [id, client] of Object.entries(account.clients)) {
      const newId = clientId(id);
      merged.clients[newId] = {
        ...client,
        id: newId,
        monthly: (client.monthly || []).map(lineForImport),
      };
    }
    for (const [id, appointment] of Object.entries(account.appointments)) {
      const newId = `${prefix}${id}`;
      merged.appointments[newId] = {
        ...appointment,
        id: newId,
        clientId: clientId(appointment.clientId || ''),
      };
    }

    // Daily routes are stored as deliveries with an `order` number, not as a
    // separate collection. Keep every source route's order when combining days.
    const deliveries = Object.entries(account.deliveries).sort(
      ([, a], [, b]) =>
        a.date.localeCompare(b.date) ||
        (a.order ?? 0) - (b.order ?? 0) ||
        a.time.localeCompare(b.time),
    );
    for (const [id, delivery] of deliveries) {
      const newId = `${prefix}${id}`;
      const day = delivery.date;
      const order = nextOrderByDate[day] || 0;
      nextOrderByDate[day] = order + 1;
      merged.deliveries[newId] = {
        ...delivery,
        id: newId,
        clientId: clientId(delivery.clientId),
        lines: (delivery.lines || []).map(lineForImport),
        order,
        ...(delivery.recurringKey ? { recurringKey: `${prefix}${delivery.recurringKey}` } : {}),
      };
    }
  });

  return { account: merged, sourceCount: sources.length };
}

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath || sourcePath.startsWith('--'))
    throw new Error('Uso: npx tsx scripts/import-export-emulator.ts <export.json> [--dry-run|--replace]');
  const replace = process.argv.includes('--replace');
  const { account, sourceCount } = mergeExport(
    JSON.parse(readFileSync(resolve(sourcePath), 'utf8')) as unknown,
  );
  const summary = `${sourceCount} contas, ${Object.keys(account.clients).length} clientes, ` +
    `${Object.keys(account.products).length} produtos, ${Object.keys(account.deliveries).length} entregas/paradas`;
  if (process.argv.includes('--dry-run')) {
    console.log(`Prévia local (nenhum dado gravado): ${summary}.`);
    return;
  }

  const app = initializeApp({
    projectId: 'agendahub-26997',
    apiKey: 'local-emulator',
    databaseURL: 'https://agendahub-26997-default-rtdb.firebaseio.com',
  });
  const auth = getAuth(app);
  const db = getDatabase(app);
  // Connect before any auth or database request. This script never writes live data.
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);

  try {
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/email-already-in-use') throw error;
      credential = await signInWithEmailAndPassword(auth, email, password);
    }
    const accountRef = ref(db, `users/${credential.user.uid}`);
    if ((await get(accountRef)).exists() && !replace)
      throw new Error('A conta de importação já contém dados. Use --replace para substituí-los.');
    await updateProfile(credential.user, { displayName: 'Dados importados (teste)' });
    await set(accountRef, account);
    console.log(`Importação local concluída: ${summary}.`);
    console.log(`Login no emulador: ${email} / ${password}`);
  } finally {
    goOffline(db);
    await deleteApp(app);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
