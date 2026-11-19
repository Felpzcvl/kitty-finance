import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { ConfirmProvider } from './components/ui.tsx';
import { Layout } from './components/Layout.tsx';
import { KittyMascot } from './components/Kitty.tsx';
import { LoginPage } from './pages/Login.tsx';
import { DashboardPage } from './pages/Dashboard.tsx';
import { IncomesPage } from './pages/Incomes.tsx';
import { ExpensesPage } from './pages/Expenses.tsx';
import { BillsPage } from './pages/Bills.tsx';
import { GoalsPage } from './pages/Goals.tsx';
import { ReportsPage } from './pages/Reports.tsx';
import { CalendarPage } from './pages/Calendar.tsx';
import { SettingsPage } from './pages/Settings.tsx';

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <KittyMascot className="w-28 animate-pulse" />
      <p className="font-display font-bold text-muted">Carregando…</p>
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <LoginPage />;
  return (
    // a chave garante dados limpos ao trocar de conta
    <DataProvider key={user.id}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="receitas" element={<IncomesPage />} />
          <Route path="despesas" element={<ExpensesPage />} />
          <Route path="contas" element={<BillsPage />} />
          <Route path="metas" element={<GoalsPage />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="perfil" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
