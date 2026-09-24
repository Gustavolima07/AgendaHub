import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  Truck,
  Palette,
  LucideIcon,
} from 'lucide-react-native';

export interface NavItem {
  id: NavId;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const paths = {
  dashboard: '/',
  agenda: '/agenda',
  clients: '/clientes',
  products: '/produtos',
  deliveries: '/entregas',
  settings: '/personalizar',
} as const;
export type NavId = keyof typeof paths;

export const navigation: NavItem[] = [
  { id: 'dashboard', label: 'Visão geral', short: 'Início', icon: LayoutDashboard },
  { id: 'agenda', label: 'Minha agenda', short: 'Agenda', icon: CalendarDays },
  { id: 'clients', label: 'Clientes', short: 'Clientes', icon: Users },
  { id: 'products', label: 'Produtos', short: 'Produtos', icon: Package },
  { id: 'deliveries', label: 'Entregas e rotas', short: 'Entregas', icon: Truck },
  { id: 'settings', label: 'Personalizar', short: 'Cores', icon: Palette },
];

export const tabSubtitles: Record<string, string> = {
  agenda: 'Mais clareza para cada momento do seu dia.',
  clients: 'Cada cliente, uma relação bem cuidada.',
  products: 'Seu catálogo e estoque sempre à mão.',
  deliveries: 'Do planejamento à porta do seu cliente.',
  settings: 'Deixe o AgendaHub do seu jeito.',
};
