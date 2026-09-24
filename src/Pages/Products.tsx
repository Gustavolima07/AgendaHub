import React, { useState } from 'react';
import { View } from 'react-native';
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react-native';
import { T, Card, Button, IconButton, Field, Chips, Badge, Empty, s } from '../ui';
import { useStore } from '../store';
import { money, reserved } from '../domain';
import { PageProps } from './types';

export function Products({ edit, notify }: PageProps) {
  const { account, mutate } = useStore(),
    [search, setSearch] = useState(''),
    [archived, setArchived] = useState(false);

  const products = Object.values(account.products).filter(
    (p) =>
      !!p.archived === archived &&
      `${p.name} ${p.type}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={s.stack}>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        <Field
          label="Buscar produtos"
          value={search}
          onChange={setSearch}
          placeholder="Nome ou tipo"
        />
        <Button label="Novo produto" icon={Plus} onPress={() => edit({ kind: 'product' })} />
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
        {products.map((p) => (
          <Card key={p.id} style={{ flexBasis: 280, flexGrow: 1, maxWidth: 450 }}>
            <Badge>{p.type}</Badge>
            <T size={21} bold>
              {p.name}
            </T>
            <T size={25} bold>
              {money(p.price)}
            </T>
            <View style={s.between}>
              <T muted>Estoque: {p.quantity}</T>
              <T muted>Reservado: {reserved(account, p.id)}</T>
            </View>
            <T bold>Disponível: {p.quantity - reserved(account, p.id)}</T>
            <View style={s.row}>
              <Button
                label="Editar produto"
                secondary
                small
                icon={Pencil}
                onPress={() => edit({ kind: 'product', item: p })}
              />
              <IconButton
                icon={p.archived ? RotateCcw : Archive}
                label={p.archived ? 'Restaurar produto' : 'Arquivar produto'}
                onPress={async () => {
                  try {
                    await mutate((a) => {
                      if (
                        !p.archived &&
                        (reserved(a, p.id) > 0 ||
                          Object.values(a.clients).some(
                            (c) =>
                              !c.archived && (c.monthly || []).some((l) => l.productId === p.id),
                          ))
                      )
                        throw Error(
                          'Este produto está em entregas pendentes ou pedidos mensais. Remova essas associações antes de arquivar.',
                        );
                      a.products[p.id].archived = !p.archived;
                    });
                    notify(p.archived ? 'Produto restaurado.' : 'Produto arquivado.');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
            </View>
          </Card>
        ))}
      </View>

      {!products.length && (
        <Card>
          <Empty
            title="Seu catálogo, organizado"
            description="Adicione produtos com tipo, preço e quantidade para montar suas entregas."
            action={() => edit({ kind: 'product' })}
          />
        </Card>
      )}
    </View>
  );
}
