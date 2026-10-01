import React, { useState, useMemo } from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { ThemedText, Card, Button, IconButton, Chips, Badge, Empty, Calendar } from '../ui';
import {
  Plus,
  Download,
  Check,
  Pencil,
  ChevronUp,
  ChevronDown,
  Navigation,
} from 'lucide-react-native';

import { useStore } from '../store';
import { Account, Delivery } from '../types';
import {
  dateKey,
  generateMonthly,
  monthlyCsv,
  optimizeRoute,
  completeDelivery,
  cancelDelivery,
  mapsUrls,
  wazeUrl,
  dateLabel,
  money,
} from '../domain';
import { exportPdf, exportText } from '../export';
import { routeCsv, routePdfHtml } from '../routeExport';
import { PageProps } from './types';
type DeliveryStatus = Delivery['status'];

export function Deliveries({ edit, notify }: PageProps) {
  const { account, mutate } = useStore();
  // Estados da Tela
  const [tab, setTab] = useState<'list' | 'route'>('list');
  const [scope, setScope] = useState<'day' | 'month'>('day');
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryStatus>('all');
  const [date, setDate] = useState<string>(dateKey());
  const [busy, setBusy] = useState<boolean>(false);

  // Executador genérico de mutações com feedback
  const run = async (action: (draft: Account) => void, successMessage: string) => {
    try {
      setBusy(true);
      await mutate(action);
      notify(successMessage);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Reordenação de Rota
  const order = async (newRoute: Delivery[]) => {
    await run((draft) => {
      newRoute.forEach((item, index) => {
        if (draft.deliveries[item.id]) {
          draft.deliveries[item.id].order = index;
        }
      });
    }, 'Ordem da rota atualizada.');
  };

  // Filtro de entregas para a aba Lista
  const list = useMemo(() => {
    const all = Object.values(account.deliveries || {});
    return all.filter((d) => {
      const matchDate = scope === 'day' ? d.date === date : d.date.startsWith(date.slice(0, 7));
      const matchStatus = statusFilter === 'all' ? true : d.status === statusFilter;
      return matchDate && matchStatus;
    });
  }, [account.deliveries, date, scope, statusFilter]);

  // Montagem da Rota do Dia (Somente pendentes do dia selecionado)
  const route = useMemo(() => {
    return Object.values(account.deliveries || {})
      .filter((d) => d.date === date && d.status === 'pending')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.time.localeCompare(b.time));
  }, [account.deliveries, date]);

  // URLs do Maps memorizadas
  const computedMapsUrls = useMemo(() => mapsUrls(route), [route]);
  const gpsApp = account.settings.gpsApp || 'maps';
  const openInGps = (delivery: Delivery) => {
    const client = account.clients[delivery.clientId];
    const url =
      gpsApp === 'waze'
        ? wazeUrl(delivery.address, client?.latitude, client?.longitude)
        : mapsUrls([delivery])[0];
    void Linking.openURL(url).catch(() =>
      notify(`Não foi possível abrir ${gpsApp === 'waze' ? 'o Waze' : 'o Maps'}.`),
    );
  };

  async function exportRouteSpreadsheet() {
    try {
      if (!route.length) throw new Error('Adicione entregas pendentes para montar a rota.');
      await exportText(`rota-${date}.csv`, routeCsv(account, route, gpsApp));
      notify('Planilha da rota exportada em CSV.');
    } catch (e) {
      notify((e as Error).message);
    }
  }

  async function exportRoutePdf() {
    try {
      if (!route.length) throw new Error('Adicione entregas pendentes para montar a rota.');
      await exportPdf(`rota-${date}.pdf`, routePdfHtml(account, route, date, gpsApp));
      notify('PDF da rota preparado para salvar ou compartilhar.');
    } catch (e) {
      notify((e as Error).message);
    }
  }

  return (
    <View style={deliveryStyles.stack}>
      {/* Navegação por Abas e Nova Entrega */}
      <View style={[deliveryStyles.between, { flexWrap: 'wrap' }]}>
        <Chips
          options={[
            { id: 'list', label: 'Entregas' },
            { id: 'route', label: 'Rota do dia' },
          ]}
          value={tab}
          onChange={(val) => setTab(val as 'list' | 'route')}
        />
        <Button label="Nova entrega" icon={Plus} onPress={() => edit({ kind: 'delivery', date })} />
      </View>

      {/* Calendário e Painel de Exportação */}
      <Card>
        <Calendar
          value={date}
          onChange={setDate}
          marked={Object.values(account.deliveries || {})
            .filter((d) => d.status === 'pending')
            .map((d) => d.date)}
          compact
        />

        {tab === 'list' && (
          <>
            <Chips
              options={[
                { id: 'day', label: 'Dia selecionado' },
                { id: 'month', label: 'Mês inteiro' },
              ]}
              value={scope}
              onChange={(val) => setScope(val as 'day' | 'month')}
            />

            <View style={deliveryStyles.wrap}>
              <Button
                label="Gerar entregas mensais"
                secondary
                small
                disabled={busy}
                onPress={() => {
                  let count = 0;
                  setBusy(true);
                  mutate((a) => {
                    count = generateMonthly(a, date.slice(0, 7));
                  })
                    .then(() =>
                      notify(
                        count
                          ? `${count} entregas mensais geradas.`
                          : 'As entregas deste mês já foram geradas ou não há clientes com produtos fixos.',
                      ),
                    )
                    .catch((e) => notify(e.message))
                    .finally(() => setBusy(false));
                }}
              />
              <Button
                label="Exportar produtos do mês"
                secondary
                small
                icon={Download}
                onPress={async () => {
                  try {
                    await exportText(
                      `produtos-${date.slice(0, 7)}.csv`,
                      monthlyCsv(account, date.slice(0, 7)),
                    );
                    notify('Arquivo mensal exportado.');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
            </View>

            <ThemedText muted size={12}>
              Exportação de {date.slice(0, 7).split('-').reverse().join('/')} • somente nome, tipo e
              quantidade; canceladas não entram.
            </ThemedText>
          </>
        )}
      </Card>

      {/* CONTEÚDO DA ABA 1: LISTA DE ENTREGAS */}
      {tab === 'list' ? (
        <>
          <Chips
            options={[
              { id: 'all', label: 'Todas' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'delivered', label: 'Entregues' },
              { id: 'cancelled', label: 'Canceladas' },
            ]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
          />

          {list.map((d) => (
            <Card key={d.id}>
              <View style={[deliveryStyles.between, { flexWrap: 'wrap' }]}>
                <View>
                  <ThemedText size={19} bold>
                    {d.clientName}
                  </ThemedText>
                  <ThemedText muted>
                    {dateLabel(d.date)} • {d.time} • {d.duration} min
                  </ThemedText>
                </View>
                <Badge>
                  {d.status === 'pending'
                    ? 'Pendente'
                    : d.status === 'delivered'
                      ? 'Entregue'
                      : 'Cancelada'}
                </Badge>
              </View>

              <ThemedText muted>{d.address}</ThemedText>

              <View style={deliveryStyles.wrap}>
                {(d.lines || []).map((l) => (
                  <Badge key={l.productId}>
                    {l.quantity} × {l.name} ({l.type})
                  </Badge>
                ))}
              </View>

              <ThemedText bold>
                Total: {money((d.lines || []).reduce((sum, l) => sum + l.price * l.quantity, 0))}
              </ThemedText>

              {!!d.notes && <ThemedText muted>{d.notes}</ThemedText>}

              {d.status === 'pending' && (
                <View style={deliveryStyles.wrap}>
                  <Button
                    small
                    label="Concluir entrega"
                    icon={Check}
                    disabled={busy}
                    onPress={() =>
                      run(
                        (a) => completeDelivery(a, d.id),
                        'Entrega concluída e estoque atualizado.',
                      )
                    }
                  />
                  <Button
                    small
                    secondary
                    label="Editar"
                    icon={Pencil}
                    onPress={() => edit({ kind: 'delivery', item: d })}
                  />
                  <Button
                    small
                    secondary
                    label="Cancelar entrega"
                    disabled={busy}
                    onPress={() =>
                      run((a) => cancelDelivery(a, d.id), 'Entrega cancelada e reserva liberada.')
                    }
                  />
                </View>
              )}
            </Card>
          ))}

          {!list.length && (
            <Card>
              <Empty
                title="Nenhuma entrega neste período"
                description="Selecione uma data ou programe sua próxima entrega."
                action={() => edit({ kind: 'delivery', date })}
              />
            </Card>
          )}
        </>
      ) : (
        /* CONTEÚDO DA ABA 2: ROTA DO DIA */
        <>
          <Card>
            <ThemedText size={20} bold>
              Sua rota • {dateLabel(date)}
            </ThemedText>
            <ThemedText muted>
              Adicione uma entrega para incluir um cliente. Use as setas para alterar a ordem; edite
              uma parada para mudar data, horário ou destinatário.
            </ThemedText>

            <View style={deliveryStyles.wrap}>
              <Button
                label="Adicionar parada"
                small
                icon={Plus}
                onPress={() => edit({ kind: 'delivery', date })}
              />
              <Button
                label="Ordenar por proximidade"
                secondary
                small
                disabled={busy || route.length < 2}
                onPress={() => {
                  try {
                    void order(optimizeRoute(account, route));
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
              <Button
                label="Exportar planilha (CSV)"
                icon={Download}
                secondary
                small
                disabled={!route.length}
                onPress={exportRouteSpreadsheet}
              />
              <Button
                label="Exportar PDF"
                icon={Download}
                secondary
                small
                disabled={!route.length}
                onPress={exportRoutePdf}
              />
            </View>

            <ThemedText size={12} muted>
              A sugestão usa distância entre coordenadas, mantém a primeira parada e não considera
              trânsito ou janelas de horário. Revise a ordem antes de sair.
            </ThemedText>

            {gpsApp === 'maps' &&
              computedMapsUrls.map((url, i) => (
                <Button
                  key={`${url}-${i}`}
                  label={`Abrir Maps${computedMapsUrls.length > 1 ? ` • trecho ${i + 1}` : ''}`}
                  secondary
                  small
                  icon={Navigation}
                  onPress={() =>
                    Linking.openURL(url).catch(() => notify('Não foi possível abrir o Maps.'))
                  }
                />
              ))}
          </Card>

          {route.map((d, i) => (
            <Card key={d.id}>
              <View style={deliveryStyles.row}>
                <Badge>{i + 1}</Badge>
                <View style={{ flex: 1 }}>
                  <ThemedText bold size={18}>
                    {d.clientName}
                  </ThemedText>
                  <ThemedText muted>
                    {d.time} • {d.address}
                  </ThemedText>
                </View>
                <IconButton
                  icon={ChevronUp}
                  label="Mover parada para cima"
                  disabled={i === 0 || busy}
                  onPress={() => {
                    const copy = [...route];
                    [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                    void order(copy);
                  }}
                />
                <IconButton
                  icon={ChevronDown}
                  label="Mover parada para baixo"
                  disabled={i === route.length - 1 || busy}
                  onPress={() => {
                    const copy = [...route];
                    [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                    void order(copy);
                  }}
                />
              </View>

              <ThemedText muted>
                {(d.lines || []).map((l) => `${l.quantity} × ${l.name}`).join(' • ')}
              </ThemedText>

              <View style={deliveryStyles.wrap}>
                <Button
                  label="Editar parada"
                  small
                  secondary
                  onPress={() => edit({ kind: 'delivery', item: d })}
                />
                <Button
                  label={`Abrir ${gpsApp === 'waze' ? 'Waze' : 'Google Maps'}`}
                  small
                  secondary
                  icon={Navigation}
                  onPress={() => openInGps(d)}
                />
                <Button
                  label="Concluir"
                  small
                  disabled={busy}
                  onPress={() => run((a) => completeDelivery(a, d.id), 'Entrega concluída.')}
                />
              </View>
            </Card>
          ))}

          {!route.length && (
            <Card>
              <Empty
                title="Vamos traçar seu caminho?"
                description="As entregas pendentes do dia aparecem aqui como paradas da rota."
                action={() => edit({ kind: 'delivery', date })}
              />
            </Card>
          )}
        </>
      )}
    </View>
  );
}

// Estilização base de layout
const deliveryStyles = StyleSheet.create({
  stack: {
    flexDirection: 'column',
    gap: 12,
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
});
