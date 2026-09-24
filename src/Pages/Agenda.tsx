import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Plus } from 'lucide-react-native';
import { ThemedText, Card, Button, Chips, Empty, Calendar, Badge, layoutStyles } from '../ui';
import { useStore } from '../store';
import { activities, dateKey, localDate, dateLabel, availableSlots } from '../domain';
import { ActivityRow } from '../Components/ActivityRow';
import { PageProps } from './types';
export function Agenda({
  edit,
  notify,
  selectedDate,
  onDateChange,
}: PageProps & { selectedDate: string; onDateChange: (date: string) => void }) {
  const { account, mutate } = useStore(),
    [mode, setMode] = useState('day'),
    [history, setHistory] = useState(false),
    { width } = useWindowDimensions();
  const date = selectedDate,
    setDate = onDateChange;
  const all = activities(account),
    current = localDate(date),
    start = new Date(current);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const included = (d: string) =>
    mode === 'day'
      ? d === date
      : mode === 'month'
        ? d.startsWith(date.slice(0, 7))
        : d >= dateKey(start) && d <= dateKey(end);
  const list = all.filter((x) => included(x.date));
  async function done(id: string) {
    try {
      await mutate((a) => {
        a.appointments[id].status = 'done';
      });
      notify('Compromisso concluído.');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <View style={layoutStyles.stack}>
      <View style={[layoutStyles.between, { flexWrap: 'wrap' }]}>
        <Chips
          options={[
            { id: 'day', label: 'Dia' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <Button
          label="Novo compromisso"
          icon={Plus}
          onPress={() => edit({ kind: 'appointment', date })}
        />
      </View>
      <View style={{ flexDirection: width > 1000 ? 'row' : 'column', gap: 18 }}>
        <Card style={{ width: width > 1000 ? 340 : '100%', alignSelf: 'flex-start' }}>
          <Calendar value={date} onChange={setDate} marked={all.map((x) => x.date)} />
          <Button label="Ir para hoje" secondary small onPress={() => setDate(dateKey())} />
        </Card>
        <Card style={{ flex: 1 }}>
          <ThemedText size={20} bold>
            {mode === 'day'
              ? localDate(date).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : mode === 'week'
                ? `${dateLabel(dateKey(start))} — ${dateLabel(dateKey(end))}`
                : localDate(date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </ThemedText>
          {list.map((x) => (
            <View key={x.id}>
              <ActivityRow
                item={x}
                onPress={() =>
                  edit(
                    x.kind === 'delivery'
                      ? { kind: 'delivery', item: account.deliveries[x.id] }
                      : { kind: 'appointment', item: account.appointments[x.id] },
                  )
                }
              />
              {x.kind === 'appointment' && (
                <View style={[layoutStyles.wrap, { paddingTop: 8 }]}>
                  <Button label="Concluir" small secondary onPress={() => done(x.id)} />
                  <Button
                    label="Cancelar compromisso"
                    small
                    secondary
                    onPress={async () => {
                      try {
                        await mutate((a) => {
                          a.appointments[x.id].status = 'cancelled';
                        });
                        notify('Compromisso cancelado.');
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  />
                </View>
              )}
            </View>
          ))}
          {!list.length && (
            <Empty
              title="Nada programado por aqui"
              description="Escolha uma data e adicione seu próximo compromisso."
              action={() => edit({ kind: 'appointment', date })}
            />
          )}
          <Button
            label={history ? 'Ocultar histórico' : 'Ver concluídos e cancelados'}
            secondary
            small
            onPress={() => setHistory(!history)}
          />
          {history &&
            Object.values(account.appointments)
              .filter((x) => x.status !== 'scheduled' && included(x.date))
              .map((x) => (
                <View key={x.id} style={layoutStyles.between}>
                  <ThemedText>
                    {x.title} • {dateLabel(x.date)} {x.time}
                  </ThemedText>
                  <Badge>{x.status === 'done' ? 'Concluído' : 'Cancelado'}</Badge>
                </View>
              ))}
        </Card>
      </View>
      <Card>
        <ThemedText bold>Horários disponíveis • {dateLabel(date)}</ThemedText>
        <ThemedText muted size={12}>
          Janelas de 30 minutos, das 08h às 18h. Compromissos e entregas são considerados.
        </ThemedText>
        <Chips
          options={availableSlots(account, date).map((x) => ({ id: x, label: x }))}
          value=""
          onChange={(time) => edit({ kind: 'appointment', date, time })}
        />
      </Card>
    </View>
  );
}
