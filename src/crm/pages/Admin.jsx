import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Lock,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { cn } from '@/lib/utils.js';

import { CAMPOS_CATALOGO, CATALOGO, configPadrao, mesclarConfig } from '../../config/formulario.js';
import { PageHeading } from '../components/Pills.jsx';

const descricaoDaSecao = (id) => CATALOGO.find((s) => s.id === id)?.descricao || '';

/** Uma seção do formulário e seus campos. */
function SecaoConfig({ secao, indice, total, onMudar, onMover }) {
  const mudarCampo = (campoId, patch) =>
    onMudar({
      ...secao,
      campos: secao.campos.map((c) => (c.id === campoId ? { ...c, ...patch } : c)),
    });

  return (
    <Card className={cn('min-w-0 transition-opacity', !secao.visivel && 'opacity-60')}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate">{secao.titulo}</CardTitle>
          <p className="mt-1 text-[0.8rem] text-muted-foreground">{descricaoDaSecao(secao.id)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMover(-1)}
            disabled={indice === 0}
            aria-label={`Mover ${secao.titulo} para cima`}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMover(1)}
            disabled={indice === total - 1}
            aria-label={`Mover ${secao.titulo} para baixo`}
          >
            <ArrowDown />
          </Button>
          <label className="flex items-center gap-2 text-[0.8rem] font-semibold">
            <Switch
              checked={secao.visivel}
              onCheckedChange={(v) => onMudar({ ...secao, visivel: v })}
              aria-label={`Exibir seção ${secao.titulo}`}
            />
            {secao.visivel ? 'Visível' : 'Oculta'}
          </label>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pt-1">
        <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_7rem] gap-3 px-3 pb-1 text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
          <span>Rótulo exibido ao cliente</span>
          <span className="text-center">Visível</span>
          <span className="text-center">Obrigatório</span>
        </div>

        {secao.campos.map((campo) => {
          const fixo = CAMPOS_CATALOGO[campo.id]?.fixo;
          return (
            <div
              key={campo.id}
              className="grid min-w-0 items-center gap-3 rounded-md border border-border px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  className="h-9"
                  value={campo.rotulo}
                  onChange={(e) => mudarCampo(campo.id, { rotulo: e.target.value })}
                  aria-label={`Rótulo do campo ${campo.id}`}
                  disabled={!secao.visivel}
                />
                {fixo && (
                  <Badge variant="outline" className="shrink-0 border-border text-muted-foreground">
                    <Lock /> Fixo
                  </Badge>
                )}
              </div>

              <label className="flex items-center gap-2 sm:justify-center">
                <Switch
                  checked={campo.visivel}
                  disabled={fixo || !secao.visivel}
                  onCheckedChange={(v) => mudarCampo(campo.id, { visivel: v, obrigatorio: v && campo.obrigatorio })}
                  aria-label={`Exibir campo ${campo.rotulo}`}
                />
                <span className="text-[0.8rem] text-muted-foreground sm:hidden">Visível</span>
              </label>

              <label className="flex items-center gap-2 sm:justify-center">
                <Switch
                  checked={campo.obrigatorio}
                  disabled={fixo || !campo.visivel || !secao.visivel}
                  onCheckedChange={(v) => mudarCampo(campo.id, { obrigatorio: v })}
                  aria-label={`Tornar ${campo.rotulo} obrigatório`}
                />
                <span className="text-[0.8rem] text-muted-foreground sm:hidden">Obrigatório</span>
              </label>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function GestaoAcessos({ api }) {
  const [perfis, setPerfis] = useState([]);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState('equipe');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const recarregar = () => api.listPerfis().then(setPerfis).catch(() => setPerfis([]));

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const adicionar = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      await api.salvarPerfil(email, papel);
      setEmail('');
      await recarregar();
    } catch (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (perfil) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Remover o acesso de ${perfil.email}?`)) return;
    try {
      await api.removerPerfil(perfil.email);
      await recarregar();
    } catch (error) {
      setErro(`Não foi possível remover: ${error.message}`);
    }
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-strong dark:text-brand" /> Quem acessa o CRM
        </CardTitle>
        <p className="text-[0.82rem] text-muted-foreground">
          <strong className="text-foreground">Equipe</strong> usa fichas, esteira e estoque.{' '}
          <strong className="text-foreground">Admin</strong> também configura o formulário e os acessos.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Alert variant="info">
          <AlertDescription>
            O e-mail precisa existir em <strong>Authentication → Users</strong> no Supabase. Cadastrar aqui só define o
            papel — não cria a conta nem a senha.
          </AlertDescription>
        </Alert>

        <form onSubmit={adicionar} className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="flex min-w-[14rem] flex-1 flex-col gap-2">
            <Label htmlFor="perfil-email">E-mail</Label>
            <Input
              id="perfil-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@lopesmultimarcas.com.br"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="perfil-papel">Papel</Label>
            <Select value={papel} onValueChange={setPapel}>
              <SelectTrigger id="perfil-papel" className="w-[9rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equipe">Equipe</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="brand" type="submit" disabled={salvando || !email.trim()}>
            <UserPlus /> {salvando ? 'Salvando...' : 'Definir papel'}
          </Button>
        </form>

        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <ul className="flex flex-col gap-2">
          {perfis.map((perfil) => (
            <li
              key={perfil.email}
              className="flex min-w-0 items-center gap-3 rounded-md border border-border px-3 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-[0.88rem]">{perfil.email}</span>
              <Badge variant={perfil.papel === 'admin' ? 'brand' : 'outline'}>
                {perfil.papel === 'admin' ? 'Admin' : 'Equipe'}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remover(perfil)}
                aria-label={`Remover ${perfil.email}`}
                className="shrink-0 text-destructive hover:bg-destructive/10"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
          {perfis.length === 0 && (
            <li className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Nenhum papel definido ainda.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function Admin({ api }) {
  const [config, setConfig] = useState(() => configPadrao());
  const [original, setOriginal] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .lerConfigFormulario()
      .then((salva) => {
        const mesclada = mesclarConfig(salva);
        setConfig(mesclada);
        setOriginal(JSON.stringify(mesclada));
      })
      .catch(() => setErro('Não foi possível carregar a configuração salva.'));
  }, [api]);

  const alterado = useMemo(() => original !== null && JSON.stringify(config) !== original, [config, original]);

  const mudarSecao = (secaoAtualizada) =>
    setConfig((atual) => ({
      ...atual,
      secoes: atual.secoes.map((s) => (s.id === secaoAtualizada.id ? secaoAtualizada : s)),
    }));

  const moverSecao = (indice, direcao) =>
    setConfig((atual) => {
      const destino = indice + direcao;
      if (destino < 0 || destino >= atual.secoes.length) return atual;
      const secoes = [...atual.secoes];
      [secoes[indice], secoes[destino]] = [secoes[destino], secoes[indice]];
      return { ...atual, secoes };
    });

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    setAviso('');
    try {
      await api.salvarConfigFormulario(config);
      setOriginal(JSON.stringify(config));
      setAviso('Configuração publicada. O formulário do site já reflete as mudanças.');
      setTimeout(() => setAviso(''), 4000);
    } catch (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const restaurar = () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Voltar toda a configuração ao padrão de fábrica?')) return;
    setConfig(configPadrao());
  };

  const totalOcultos = config.secoes.reduce(
    (soma, s) => soma + (s.visivel ? s.campos.filter((c) => !c.visivel).length : s.campos.length),
    0,
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeading
        titulo="Administração"
        descricao="Área restrita: controla o formulário público e quem acessa o CRM."
      >
        <Badge variant="brand">
          <ShieldCheck /> Somente admin
        </Badge>
      </PageHeading>

      <Tabs defaultValue="formulario">
        <TabsList>
          <TabsTrigger value="formulario">Formulário</TabsTrigger>
          <TabsTrigger value="acessos">Acessos</TabsTrigger>
        </TabsList>

        <TabsContent value="formulario" className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-[14rem] flex-1">
                <strong className="text-[0.92rem]">Campos do formulário público</strong>
                <p className="mt-0.5 text-[0.82rem] text-muted-foreground">
                  Esconda campos, mude o texto do rótulo, defina o que é obrigatório e reordene as seções.{' '}
                  {totalOcultos > 0 && `${totalOcultos} campo${totalOcultos > 1 ? 's' : ''} oculto${totalOcultos > 1 ? 's' : ''}.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="ghost" size="sm" asChild>
                  <a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer">
                    <ExternalLink /> Ver o formulário
                  </a>
                </Button>
                <Button variant="secondary" size="sm" onClick={restaurar}>
                  <RotateCcw /> Restaurar padrão
                </Button>
                <Button variant="brand" size="sm" onClick={salvar} disabled={!alterado || salvando}>
                  {salvando ? 'Publicando...' : alterado ? 'Publicar mudanças' : 'Tudo publicado'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {aviso && (
            <Alert variant="success">
              <CheckCircle2 />
              <AlertDescription>{aviso}</AlertDescription>
            </Alert>
          )}
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          <Alert variant="info">
            <Lock />
            <AlertDescription>
              CPF, celular e a autorização de uso dos dados são fixos: sem eles não há análise de crédito nem base legal
              para tratar os dados do cliente.
            </AlertDescription>
          </Alert>

          {config.secoes.map((secao, indice) => (
            <SecaoConfig
              key={secao.id}
              secao={secao}
              indice={indice}
              total={config.secoes.length}
              onMudar={mudarSecao}
              onMover={(direcao) => moverSecao(indice, direcao)}
            />
          ))}
        </TabsContent>

        <TabsContent value="acessos">
          <GestaoAcessos api={api} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
