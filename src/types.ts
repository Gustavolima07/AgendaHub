export type Line = {
  productId: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
};
export type Product = {
  id: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
  archived?: boolean;
};
export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  latitude?: number;
  longitude?: number;
  monthly: Line[];
  day: number;
  time: string;
  archived?: boolean;
};
export type Appointment = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  clientId: string;
  notes: string;
  reminder: number;
  status: 'scheduled' | 'done' | 'cancelled';
};
export type Delivery = {
  id: string;
  clientId: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  duration: number;
  lines: Line[];
  status: 'pending' | 'delivered' | 'cancelled';
  notes: string;
  reminder: number;
  order: number;
  recurringKey?: string;
};
export type Palette = {
  id: string;
  name: string;
  primary: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
};
export type Account = {
  clients: Record<string, Client>;
  products: Record<string, Product>;
  appointments: Record<string, Appointment>;
  deliveries: Record<string, Delivery>;
  settings: { palette: Palette; palettes: Palette[]; name: string; notifications: boolean };
};
