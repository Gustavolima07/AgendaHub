import React from 'react';
import { router } from 'expo-router';
import { useNow } from '../hooks/useNow';
import { View, Pressable, useWindowDimensions } from 'react-native';
import {
  Plus,
  ArrowRight,
  Truck,
  Users,
  Package,
  CalendarDays,
  Sparkles,
} from 'lucide-react-native';
import {
  ThemedText,
  Card,
  Button,
  Empty,
  Calendar,
  layoutStyles,
  interactiveZoom,
  useTheme,
  contrast,
} from '../ui';
import { useStore } from '../store';
import { activities, dateKey, localDate, conflicts, stockShortages } from '../domain';
import { PageProps } from './types';

import { ActivityRow } from '../Components/ActivityRow';

export function Dashboard({ edit, go }: PageProps) {
  const now = useNow();
  const { account, user } = useStore(),
    t = useTheme(),
    { width } = useWindowDimensions(),
    today = dateKey(),
    all = activities(account),
    list = all.filter((x) => x.date === today),
    deliveries = Object.values(account.deliveries).filter((d) => d.date === today),
    shortageItems = stockShortages(account),
    done = deliveries.filter((d) => d.status === 'delivered').length,
    total = deliveries.filter((d) => d.status !== 'cancelled').length;
  const conflictsCount = all.filter((x) => conflicts(account, x).length).length;
  const upcoming = all.filter(
    (x) =>
      localDate(x.date, x.time).getTime() > now &&
      localDate(x.date, x.time).getTime() - now < 3600000,
  );

  return (
    <View style={layoutStyles.stack}>
      <View style={[layoutStyles.between, { flexWrap: 'wrap' }]}>
        <View style={{ gap: 5 }}>
          <ThemedText size={30} bold>
            Olá, {(account.settings.name || user?.displayName || 'você').split(' ')[0]}{' '}
            <ThemedText size={28}>☀</ThemedText>
          </ThemedText>
          <ThemedText muted>Vamos fazer deste um dia bem organizado.</ThemedText>
        </View>
        <Button
          label="Novo compromisso"
          icon={Plus}
          onPress={() => edit({ kind: 'appointment' })}
        />
      </View>

      <View style={[layoutStyles.wrap, { gap: 14 }]}>
        {[
          {
            label: 'Compromissos hoje',
            value: list.filter((x) => x.kind === 'appointment').length,
            icon: CalendarDays,
            tab: 'agenda',
            note: 'Seu tempo, bem planejado',
          },
          {
            label: 'Entregas do dia',
            value: total,
            icon: Truck,
            tab: 'deliveries',
            note: `${done} concluídas • ${total - done} pendentes`,
          },
          {
            label: 'Clientes ativos',
            value: Object.values(account.clients).filter((c) => !c.archived).length,
            icon: Users,
            tab: 'clients',
            note: 'Conexões que importam',
          },
          {
            label: 'Produtos cadastrados',
            value: Object.values(account.products).filter((p) => !p.archived).length,
            icon: Package,
            tab: 'products',
            note: 'Tudo sob controle',
          },
        ].map((x, i) => (
          <Pressable
            key={x.tab}
            accessibilityRole="button"
            accessibilityLabel={x.label}
            onPress={() => go?.(x.tab)}
            style={({ pressed, hovered }: any) => ({
              flex: 1,
              minWidth: width < 600 ? '44%' : 180,
              ...interactiveZoom(pressed, hovered, 0.975, 1.02),
            })}
          >
            <Card delay={i * 60} style={{ height: 158, padding: 18, gap: 10 }}>
              <View style={layoutStyles.between}>
                <ThemedText muted size={12}>
                  {x.label}
                </ThemedText>
                <x.icon color={t.primary} size={19} />
              </View>
              <ThemedText size={33} bold>
                {x.value}
              </ThemedText>
              <ThemedText muted size={11}>
                {x.note}
              </ThemedText>
            </Card>
          </Pressable>
        ))}
      </View>

      {shortageItems.length > 0 && (
        <Card style={{ backgroundColor: '#FFF0D5', borderColor: '#E5B75D' }}>
          <ThemedText size={18} bold color="#775922">
            Demanda acima do estoque · encomende antes de concluir
          </ThemedText>
          {shortageItems.map((item) => (
            <ThemedText key={item.productId} color="#775922">
              {item.name}: {item.requested} em entregas pendentes, {item.onHand} em estoque — faltam{' '}
              {item.missing}.
            </ThemedText>
          ))}
          <Button label="Atualizar estoque" small secondary onPress={() => go?.('products')} />
        </Card>
      )}

      <View style={{ flexDirection: width > 1100 ? 'row' : 'column', gap: 18 }}>
        <View style={{ flex: 1, gap: 18 }}>
          <Card style={{ backgroundColor: t.primary, borderColor: t.primary, overflow: 'hidden' }}>
            <View style={layoutStyles.row}>
              <Sparkles size={18} color={contrast(t.primary)} />
              <ThemedText color={contrast(t.primary)} bold>
                Seu resumo inteligente
              </ThemedText>
            </View>
            <ThemedText color={contrast(t.primary)} size={22} bold>
              {list.length
                ? `${list.length} atividades para hoje.`
                : 'Um novo dia, novas possibilidades.'}
            </ThemedText>
            <ThemedText color={contrast(t.primary)}>
              {upcoming.length ? `${upcoming.length} atividade(s) começam na próxima hora. ` : ''}
              {conflictsCount
                ? `${conflictsCount} atividades em conflito precisam de atenção.`
                : 'Nenhum conflito de horário na sua agenda.'}
            </ThemedText>
            {all.filter((x) => localDate(x.date, x.time).getTime() < now).length > 0 && (
              <ThemedText color={contrast(t.primary)} size={12}>
                Há atividades com horário passado ainda pendentes. Revise a agenda e atualize seus
                status.
              </ThemedText>
            )}
          </Card>

          <Card>
            <View style={layoutStyles.between}>
              <ThemedText size={19} bold>
                Na sua agenda hoje
              </ThemedText>
              <Button
                label="Ver agenda"
                small
                secondary
                onPress={() => go?.('agenda')}
                icon={ArrowRight}
              />
            </View>
            {list.length ? (
              list.map((x) => (
                <ActivityRow
                  key={x.id}
                  item={x}
                  onPress={() =>
                    edit(
                      x.kind === 'delivery'
                        ? { kind: 'delivery', item: account.deliveries[x.id] }
                        : { kind: 'appointment', item: account.appointments[x.id] },
                    )
                  }
                />
              ))
            ) : (
              <Empty
                title="Seu dia está livre"
                description="Adicione compromissos e entregas para acompanhar tudo por aqui."
                action={() => edit({ kind: 'appointment' })}
              />
            )}
          </Card>
        </View>

        <View style={{ width: width > 1100 ? 325 : '100%', gap: 18 }}>
          <Card>
            <Calendar
              value={today}
              onChange={(date) => router.navigate({ pathname: '/agenda', params: { date } })}
              marked={all.map((x) => x.date)}
              compact
            />
          </Card>
          <Card>
            <ThemedText bold>Próximos passos</ThemedText>
            <Button
              label="Cadastrar cliente"
              secondary
              small
              icon={Users}
              onPress={() => edit({ kind: 'client' })}
            />
            <Button
              label="Programar entrega"
              secondary
              small
              icon={Truck}
              onPress={() => edit({ kind: 'delivery' })}
            />
            <ThemedText size={12} muted>
              Organize o básico hoje. Ganhe tranquilidade amanhã.
            </ThemedText>
          </Card>
        </View>
      </View>
    </View>
  );
}
