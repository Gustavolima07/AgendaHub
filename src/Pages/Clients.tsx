import React, { useState } from 'react';
import { View } from 'react-native';
import { Plus, MapPin, Pencil, Archive, RotateCcw } from 'lucide-react-native';
import {
  ThemedText,
  Card,
  Button,
  IconButton,
  Field,
  Chips,
  Badge,
  Empty,
  Sheet,
  layoutStyles,
} from '../ui';
import { useStore } from '../store';
import { Client } from '../types';
import { dateLabel, money } from '../domain';
import { PageProps } from './types';

export function Clients({ edit, notify }: PageProps) {
  const { account, mutate } = useStore(),
    [search, setSearch] = useState(''),
    [archived, setArchived] = useState(false),
    [selected, setSelected] = useState<Client | null>(null);

  const clients = Object.values(account.clients).filter(
    (c) =>
      !!c.archived === archived &&
      `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function archive(c: Client) {
    try {
      await mutate((a) => {
        if (
          !c.archived &&
          Object.values(a.deliveries).some((d) => d.clientId === c.id && d.status === 'pending')
        )
          throw Error('Conclua ou cancele as entregas pendentes antes de arquivar este cliente.');
        a.clients[c.id].archived = !c.archived;
      });
      notify(c.archived ? 'Cliente restaurado.' : 'Cliente arquivado; histórico preservado.');
    } catch (e) {
      notify((e as Error).message);
    }
  }

  return (
    <View style={layoutStyles.stack}>
      <View style={[layoutStyles.row, { flexWrap: 'wrap' }]}>
        <Field
          label="Buscar clientes"
          value={search}
          onChange={setSearch}
          placeholder="Nome, telefone ou e-mail"
        />
        <Button label="Novo cliente" icon={Plus} onPress={() => edit({ kind: 'client' })} />
      </View>

      <Chips
        options={[
          { id: 'active', label: 'Ativos' },
          { id: 'archived', label: 'Arquivados' },
        ]}
        value={archived ? 'archived' : 'active'}
        onChange={(v) => setArchived(v === 'archived')}
      />

      <View style={[layoutStyles.wrap, { gap: 16 }]}>
        {clients.map((c) => (
          <Card key={c.id} style={{ flexGrow: 1, flexBasis: 300, maxWidth: 500 }}>
            <View style={layoutStyles.between}>
              <ThemedText size={19} bold>
                {c.name}
              </ThemedText>
              {!!(c.monthly || []).length && <Badge>Mensal fixo</Badge>}
            </View>
            <ThemedText muted>{c.phone || 'Telefone não informado'}</ThemedText>
            <ThemedText muted>{c.email || 'E-mail não informado'}</ThemedText>
            <View style={layoutStyles.row}>
              <MapPin size={16} color="#79887D" />
              <ThemedText size={13} muted style={{ flex: 1 }}>
                {c.address || 'Endereço não informado'}
              </ThemedText>
            </View>
            <View style={layoutStyles.wrap}>
              <Button small secondary label="Histórico" onPress={() => setSelected(c)} />
              <IconButton
                icon={Pencil}
                label={`Editar ${c.name}`}
                onPress={() => edit({ kind: 'client', item: c })}
              />
              <IconButton
                icon={c.archived ? RotateCcw : Archive}
                label={c.archived ? 'Restaurar cliente' : 'Arquivar cliente'}
                onPress={() => archive(c)}
              />
              {!c.archived && (
                <Button
                  small
                  label="Entrega"
                  onPress={() => edit({ kind: 'delivery', clientId: c.id })}
                />
              )}
            </View>
          </Card>
        ))}
      </View>

      {!clients.length && (
        <Card>
          <Empty
            title="Sua rede começa aqui"
            description="Cadastre contatos, endereços e produtos mensais dos seus clientes."
            action={() => edit({ kind: 'client' })}
          />
        </Card>
      )}

      {selected && (
        <Sheet title={selected.name} onClose={() => setSelected(null)}>
          <ThemedText muted>{selected.address}</ThemedText>
          <ThemedText>{selected.notes || 'Sem observações.'}</ThemedText>
          {(selected.monthly || []).length > 0 && (
            <>
              <ThemedText bold>
                Mensal fixo • dia {selected.day}, {selected.time}
              </ThemedText>
              {selected.monthly.map((l) => (
                <ThemedText key={l.productId}>
                  {l.quantity} × {l.name} • {l.type}
                </ThemedText>
              ))}
            </>
          )}
          <ThemedText bold size={18}>
            Histórico de pedidos e entregas
          </ThemedText>
          {Object.values(account.deliveries)
            .filter((d) => d.clientId === selected.id)
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((d) => (
              <Card key={d.id}>
                <ThemedText bold>
                  {dateLabel(d.date)} • {d.time}
                </ThemedText>
                <Badge>
                  {d.status === 'pending'
                    ? 'Pendente'
                    : d.status === 'delivered'
                      ? 'Entregue'
                      : 'Cancelada'}
                </Badge>
                {(d.lines || []).map((l) => (
                  <ThemedText key={l.productId}>
                    {l.quantity} × {l.name} • {money(l.price * l.quantity)}
                  </ThemedText>
                ))}
                <ThemedText muted>{d.address}</ThemedText>
              </Card>
            ))}
          <ThemedText bold size={18}>
            Compromissos
          </ThemedText>
          {Object.values(account.appointments)
            .filter((x) => x.clientId === selected.id)
            .map((x) => (
              <ThemedText key={x.id}>
                {dateLabel(x.date)} {x.time} • {x.title} •{' '}
                {x.status === 'done'
                  ? 'Concluído'
                  : x.status === 'cancelled'
                    ? 'Cancelado'
                    : 'Agendado'}
              </ThemedText>
            ))}
          <Button
            label="Agendar com este cliente"
            onPress={() => {
              edit({ kind: 'appointment', clientId: selected.id });
              setSelected(null);
            }}
          />
        </Sheet>
      )}
    </View>
  );
}
