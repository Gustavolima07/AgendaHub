import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { MotiView } from 'moti';
import { Badge, Card, ThemedText, layoutStyles, useTheme } from '../ui';
import { useStore } from '../store';
import { money } from '../domain';
import { Line } from '../types';

type ProductProfit = {
  id: string;
  name: string;
  quantity: number;
  sales: number;
  cost: number;
  profit: number;
  missingCostQuantity: number;
};

type MonthProfit = { month: string; label: string; sales: number; profit: number };

function lineCost(line: Line, currentCost?: number) {
  return line.costPrice ?? currentCost;
}

function AnimatedBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (Platform.OS === 'web')
    return (
      <View
        style={
          {
            width: 16,
            height: visible ? Math.max(height, 3) : 0,
            backgroundColor: color,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            transition: `height 520ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
          } as any
        }
      />
    );

  return (
    <MotiView
      from={{ height: 0 }}
      animate={{ height: Math.max(height, 3) }}
      transition={{ type: 'timing', duration: 520, delay }}
      style={{ width: 16, backgroundColor: color, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}
    />
  );
}

export function Profit() {
  const { account } = useStore();
  const theme = useTheme();
  const products = account.products;
  const delivered = useMemo(
    () => Object.values(account.deliveries).filter((delivery) => delivery.status === 'delivered'),
    [account.deliveries],
  );
  const pending = useMemo(
    () => Object.values(account.deliveries).filter((delivery) => delivery.status === 'pending'),
    [account.deliveries],
  );

  const report = useMemo(() => {
    const byProduct = new Map<string, ProductProfit>();
    let sales = 0;
    let knownCost = 0;
    let knownSales = 0;
    let missingCostQuantity = 0;
    for (const delivery of delivered) {
      for (const line of delivery.lines || []) {
        const lineSales = line.price * line.quantity;
        const unitCost = lineCost(line, products[line.productId]?.costPrice);
        sales += lineSales;
        const current = byProduct.get(line.productId) || {
          id: line.productId,
          name: line.name,
          quantity: 0,
          sales: 0,
          cost: 0,
          profit: 0,
          missingCostQuantity: 0,
        };
        current.quantity += line.quantity;
        current.sales += lineSales;
        if (unitCost === undefined || !Number.isFinite(unitCost)) {
          missingCostQuantity += line.quantity;
          current.missingCostQuantity += line.quantity;
        } else {
          const cost = unitCost * line.quantity;
          knownCost += cost;
          knownSales += lineSales;
          current.cost += cost;
          current.profit += lineSales - cost;
        }
        byProduct.set(line.productId, current);
      }
    }

    let pendingSales = 0;
    let pendingPotentialProfit = 0;
    let pendingMissingCostQuantity = 0;
    for (const delivery of pending) {
      for (const line of delivery.lines || []) {
        const lineSales = line.price * line.quantity;
        const unitCost = lineCost(line, products[line.productId]?.costPrice);
        pendingSales += lineSales;
        if (unitCost === undefined || !Number.isFinite(unitCost)) {
          pendingMissingCostQuantity += line.quantity;
        } else {
          pendingPotentialProfit += (line.price - unitCost) * line.quantity;
        }
      }
    }

    const monthDates = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        month,
        label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      };
    });
    const months: MonthProfit[] = monthDates.map(({ month, label }) => {
      let monthSales = 0;
      let monthProfit = 0;
      for (const delivery of delivered.filter((item) => item.date.startsWith(month))) {
        for (const line of delivery.lines || []) {
          const unitCost = lineCost(line, products[line.productId]?.costPrice);
          monthSales += line.price * line.quantity;
          if (unitCost !== undefined && Number.isFinite(unitCost))
            monthProfit += (line.price - unitCost) * line.quantity;
        }
      }
      return { month, label, sales: monthSales, profit: monthProfit };
    });
    return {
      sales,
      knownSales,
      knownCost,
      profit: knownSales - knownCost,
      margin: knownSales > 0 ? ((knownSales - knownCost) / knownSales) * 100 : 0,
      missingCostQuantity,
      pendingSales,
      pendingPotentialProfit,
      pendingMissingCostQuantity,
      products: [...byProduct.values()].sort((a, b) => b.profit - a.profit),
      months,
    };
  }, [delivered, pending, products]);

  const maxBar = Math.max(
    1,
    ...report.months.map((month) => Math.max(month.sales, Math.abs(month.profit))),
  );
  const moneyCompact = (value: number) =>
    new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

  return (
    <View style={layoutStyles.stack}>
      <Card>
        <ThemedText size={21} bold>
          Resumo do negócio
        </ThemedText>
        <ThemedText muted>
          O lucro bruto considera entregas concluídas e custos unitários informados. Entregas
          pendentes aparecem como previsão, sem entrar nos totais realizados.
        </ThemedText>
        <View style={[layoutStyles.wrap, { gap: 12 }]}>
          <Metric label="Vendas concluídas" value={money(report.sales)} />
          <Metric
            label="Lucro bruto calculável"
            value={money(report.profit)}
            color={report.profit >= 0 ? theme.primary : '#B33D3D'}
          />
          <Metric label="Margem bruta calculável" value={`${report.margin.toFixed(1)}%`} />
          <Metric
            label="Previsão em pedidos pendentes"
            value={money(report.pendingPotentialProfit)}
            note={`${money(report.pendingSales)} em vendas previstas`}
          />
        </View>
        {(report.missingCostQuantity > 0 || report.pendingMissingCostQuantity > 0) && (
          <View style={{ padding: 13, borderRadius: 12, backgroundColor: '#FFF0D5', gap: 5 }}>
            <ThemedText color="#775922" bold>
              Há produtos sem custo unitário informado
            </ThemedText>
            <ThemedText color="#775922" size={12}>
              {report.missingCostQuantity} unidade(s) vendida(s) e{' '}
              {report.pendingMissingCostQuantity} pendente(s) não entram no cálculo de lucro.
              Preencha o custo em Produtos para os próximos pedidos.
            </ThemedText>
          </View>
        )}
      </Card>

      <Card>
        <View style={layoutStyles.between}>
          <View>
            <ThemedText size={20} bold>
              Vendas e lucro bruto · últimos 6 meses
            </ThemedText>
            <ThemedText size={12} muted>
              Barras animadas ao entrar na página; lucro usa somente linhas com custo conhecido.
            </ThemedText>
          </View>
          <Badge>R$</Badge>
        </View>
        <View style={[layoutStyles.row, { flexWrap: 'wrap' }]}>
          <Legend color={theme.primary} label="Vendas concluídas" />
          <Legend color="#E0A83D" label="Lucro bruto" />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            minHeight: 214,
            paddingTop: 18,
            gap: 8,
          }}
        >
          {report.months.map((month, index) => (
            <View key={month.month} style={{ flex: 1, minWidth: 38, alignItems: 'center', gap: 6 }}>
              <ThemedText size={9} muted>
                {moneyCompact(month.sales)}
              </ThemedText>
              <View style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <AnimatedBar
                  height={(month.sales / maxBar) * 145}
                  color={theme.primary}
                  delay={index * 55}
                />
                <AnimatedBar
                  height={(Math.abs(month.profit) / maxBar) * 145}
                  color={month.profit < 0 ? '#B33D3D' : '#E0A83D'}
                  delay={index * 55 + 90}
                />
              </View>
              <ThemedText size={10} bold>
                {month.label}
              </ThemedText>
              <ThemedText size={9} muted>
                {moneyCompact(month.profit)}
              </ThemedText>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <ThemedText size={20} bold>
          Resultado por produto
        </ThemedText>
        {!report.products.length ? (
          <ThemedText muted>
            Conclua entregas para começar a ver vendas e lucro por produto.
          </ThemedText>
        ) : (
          report.products.map((product) => (
            <View
              key={product.id}
              style={[
                layoutStyles.between,
                {
                  flexWrap: 'wrap',
                  borderBottomWidth: 1,
                  borderColor: theme.muted + '20',
                  paddingVertical: 9,
                },
              ]}
            >
              <View style={{ flex: 1, minWidth: 160 }}>
                <ThemedText bold>{product.name}</ThemedText>
                <ThemedText size={11} muted>
                  {product.quantity} unidade(s) · vendas {money(product.sales)} · custo conhecido{' '}
                  {money(product.cost)}
                </ThemedText>
                {product.missingCostQuantity > 0 && (
                  <ThemedText size={11} color="#775922">
                    Custo ausente em {product.missingCostQuantity} unidade(s)
                  </ThemedText>
                )}
              </View>
              <Badge>Lucro {money(product.profit)}</Badge>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
  note,
}: {
  label: string;
  value: string;
  color?: string;
  note?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 190,
        padding: 14,
        borderRadius: 13,
        backgroundColor: theme.background,
        gap: 6,
      }}
    >
      <ThemedText size={11} muted>
        {label}
      </ThemedText>
      <ThemedText size={20} bold color={color}>
        {value}
      </ThemedText>
      {!!note && (
        <ThemedText size={10} muted>
          {note}
        </ThemedText>
      )}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={layoutStyles.row}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <ThemedText size={11} muted>
        {label}
      </ThemedText>
    </View>
  );
}
