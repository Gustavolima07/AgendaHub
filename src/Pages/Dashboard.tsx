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
import { T, Card, Button, Empty, Calendar, s, useTheme, contrast } from '../ui';
import { useStore } from '../store';
import { activities, dateKey, localDate, conflicts } from '../domain';
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
    done = deliveries.filter((d) => d.status === 'delivered').length,
    total = deliveries.filter((d) => d.status !== 'cancelled').length;
  const conflictsCount = all.filter((x) => conflicts(account, x).length).length;
  const upcoming = all.filter(
    (x) =>
      localDate(x.date, x.time).getTime() > now &&
      localDate(x.date, x.time).getTime() - now < 3600000,
  );

  return (
    <View style={s.stack}>
      <View style={[s.between, { flexWrap: 'wrap' }]}>
        <View style={{ gap: 5 }}>
          <T size={30} bold>
            Olá, {(account.settings.name || user?.displayName || 'você').split(' ')[0]}{' '}
            <T size={28}>☀</T>
          </T>
          <T muted>Vamos fazer deste um dia bem organizado.</T>
        </View>
        <Button
          label="Novo compromisso"
          icon={Plus}
          onPress={() => edit({ kind: 'appointment' })}
        />
      </View>

      <View style={[s.wrap, { gap: 14 }]}>
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
            style={{ flex: 1, minWidth: width < 600 ? '44%' : 180 }}
          >
            <Card delay={i * 60} style={{ height: 158, padding: 18, gap: 10 }}>
              <View style={s.between}>
                <T muted size={12}>
                  {x.label}
                </T>
                <x.icon color={t.primary} size={19} />
              </View>
              <T size={33} bold>
                {x.value}
              </T>
              <T muted size={11}>
                {x.note}
              </T>
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: width > 1100 ? 'row' : 'column', gap: 18 }}>
        <View style={{ flex: 1, gap: 18 }}>
          <Card style={{ backgroundColor: t.primary, borderColor: t.primary, overflow: 'hidden' }}>
            <View style={s.row}>
              <Sparkles size={18} color={contrast(t.primary)} />
              <T color={contrast(t.primary)} bold>
                Seu resumo inteligente
              </T>
            </View>
            <T color={contrast(t.primary)} size={22} bold>
              {list.length
                ? `${list.length} atividades para hoje.`
                : 'Um novo dia, novas possibilidades.'}
            </T>
            <T color={contrast(t.primary)}>
              {upcoming.length ? `${upcoming.length} atividade(s) começam na próxima hora. ` : ''}
              {conflictsCount
                ? `${conflictsCount} atividades em conflito precisam de atenção.`
                : 'Nenhum conflito de horário na sua agenda.'}
            </T>
            {all.filter((x) => localDate(x.date, x.time).getTime() < now).length > 0 && (
              <T color={contrast(t.primary)} size={12}>
                Há atividades com horário passado ainda pendentes. Revise a agenda e atualize seus
                status.
              </T>
            )}
          </Card>

          <Card>
            <View style={s.between}>
              <T size={19} bold>
                Na sua agenda hoje
              </T>
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
            <T bold>Próximos passos</T>
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
            <T size={12} muted>
              Organize o básico hoje. Ganhe tranquilidade amanhã.
            </T>
          </Card>
        </View>
      </View>
    </View>
  );
}
