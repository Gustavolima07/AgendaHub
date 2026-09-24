// Local-only fixture. Never points at production services.
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, ref, set, goOffline } from 'firebase/database';
import { emptyAccount, dateKey } from '../src/domain';
async function main() {
  const app = initializeApp({
    projectId: 'agendahub-26997',
    apiKey: 'local-emulator',
    databaseURL: 'https://agendahub-26997-default-rtdb.firebaseio.com',
  });
  const auth = getAuth(app),
    db = getDatabase(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(
      auth,
      'demo@agendahub.test',
      'AgendaHub-local-2026',
    );
  } catch {
    credential = await signInWithEmailAndPassword(
      auth,
      'demo@agendahub.test',
      'AgendaHub-local-2026',
    );
  }
  await updateProfile(credential.user, { displayName: 'Gustavo Demo' });
  const a = emptyAccount();
  a.settings.name = 'Gustavo Demo';
  a.products = {
    p1: { id: 'p1', name: 'Café especial', type: 'Grãos • 250 g', quantity: 40, price: 32.9 },
    p2: {
      id: 'p2',
      name: 'Pão de fermentação natural',
      type: 'Artesanal',
      quantity: 25,
      price: 22,
    },
    p3: { id: 'p3', name: 'Mel silvestre', type: 'Orgânico • 500 g', quantity: 18, price: 28 },
  };
  const line = {
    productId: 'p1',
    name: 'Café especial',
    type: 'Grãos • 250 g',
    quantity: 2,
    price: 32.9,
  };
  a.clients = {
    c1: {
      id: 'c1',
      name: 'Marina • Demonstração',
      email: 'marina@example.com',
      phone: '',
      address: 'Praça da Sé, São Paulo, SP',
      notes: 'Dados fictícios para testes locais.',
      monthly: [line],
      day: 25,
      time: '09:00',
      latitude: -23.5505,
      longitude: -46.6333,
    },
    c2: {
      id: 'c2',
      name: 'Ateliê Aurora • Demo',
      email: 'aurora@example.com',
      phone: '',
      address: 'Avenida Paulista, São Paulo, SP',
      notes: '',
      monthly: [],
      day: 1,
      time: '10:00',
      latitude: -23.5614,
      longitude: -46.6559,
    },
  };
  a.appointments = {
    a1: {
      id: 'a1',
      title: 'Planejar pedidos da semana',
      date: dateKey(),
      time: '08:00',
      duration: 30,
      clientId: '',
      notes: 'Revisar estoque e entregas.',
      reminder: 15,
      status: 'scheduled',
    },
    a2: {
      id: 'a2',
      title: 'Conversar com Marina',
      date: dateKey(),
      time: '14:00',
      duration: 60,
      clientId: 'c1',
      notes: '',
      reminder: 15,
      status: 'scheduled',
    },
  };
  a.deliveries = {
    d1: {
      id: 'd1',
      clientId: 'c1',
      clientName: a.clients.c1.name,
      address: a.clients.c1.address,
      date: dateKey(),
      time: '10:00',
      duration: 30,
      lines: [line],
      status: 'pending',
      notes: '',
      reminder: 30,
      order: 0,
    },
    d2: {
      id: 'd2',
      clientId: 'c2',
      clientName: a.clients.c2.name,
      address: a.clients.c2.address,
      date: dateKey(),
      time: '11:00',
      duration: 30,
      lines: [
        {
          productId: 'p2',
          name: a.products.p2.name,
          type: a.products.p2.type,
          quantity: 3,
          price: 22,
        },
      ],
      status: 'pending',
      notes: '',
      reminder: 30,
      order: 1,
    },
  };
  await set(ref(db, `users/${credential.user.uid}`), a);
  goOffline(db);
  await deleteApp(app);
  console.log('Conta de demonstração local pronta: demo@agendahub.test');
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
