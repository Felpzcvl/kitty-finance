import {
  Bus, Car, Clapperboard, GraduationCap, Gift, Heart, HeartPulse, Home, House, Package, Plane,
  Repeat, Shield, Shirt, ShoppingBag, Smartphone, Sparkles, Utensils, Wallet, Briefcase, Store,
  TrendingUp, HandCoins, RotateCcw, CircleDollarSign, type LucideIcon,
} from 'lucide-react';
import type { GoalColor, GoalIcon } from '../../shared/catalog.ts';

export * from '../../shared/catalog.ts';

export const EXPENSE_META: Record<string, { icon: LucideIcon; color: string }> = {
  alimentacao: { icon: Utensils, color: '#f2709c' },
  transporte: { icon: Bus, color: '#7aa7f0' },
  compras: { icon: ShoppingBag, color: '#b58cf0' },
  beleza: { icon: Sparkles, color: '#f59ac0' },
  saude: { icon: HeartPulse, color: '#e0475e' },
  lazer: { icon: Clapperboard, color: '#f5a76c' },
  estudos: { icon: GraduationCap, color: '#5fbfa8' },
  moradia: { icon: House, color: '#c08a6a' },
  assinaturas: { icon: Repeat, color: '#8d8ce0' },
  outros: { icon: Package, color: '#a99aa2' },
};

export const INCOME_META: Record<string, { icon: LucideIcon; color: string }> = {
  salario: { icon: Wallet, color: '#ec5a92' },
  freelance: { icon: Briefcase, color: '#b58cf0' },
  vendas: { icon: Store, color: '#f5a76c' },
  investimentos: { icon: TrendingUp, color: '#5fbfa8' },
  presente: { icon: Gift, color: '#f2709c' },
  reembolso: { icon: RotateCcw, color: '#7aa7f0' },
  outros: { icon: CircleDollarSign, color: '#a99aa2' },
};

export const GOAL_ICON_MAP: Record<GoalIcon, LucideIcon> = {
  heart: Heart,
  smartphone: Smartphone,
  plane: Plane,
  shirt: Shirt,
  shield: Shield,
  gift: Gift,
  home: Home,
  graduation: GraduationCap,
  sparkles: Sparkles,
  car: Car,
};

export const GOAL_COLOR_MAP: Record<GoalColor, { bar: string; soft: string; label: string }> = {
  rosa: { bar: '#ec5a92', soft: '#ffe3ee', label: 'Rosa' },
  morango: { bar: '#e0475e', soft: '#ffe1e5', label: 'Morango' },
  lavanda: { bar: '#9a64e4', soft: '#efe5ff', label: 'Lavanda' },
  pessego: { bar: '#f08a5d', soft: '#ffeadf', label: 'Pêssego' },
  menta: { bar: '#3fae8c', soft: '#ddf5ec', label: 'Menta' },
  ceu: { bar: '#5b8def', soft: '#e3ecff', label: 'Céu' },
};

export const DepositIcon = HandCoins;
