import { useState } from 'react';
import { Eye, LoaderCircle, Moon, PlayCircle, ShieldCheck, Sun } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

import { supabase } from '../lib/api.js';

const ASSET = import.meta.env.BASE_URL;

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
    <div className="relative grid min-h-screen place-items-center px-5 py-10">
      {/* Mesmo fundo fotográfico do formulário público, para as duas telas conversarem. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${ASSET}hero-showroom.jpg)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f14]/90 via-[#0b0f14]/94 to-[#0b0f14]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_12%,color-mix(in_srgb,var(--brand)_26%,transparent),transparent_58%)]" />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleTheme}
        className="absolute top-5 right-5 text-white/75 hover:bg-white/10 hover:text-white"
      >
        {theme === 'dark' ? <Sun /> : <Moon />}
        {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      </Button>

      <Card className="relative w-full max-w-[26rem] shadow-lift">
        <CardContent className="flex flex-col gap-5 px-7 py-9">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* A logo é branca: fica sobre uma placa escura para funcionar nos dois temas. */}
            <span className="rounded-xl bg-[#12171d] px-5 py-3">
              <img className="h-9 w-auto" src={`${ASSET}lopes-multimarcas-logo.png`} alt="Lopes Multimarcas" />
            </span>
            <h1 className="font-display text-xl font-extrabold tracking-tight">CRM Lopes Multimarcas</h1>
            <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">
              <ShieldCheck className="size-4 text-brand-strong dark:text-brand" /> Acesso restrito à equipe
            </span>
          </div>

          <form onSubmit={entrar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@lopesmultimarcas.com.br"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-senha">Senha</Label>
              <Input
                id="login-senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Sua senha"
                required
              />
            </div>

            {erro && (
              <Alert variant="destructive">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            {!supabaseConfigurado && (
              <Alert variant="warning">
                <AlertDescription>
                  Supabase não configurado (.env.local). Use o modo demonstração abaixo.
                </AlertDescription>
              </Alert>
            )}

            <Button variant="brand" type="submit" disabled={carregando || !supabaseConfigurado}>
              {carregando ? <LoaderCircle className="animate-spin" /> : <Eye />}
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <Button
            variant="outline"
            type="button"
            onClick={onDemo}
            className="border-dashed border-brand/45 text-brand-strong dark:text-brand"
          >
            <PlayCircle /> Ver demonstração com dados fictícios
          </Button>

          <p className="text-center text-[0.78rem] leading-relaxed text-muted-foreground">
            Contas da equipe são criadas no painel do Supabase em
            <br />
            <strong className="text-foreground">Authentication → Users → Add user</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
