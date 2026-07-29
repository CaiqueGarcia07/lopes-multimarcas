import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CarFront,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';

import { createDemoApi, createSupabaseApi, supabase, supabaseConfigurado } from './lib/api.js';
import Dashboard from './pages/Dashboard.jsx';
import Esteira from './pages/Esteira.jsx';
import Estoque from './pages/Estoque.jsx';
import FichaDetail from './pages/FichaDetail.jsx';
import Fichas from './pages/Fichas.jsx';
import Login from './pages/Login.jsx';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fichas', label: 'Fichas', icon: ListChecks },
  { id: 'esteira', label: 'Esteira', icon: KanbanSquare },
  { id: 'estoque', label: 'Estoque', icon: CarFront },
];

export default function CrmApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem('crm-theme') || 'dark');
  const [session, setSession] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [busca, setBusca] = useState('');
  const [fichas, setFichas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [detalheId, setDetalheId] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('crm-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const api = useMemo(() => {
    if (demoMode) return createDemoApi();
    if (session && supabase) return createSupabaseApi(supabase, session.user?.email);
    return null;
  }, [demoMode, session]);

  const recarregar = useCallback(async () => {
    if (!api) return;
    setCarregando(true);
    setErro('');
    try {
      const [f, v] = await Promise.all([api.listFichas(), api.listVeiculos()]);
      setFichas(f);
      setVeiculos(v);
    } catch (error) {
      setErro(
        /relation .* does not exist|schema cache/i.test(error.message)
          ? 'Tabelas do CRM não encontradas. Execute supabase/schema-crm.sql no SQL Editor do Supabase.'
          : `Erro ao carregar dados: ${error.message}`,
      );
    } finally {
      setCarregando(false);
    }
  }, [api]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const atualizarFicha = useCallback(
    async (id, patch) => {
      const atualizada = await api.updateFicha(id, patch);
      setFichas((atuais) => atuais.map((f) => (f.id === id ? atualizada : f)));
      return atualizada;
    },
    [api],
  );

  const sair = async () => {
    if (demoMode) {
      setDemoMode(false);
      setFichas([]);
      setVeiculos([]);
      setPage('dashboard');
      return;
    }
    await supabase?.auth.signOut();
  };

  const aoBuscar = (valor) => {
    setBusca(valor);
    if (valor && page !== 'fichas') setPage('fichas');
  };

  const irPara = (destino) => {
    setPage(destino);
    setMenuAberto(false);
  };

  const detalhe = detalheId ? fichas.find((f) => f.id === detalheId) : null;
  const alternarTema = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  if (!api) {
    return (
      <Login
        supabaseConfigurado={supabaseConfigurado}
        onDemo={() => setDemoMode(true)}
        theme={theme}
        onToggleTheme={alternarTema}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {menuAberto && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#0b0f14]/60 lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={cn(
          'bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-[254px] flex-col gap-6 border-r border-sidebar-border px-4 py-6 transition-transform duration-300 lg:translate-x-0',
          menuAberto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-2">
          <img
            className="h-9 w-auto"
            src={`${import.meta.env.BASE_URL}lopes-multimarcas-logo.png`}
            alt="Lopes Multimarcas"
          />
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <span className="px-3 pb-2 text-[0.68rem] font-bold tracking-[0.16em] text-sidebar-foreground/40 uppercase">
            Operação
          </span>
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => irPara(id)}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.92rem] font-semibold transition-colors outline-none',
                'hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-brand/40',
                page === id
                  ? 'bg-sidebar-accent text-white before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-brand'
                  : 'text-sidebar-foreground/70',
              )}
            >
              <Icon className="size-[1.15rem]" /> {label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-sidebar-border pt-4">
          <span
            className="truncate px-3 text-[0.78rem] text-sidebar-foreground/50"
            title={demoMode ? 'Modo demonstração' : session?.user?.email}
          >
            {demoMode ? 'Demonstração' : session?.user?.email}
          </span>
          <button
            type="button"
            onClick={sair}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.92rem] font-semibold text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-white"
          >
            <LogOut className="size-[1.1rem]" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[254px]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </Button>

          <div className="relative min-w-0 flex-1 sm:max-w-lg">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              className="h-10 pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
              placeholder="Buscar por protocolo, CPF, celular, carro ou nome..."
              value={busca}
              onChange={(event) => aoBuscar(event.target.value)}
              aria-label="Buscar ficha cadastral"
            />
            {busca && (
              <button
                type="button"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={alternarTema} className="ml-auto shrink-0">
            {theme === 'dark' ? <Sun /> : <Moon />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
          </Button>
        </header>

        <div className="flex flex-col gap-4 px-4 pt-4 sm:px-6">
          {demoMode && (
            <Alert variant="info">
              <AlertDescription>
                Modo demonstração — dados fictícios. Entre com sua conta para usar os dados reais.
              </AlertDescription>
            </Alert>
          )}
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6">
          {page === 'dashboard' && (
            <Dashboard
              fichas={fichas}
              veiculos={veiculos}
              carregando={carregando}
              onAbrirFicha={setDetalheId}
              onIrPara={setPage}
            />
          )}
          {page === 'fichas' && (
            <Fichas
              fichas={fichas}
              veiculos={veiculos}
              busca={busca}
              carregando={carregando}
              onAbrirFicha={setDetalheId}
            />
          )}
          {page === 'esteira' && (
            <Esteira
              fichas={fichas}
              api={api}
              onAtualizar={atualizarFicha}
              onRecarregar={recarregar}
              onAbrirFicha={setDetalheId}
            />
          )}
          {page === 'estoque' && (
            <Estoque veiculos={veiculos} fichas={fichas} api={api} onRecarregar={recarregar} />
          )}
        </main>
      </div>

      {detalhe && (
        <FichaDetail
          ficha={detalhe}
          veiculos={veiculos}
          api={api}
          onAtualizar={atualizarFicha}
          onFechar={() => setDetalheId(null)}
        />
      )}
    </div>
  );
}
