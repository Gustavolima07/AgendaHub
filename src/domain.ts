import { Account, Appointment, Delivery, Line, Palette } from './types';
export const palettes: Palette[] = [
  {
    id: 'forest',
    name: 'Jardim',
    primary: '#22634C',
    background: '#F5F6F2',
    surface: '#FFFFFF',
    text: '#20362B',
    muted: '#69766F',
    accent: '#E6F0D9',
  },
  {
    id: 'ocean',
    name: 'Oceano',
    primary: '#2463A6',
    background: '#F1F6FB',
    surface: '#FFFFFF',
    text: '#18324C',
    muted: '#61788D',
    accent: '#DBECFC',
  },
  {
    id: 'lavender',
    name: 'Lavanda',
    primary: '#7352A0',
    background: '#F8F5FC',
    surface: '#FFFFFF',
    text: '#382B4B',
    muted: '#7A6B8A',
    accent: '#EDE2FA',
  },
  {
    id: 'clay',
    name: 'Terracota',
    primary: '#A54F38',
    background: '#FBF5EF',
    surface: '#FFFFFF',
    text: '#492F26',
    muted: '#896D60',
    accent: '#F8E4D5',
  },
  {
    id: 'rose',
    name: 'Rosé',
    primary: '#A23F67',
    background: '#FCF3F6',
    surface: '#FFFFFF',
    text: '#482B36',
    muted: '#896976',
    accent: '#F7DFE9',
  },
  {
    id: 'night',
    name: 'Noturno',
    primary: '#99D5B5',
    background: '#121C19',
    surface: '#1C2A24',
    text: '#F0F6F2',
    muted: '#A2B7AA',
    accent: '#2C4336',
  },
];
export const emptyAccount = (): Account => ({
  clients: {},
  products: {},
  appointments: {},
  deliveries: {},
  settings: { palette: palettes[0], palettes: [], name: '', notifications: false },
});
export const normalize = (a: Partial<Account> | null): Account => ({
  ...emptyAccount(),
  ...a,
  clients: a?.clients || {},
  products: a?.products || {},
  appointments: a?.appointments || {},
  deliveries: a?.deliveries || {},
  settings: { ...emptyAccount().settings, ...a?.settings, palettes: a?.settings?.palettes || [] },
});
export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const localDate = (date: string, time = '12:00') => new Date(`${date}T${time}:00`);
export const dateLabel = (date: string) =>
  localDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
export const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
export function validateSlot(date: string, time: string, duration: number) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(localDate(date).getTime()) ||
    dateKey(localDate(date)) !== date
  )
    throw Error('Selecione uma data válida.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw Error('Use um horário válido no formato HH:mm.');
  if (!Number.isInteger(duration) || duration < 5 || minutes(time) + duration > 1440)
    throw Error('A duração deve ser de pelo menos 5 minutos e terminar no mesmo dia.');
}
export function activities(a: Account) {
  return [
    ...Object.values(a.appointments)
      .filter((x) => x.status === 'scheduled')
      .map((x) => ({ ...x, kind: 'appointment' as const, label: x.title })),
    ...Object.values(a.deliveries)
      .filter((x) => x.status === 'pending')
      .map((x) => ({ ...x, kind: 'delivery' as const, label: `Entrega • ${x.clientName}` })),
  ].sort((x, y) => `${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`));
}
export function conflicts(
  a: Account,
  item: { id?: string; date: string; time: string; duration: number },
) {
  return activities(a).filter(
    (x) =>
      x.id !== item.id &&
      x.date === item.date &&
      minutes(item.time) < minutes(x.time) + x.duration &&
      minutes(item.time) + item.duration > minutes(x.time),
  );
}
export function availableSlots(a: Account, date: string, duration = 30) {
  if (!Number.isFinite(duration) || duration < 5 || duration > 600) return [];
  const slots: string[] = [];
  for (let m = 8 * 60; m + duration <= 18 * 60; m += 30) {
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    if (!conflicts(a, { date, time, duration }).length) slots.push(time);
  }
  return slots;
}
export function reserved(a: Account, productId: string, exceptId?: string) {
  return Object.values(a.deliveries)
    .filter((d) => d.status === 'pending' && d.id !== exceptId)
    .reduce(
      (sum, d) =>
        sum +
        (d.lines || [])
          .filter((l) => l.productId === productId)
          .reduce((s, l) => s + l.quantity, 0),
      0,
    );
}
export function validateLines(a: Account, lines: Line[], exceptId?: string) {
  if (!lines.length) throw Error('Adicione pelo menos um produto.');
  const totals: Record<string, number> = {};
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0)
      throw Error('Informe quantidades inteiras maiores que zero.');
    totals[line.productId] = (totals[line.productId] || 0) + line.quantity;
  }
  for (const [id, qty] of Object.entries(totals)) {
    const p = a.products[id];
    if (!p || p.archived) throw Error('Um dos produtos não está mais disponível.');
    if (qty > p.quantity - reserved(a, id, exceptId))
      throw Error(
        `Estoque disponível insuficiente para ${p.name}. Disponível: ${p.quantity - reserved(a, id, exceptId)}.`,
      );
  }
}
export function saveAppointment(a: Account, item: Appointment) {
  if (a.appointments[item.id] && a.appointments[item.id].status !== 'scheduled')
    throw Error('Este compromisso já foi finalizado ou cancelado. Atualize a agenda.');
  validateSlot(item.date, item.time, item.duration);
  if (!item.title.trim()) throw Error('Informe o título.');
  if (item.status === 'scheduled' && conflicts(a, item).length)
    throw Error('Esse horário conflita com outra atividade. Escolha um horário disponível.');
  a.appointments[item.id] = item;
}
export function saveDelivery(a: Account, item: Delivery) {
  if (a.deliveries[item.id] && a.deliveries[item.id].status !== 'pending')
    throw Error(
      'Esta entrega já foi finalizada ou cancelada em outro dispositivo. Atualize a lista.',
    );
  validateSlot(item.date, item.time, item.duration);
  if (!a.clients[item.clientId] || a.clients[item.clientId].archived)
    throw Error('Selecione um cliente ativo.');
  if (!item.address.trim()) throw Error('Preencha o endereço da entrega.');
  if (item.status === 'pending') {
    validateLines(a, item.lines, item.id);
    if (conflicts(a, item).length)
      throw Error('Entrega em conflito com outra atividade. Escolha outro horário.');
  }
  a.deliveries[item.id] = item;
}
export function completeDelivery(a: Account, id: string) {
  const d = a.deliveries[id];
  if (!d || d.status !== 'pending') throw Error('Essa entrega não está pendente.');
  validateLines(a, d.lines, id);
  for (const line of d.lines) a.products[line.productId].quantity -= line.quantity;
  d.status = 'delivered';
}
export function cancelDelivery(a: Account, id: string) {
  const delivery = a.deliveries[id];
  if (!delivery || delivery.status !== 'pending')
    throw Error('Esta entrega já foi finalizada ou cancelada. Atualize a lista.');
  delivery.status = 'cancelled';
}
export function generateMonthly(a: Account, month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Mês inválido.');
  const [year, m] = month.split('-').map(Number),
    last = new Date(year, m, 0).getDate();
  let count = 0;
  const draft: Account = { ...a, deliveries: { ...a.deliveries } };
  for (const c of Object.values(a.clients).filter((c) => !c.archived && (c.monthly || []).length)) {
    const recurringKey = `${month}_${c.id}`;
    if (Object.values(a.deliveries).some((d) => d.recurringKey === recurringKey)) continue;
    const id = `monthly_${recurringKey}`,
      lines = c.monthly.map((l) => ({
        ...l,
        name: a.products[l.productId]?.name || l.name,
        type: a.products[l.productId]?.type || l.type,
        price: a.products[l.productId]?.price ?? l.price,
      }));
    const d: Delivery = {
      id,
      clientId: c.id,
      clientName: c.name,
      address: c.address,
      date: `${month}-${String(Math.min(c.day, last)).padStart(2, '0')}`,
      time: c.time || '09:00',
      duration: 30,
      lines,
      status: 'pending',
      notes: 'Pedido mensal fixo',
      reminder: 30,
      order: 0,
      recurringKey,
    };
    try {
      saveDelivery(draft, d);
    } catch (e) {
      throw Error(
        `${c.name}: ${(e as Error).message} Nenhuma entrega foi gerada; ajuste o cadastro e tente novamente.`,
      );
    }
    count++;
  }
  a.deliveries = draft.deliveries;
  return count;
}
const csvCell = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"`;
export function monthlyCsv(a: Account, month: string) {
  const grouped: Record<string, { name: string; type: string; quantity: number }> = {};
  for (const d of Object.values(a.deliveries).filter(
    (d) => d.status !== 'cancelled' && d.date.startsWith(month),
  ))
    for (const l of d.lines || []) {
      const key = JSON.stringify([l.name, l.type]);
      grouped[key] ??= { name: l.name, type: l.type, quantity: 0 };
      grouped[key].quantity += l.quantity;
    }
  return (
    '\uFEFFNome;Tipo;Quantidade\r\n' +
    Object.values(grouped)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x) => `${csvCell(x.name)};${csvCell(x.type)};${x.quantity}`)
      .join('\r\n')
  );
}
export function mapsUrls(deliveries: Delivery[]) {
  const urls: string[] = [];
  for (let i = 0; i < deliveries.length; i += 3) {
    const batch = deliveries.slice(i, i + 3);
    const params = new URLSearchParams({
      api: '1',
      travelmode: 'driving',
      destination: batch[batch.length - 1].address,
    });
    if (i > 0) params.set('origin', deliveries[i - 1].address);
    if (batch.length > 1)
      params.set(
        'waypoints',
        batch
          .slice(0, -1)
          .map((d) => d.address)
          .join('|'),
      );
    urls.push(`https://www.google.com/maps/dir/?${params}`);
  }
  return urls;
}
export function optimizeRoute(a: Account, deliveries: Delivery[]) {
  if (
    deliveries.some(
      (d) =>
        !Number.isFinite(a.clients[d.clientId]?.latitude) ||
        !Number.isFinite(a.clients[d.clientId]?.longitude),
    )
  )
    throw Error(
      'Para ordenar por proximidade, preencha latitude e longitude de todos os clientes da rota.',
    );
  if (deliveries.length < 2) return deliveries;
  const left = deliveries.slice(1),
    result = [deliveries[0]];
  const rad = (n: number) => (n * Math.PI) / 180;
  while (left.length) {
    const from = a.clients[result[result.length - 1].clientId];
    const distance = (d: Delivery) => {
      const to = a.clients[d.clientId];
      const p = rad(to.latitude! - from.latitude!),
        q = rad(to.longitude! - from.longitude!);
      return (
        Math.sin(p / 2) ** 2 +
        Math.cos(rad(from.latitude!)) * Math.cos(rad(to.latitude!)) * Math.sin(q / 2) ** 2
      );
    };
    left.sort((x, y) => distance(x) - distance(y));
    result.push(left.shift()!);
  }
  return result;
}
