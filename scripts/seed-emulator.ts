// Local-only fixture. All recipients are fictional; addresses are public landmarks.
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
  const auth = getAuth(app);
  const db = getDatabase(app);
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

  const account = emptyAccount();
  account.settings.name = 'Gustavo Demo';
  account.products = {
    p1: {
      id: 'p1',
      name: 'Caf\u00e9 especial',
      type: 'Gr\u00e3os 250 g',
      quantity: 80,
      price: 32.9,
      costPrice: 18,
    },
    p2: {
      id: 'p2',
      name: 'P\u00e3o de fermenta\u00e7\u00e3o natural',
      type: 'Artesanal',
      quantity: 60,
      price: 22,
      costPrice: 11,
    },
    p3: {
      id: 'p3',
      name: 'Mel silvestre',
      type: 'Org\u00e2nico 500 g',
      quantity: 50,
      price: 28,
      costPrice: 15,
    },
    p4: {
      id: 'p4',
      name: 'Geleia de morango',
      type: 'Artesanal 250 g',
      quantity: 55,
      price: 19.9,
      costPrice: 9,
    },
    p5: { id: 'p5', name: 'Kit presente', type: 'Cesta', quantity: 35, price: 69.9, costPrice: 38 },
  };
  const productIds = Object.keys(account.products);
  const lineFor = (productId: string, quantity: number) => {
    const product = account.products[productId];
    return {
      productId,
      name: product.name,
      type: product.type,
      quantity,
      price: product.price,
      costPrice: product.costPrice,
    };
  };

  const locations = [
    {
      name: 'Marina',
      address: 'Pra\u00e7a da S\u00e9, S\u00e3o Paulo, SP',
      latitude: -23.5505,
      longitude: -46.6333,
    },
    {
      name: 'Rafael',
      address: 'Allianz Parque, Avenida Francisco Matarazzo, 1705, S\u00e3o Paulo, SP',
      latitude: -23.5275,
      longitude: -46.6788,
    },
    {
      name: 'Camila',
      address: 'Mercado Municipal de S\u00e3o Paulo, Rua da Cantareira, 306, S\u00e3o Paulo, SP',
      latitude: -23.5418,
      longitude: -46.6291,
    },
    {
      name: 'Lucas',
      address: 'Parque Ibirapuera, Avenida Pedro \u00c1lvares Cabral, S\u00e3o Paulo, SP',
      latitude: -23.5874,
      longitude: -46.6576,
    },
    {
      name: 'Bianca',
      address:
        'P\u00e1tio do Col\u00e9gio, Pra\u00e7a P\u00e1tio do Col\u00e9gio, 2, S\u00e3o Paulo, SP',
      latitude: -23.5489,
      longitude: -46.632,
    },
    {
      name: 'Felipe',
      address: 'MASP, Avenida Paulista, 1578, S\u00e3o Paulo, SP',
      latitude: -23.5614,
      longitude: -46.6559,
    },
    {
      name: 'Joana',
      address: 'Pinacoteca de S\u00e3o Paulo, Pra\u00e7a da Luz, 2, S\u00e3o Paulo, SP',
      latitude: -23.5343,
      longitude: -46.6337,
    },
    {
      name: 'Bruno',
      address: 'Museu do Ipiranga, Rua dos Patriotas, 100, S\u00e3o Paulo, SP',
      latitude: -23.5855,
      longitude: -46.6092,
    },
    {
      name: 'Larissa',
      address: 'Parque Trianon, Avenida Paulista, S\u00e3o Paulo, SP',
      latitude: -23.5591,
      longitude: -46.657,
    },
    {
      name: 'Pedro',
      address: 'Theatro Municipal, Pra\u00e7a Ramos de Azevedo, S\u00e3o Paulo, SP',
      latitude: -23.5452,
      longitude: -46.6388,
    },
  ];

  account.clients = Object.fromEntries(
    locations.map((location, index) => {
      const id = `c${index + 1}`;
      return [
        id,
        {
          id,
          name: `${location.name} (demo)`,
          email: `cliente${index + 1}@example.com`,
          phone: '',
          address: location.address,
          notes: 'Pessoa fict\u00edcia; local p\u00fablico usado somente para testes.',
          monthly: index < 2 ? [lineFor(productIds[index], 1)] : [],
          day: 25,
          time: '09:00',
          latitude: location.latitude,
          longitude: location.longitude,
        },
      ];
    }),
  );

  const today = dateKey();
  account.appointments = {
    a1: {
      id: 'a1',
      title: 'Planejar pedidos da semana',
      date: today,
      time: '08:00',
      duration: 30,
      clientId: '',
      notes: 'Revisar estoque e entregas.',
      reminder: 15,
      status: 'scheduled',
    },
    a2: {
      id: 'a2',
      title: 'Revisar rota de demonstra\u00e7\u00e3o',
      date: today,
      time: '15:00',
      duration: 30,
      clientId: '',
      notes: '',
      reminder: 15,
      status: 'scheduled',
    },
  };
  account.deliveries = Object.fromEntries(
    locations.map((_, index) => {
      const id = `d${index + 1}`;
      const client = account.clients[`c${index + 1}`];
      const minute = 9 * 60 + index * 30;
      const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      return [
        id,
        {
          id,
          clientId: client.id,
          clientName: client.name,
          address: client.address,
          date: today,
          time,
          duration: 30,
          lines: [
            lineFor(productIds[index % productIds.length], 1 + (index % 3)),
            lineFor(productIds[(index + 2) % productIds.length], 1),
          ],
          status: 'pending',
          notes: 'Entrega de demonstra\u00e7\u00e3o.',
          reminder: 30,
          order: index,
        },
      ];
    }),
  );

  await set(ref(db, `users/${credential.user.uid}`), account);
  goOffline(db);
  await deleteApp(app);
  console.log(
    `Conta local pronta: demo@agendahub.test (10 clientes, 5 produtos e 10 paradas em ${today}).`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
