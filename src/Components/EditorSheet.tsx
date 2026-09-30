import React, { useState } from 'react';
import { View, Switch, Linking } from 'react-native';
import { MapPin, Trash2 } from 'lucide-react-native';
import { useStore } from '../store';
import {
  ThemedText,
  Field,
  Button,
  Chips,
  Calendar,
  Sheet,
  layoutStyles,
  IconButton,
  useTheme,
} from '../ui';
import { AddressParts, Client, Product, Appointment, Delivery, Line } from '../types';
import {
  uid,
  dateKey,
  saveAppointment,
  saveDelivery,
  reserved,
  money,
  availableSlots,
  formatAddressParts,
} from '../domain';
import { findAddressCoordinates, GeocodingMatch } from '../geocoding';
export type Editor =
  | { kind: 'client'; item?: Client }
  | { kind: 'product'; item?: Product }
  | { kind: 'appointment'; item?: Appointment; date?: string; time?: string; clientId?: string }
  | { kind: 'delivery'; item?: Delivery; date?: string; clientId?: string };
const number = (s: string) => Number(s.replace(',', '.'));
const blankAddress = (): AddressParts => ({
  street: '',
  number: '',
  block: '',
  neighborhood: '',
  postalCode: '',
  city: '',
  state: '',
  complement: '',
  country: 'Brasil',
});
export function LineEditor({ lines, onChange }: { lines: Line[]; onChange: (l: Line[]) => void }) {
  const { account } = useStore();
  const products = Object.values(account.products).filter((p) => !p.archived);
  return (
    <View style={layoutStyles.stack}>
      <ThemedText bold>Produtos e quantidades</ThemedText>
      {lines.map((l, i) => (
        <View key={l.productId} style={layoutStyles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText bold>{l.name}</ThemedText>
            <ThemedText size={12} muted>
              {l.type} • {money(l.price)}
            </ThemedText>
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
            label: `+ ${p.name} (${Math.max(0, p.quantity - reserved(account, p.id))} livres${p.quantity < reserved(account, p.id) + 1 ? ' · encomendar' : ''})`,
          }))}
        value=""
        onChange={(id) => {
          const p = account.products[id];
          onChange([
            ...lines,
            {
              productId: id,
              name: p.name,
              type: p.type,
              price: p.price,
              costPrice: p.costPrice,
              quantity: 1,
            },
          ]);
        }}
      />
      {!products.length && (
        <ThemedText muted>Cadastre um produto primeiro na aba Produtos.</ThemedText>
      )}
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
          addressParts: blankAddress(),
          notes: '',
          monthly: [],
          day: 1,
          time: '09:00',
          latitude: '',
          longitude: '',
        },
        ...original,
        addressParts:
          (editor.kind === 'client' ? editor.item?.addressParts : undefined) || blankAddress(),
      };
    if (editor.kind === 'product')
      return {
        ...{ id: uid(), name: '', type: '', quantity: 0, price: 0, costPrice: '' },
        ...original,
      };
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
    [busy, setBusy] = useState(false),
    [oneTimeRoute, setOneTimeRoute] = useState(false),
    [oneTimeLines, setOneTimeLines] = useState<Line[]>([]),
    [oneTimeDate, setOneTimeDate] = useState(dateKey()),
    [oneTimeTime, setOneTimeTime] = useState('10:00'),
    [geocoding, setGeocoding] = useState(false),
    [geocodeError, setGeocodeError] = useState(''),
    [geocodeMatches, setGeocodeMatches] = useState<GeocodingMatch[]>([]),
    [geocodeSearched, setGeocodeSearched] = useState(false);
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
  const addressField = (key: keyof AddressParts, label: string, numeric = false) => (
    <Field
      label={label}
      value={String(form.addressParts?.[key] ?? '')}
      onChange={(value) =>
        setForm((current: any) => ({
          ...current,
          addressParts: { ...blankAddress(), ...current.addressParts, [key]: value },
        }))
      }
      numeric={numeric}
    />
  );
  const clients = Object.values(account.clients).filter((c) => !c.archived);
  async function lookupCoordinates() {
    setGeocodeError('');
    setGeocodeMatches([]);
    setGeocodeSearched(true);
    setGeocoding(true);
    try {
      const parts = form.addressParts as AddressParts;
      if (!parts.street.trim() || !parts.city.trim() || !parts.state.trim())
        throw new Error('Preencha rua, cidade e estado para buscar o ponto.');
      setGeocodeMatches(await findAddressCoordinates(formatAddressParts(parts)));
    } catch (lookupError) {
      setGeocodeError((lookupError as Error).message);
    } finally {
      setGeocoding(false);
    }
  }
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
            costPrice: String(form.costPrice ?? '').trim()
              ? number(String(form.costPrice))
              : undefined,
          };
          if (!p.name || !p.type) throw Error('Preencha nome e tipo do produto.');
          if (
            !Number.isInteger(p.quantity) ||
            p.quantity < 0 ||
            !Number.isFinite(p.price) ||
            p.price < 0
          )
            throw Error('Informe estoque inteiro e preço não negativos.');
          if (p.costPrice !== undefined && (!Number.isFinite(p.costPrice) || p.costPrice < 0))
            throw Error('Informe um custo unitário não negativo.');
          a.products[p.id] = p;
        } else if (editor.kind === 'client') {
          const addressParts = form.addressParts as AddressParts;
          const c: Client = {
            ...form,
            name: form.name.trim(),
            day: number(String(form.day)),
            monthly: monthly ? form.monthly : [],
          };
          const hasStructuredAddress = Object.entries(addressParts).some(
            ([key, value]) => key !== 'country' && !!value.trim(),
          );
          c.address = hasStructuredAddress
            ? formatAddressParts(addressParts)
            : String(
                form.address || (editor.kind === 'client' ? editor.item?.address : '') || '',
              ).trim();
          c.addressParts = hasStructuredAddress ? addressParts : undefined;
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
          if (oneTimeRoute && !original) {
            if (!c.address || !oneTimeLines.length)
              throw Error('Para criar a rota única, preencha o endereço e selecione os produtos.');
            saveDelivery(a, {
              id: uid(),
              clientId: c.id,
              clientName: c.name,
              address: c.address,
              date: oneTimeDate,
              time: oneTimeTime,
              duration: 30,
              lines: oneTimeLines,
              status: 'pending',
              notes: 'Rota única criada junto com o cadastro do cliente.',
              reminder: 30,
              order: 0,
            });
          }
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
          <View style={layoutStyles.row}>
            {field('quantity', 'Quantidade em estoque', true)}
            {field('price', 'Preço unitário (R$)', true)}
          </View>
          {field('costPrice', 'Quanto você paga por unidade (R$)', true)}
          <ThemedText size={12} muted>
            Informe seu custo para calcular margem e lucro bruto. Se deixar em branco, o produto
            ficará fora desse cálculo.
          </ThemedText>
        </>
      )}
      {editor.kind === 'client' && (
        <>
          {field('name', 'Nome do cliente')}
          <View style={layoutStyles.row}>
            {field('phone', 'Telefone')}
            {field('email', 'E-mail')}
          </View>
          <ThemedText bold>Endereço de entrega</ThemedText>
          {!!form.address && !(editor.kind === 'client' && editor.item?.addressParts) && (
            <ThemedText size={12} muted>
              Endereço atual: {form.address}. Preencha os campos abaixo para atualizá-lo.
            </ThemedText>
          )}
          <View style={[layoutStyles.row, { flexWrap: 'wrap' }]}>
            {addressField('street', 'Rua / avenida')}
            {addressField('number', 'Número')}
            {addressField('block', 'Bloco / unidade')}
            {addressField('complement', 'Complemento')}
            {addressField('neighborhood', 'Bairro')}
            {addressField('postalCode', 'CEP')}
            {addressField('city', 'Cidade')}
            {addressField('state', 'Estado / UF')}
            {addressField('country', 'País')}
          </View>
          <ThemedText size={12} muted>
            A busca envia somente o endereço ao Nominatim/OpenStreetMap. Não inclua nome, telefone
            ou outras informações pessoais. A consulta é manual e segue o limite de uma requisição
            por segundo.
          </ThemedText>
          <Button
            label={geocoding ? 'Buscando endereço…' : 'Buscar coordenadas no OpenStreetMap'}
            icon={MapPin}
            secondary
            disabled={geocoding}
            onPress={lookupCoordinates}
          />
          <Button
            label="Ler política de uso do Nominatim"
            small
            secondary
            onPress={() =>
              void Linking.openURL('https://operations.osmfoundation.org/policies/nominatim/')
            }
          />
          {!!geocodeError && <ThemedText color="#B33D3D">{geocodeError}</ThemedText>}
          {geocodeSearched && !geocoding && !geocodeError && !geocodeMatches.length && (
            <ThemedText muted>
              Nenhum endereço encontrado. Complete mais campos ou insira as coordenadas manualmente.
            </ThemedText>
          )}
          {geocodeMatches.some((match) => match.approximate) && (
            <ThemedText size={12} color="#8A641F">
              Não encontramos o número exato. As sugestões abaixo representam a rua sem o número;
              confirme o ponto no GPS antes de usar a rota.
            </ThemedText>
          )}
          {geocodeMatches.map((match, index) => (
            <Button
              key={`${match.latitude}-${match.longitude}`}
              small
              secondary
              label={`${index + 1}. ${match.approximate ? 'Aproximado · ' : ''}${match.displayName.slice(0, 90)} · ${match.latitude}, ${match.longitude}`}
              onPress={() => {
                update('latitude', String(match.latitude));
                update('longitude', String(match.longitude));
                setGeocodeMatches([]);
              }}
            />
          ))}
          {field('notes', 'Observações', false, true)}
          <View style={layoutStyles.row}>
            {field('latitude', 'Latitude (opcional)', true)}
            {field('longitude', 'Longitude (opcional)', true)}
          </View>
          <ThemedText muted size={12}>
            Coordenadas são opcionais e permitem sugerir uma ordem de paradas por proximidade.
          </ThemedText>
          <View style={layoutStyles.between}>
            <ThemedText bold>Produtos mensais fixos</ThemedText>
            <Switch
              accessibilityLabel="Produtos mensais fixos"
              value={monthly}
              onValueChange={setMonthly}
              trackColor={{ true: t.primary }}
            />
          </View>
          {monthly && (
            <>
              <View style={layoutStyles.row}>
                {field('day', 'Dia do mês (1–31)', true)}
                {field('time', 'Horário fixo (HH:mm)')}
              </View>
              <ThemedText muted size={12}>
                Meses mais curtos usam o último dia. Gere as entregas do mês na aba Entregas.
              </ThemedText>
              <LineEditor lines={form.monthly || []} onChange={(l) => update('monthly', l)} />
            </>
          )}
          {!original && (
            <>
              <View style={layoutStyles.between}>
                <ThemedText bold>Criar uma rota para este cliente agora</ThemedText>
                <Switch
                  accessibilityLabel="Criar uma única entrega para este cliente"
                  value={oneTimeRoute}
                  onValueChange={setOneTimeRoute}
                  trackColor={{ true: t.primary }}
                />
              </View>
              <ThemedText size={12} muted>
                Esta atribuição cria uma única entrega na data escolhida. Ela não é mensal nem se
                repete automaticamente.
              </ThemedText>
              {oneTimeRoute && (
                <>
                  <ThemedText bold>Data da entrega única · {oneTimeDate}</ThemedText>
                  <Calendar value={oneTimeDate} onChange={setOneTimeDate} />
                  <Field label="Horário da entrega" value={oneTimeTime} onChange={setOneTimeTime} />
                  <LineEditor lines={oneTimeLines} onChange={setOneTimeLines} />
                </>
              )}
            </>
          )}
        </>
      )}
      {(editor.kind === 'appointment' || editor.kind === 'delivery') && (
        <>
          {editor.kind === 'appointment' && field('title', 'Título do compromisso')}
          <ThemedText bold>Cliente {editor.kind === 'appointment' ? '(opcional)' : ''}</ThemedText>
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
          {!clients.length && <ThemedText muted>Cadastre clientes na aba Clientes.</ThemedText>}
          {editor.kind === 'delivery' && (
            <>
              {field('address', 'Endereço desta entrega', false, true)}
              <LineEditor lines={form.lines || []} onChange={(l) => update('lines', l)} />
            </>
          )}
          <ThemedText bold>Data • {form.date.split('-').reverse().join('/')}</ThemedText>
          <Calendar
            value={form.date}
            onChange={(d) => update('date', d)}
            marked={Object.values(account.deliveries).map((d) => d.date)}
          />
          <View style={layoutStyles.row}>
            {field('time', 'Horário (HH:mm)')}
            {field('duration', 'Duração (minutos)', true)}
          </View>
          <ThemedText size={12} muted>
            Horários livres entre 08h e 18h
          </ThemedText>
          <Chips
            options={availableSlots(account, form.date, number(String(form.duration)) || 30).map(
              (x) => ({ id: x, label: x }),
            )}
            value={form.time}
            onChange={(v) => update('time', v)}
          />
          <ThemedText bold>Lembrar antes</ThemedText>
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
      {!!error && <ThemedText color="#B33D3D">{error}</ThemedText>}
      <Button label={busy ? 'Salvando…' : 'Salvar'} disabled={busy} onPress={save} />
    </Sheet>
  );
}
