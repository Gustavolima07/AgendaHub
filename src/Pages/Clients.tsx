import React, { useState } from 'react';
import { View } from 'react-native';
import { Plus, MapPin, Pencil, Archive, RotateCcw } from 'lucide-react-native';
import { T, Card, Button, IconButton, Field, Chips, Badge, Empty, Sheet, s } from '../ui';
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
    <View style={s.stack}>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
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

      <View style={[s.wrap, { gap: 16 }]}>
        {clients.map((c) => (
          <Card key={c.id} style={{ flexGrow: 1, flexBasis: 300, maxWidth: 500 }}>
            <View style={s.between}>
              <T size={19} bold>
                {c.name}
              </T>
              {!!(c.monthly || []).length && <Badge>Mensal fixo</Badge>}
            </View>
            <T muted>{c.phone || 'Telefone não informado'}</T>
            <T muted>{c.email || 'E-mail não informado'}</T>
            <View style={s.row}>
              <MapPin size={16} color="#79887D" />
              <T size={13} muted style={{ flex: 1 }}>
                {c.address || 'Endereço não informado'}
              </T>
            </View>
            <View style={s.wrap}>
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
          <T muted>{selected.address}</T>
          <T>{selected.notes || 'Sem observações.'}</T>
          {(selected.monthly || []).length > 0 && (
            <>
              <T bold>
                Mensal fixo • dia {selected.day}, {selected.time}
              </T>
              {selected.monthly.map((l) => (
                <T key={l.productId}>
                  {l.quantity} × {l.name} • {l.type}
                </T>
              ))}
            </>
          )}
          <T bold size={18}>
            Histórico de pedidos e entregas
          </T>
          {Object.values(account.deliveries)
            .filter((d) => d.clientId === selected.id)
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((d) => (
              <Card key={d.id}>
                <T bold>
                  {dateLabel(d.date)} • {d.time}
                </T>
                <Badge>
                  {d.status === 'pending'
                    ? 'Pendente'
                    : d.status === 'delivered'
                      ? 'Entregue'
                      : 'Cancelada'}
                </Badge>
                {(d.lines || []).map((l) => (
                  <T key={l.productId}>
                    {l.quantity} × {l.name} • {money(l.price * l.quantity)}
                  </T>
                ))}
                <T muted>{d.address}</T>
              </Card>
            ))}
          <T bold size={18}>
            Compromissos
          </T>
          {Object.values(account.appointments)
            .filter((x) => x.clientId === selected.id)
            .map((x) => (
              <T key={x.id}>
                {dateLabel(x.date)} {x.time} • {x.title} •{' '}
                {x.status === 'done'
                  ? 'Concluído'
                  : x.status === 'cancelled'
                    ? 'Cancelado'
                    : 'Agendado'}
              </T>
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
