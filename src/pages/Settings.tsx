import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, Camera, Download, KeyRound, LogOut, Palette, RotateCcw, Save, Trash2, UserRound, Moon, Sun, Monitor, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Avatar } from '../components/Layout.tsx';
import { Button, Card, CardTitle, Field, Input, PageHeader, Select, Switch, cx, useConfirm } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { today } from '../lib/dates.ts';
import type { Settings } from '../lib/types.ts';

function resizeImage(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir essa imagem.')); };
    img.src = url;
  });
}

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { data, reload } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);
  if (!user) return null;
  const s = user.settings;

  const saveSettings = async (patch: Partial<Settings>, msg = 'Preferência salva ♥') => {
    try {
      await updateProfile({ settings: { ...s, ...patch } });
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setNameError('Informe pelo menos 2 letras.');
    setNameError('');
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Nome atualizado!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Escolha um arquivo de imagem.');
    try {
      const dataUrl = await resizeImage(file);
      await updateProfile({ avatar: dataUrl });
      toast.success('Foto de perfil atualizada!');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleBrowserNotifications = async (on: boolean) => {
    if (on) {
      if (!('Notification' in window)) return toast.error('Seu navegador não suporta notificações.');
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (perm !== 'granted') return toast.error('Permissão negada. Libere as notificações nas configurações do navegador.');
    }
    await saveSettings({ notifications: { ...s.notifications, browser: on } }, on ? 'Notificações do navegador ativadas.' : 'Notificações do navegador desativadas.');
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) return setPwErr('A nova senha precisa ter pelo menos 6 caracteres.');
    if (pw.next !== pw.confirm) return setPwErr('As senhas não conferem.');
    setPwErr('');
    setPwSaving(true);
    try {
      await api('/me/password', { method: 'PUT', body: { current: pw.current, next: pw.next } });
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Senha alterada com sucesso!');
    } catch (err) {
      setPwErr((err as Error).message);
    } finally {
      setPwSaving(false);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportadoEm: new Date().toISOString(), usuario: { nome: user.name, email: user.email }, ...data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kitty-finance-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Backup baixado!');
  };

  const wipe = async () => {
    const ok = await confirm({
      title: 'Apagar todos os dados?',
      text: 'Receitas, despesas, contas, metas e aportes serão apagados permanentemente. Sua conta continua existindo. Essa ação não pode ser desfeita.',
      confirmLabel: 'Apagar tudo', danger: true,
    });
    if (!ok) return;
    try {
      await api('/me/data', { method: 'DELETE' });
      await reload();
      toast.success('Todos os dados foram apagados.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resetDemo = async () => {
    const ok = await confirm({ title: 'Restaurar demonstração?', text: 'Os dados de exemplo voltam ao estado inicial.', confirmLabel: 'Restaurar' });
    if (!ok) return;
    try {
      await api('/me/demo-reset', { method: 'POST', body: {} });
      await reload();
      toast.success('Dados de demonstração restaurados!');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const themes: { v: Settings['theme']; label: string; icon: typeof Sun }[] = [
    { v: 'light', label: 'Claro', icon: Sun },
    { v: 'dark', label: 'Escuro', icon: Moon },
    { v: 'system', label: 'Sistema', icon: Monitor },
  ];
  const accents: { v: Settings['accent']; label: string; color: string }[] = [
    { v: 'rosa', label: 'Rosa', color: '#ec5a92' },
    { v: 'morango', label: 'Morango', color: '#e9515f' },
    { v: 'lavanda', label: 'Lavanda', color: '#9a64e4' },
  ];

  return (
    <div>
      <PageHeader title="Perfil e configurações" subtitle="Deixe o Kitty Finance com a sua cara" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Perfil" icon={UserRound} />
          <div className="mb-5 flex items-center gap-5">
            <div className="relative">
              <Avatar size="lg" />
              <button onClick={() => fileRef.current?.click()} className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full border-4 border-card bg-brand-500 text-white transition hover:bg-brand-600" aria-label="Trocar foto">
                <Camera className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-ink">{user.name}</p>
              <p className="truncate text-sm text-muted">{user.isDemo ? 'Conta de demonstração' : user.email}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="soft" onClick={() => fileRef.current?.click()}>Trocar foto</Button>
                {user.avatar && <Button size="sm" variant="ghost" onClick={() => updateProfile({ avatar: null }).then(() => toast.success('Foto removida.'))}>Remover</Button>}
              </div>
            </div>
          </div>
          <form onSubmit={saveName} className="flex items-end gap-2" noValidate>
            <Field label="Nome" error={nameError} className="flex-1">
              {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} invalid={!!nameError} />}
            </Field>
            <Button type="submit" icon={Save} loading={saving} disabled={name.trim() === user.name}>Salvar</Button>
          </form>
        </Card>

        <Card>
          <CardTitle title="Aparência" icon={Palette} />
          <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Tema</p>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button key={t.v} onClick={() => saveSettings({ theme: t.v }, `Tema ${t.label.toLowerCase()} aplicado.`)} aria-pressed={s.theme === t.v}
                className={cx('flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-bold transition', s.theme === t.v ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-line text-muted hover:bg-soft')}>
                <t.icon className="size-5" /> {t.label}
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Tom de destaque</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {accents.map((a) => (
              <button key={a.v} onClick={() => saveSettings({ accent: a.v }, `Tom ${a.label} aplicado.`)} aria-pressed={s.accent === a.v}
                className={cx('flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition', s.accent === a.v ? 'border-brand-400 bg-brand-50 text-ink' : 'border-line text-muted hover:bg-soft')}>
                <span className="size-4 rounded-full" style={{ background: a.color }} /> {a.label}
              </button>
            ))}
          </div>
          <Switch checked={s.decorations} onChange={(v) => saveSettings({ decorations: v })} label="Decorações" description="Laços, corações e a gatinha pela interface" />
        </Card>

        <Card>
          <CardTitle title="Moeda" icon={Coins} />
          <Field label="Moeda de exibição" hint="Só muda o formato dos valores, sem conversão.">
            {(id) => (
              <Select id={id} value={s.currency} onChange={(e) => saveSettings({ currency: e.target.value as Settings['currency'] }, 'Moeda atualizada.')}>
                <option value="BRL">Real brasileiro (R$)</option>
                <option value="USD">Dólar americano (US$)</option>
                <option value="EUR">Euro (€)</option>
              </Select>
            )}
          </Field>
        </Card>

        <Card>
          <CardTitle title="Notificações" icon={Bell} />
          <div className="divide-y divide-line">
            <Switch checked={s.notifications.inApp} onChange={(v) => saveSettings({ notifications: { ...s.notifications, inApp: v } })}
              label="Avisos no app" description="Mostra um aviso ao abrir quando houver contas atrasadas ou vencendo" />
            <Switch checked={s.notifications.browser} onChange={toggleBrowserNotifications}
              label="Notificações do navegador" description="Um lembrete por dia, mesmo com a aba em segundo plano" />
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-bold text-ink">Antecedência do alerta</p>
                <p className="text-xs text-muted">Quantos dias antes do vencimento avisar</p>
              </div>
              <Select value={String(s.notifications.daysBefore)} className="h-10 w-32"
                onChange={(e) => saveSettings({ notifications: { ...s.notifications, daysBefore: Number(e.target.value) } })} aria-label="Dias de antecedência">
                {[0, 1, 2, 3, 5, 7, 10, 15].map((d) => <option key={d} value={d}>{d === 0 ? 'No dia' : `${d} dia${d > 1 ? 's' : ''}`}</option>)}
              </Select>
            </div>
          </div>
        </Card>

        {!user.isDemo && (
          <Card>
            <CardTitle title="Segurança" icon={KeyRound} />
            <form onSubmit={changePassword} className="grid gap-3" noValidate>
              <Field label="Senha atual">{(id) => <Input id={id} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nova senha">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
                <Field label="Confirmar nova senha">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />}</Field>
              </div>
              {pwErr && <p className="text-xs font-semibold text-bad">{pwErr}</p>}
              <div><Button type="submit" variant="secondary" loading={pwSaving} disabled={!pw.current || !pw.next}>Alterar senha</Button></div>
            </form>
          </Card>
        )}

        <Card>
          <CardTitle title="Seus dados" icon={Download} subtitle="Baixe um backup ou recomece do zero" />
          <div className="grid gap-2">
            <Button variant="secondary" icon={Download} onClick={exportData} className="justify-start">Baixar backup (JSON)</Button>
            {user.isDemo && <Button variant="secondary" icon={RotateCcw} onClick={resetDemo} className="justify-start">Restaurar dados de demonstração</Button>}
            <Button variant="secondary" icon={Trash2} onClick={wipe} className="justify-start text-bad hover:bg-bad-soft">Apagar todos os dados</Button>
            <Button variant="ghost" icon={LogOut} onClick={logout} className="justify-start">Sair da conta</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
