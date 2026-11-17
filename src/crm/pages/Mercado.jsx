import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Link2, LoaderCircle, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { cn } from '@/lib/utils.js';

import { PageHeading } from '../components/Pills.jsx';
import { Placa } from '../components/Placa.jsx';
import {
  comparacaoFipe,
  consultarValor,
  fipeDesatualizada,
  listarAnos,
  listarMarcas,
  listarModelos,
  sugerirAno,
  sugerirMarca,
  sugerirModelo,
} from '../lib/fipe.js';
import { fmtBRL, diasDesde } from '../lib/format.js';
import { nomeCurtoCarro } from '../lib/whatsapp.js';

const fmtNumero = (n) => (n == null ? '—' : new Intl.NumberFormat('pt-BR').format(n));
const fmtMes = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/** Diferença para a FIPE com sinal e cor: acima da tabela em âmbar, abaixo em verde. */
function Diferenca({ veiculo }) {
  const comp = comparacaoFipe(veiculo);
  if (!comp) return <span className="text-muted-foreground">—</span>;
  const acima = comp.diferenca > 0;
  const Icone = acima ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        acima ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300',
      )}
    >
      <Icone className="size-3.5" aria-hidden="true" />
      {acima ? '+' : ''}
      {comp.percentual.toLocaleString('pt-BR')}%
      <small className="font-normal text-muted-foreground">({acima ? '+' : ''}{fmtBRL(comp.diferenca)})</small>
    </span>
  );
}

function VincularFipe({ veiculo, onSalvar, onFechar }) {
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);
  const [marca, setMarca] = useState(veiculo.fipe?.marca?.codigo || '');
  const [modelo, setModelo] = useState(veiculo.fipe?.modelo?.codigo || '');
  const [ano, setAno] = useState(veiculo.fipe?.ano?.codigo || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarMarcas()
      .then((lista) => {
        setMarcas(lista);
        if (!marca) setMarca(sugerirMarca(lista, veiculo.nome)?.codigo || '');
      })
      .catch((e) => setErro(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!marca) return;
    setModelos([]);
    listarModelos(marca)
      .then((lista) => {
        setModelos(lista);
        setModelo((atual) =>
          lista.some((m) => String(m.codigo) === String(atual)) ? atual : String(sugerirModelo(lista, veiculo.nome)?.codigo || ''),
        );
      })
      .catch((e) => setErro(e.message));
  }, [marca, veiculo.nome]);

  useEffect(() => {
    if (!marca || !modelo) return;
    setAnos([]);
    listarAnos(marca, modelo)
      .then((lista) => {
        setAnos(lista);
        setAno((atual) => (lista.some((a) => a.codigo === atual) ? atual : sugerirAno(lista, veiculo.ano_modelo)?.codigo || ''));
      })
      .catch((e) => setErro(e.message));
  }, [marca, modelo, veiculo.ano_modelo]);

  const achar = (lista, codigo) => lista.find((item) => String(item.codigo) === String(codigo));

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      const vinculo = {
        marca: achar(marcas, marca),
        modelo: achar(modelos, modelo),
        ano: achar(anos, ano),
      };
      await onSalvar(await consultarValor(vinculo));
      onFechar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const campo = (id, rotulo, valor, setValor, lista, carregando) => (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Select value={String(valor || '')} onValueChange={setValor} disabled={carregando}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={carregando ? 'Carregando...' : 'Escolha'} />
        </SelectTrigger>
        <SelectContent>
          {lista.map((item) => (
            <SelectItem key={item.codigo} value={String(item.codigo)}>
              {item.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular à tabela FIPE</DialogTitle>
          <DialogDescription>
            {veiculo.nome} · {veiculo.ano_modelo}. Os campos já vêm sugeridos pelo nome do carro; confira e salve. Depois disso o valor se atualiza sozinho todo mês.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {campo('fipe-marca', 'Marca', marca, setMarca, marcas, !marcas.length)}
          {campo('fipe-modelo', 'Modelo', modelo, setModelo, modelos, !!marca && !modelos.length)}
          {campo('fipe-ano', 'Ano e combustível', ano, setAno, anos, !!modelo && !anos.length)}
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onFechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!marca || !modelo || !ano || salvando}>
              {salvando && <LoaderCircle className="animate-spin" />} Salvar vínculo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Resumo({ rotulo, valor, detalhe }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-secondary px-4 py-3">
      <span className="text-[0.78rem] text-muted-foreground">{rotulo}</span>
      <strong className="font-display text-xl leading-tight tabular-nums">{valor}</strong>
      {detalhe && <span className="text-[0.76rem] text-muted-foreground">{detalhe}</span>}
    </div>
  );
}

/** Quantos carros do estoque são do mesmo modelo do ranking ("Hyundai HB20" casa com "HB20S"). */
const noEstoque = (modelo, veiculos) => {
  const chave = modelo.split(' ').slice(1).join(' ').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Palavra inteira, aceitando o "S" das versões sedã: "HB20" conta "HB20S", mas "Gol" não conta "Golf".
  const padrao = new RegExp(`(^|[^a-z0-9])${chave}s?([^a-z0-9]|$)`);
  return veiculos.filter((v) => v.status !== 'vendido' && padrao.test(v.nome.toLowerCase())).length;
};

export default function Mercado({ veiculos, api, onRecarregar }) {
  const [vinculando, setVinculando] = useState(null);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');
  const [mercado, setMercado] = useState([]);
  const [mesIndice, setMesIndice] = useState(0);
  const atualizouAuto = useRef(false);

  const ativos = useMemo(() => veiculos.filter((v) => v.status !== 'vendido'), [veiculos]);
  const vinculados = ativos.filter((v) => v.fipe?.valor_centavos);

  useEffect(() => {
    api.listMercado().then(setMercado).catch(() => setMercado([]));
  }, [api]);

  const atualizarTodos = async (somenteDesatualizados) => {
    const alvo = ativos.filter((v) => v.fipe?.ano && (!somenteDesatualizados || fipeDesatualizada(v.fipe)));
    if (!alvo.length) return;
    setAtualizando(true);
    setErro('');
    try {
      for (const v of alvo) {
        await api.salvarFipeVeiculo(v.id, await consultarValor(v.fipe));
      }
      await onRecarregar();
    } catch (e) {
      setErro(`Não deu para atualizar a FIPE: ${e.message}`);
    } finally {
      setAtualizando(false);
    }
  };

  // Virou o mês: atualiza sozinho os valores ao abrir a página.
  useEffect(() => {
    if (atualizouAuto.current || !ativos.length) return;
    atualizouAuto.current = true;
    if (ativos.some((v) => v.fipe?.ano && fipeDesatualizada(v.fipe))) atualizarTodos(true);
  }, [ativos]); // eslint-disable-line react-hooks/exhaustive-deps

  const somaPreco = vinculados.reduce((s, v) => s + (v.preco_centavos || 0), 0);
  const somaFipe = vinculados.reduce((s, v) => s + v.fipe.valor_centavos, 0);
  const acima = vinculados.filter((v) => comparacaoFipe(v)?.diferenca > 0).length;
  const mediaPct = somaFipe ? Math.round(((somaPreco - somaFipe) / somaFipe) * 1000) / 10 : null;
  const referencia = vinculados[0]?.fipe?.referencia;

  const mes = mercado[mesIndice];
  const maior = mes?.ranking?.[0]?.unidades || 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        titulo="Mercado"
        descricao="Seu estoque comparado com a tabela FIPE e o que mais vende entre os usados no Brasil."
      >
        <Button variant="secondary" size="sm" onClick={() => atualizarTodos(false)} disabled={atualizando || !vinculados.length}>
          <RefreshCw className={cn(atualizando && 'animate-spin')} />
          {atualizando ? 'Atualizando FIPE...' : 'Atualizar FIPE'}
        </Button>
      </PageHeading>

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-base">Estoque x FIPE</CardTitle>
          <span className="text-[0.8rem] text-muted-foreground">
            {referencia ? `Tabela de ${referencia}` : 'Vincule os carros para comparar'} · {vinculados.length} de {ativos.length} vinculados
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {vinculados.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Resumo rotulo="Seu preço total" valor={fmtBRL(somaPreco)} detalhe="Carros vinculados à FIPE" />
              <Resumo rotulo="FIPE total" valor={fmtBRL(somaFipe)} />
              <Resumo
                rotulo="Média em relação à FIPE"
                valor={`${mediaPct > 0 ? '+' : ''}${mediaPct?.toLocaleString('pt-BR')}%`}
                detalhe={`${acima} carro${acima === 1 ? '' : 's'} acima da tabela`}
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-[0.88rem]">
              <thead>
                <tr className="border-b border-border text-left text-[0.78rem] text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Placa</th>
                  <th className="py-2 pr-3 font-semibold">Carro</th>
                  <th className="py-2 pr-3 text-right font-semibold">Seu preço</th>
                  <th className="py-2 pr-3 text-right font-semibold">FIPE</th>
                  <th className="py-2 pr-3 font-semibold">Diferença</th>
                  <th className="py-2 font-semibold">No estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ativos.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 pr-3">
                      <Placa placa={v.placa} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <strong className="block font-semibold">{nomeCurtoCarro(v.nome)}</strong>
                      <small className="text-muted-foreground">
                        {v.ano_modelo}
                        {v.fipe?.codigo_fipe ? ` · FIPE ${v.fipe.codigo_fipe}` : ''}
                      </small>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{fmtBRL(v.preco_centavos)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {v.fipe?.valor_centavos ? (
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => setVinculando(v)}
                          title="Trocar o modelo vinculado"
                        >
                          {fmtBRL(v.fipe.valor_centavos)}
                        </button>
                      ) : (
                        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setVinculando(v)}>
                          <Link2 /> Vincular
                        </Button>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Diferenca veiculo={v} />
                    </td>
                    <td className="py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                      {diasDesde(v.criado_em) ?? '—'} dias
                    </td>
                  </tr>
                ))}
                {ativos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      Cadastre carros na página Estoque para compará-los com a FIPE.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Usados mais vendidos no Brasil</CardTitle>
          {mercado.length > 1 && (
            <Select value={String(mesIndice)} onValueChange={(v) => setMesIndice(Number(v))}>
              <SelectTrigger className="w-[12rem]" aria-label="Mês do ranking">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mercado.map((m, i) => (
                  <SelectItem key={m.mes} value={String(i)}>
                    {fmtMes(m.mes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!mes ? (
            <p className="text-[0.88rem] text-muted-foreground">
              O ranking da Fenauto entra aqui todo mês. Rode supabase/schema-crm-v6.sql para criar a tabela com o mês mais recente.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Resumo
                  rotulo={`Carros e comerciais leves em ${fmtMes(mes.mes)}`}
                  valor={fmtNumero(mes.total_autos_comerciais)}
                  detalhe={`${fmtNumero(mes.total_geral)} contando motos e pesados`}
                />
                <Resumo
                  rotulo="Contra o mês anterior"
                  valor={mes.variacao_mes_pct != null ? `${mes.variacao_mes_pct > 0 ? '+' : ''}${Number(mes.variacao_mes_pct).toLocaleString('pt-BR')}%` : '—'}
                />
                <Resumo
                  rotulo="Contra o mesmo mês do ano passado"
                  valor={mes.variacao_ano_pct != null ? `${mes.variacao_ano_pct > 0 ? '+' : ''}${Number(mes.variacao_ano_pct).toLocaleString('pt-BR')}%` : '—'}
                />
              </div>

              <ol className="flex flex-col gap-2">
                {mes.ranking.map((item) => {
                  const qtd = noEstoque(item.modelo, veiculos);
                  return (
                    <li key={item.posicao} className="grid grid-cols-[1.75rem_minmax(8rem,12rem)_1fr_auto] items-center gap-3">
                      <span className="text-right text-[0.82rem] text-muted-foreground tabular-nums">{item.posicao}º</span>
                      <span className="truncate text-[0.88rem] font-semibold">{item.modelo}</span>
                      <span className="relative h-6 overflow-hidden rounded bg-secondary">
                        <span
                          className={cn('absolute inset-y-0 left-0 rounded', qtd ? 'bg-brand' : 'bg-muted-foreground/30')}
                          style={{ width: `${(item.unidades / maior) * 100}%` }}
                        />
                        <span className="relative px-2 text-[0.76rem] leading-6 font-semibold tabular-nums">
                          {fmtNumero(item.unidades)}
                        </span>
                      </span>
                      <span className={cn('w-[6.5rem] text-[0.76rem]', qtd ? 'font-semibold text-brand-strong dark:text-brand' : 'text-muted-foreground')}>
                        {qtd ? `${qtd} no seu estoque` : 'Fora do estoque'}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <p className="flex flex-wrap items-center gap-1 text-[0.76rem] text-muted-foreground">
                Fonte: {mes.fonte || 'Fenauto'}, transferências de usados e seminovos no mês.
                {mes.fonte_url && (
                  <a href={mes.fonte_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    Ver publicação <ExternalLink className="size-3" />
                  </a>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {vinculando && (
        <VincularFipe
          veiculo={vinculando}
          onFechar={() => setVinculando(null)}
          onSalvar={async (fipe) => {
            await api.salvarFipeVeiculo(vinculando.id, fipe);
            await onRecarregar();
          }}
        />
      )}
    </div>
  );
}
