import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { ThemedText, Card, Button, Chips, Badge, Empty, Calendar, Field, useTheme } from '../ui';
import {
  Plus,
  Download,
  Check,
  Pencil,
  GripVertical,
  Navigation,
  MapPin,
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
import {
  createGooglePlacesSession,
  getGoogleAddressDetails,
  GoogleAddressPrediction,
  searchGoogleAddresses,
} from '../geocoding';
import { PageProps } from './types';
import { DraggableRouteCard } from '../Components/DraggableRouteCard';
import { usePageScroll } from '../Components/PageFrame';
type DeliveryStatus = Delivery['status'];

export function Deliveries({ edit, notify }: PageProps) {
  const { account, mutate } = useStore();
  const theme = useTheme();
  const pageScroll = usePageScroll();
  // Estados da Tela
  const [tab, setTab] = useState<'list' | 'route'>('list');
  const [scope, setScope] = useState<'day' | 'month'>('day');
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryStatus>('all');
  const [date, setDate] = useState<string>(dateKey());
  const [busy, setBusy] = useState<boolean>(false);
  const [routeStartQuery, setRouteStartQuery] = useState('');
  const [routeStart, setRouteStart] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeStartPredictions, setRouteStartPredictions] = useState<GoogleAddressPrediction[]>([]);
  const [routeStartSession] = useState(createGooglePlacesSession);
  const [routeStartLoading, setRouteStartLoading] = useState(false);
  const [routeStartError, setRouteStartError] = useState('');

  // Executador genérico de mutações com feedback
  const run = useCallback(
    async (action: (draft: Account) => void, successMessage: string) => {
      try {
        setBusy(true);
        await mutate(action);
        notify(successMessage);
      } catch (e) {
        notify((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [mutate, notify],
  );

  async function searchRouteStart() {
    setRouteStartError('');
    setRouteStartPredictions([]);
    setRouteStartLoading(true);
    try {
      const predictions = await searchGoogleAddresses(routeStartQuery, routeStartSession);
      setRouteStartPredictions(predictions);
      if (!predictions.length)
        setRouteStartError('O Google não encontrou sugestões para esse endereço.');
    } catch (error) {
      setRouteStartError((error as Error).message);
    } finally {
      setRouteStartLoading(false);
    }
  }

  async function selectRouteStart(prediction: GoogleAddressPrediction) {
    setRouteStartError('');
    setRouteStartLoading(true);
    try {
      const details = await getGoogleAddressDetails(prediction, routeStartSession);
      if (!Number.isFinite(details.latitude) || !Number.isFinite(details.longitude))
        throw new Error('O Google não retornou as coordenadas deste ponto inicial.');
      const selectedStart = {
        address: details.formattedAddress,
        latitude: details.latitude!,
        longitude: details.longitude!,
      };
      setRouteStart(selectedStart);
      setRouteStartQuery(selectedStart.address);
      setRouteStartPredictions([]);
    } catch (error) {
      setRouteStartError((error as Error).message);
    } finally {
      setRouteStartLoading(false);
    }
  }

  // Reordenação de Rota
  const order = useCallback(
    async (newRoute: Delivery[]) => {
      await run((draft) => {
        newRoute.forEach((item, index) => {
          if (draft.deliveries[item.id]) {
            draft.deliveries[item.id].order = index;
          }
        });
      }, 'Ordem da rota atualizada.');
    },
    [run],
  );

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
      .map((delivery) => {
        const client = account.clients[delivery.clientId];
        return {
          ...delivery,
          clientName: client?.name || delivery.clientName,
          address: client?.address?.trim() || delivery.address,
        };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.time.localeCompare(b.time));
  }, [account.clients, account.deliveries, date]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [scrollAdjustment, setScrollAdjustment] = useState(0);
  const routeRef = useRef(route);
  const orderRef = useRef(order);
  const cardLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const dragging = useRef<{ id: string | null; translationY: number }>({
    id: null,
    translationY: 0,
  });
  const scrollAdjustmentRef = useRef(0);
  const autoScrollDirection = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    routeRef.current = route;
    orderRef.current = order;
  }, [order, route]);

  const measureCard = useCallback((id: string, y: number, height: number) => {
    cardLayouts.current[id] = { y, height };
  }, []);
  const targetIndexAt = useCallback((id: string, translationY: number) => {
    const currentRoute = routeRef.current;
    const source = cardLayouts.current[id];
    if (!source) return currentRoute.findIndex((delivery) => delivery.id === id);
    const draggedCenter = source.y + source.height / 2 + translationY;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    currentRoute.forEach((delivery, index) => {
      const layout = cardLayouts.current[delivery.id];
      if (!layout) return;
      const distance = Math.abs(draggedCenter - layout.y - layout.height / 2);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  }, []);
  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = null;
    autoScrollDirection.current = 0;
  }, []);
  useEffect(() => stopAutoScroll, [stopAutoScroll]);
  const startDrag = useCallback((id: string) => {
    dragging.current = { id, translationY: 0 };
    scrollAdjustmentRef.current = 0;
    setScrollAdjustment(0);
    setDraggingId(id);
    setDropTargetIndex(routeRef.current.findIndex((delivery) => delivery.id === id));
  }, []);
  const moveDrag = useCallback(
    (id: string, translationY: number, absoluteY: number) => {
      dragging.current = { id, translationY };
      const viewport = pageScroll?.getViewport();
      const direction =
        viewport && viewport.bottom > viewport.top
          ? absoluteY < viewport.top + 80
            ? -1
            : absoluteY > viewport.bottom - 80
              ? 1
              : 0
          : 0;
      if (direction !== autoScrollDirection.current) {
        stopAutoScroll();
        autoScrollDirection.current = direction;
        if (direction && pageScroll)
          autoScrollTimer.current = setInterval(() => {
            const moved = pageScroll.scrollBy(direction * 10);
            if (!moved) return;
            scrollAdjustmentRef.current += moved;
            setScrollAdjustment(scrollAdjustmentRef.current);
            const activeId = dragging.current.id;
            if (activeId)
              setDropTargetIndex(
                targetIndexAt(
                  activeId,
                  dragging.current.translationY + scrollAdjustmentRef.current,
                ),
              );
          }, 16);
      }
      const nextIndex = targetIndexAt(id, translationY + scrollAdjustmentRef.current);
      setDropTargetIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
    },
    [pageScroll, stopAutoScroll, targetIndexAt],
  );
  const endDrag = useCallback(
    (id: string, translationY: number) => {
      stopAutoScroll();
      const currentRoute = routeRef.current;
      const from = currentRoute.findIndex((delivery) => delivery.id === id);
      const to = targetIndexAt(id, translationY + scrollAdjustmentRef.current);
      if (from < 0 || to < 0 || from === to) return;
      const reordered = [...currentRoute];
      reordered.splice(to, 0, ...reordered.splice(from, 1));
      void orderRef.current(reordered);
    },
    [stopAutoScroll, targetIndexAt],
  );
  const cancelDrag = useCallback(() => {
    stopAutoScroll();
    dragging.current = { id: null, translationY: 0 };
    scrollAdjustmentRef.current = 0;
    setScrollAdjustment(0);
    setDraggingId(null);
    setDropTargetIndex(null);
  }, [stopAutoScroll]);
  const moveCardForAccessibility = useCallback((id: string, direction: -1 | 1) => {
    const currentRoute = routeRef.current;
    const index = currentRoute.findIndex((delivery) => delivery.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= currentRoute.length) return;
    const reordered = [...currentRoute];
    reordered.splice(target, 0, ...reordered.splice(index, 1));
    void orderRef.current(reordered);
  }, []);

  // URLs do Maps memorizadas
  const computedMapsUrls = useMemo(
    () => mapsUrls(route, routeStart?.address),
    [route, routeStart?.address],
  );
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
      await exportText(`rota-${date}.csv`, routeCsv(account, route, gpsApp, routeStart?.address));
      notify('Planilha da rota exportada em CSV.');
    } catch (e) {
      notify((e as Error).message);
    }
  }

  async function exportRoutePdf() {
    try {
      if (!route.length) throw new Error('Adicione entregas pendentes para montar a rota.');
      await exportPdf(
        `rota-${date}.pdf`,
        routePdfHtml(account, route, date, gpsApp, routeStart?.address),
      );
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
              Adicione uma entrega para incluir um cliente. Segure o card e arraste para mudar a
              ordem das paradas; edite uma parada para mudar data, horário ou destinatário.
            </ThemedText>

            <Field
              label={'Endere\u00e7o inicial da rota (opcional)'}
              value={routeStartQuery}
              placeholder={'Pesquise um endere\u00e7o no Google Maps'}
              onChange={(value) => {
                setRouteStartQuery(value);
                setRouteStart(null);
                setRouteStartError('');
                setRouteStartPredictions([]);
              }}
            />
            <Button
              label={
                routeStartLoading ? 'Pesquisando endereço...' : 'Buscar ponto inicial no Google'
              }
              icon={MapPin}
              secondary
              small
              disabled={routeStartLoading || routeStartQuery.trim().length < 4}
              onPress={() => void searchRouteStart()}
            />
            {!!routeStartError && (
              <ThemedText size={12} muted>
                {routeStartError}
              </ThemedText>
            )}
            {routeStartPredictions.map((prediction) => (
              <Button
                key={prediction.placeId}
                label={prediction.description}
                icon={MapPin}
                secondary
                small
                disabled={routeStartLoading}
                onPress={() => void selectRouteStart(prediction)}
              />
            ))}
            {!!routeStart && (
              <ThemedText size={12} muted>
                {'Ponto inicial selecionado. As paradas ser\u00e3o ordenadas a partir dele.'}
              </ThemedText>
            )}

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
                    if (routeStartQuery.trim() && !routeStart) {
                      notify('Escolha uma sugest\u00e3o do Google para definir o ponto inicial.');
                      return;
                    }
                    void order(
                      optimizeRoute(
                        account,
                        route,
                        routeStart
                          ? { latitude: routeStart.latitude, longitude: routeStart.longitude }
                          : undefined,
                      ),
                    );
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
              {routeStart
                ? 'A ordena\u00e7\u00e3o come\u00e7a pelo ponto inicial selecionado e segue pela pr\u00f3xima parada mais pr\u00f3xima.'
                : 'Sem ponto inicial, a ordena\u00e7\u00e3o mant\u00e9m a primeira parada atual. A dist\u00e2ncia n\u00e3o considera tr\u00e2nsito ou hor\u00e1rios.'}
            </ThemedText>

            {gpsApp === 'maps' && route.length > 4 && (
              <ThemedText size={12} muted>
                No celular, o Maps aceita poucos pontos por link. A rota agora fica dividida em
                trechos consecutivos; abra cada trecho para percorrer todos os destinos.
              </ThemedText>
            )}

            {gpsApp === 'maps' &&
              computedMapsUrls.map((url, i) => (
                <Button
                  key={`${url}-${i}`}
                  label={`Abrir Maps${computedMapsUrls.length > 1 ? ` - trecho ${i + 1}/${computedMapsUrls.length}` : ''}`}
                  secondary
                  small
                  icon={Navigation}
                  onPress={() =>
                    Linking.openURL(url).catch(() => notify('Não foi possível abrir o Maps.'))
                  }
                />
              ))}
          </Card>

          <View style={deliveryStyles.stack}>
            {route.map((d, i) => (
              <DraggableRouteCard
                key={d.id}
                id={d.id}
                disabled={busy || route.length < 2}
                isDragging={draggingId === d.id}
                isDropTarget={draggingId !== null && dropTargetIndex === i}
                highlightColor={theme.primary}
                scrollAdjustment={draggingId === d.id ? scrollAdjustment : 0}
                onMeasure={measureCard}
                onDragStart={startDrag}
                onDragMove={moveDrag}
                onDragEnd={endDrag}
                onDragCancel={cancelDrag}
              >
                <Card>
                  <View style={deliveryStyles.row}>
                    <View
                      accessible
                      accessibilityRole="adjustable"
                      accessibilityLabel={`Posi\u00e7\u00e3o da parada ${i + 1}: ${d.clientName}`}
                      accessibilityActions={[
                        { name: 'decrement', label: 'Mover para cima' },
                        { name: 'increment', label: 'Mover para baixo' },
                      ]}
                      onAccessibilityAction={(event) => {
                        if (busy) return;
                        if (event.nativeEvent.actionName === 'decrement')
                          moveCardForAccessibility(d.id, -1);
                        if (event.nativeEvent.actionName === 'increment')
                          moveCardForAccessibility(d.id, 1);
                      }}
                    >
                      <GripVertical size={18} color={theme.muted} />
                    </View>
                    <Badge>{i + 1}</Badge>
                    <View style={{ flex: 1 }}>
                      <ThemedText bold size={18}>
                        {d.clientName}
                      </ThemedText>
                      <ThemedText muted>
                        {d.time} {'\u2022'} {d.address}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText muted>
                    {(d.lines || [])
                      .map((line) => `${line.quantity} \u00d7 ${line.name}`)
                      .join(' \u2022 ')}
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
                      onPress={() =>
                        run(
                          (accountDraft) => completeDelivery(accountDraft, d.id),
                          'Entrega conclu\u00edda.',
                        )
                      }
                    />
                  </View>
                </Card>
              </DraggableRouteCard>
            ))}
          </View>

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
