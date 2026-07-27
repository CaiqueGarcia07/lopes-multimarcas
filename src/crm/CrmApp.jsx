import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CarFront,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';

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

  const detalhe = detalheId ? fichas.find((f) => f.id === detalheId) : null;

  if (!api) {
    return (
      <Login
        supabaseConfigurado={supabaseConfigurado}
        onDemo={() => setDemoMode(true)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    );
  }

  return (
    <div className="crm-shell">
      <aside className="crm-sidebar">
        <img className="crm-logo" src="/lopes-multimarcas-logo.png" alt="Lopes Multimarcas" />
        <nav>
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              <Icon size={19} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="user-email" title={demoMode ? 'Modo demonstração' : session?.user?.email}>
            {demoMode ? 'Demonstração' : session?.user?.email}
          </span>
          <button type="button" className="nav-item" onClick={sair}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      <div className="crm-main">
        <header className="crm-topbar">
          <div className="search-box">
            <Search size={17} />
            <input
              type="search"
              placeholder="Buscar por protocolo, CPF, celular, carro ou nome..."
              value={busca}
              onChange={(event) => aoBuscar(event.target.value)}
              aria-label="Buscar ficha cadastral"
            />
            {busca && (
              <button type="button" className="icon-button" onClick={() => setBusca('')} aria-label="Limpar busca">
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
        </header>

        {demoMode && (
          <div className="demo-banner">
            Modo demonstração — dados fictícios. Entre com sua conta para usar os dados reais.
          </div>
        )}
        {erro && <div className="crm-error">{erro}</div>}

        <main className="crm-content">
          {page === 'dashboard' && (
            <Dashboard fichas={fichas} carregando={carregando} onAbrirFicha={setDetalheId} onIrPara={setPage} />
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
