import { useState } from 'react';
import { useData } from '../context/DataContext.tsx';
import { lastDayOfMonth } from '../lib/dates.ts';
import { MonthPicker } from './MonthPicker.tsx';
import { Input, Segmented } from './ui.tsx';

export type PeriodMode = 'mes' | 'intervalo' | 'tudo';

/** Filtro por período: mês selecionado, intervalo de datas ou tudo. */
export function usePeriod() {
  const { month } = useData();
  const [mode, setMode] = useState<PeriodMode>('mes');
  const [from, setFrom] = useState(`${month}-01`);
  const [to, setTo] = useState(lastDayOfMonth(month));

  const inPeriod = (date: string) => {
    if (mode === 'tudo') return true;
    if (mode === 'mes') return date.startsWith(month);
    return (!from || date >= from) && (!to || date <= to);
  };

  const ui = (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented<PeriodMode>
        value={mode}
        onChange={setMode}
        options={[{ value: 'mes', label: 'Mês' }, { value: 'intervalo', label: 'Período' }, { value: 'tudo', label: 'Tudo' }]}
      />
      {mode === 'mes' && <MonthPicker />}
      {mode === 'intervalo' && (
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" className="h-10 w-40" />
          <span className="text-sm text-muted">até</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" className="h-10 w-40" />
        </div>
      )}
    </div>
  );

  return { mode, inPeriod, ui };
}
