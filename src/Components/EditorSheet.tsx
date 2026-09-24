import React, { useState } from 'react';
import { View, Switch } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useStore } from '../store';
import { T, Field, Button, Chips, Calendar, Sheet, s, IconButton, useTheme } from '../ui';
import { Client, Product, Appointment, Delivery, Line } from '../types';
import {
  uid,
  dateKey,
  saveAppointment,
  saveDelivery,
  reserved,
  money,
  availableSlots,
} from '../domain';
export type Editor =
  | { kind: 'client'; item?: Client }
  | { kind: 'product'; item?: Product }
  | { kind: 'appointment'; item?: Appointment; date?: string; time?: string; clientId?: string }
  | { kind: 'delivery'; item?: Delivery; date?: string; clientId?: string };
const number = (s: string) => Number(s.replace(',', '.'));
export function LineEditor({ lines, onChange }: { lines: Line[]; onChange: (l: Line[]) => void }) {
  const { account } = useStore();
  const products = Object.values(account.products).filter((p) => !p.archived);
  return (
    <View style={s.stack}>
      <T bold>Produtos e quantidades</T>
      {lines.map((l, i) => (
        <View key={l.productId} style={s.row}>
          <View style={{ flex: 1 }}>
            <T bold>{l.name}</T>
            <T size={12} muted>
              {l.type} • {money(l.price)}
            </T>
          </View>
          <View style={{ width: 85 }}>
            <Field
              label="Qtd."
              value={String(l.quantity)}
              numeric
              onChange={(v) =>
                onChange(lines.map((x, j) => (j === i ? { ...x, quantity: number(v) } : x)))
              }
            />
          </View>
          <IconButton
            label={`Remover ${l.name}`}
            icon={Trash2}
            onPress={() => onChange(lines.filter((_, j) => i !== j))}
          />
        </View>
      ))}
      <Chips
        options={products
          .filter((p) => !lines.some((l) => l.productId === p.id))
          .map((p) => ({
            id: p.id,
            label: `+ ${p.name} (${p.quantity - reserved(account, p.id)} livres)`,
          }))}
        value=""
        onChange={(id) => {
          const p = account.products[id];
          onChange([
            ...lines,
            { productId: id, name: p.name, type: p.type, price: p.price, quantity: 1 },
          ]);
        }}
      />
      {!products.length && <T muted>Cadastre um produto primeiro na aba Produtos.</T>}
    </View>
  );
}
export function EditorSheet({
  editor,
  onClose,
  onSaved,
}: {
  editor: Editor;
  onClose: () => void;
  onSaved: (s: string) => void;
}) {
  const { account, mutate } = useStore(),
    t = useTheme();
  const original = editor.item;
  const [form, setForm] = useState<any>(() => {
    if (editor.kind === 'client')
      return {
        ...{
          id: uid(),
          name: '',
          phone: '',
          email: '',
          address: '',
          notes: '',
          monthly: [],
          day: 1,
          time: '09:00',
          latitude: '',
          longitude: '',
        },
        ...original,
      };
    if (editor.kind === 'product')
      return { ...{ id: uid(), name: '', type: '', quantity: 0, price: 0 }, ...original };
    if (editor.kind === 'appointment')
      return {
        ...{
          id: uid(),
          title: '',
          date: editor.date || dateKey(),
          time: editor.time || '09:00',
          duration: 30,
          clientId: editor.clientId || '',
          notes: '',
          reminder: 15,
          status: 'scheduled',
        },
        ...original,
      };
    const c = account.clients[editor.clientId || ''];
    return {
      ...{
        id: uid(),
        clientId: c?.id || '',
        clientName: c?.name || '',
        address: c?.address || '',
        date: editor.date || dateKey(),
        time: '09:00',
        duration: 30,
        lines: c?.monthly || [],
        status: 'pending',
        notes: '',
        reminder: 30,
        order: 0,
      },
      ...original,
    };
  });
  const [monthly, setMonthly] = useState((form.monthly || []).length > 0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const update = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));
  const field = (key: string, label: string, numeric = false, multiline = false) => (
    <Field
      label={label}
      value={String(form[key] ?? '')}
      onChange={(v) => update(key, v)}
      numeric={numeric}
      multiline={multiline}
    />
  );
  const clients = Object.values(account.clients).filter((c) => !c.archived);
  async function save() {
    setError('');
    setBusy(true);
    try {
      await mutate((a) => {
        if (editor.kind === 'product') {
          const p: Product = {
            ...form,
            name: form.name.trim(),
            type: form.type.trim(),
            quantity: number(String(form.quantity)),
            price: number(String(form.price)),
          };
          if (!p.name || !p.type) throw Error('Preencha nome e tipo do produto.');
          if (
            !Number.isInteger(p.quantity) ||
            p.quantity < 0 ||
            !Number.isFinite(p.price) ||
            p.price < 0
          )
            throw Error('Informe estoque inteiro e preço não negativos.');
          if (p.quantity < reserved(a, p.id))
            throw Error('O estoque não pode ser menor que a quantidade reservada para entregas.');
          a.products[p.id] = p;
        } else if (editor.kind === 'client') {
          const c: Client = {
            ...form,
            name: form.name.trim(),
            day: number(String(form.day)),
            monthly: monthly ? form.monthly : [],
          };
          delete c.latitude;
          delete c.longitude;
          if (!c.name) throw Error('Informe o nome do cliente.');
          if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))
            throw Error('E-mail inválido.');
          if ((form.latitude !== '') !== (form.longitude !== ''))
            throw Error('Informe latitude e longitude juntas.');
          if (form.latitude !== '' && form.latitude != null) {
            c.latitude = number(String(form.latitude));
            c.longitude = number(String(form.longitude));
            if (
              !Number.isFinite(c.latitude) ||
              !Number.isFinite(c.longitude) ||
              Math.abs(c.latitude) > 90 ||
              Math.abs(c.longitude) > 180
            )
              throw Error('Coordenadas inválidas.');
          }
          if (monthly) {
            if (!c.address.trim() || !c.monthly.length)
              throw Error('Informe endereço e produtos mensais.');
            if (!Number.isInteger(c.day) || c.day < 1 || c.day > 31)
              throw Error('O dia fixo deve estar entre 1 e 31.');
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time)) throw Error('Horário mensal inválido.');
            if (c.monthly.some((l) => !Number.isInteger(l.quantity) || l.quantity <= 0))
              throw Error('Informe quantidades inteiras maiores que zero.');
          }
          a.clients[c.id] = c;
        } else if (editor.kind === 'appointment')
          saveAppointment(a, {
            ...form,
            duration: number(String(form.duration)),
            reminder: number(String(form.reminder)),
          });
        else
          saveDelivery(a, {
            ...form,
            duration: number(String(form.duration)),
            reminder: number(String(form.reminder)),
          });
      });
      onSaved('Salvo com sucesso.');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    client: 'cliente',
    product: 'produto',
    appointment: 'compromisso',
    delivery: 'entrega',
  };
  return (
    <Sheet
      title={`${original ? 'Editar' : 'Novo'} ${titles[editor.kind]}`}
      onClose={() => !busy && onClose()}
    >
      {editor.kind === 'product' && (
        <>
          {field('name', 'Nome do produto')}
          {field('type', 'Tipo / categoria')}
          <View style={s.row}>
            {field('quantity', 'Quantidade em estoque', true)}
            {field('price', 'Preço unitário (R$)', true)}
          </View>
          <T size={12} muted>
            O estoque é baixado ao concluir a entrega. As entregas pendentes reservam as
            quantidades.
          </T>
        </>
      )}
      {editor.kind === 'client' && (
        <>
          {field('name', 'Nome do cliente')}
          <View style={s.row}>
            {field('phone', 'Telefone')}
            {field('email', 'E-mail')}
          </View>
          {field('address', 'Endereço completo para entrega', false, true)}
          {field('notes', 'Observações', false, true)}
          <View style={s.row}>
            {field('latitude', 'Latitude (opcional)', true)}
            {field('longitude', 'Longitude (opcional)', true)}
          </View>
          <T muted size={12}>
            Coordenadas são opcionais e permitem sugerir uma ordem de paradas por proximidade.
          </T>
          <View style={s.between}>
            <T bold>Produtos mensais fixos</T>
            <Switch
              accessibilityLabel="Produtos mensais fixos"
              value={monthly}
              onValueChange={setMonthly}
              trackColor={{ true: t.primary }}
            />
          </View>
          {monthly && (
            <>
              <View style={s.row}>
                {field('day', 'Dia do mês (1–31)', true)}
                {field('time', 'Horário fixo (HH:mm)')}
              </View>
              <T muted size={12}>
                Meses mais curtos usam o último dia. Gere as entregas do mês na aba Entregas.
              </T>
              <LineEditor lines={form.monthly || []} onChange={(l) => update('monthly', l)} />
            </>
          )}
        </>
      )}
      {(editor.kind === 'appointment' || editor.kind === 'delivery') && (
        <>
          {editor.kind === 'appointment' && field('title', 'Título do compromisso')}
          <T bold>Cliente {editor.kind === 'appointment' ? '(opcional)' : ''}</T>
          <Chips
            options={[
              ...(editor.kind === 'appointment' ? [{ id: '', label: 'Sem cliente' }] : []),
              ...clients.map((c) => ({ id: c.id, label: c.name })),
            ]}
            value={form.clientId}
            onChange={(id) => {
              const c = account.clients[id];
              setForm((f: any) => ({
                ...f,
                clientId: id,
                ...(editor.kind === 'delivery' ? { clientName: c.name, address: c.address } : {}),
              }));
            }}
          />
          {!clients.length && <T muted>Cadastre clientes na aba Clientes.</T>}
          {editor.kind === 'delivery' && (
            <>
              {field('address', 'Endereço desta entrega', false, true)}
              <LineEditor lines={form.lines || []} onChange={(l) => update('lines', l)} />
            </>
          )}
          <T bold>Data • {form.date.split('-').reverse().join('/')}</T>
          <Calendar
            value={form.date}
            onChange={(d) => update('date', d)}
            marked={Object.values(account.deliveries).map((d) => d.date)}
          />
          <View style={s.row}>
            {field('time', 'Horário (HH:mm)')}
            {field('duration', 'Duração (minutos)', true)}
          </View>
          <T size={12} muted>
            Horários livres entre 08h e 18h
          </T>
          <Chips
            options={availableSlots(account, form.date, number(String(form.duration)) || 30).map(
              (x) => ({ id: x, label: x }),
            )}
            value={form.time}
            onChange={(v) => update('time', v)}
          />
          <T bold>Lembrar antes</T>
          <Chips
            options={[
              { id: '0', label: 'No horário' },
              { id: '15', label: '15 min' },
              { id: '30', label: '30 min' },
              { id: '60', label: '1 hora' },
            ]}
            value={String(form.reminder)}
            onChange={(v) => update('reminder', Number(v))}
          />
          {field('notes', 'Observações', false, true)}
        </>
      )}
      {!!error && <T color="#B33D3D">{error}</T>}
      <Button label={busy ? 'Salvando…' : 'Salvar'} disabled={busy} onPress={save} />
    </Sheet>
  );
}
