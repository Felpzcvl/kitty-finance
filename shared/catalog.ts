// Catálogo compartilhado entre a API e o app (identificadores e rótulos).

export const EXPENSE_CATEGORIES = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  compras: 'Compras',
  beleza: 'Beleza e cuidados pessoais',
  saude: 'Saúde',
  lazer: 'Lazer',
  estudos: 'Estudos',
  moradia: 'Moradia',
  assinaturas: 'Assinaturas',
  outros: 'Outros',
} as const;

export const INCOME_CATEGORIES = {
  salario: 'Salário',
  freelance: 'Freelance',
  vendas: 'Vendas',
  investimentos: 'Investimentos',
  presente: 'Presente',
  reembolso: 'Reembolso',
  outros: 'Outros',
} as const;

export const INCOME_METHODS = {
  pix: 'Pix',
  transferencia: 'Transferência',
  deposito: 'Depósito',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
} as const;

export const PAYMENT_METHODS = {
  pix: 'Pix',
  debito: 'Cartão de débito',
  credito: 'Cartão de crédito',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
  outro: 'Outro',
} as const;

export const EXPENSE_STATUS = { pago: 'Pago', pendente: 'Pendente' } as const;
export const BILL_STATUS = { pago: 'Paga', pendente: 'Pendente' } as const;
export const RECURRENCE = { nenhuma: 'Não se repete', mensal: 'Todo mês' } as const;

export const GOAL_ICONS = [
  'heart', 'smartphone', 'plane', 'shirt', 'shield', 'gift', 'home', 'graduation', 'sparkles', 'car',
] as const;

export const GOAL_COLORS = ['rosa', 'morango', 'lavanda', 'pessego', 'menta', 'ceu'] as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;
export type IncomeCategory = keyof typeof INCOME_CATEGORIES;
export type IncomeMethod = keyof typeof INCOME_METHODS;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export type GoalIcon = (typeof GOAL_ICONS)[number];
export type GoalColor = (typeof GOAL_COLORS)[number];

export const MAX_AMOUNT = 100_000_000_00; // R$ 100 milhões em centavos
