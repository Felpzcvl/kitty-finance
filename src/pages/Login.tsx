import { useState, type FormEvent } from 'react';
import { Lock, Mail, Sparkles, UserRound, Eye, EyeOff, ShieldCheck, ChartPie, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Bow, Heart, KittyMascot } from '../components/Kitty.tsx';
import { Button, Field, Input, cx } from '../components/ui.tsx';

export function LoginPage() {
  const { login, register, enterDemo } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === 'register' && name.trim().length < 2) errs.name = 'Como podemos te chamar?';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Informe um e-mail válido.';
    if (password.length < 6) errs.password = 'A senha precisa ter pelo menos 6 caracteres.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy('form');
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Que bom te ver de novo ♥');
      } else {
        await register(name, email, password);
        toast.success('Conta criada! Vamos organizar suas finanças ♥');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const demo = async () => {
    setBusy('demo');
    try {
      await enterDemo();
      toast.success('Bem-vinda à demonstração!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-hearts grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* lado ilustrado */}
      <div className="relative hidden overflow-hidden bg-brand-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Bow className="absolute top-10 -right-10 w-64 rotate-12 opacity-15" color="#fff" />
        <Heart className="absolute bottom-32 left-10 size-10 opacity-20" color="#fff" />
        <Heart className="absolute top-1/3 right-24 size-6 opacity-25" color="#fff" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20"><Bow className="w-8" color="#fff" /></span>
          <p className="font-display text-xl font-bold">Kitty Finance</p>
        </div>
        <div className="relative">
          <div className="mb-8 inline-flex rounded-[2.5rem] bg-white p-6 shadow-2xl">
            <KittyMascot className="w-52" mood="wink" />
          </div>
          <h1 className="max-w-md font-display text-4xl leading-tight font-bold">Sua vida financeira, organizada com delicadeza.</h1>
          <p className="mt-4 max-w-md text-white/85">Receitas, gastos, contas e metas no mesmo lugar, com gráficos claros e lembretes na hora certa.</p>
          <ul className="mt-8 grid max-w-md gap-3 text-sm font-semibold">
            {[
              [ShieldCheck, 'Seus dados ficam guardados na sua máquina, protegidos por senha'],
              [ChartPie, 'Relatórios e gráficos atualizados na hora'],
              [Target, 'Metas com progresso e aportes'],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={i} className="flex items-center gap-3"><span className="rounded-xl bg-white/20 p-2"><I className="size-4" /></span>{text as string}</li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-white/70">Feito com ♥ para quem quer cuidar do próprio dinheiro.</p>
      </div>

      {/* formulário */}
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <KittyMascot className="mb-3 w-32" mood="wink" />
            <p className="font-display text-2xl font-bold text-ink">Kitty Finance</p>
            <p className="text-sm text-muted">suas finanças com carinho</p>
          </div>

          <div className="rounded-[2rem] border border-line bg-card p-6 shadow-soft sm:p-8">
            <div className="mb-6 grid grid-cols-2 rounded-full bg-soft p-1" role="tablist">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => { setMode(m); setErrors({}); }}
                  className={cx('rounded-full py-2 text-sm font-bold transition', mode === m ? 'bg-card text-brand-600 shadow-sm' : 'text-muted')}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            <h2 className="font-display text-2xl font-bold text-ink">{mode === 'login' ? 'Olá de novo!' : 'Vamos começar?'}</h2>
            <p className="mt-1 mb-6 text-sm text-muted">
              {mode === 'login' ? 'Entre para ver como estão suas finanças.' : 'Crie sua conta e comece com tudo zerado.'}
            </p>

            <form onSubmit={submit} className="grid gap-4" noValidate>
              {mode === 'register' && (
                <Field label="Seu nome" error={errors.name}>
                  {(id) => (
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
                      <Input id={id} value={name} onChange={(e) => setName(e.target.value)} className="pl-11" placeholder="Como quer ser chamada" autoComplete="name" invalid={!!errors.name} />
                    </div>
                  )}
                </Field>
              )}
              <Field label="E-mail" error={errors.email}>
                {(id) => (
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
                    <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11" placeholder="voce@email.com" autoComplete="email" invalid={!!errors.email} />
                  </div>
                )}
              </Field>
              <Field label="Senha" error={errors.password}>
                {(id) => (
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
                    <Input
                      id={id}
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="px-11"
                      placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      invalid={!!errors.password}
                    />
                    <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-ink" aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                )}
              </Field>
              <Button type="submit" loading={busy === 'form'} disabled={!!busy} className="mt-2 w-full">
                {mode === 'login' ? 'Entrar' : 'Criar minha conta'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-bold text-muted">
              <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
            </div>
            <Button variant="soft" icon={Sparkles} loading={busy === 'demo'} disabled={!!busy} onClick={demo} className="w-full">
              Explorar a demonstração
            </Button>
            <p className="mt-3 text-center text-xs text-muted">A demonstração usa dados fictícios, separados da sua conta.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
