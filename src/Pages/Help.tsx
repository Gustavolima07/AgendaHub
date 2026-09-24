import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  Search,
  CircleHelp,
  CalendarDays,
  Users,
  Package,
  Truck,
  Palette,
  MapPin,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Field,
  ThemedText,
  layoutStyles,
  useTheme,
  interactiveZoom,
} from '../ui';

type HelpKey =
  'dashboard' | 'agenda' | 'clients' | 'products' | 'deliveries' | 'settings' | 'coordinates';
type HelpGuide = {
  id: HelpKey;
  title: string;
  group: string;
  icon: React.ComponentType<any>;
  keywords: string[];
  intro: string;
  points: string[];
  visualLabels: string[];
};

const helpGuides: HelpGuide[] = [
  {
    id: 'dashboard',
    title: 'Visão geral',
    group: 'Páginas do app',
    icon: CircleHelp,
    keywords: ['início', 'resumo', 'hoje', 'conflitos', 'lembretes', 'atividades'],
    intro: 'A página inicial reúne o que merece atenção hoje e atalhos para começar uma tarefa.',
    points: [
      '1 · Resumo inteligente: mostra atividades do dia, itens próximos e conflitos de horário.',
      '2 · Agenda de hoje: abra um compromisso ou entrega para consultar e editar.',
      '3 · Próximos passos: cadastre um cliente ou programe uma entrega sem procurar o menu.',
    ],
    visualLabels: ['Resumo do dia', 'Agenda de hoje', 'Atalhos'],
  },
  {
    id: 'agenda',
    title: 'Agenda',
    group: 'Páginas do app',
    icon: CalendarDays,
    keywords: ['calendário', 'dia', 'semana', 'mês', 'compromisso', 'horário', 'disponibilidade'],
    intro:
      'Use a agenda para planejar compromissos e consultar horários livres sem sobrepor atividades.',
    points: [
      '1 · Alterne entre dia, semana e mês; as datas marcadas têm atividades.',
      '2 · Toque em Novo compromisso para escolher cliente, data, horário e duração. A tela avisa quando existe conflito.',
      '3 · Horários disponíveis são exibidos em intervalos de 30 minutos, das 08h às 18h. Você também pode consultar o histórico de concluídos e cancelados.',
    ],
    visualLabels: ['Dia · Semana · Mês', 'Calendário', 'Horários livres'],
  },
  {
    id: 'clients',
    title: 'Clientes',
    group: 'Páginas do app',
    icon: Users,
    keywords: [
      'cadastro',
      'contato',
      'endereço',
      'latitude',
      'longitude',
      'histórico',
      'fixo',
      'mensal',
    ],
    intro:
      'Cada cadastro guarda os dados de contato, endereço de entrega e relação do cliente com agenda e pedidos.',
    points: [
      '1 · Use Novo cliente para cadastrar nome e formas de contato.',
      '2 · Informe o endereço completo. Para sugerir ordem por proximidade, preencha também latitude e longitude no cadastro/edição do cliente.',
      '3 · Histórico abre pedidos, entregas e compromissos. Marque produtos mensais fixos, quantidade, dia e horário para gerar as entregas do mês.',
    ],
    visualLabels: ['Contato', 'Endereço + coordenadas', 'Mensal fixo / histórico'],
  },
  {
    id: 'products',
    title: 'Produtos',
    group: 'Páginas do app',
    icon: Package,
    keywords: ['catálogo', 'estoque', 'quantidade', 'preço', 'tipo', 'produto'],
    intro: 'O catálogo mantém os produtos disponíveis para incluir nos pedidos e nas entregas.',
    points: [
      '1 · Cadastre nome e tipo para reconhecer o produto no catálogo.',
      '2 · Informe preço e quantidade em estoque. O saldo reservado aparece enquanto há entregas pendentes.',
      '3 · Ao concluir uma entrega, o sistema baixa as unidades do estoque; ao cancelar, libera a reserva.',
    ],
    visualLabels: ['Nome e tipo', 'Preço', 'Estoque disponível'],
  },
  {
    id: 'deliveries',
    title: 'Entregas e rotas',
    group: 'Páginas do app',
    icon: Truck,
    keywords: ['entrega', 'pedido', 'rota', 'maps', 'waze', 'exportar', 'csv', 'paradas', 'mensal'],
    intro:
      'Programe pedidos por data, horário e destinatário. Depois organize as paradas do dia e abra a navegação.',
    points: [
      '1 · Em Entregas, escolha uma data no calendário e toque em Nova entrega para selecionar cliente, horário e produtos.',
      '2 · A aba Rota do dia reúne as pendentes. Use as setas para mudar a ordem, ou ordene por proximidade (estimativa por coordenadas, sem considerar trânsito).',
      '3 · Abra cada destino no Waze ou use Abrir Maps para os trechos. Exportar rota cria uma lista de paradas. No escopo mensal, Exportar produtos do mês gera CSV somente com nome, tipo e quantidade.',
    ],
    visualLabels: ['Calendário + pedidos', 'Paradas reordenáveis', 'Exportação / navegação'],
  },
  {
    id: 'settings',
    title: 'Personalizar e notificações',
    group: 'Páginas do app',
    icon: Palette,
    keywords: ['cores', 'paleta', 'preview', 'prévia', 'notificação', 'lembrete', 'conta'],
    intro: 'Personalizar permite ajustar a aparência e os lembretes do AgendaHub.',
    points: [
      '1 · Selecione uma paleta pronta ou crie uma paleta informando cores em hexadecimal (#RRGGBB).',
      '2 · Confira a prévia ao vivo. A paleta só muda no app depois de tocar em Aplicar esta paleta.',
      '3 · Atualize o nome de exibição e ative notificações locais no Android/iOS. No site, os avisos aparecem dentro do app.',
    ],
    visualLabels: ['Paletas', 'Prévia ao vivo', 'Conta e avisos'],
  },
  {
    id: 'coordinates',
    title: 'Encontrar latitude e longitude',
    group: 'Rotas e endereços',
    icon: MapPin,
    keywords: [
      'coordenadas',
      'gps',
      'latitude',
      'longitude',
      'google maps',
      'waze',
      'pin',
      'endereço',
      'rota',
    ],
    intro:
      'As coordenadas identificam um ponto com precisão. Cadastre no cliente o par no formato latitude, longitude para ajudar a ordenar as paradas por proximidade.',
    points: [
      'Google Maps (computador): abra o mapa, clique com o botão direito exatamente no local. As coordenadas aparecem no topo do menu; clique nelas para copiar.',
      'Google Maps (celular): mantenha o dedo pressionado no ponto até surgir um pino. Abra o cartão do local e copie as coordenadas exibidas.',
      'Waze: ele aceita coordenadas na busca no formato latitude,longitude. Para encontrar/copiar o par de um endereço, use o pin no Google Maps e valide o ponto abrindo as mesmas coordenadas no Waze.',
      'No AgendaHub, cole latitude no primeiro campo e longitude no segundo. Exemplo: -23.55052 e -46.63331. Sul e oeste costumam ser negativos; use ponto decimal, não troque os campos.',
    ],
    visualLabels: ['1 · Marque o ponto', '2 · Copie o par', '3 · Cole no cliente'],
  },
];

function normalizeText(text: string) {
  return text
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function GuidePreview({ guide }: { guide: HelpGuide }) {
  const theme = useTheme();
  const descriptions: Record<HelpKey, string[]> = {
    dashboard: ['Olá! Seu dia', '4 atividades hoje', 'Agenda · 09:00', 'Cadastrar cliente'],
    agenda: ['Minha agenda', 'Dia  Semana  Mês', '◉  09:00  Compromisso', 'Disponível · 10:30'],
    clients: [
      'Clientes',
      'Ana Souza · (11) 9999',
      'Endereço · lat / long',
      'Mensal fixo · Histórico',
    ],
    products: ['Produtos', 'Café especial · Bebida', 'R$ 32,00', 'Estoque · 18 un.'],
    deliveries: [
      'Entregas e rotas',
      'Calendário · 24 set.',
      '1  Ana · 09:00   ↕',
      'Exportar · Maps · Waze',
    ],
    settings: ['Personalizar', 'Paletas de cores', 'Prévia ao vivo', 'Aplicar esta paleta'],
    coordinates: [
      'Google Maps / Waze',
      '📍 Ponto exato',
      '-23.55052, -46.63331',
      'Cliente · latitude / longitude',
    ],
  };
  const rows = descriptions[guide.id];
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Ilustração da tela ${guide.title} com áreas numeradas`}
      style={{
        backgroundColor: theme.background,
        borderColor: theme.muted + '35',
        borderWidth: 1,
        borderRadius: 14,
        padding: 10,
        gap: 8,
      }}
    >
      <View style={[layoutStyles.row, { paddingHorizontal: 4 }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
        <ThemedText size={10} muted>
          AGENDAHUB / {guide.title.toLocaleUpperCase('pt-BR')}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, minHeight: 130 }}>
        <View
          style={{
            width: 32,
            backgroundColor: theme.surface,
            borderRadius: 8,
            padding: 6,
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          {[0, 1, 2, 3].map((railItem) => (
            <View
              key={railItem}
              style={{
                width: 15,
                height: 15,
                borderRadius: 5,
                backgroundColor: railItem === 1 ? theme.accent : theme.muted + '28',
              }}
            />
          ))}
        </View>
        <View style={{ flex: 1, gap: 7 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 8, padding: 8 }}>
            <ThemedText size={11} bold>
              {rows[0]}
            </ThemedText>
          </View>
          {rows.slice(1).map((row, rowIndex) => (
            <View
              key={row}
              style={{
                flex: 1,
                minHeight: 25,
                borderRadius: 8,
                paddingHorizontal: 8,
                justifyContent: 'center',
                backgroundColor: rowIndex === 0 ? theme.accent : theme.surface,
                borderWidth: rowIndex === 0 ? 1 : 0,
                borderColor: theme.primary,
              }}
            >
              <View style={layoutStyles.between}>
                <ThemedText size={10}>{row}</ThemedText>
                <Badge>{rowIndex + 1}</Badge>
              </View>
            </View>
          ))}
        </View>
      </View>
      <ThemedText size={10} muted>
        Guia visual ilustrativo · os números correspondem às orientações abaixo.
      </ThemedText>
    </View>
  );
}

export function Help() {
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const groups = ['Todos', 'Páginas do app', 'Rotas e endereços'];
  const filteredGuides = useMemo(() => {
    const searchTerms = normalizeText(searchText).trim().split(/\s+/).filter(Boolean);
    return helpGuides.filter((guide) => {
      const matchesGroup = selectedGroup === 'Todos' || guide.group === selectedGroup;
      const searchableGuide = normalizeText(
        [guide.title, guide.group, guide.intro, ...guide.points, ...guide.keywords].join(' '),
      );
      return matchesGroup && searchTerms.every((term) => searchableGuide.includes(term));
    });
  }, [searchText, selectedGroup]);

  return (
    <View style={layoutStyles.stack}>
      <Card style={{ backgroundColor: theme.primary, borderColor: theme.primary }}>
        <View style={layoutStyles.row}>
          <CircleHelp size={22} color="#FFFFFF" />
          <ThemedText size={21} bold color="#FFFFFF">
            Como podemos ajudar?
          </ThemedText>
        </View>
        <ThemedText color="#FFFFFF">
          Pesquise por uma palavra ou escolha um tópico. Os guias destacam onde encontrar cada
          recurso.
        </ThemedText>
        <Field
          label="Buscar na ajuda"
          value={searchText}
          onChange={setSearchText}
          placeholder="Ex.: estoque, horário, latitude, paleta…"
        />
        {!!searchText && (
          <Button small secondary label="Limpar busca" icon={X} onPress={() => setSearchText('')} />
        )}
      </Card>

      <View style={layoutStyles.wrap}>
        {groups.map((group) => (
          <Pressable
            key={group}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedGroup === group }}
            onPress={() => setSelectedGroup(group)}
            style={({ pressed, hovered }: any) => ({
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: selectedGroup === group ? theme.primary : theme.surface,
              ...interactiveZoom(pressed, hovered),
            })}
          >
            <ThemedText size={12} bold color={selectedGroup === group ? '#FFFFFF' : theme.text}>
              {group}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText muted size={12}>
        {filteredGuides.length} tópico(s) encontrado(s)
        {searchText ? ` para “${searchText.trim()}”` : ''}.
      </ThemedText>
      {filteredGuides.map((guide) => {
        const GuideIcon = guide.icon;
        return (
          <Card key={guide.id}>
            <View style={layoutStyles.row}>
              <View style={{ backgroundColor: theme.accent, borderRadius: 11, padding: 9 }}>
                <GuideIcon size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText bold size={19}>
                  {guide.title}
                </ThemedText>
                <ThemedText muted size={11}>
                  {guide.group}
                </ThemedText>
              </View>
              {guide.id !== 'coordinates' && (
                <Button
                  small
                  secondary
                  label="Abrir página"
                  onPress={() =>
                    router.navigate(
                      guide.id === 'dashboard'
                        ? '/'
                        : guide.id === 'agenda'
                          ? '/agenda'
                          : guide.id === 'clients'
                            ? '/clientes'
                            : guide.id === 'products'
                              ? '/produtos'
                              : guide.id === 'deliveries'
                                ? '/entregas'
                                : '/personalizar',
                    )
                  }
                />
              )}
            </View>
            <ThemedText>{guide.intro}</ThemedText>
            <GuidePreview guide={guide} />
            <View style={{ gap: 10 }}>
              {guide.points.map((point, index) => (
                <View key={point} style={[layoutStyles.row, { alignItems: 'flex-start' }]}>
                  <Badge>{index + 1}</Badge>
                  <ThemedText style={{ flex: 1 }}>{point.replace(/^\d+ · /, '')}</ThemedText>
                </View>
              ))}
            </View>
            {guide.id === 'coordinates' && (
              <Card style={{ backgroundColor: theme.accent }}>
                <ThemedText bold>Confira o formato</ThemedText>
                <ThemedText>Latitude: de -90 a 90 · Longitude: de -180 a 180</ThemedText>
                <ThemedText bold>-23.55052 / -46.63331</ThemedText>
                <ThemedText muted>
                  Use números decimais com ponto e mantenha a ordem latitude, longitude.
                </ThemedText>
              </Card>
            )}
          </Card>
        );
      })}
      {!filteredGuides.length && (
        <Card>
          <ThemedText bold>Nenhum tópico encontrado</ThemedText>
          <ThemedText muted>
            Tente termos como cliente, agenda, estoque, rota, Maps ou cores.
          </ThemedText>
          <Button
            label="Limpar filtros"
            secondary
            onPress={() => {
              setSearchText('');
              setSelectedGroup('Todos');
            }}
          />
        </Card>
      )}
      <Card>
        <View style={layoutStyles.row}>
          <Search size={17} color={theme.primary} />
          <ThemedText bold>Dica de busca</ThemedText>
        </View>
        <ThemedText muted>
          A pesquisa ignora acentos. Por exemplo, “coordenada”, “entrega mensal” e “horário”
          encontram os tópicos relacionados.
        </ThemedText>
      </Card>
    </View>
  );
}
