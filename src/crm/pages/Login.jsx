import { useState } from 'react';
import { Eye, LoaderCircle, Moon, PlayCircle, ShieldCheck, Sun } from 'lucide-react';

import { supabase } from '../lib/api.js';

export default function Login({ supabaseConfigurado, onDemo, theme, onToggleTheme }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const entrar = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setCarregando(true);
    setErro('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(
        /invalid login credentials/i.test(error.message)
          ? 'E-mail ou senha incorretos.'
          : `Não foi possível entrar: ${error.message}`,
      );
    }
    setCarregando(false);
  };

  return (
    <div className="login-screen">
      <button type="button" className="theme-toggle login-theme" onClick={onToggleTheme}>
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      </button>

      <div className="login-card">
        <img className="login-logo" src="/lopes-multimarcas-logo.png" alt="Lopes Multimarcas" />
        <h1>CRM Lopes Multimarcas</h1>
        <p className="login-sub">
          <ShieldCheck size={15} /> Acesso restrito à equipe
        </p>

        <form onSubmit={entrar}>
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@lopesmultimarcas.com.br"
            required
          />
          <label htmlFor="login-senha">Senha</label>
          <input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="Sua senha"
            required
          />
          {erro && <div className="login-erro">{erro}</div>}
          {!supabaseConfigurado && (
            <div className="login-erro">
              Supabase não configurado (.env.local). Use o modo demonstração abaixo.
            </div>
          )}
          <button className="button-primary" type="submit" disabled={carregando || !supabaseConfigurado}>
            {carregando ? <LoaderCircle className="spin" size={18} /> : <Eye size={18} />}
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <button type="button" className="button-demo" onClick={onDemo}>
          <PlayCircle size={17} /> Ver demonstração com dados fictícios
        </button>

        <p className="login-hint">
          Contas da equipe são criadas no painel do Supabase em
          <br />
          <strong>Authentication → Users → Add user</strong>.
        </p>
      </div>
    </div>
  );
}
