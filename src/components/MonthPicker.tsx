import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { currentMonth, monthLabel, shiftMonth } from '../lib/dates.ts';

export function MonthPicker() {
  const { month, setMonth } = useData();
  const isCurrent = month === currentMonth();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-card p-1 shadow-soft">
      <button
        onClick={() => setMonth(shiftMonth(month, -1))}
        className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-brand-50 hover:text-brand-600"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-4" />
      </button>
      <label className="relative flex min-w-40 cursor-pointer items-center justify-center gap-2 px-2 text-sm font-bold text-ink">
        <CalendarDays className="size-4 text-brand-500" />
        {monthLabel(month)}
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Escolher mês"
        />
      </label>
      <button
        onClick={() => setMonth(shiftMonth(month, 1))}
        className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-brand-50 hover:text-brand-600"
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-4" />
      </button>
      {!isCurrent && (
        <button
          onClick={() => setMonth(currentMonth())}
          className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-100"
        >
          Hoje
        </button>
      )}
    </div>
  );
}
