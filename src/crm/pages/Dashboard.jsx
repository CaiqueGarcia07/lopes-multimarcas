import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Eye,
  EyeOff,
  FileText,
  Handshake,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { cn } from '@/lib/utils.js';

import { BarrasHorizontais, BarrasVerticais, Destaque } from '../components/Charts.jsx';
import { EsperaPill, PageHeading, StatusPill } from '../components/Pills.jsx';
import { STATUS_META, corDoStatus, esperaInfo, fmtBRL, fmtDate, nomeDa } from '../lib/format.js';
import { TIPOS_GASTO, gastosDe, totalGastos } from '../lib/veiculo.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const STATUS_ESTOQUE = [
  ['disponivel', 'Disponível'],
  ['reservado', 'Reservado'],
  ['vendido', 'Vendido'],
];

// Placeholder dos valores escondidos — mesma largura visual em qualquer número.
const OCULTO = 'R$ ••••••';

const TONS = {
  brand: 'from-brand/18 to-brand/5 text-brand-strong dark:text-brand ring-brand/20',
  teal: 'from-teal-500/18 to-teal-500/5 text-teal-600 dark:text-teal-300 ring-teal-500/20',
  green: 'from-emerald-500/18 to-emerald-500/5 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20',
};

function Kpi({ icon: Icon, label, valor, detalhe, tom = 'brand' }) {
  return (
    <Card className="transition-shadow hover:shadow-lift">
      <CardContent className="flex items-start gap-4 py-5">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1', TONS[tom])}>
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[0.76rem] font-bold tracking-wide text-muted-foreground">{label}</span>
          <strong className="font-display text-2xl leading-none tracking-tight">{valor}</strong>
          {detalhe && <span className="mt-1 text-[0.78rem] text-muted-foreground">{detalhe}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ fichas, veiculos = [], carregando, onAbrirFicha, onIrPara }) {
  // Esconde os valores em reais do painel — útil quando a tela está à vista de
  // clientes na loja. A escolha fica salva no navegador de quem usa.
  const [valoresOcultos, setValoresOcultos] = useState(
    () => localStorage.getItem('crm-valores-ocultos') === 'true',
  );

  useEffect(() => {
    localStorage.setItem('crm-valores-ocultos', String(valoresOcultos));
  }, [valoresOcultos]);

  const moeda = (centavos) => (valoresOcultos ? OCULTO : fmtBRL(centavos));

  const total = fichas.length;
  const novas = fichas.filter((f) => f.status === 'novo').length;
  const aprovadas = fichas.filter((f) => f.status === 'aprovado');
  const vendas = fichas.filter((f) => f.status === 'convertido');

  const valorVendido = vendas.reduce((soma, f) => soma + (f.valor_venda_centavos || 0), 0);
  const valorAprovado = aprovadas.reduce((soma, f) => soma + (f.valor_venda_centavos || 0), 0);
  const ticketMedio = vendas.length ? valorVendido / vendas.length : null;
  const conversao = total ? Math.round((vendas.length / total) * 100) : 0;

  const atrasadas = fichas
    .filter((f) => esperaInfo(f).nivel === 'atrasado')
    .sort((a, b) => esperaInfo(b).dias - esperaInfo(a).dias)
    .slice(0, 6);

  // Fichas concluídas nos últimos 6 meses, pela data da última movimentação.
  const vendasPorMes = (() => {
    const hoje = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      return {
        chave: `${d.getFullYear()}-${d.getMonth()}`,
        rotulo: MESES[d.getMonth()],
        rotuloCompleto: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        valor: 0,
      };
    });
    vendas.forEach((ficha) => {
      const d = new Date(ficha.atualizado_em || ficha.criado_em);
      const mes = meses.find((m) => m.chave === `${d.getFullYear()}-${d.getMonth()}`);
      if (mes) mes.valor += 1;
    });
    return meses;
  })();

  const estoquePorSituacao = STATUS_ESTOQUE.map(([valor, rotulo]) => ({
    rotulo,
    valor: veiculos.filter((v) => v.status === valor).reduce((soma, v) => soma + (v.preco_centavos || 0), 0),
  }));
  const valorEstoqueDisponivel = estoquePorSituacao[0].valor;

  const gastosPorTipo = TIPOS_GASTO.map((tipo) => ({
    rotulo: tipo,
    valor: veiculos.reduce(
      (soma, v) => soma + gastosDe(v).filter((g) => g.tipo === tipo).reduce((s, g) => s + (g.valor_centavos || 0), 0),
      0,
    ),
  }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const gastoTotal = veiculos.reduce((soma, v) => soma + totalGastos(v), 0);

  const porStatus = Object.entries(STATUS_META).map(([status, meta]) => ({
    status,
    meta,
    qtd: fichas.filter((f) => f.status === status).length,
  }));
  const maxQtd = Math.max(1, ...porStatus.map((s) => s.qtd));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        titulo="Visão geral"
        descricao={carregando ? 'Carregando dados...' : 'Resumo das fichas e vendas da loja.'}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setValoresOcultos((atual) => !atual)}
          aria-pressed={valoresOcultos}
          title={valoresOcultos ? 'Mostrar os valores em reais' : 'Esconder os valores em reais'}
        >
          {valoresOcultos ? <EyeOff /> : <Eye />}
          {valoresOcultos ? 'Valores ocultos' : 'Ocultar valores'}
        </Button>
      </PageHeading>

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, indice) => (
            <Skeleton key={indice} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Kpi icon={FileText} label="Fichas recebidas" valor={total} detalhe={`${novas} nova${novas === 1 ? '' : 's'} aguardando`} />
          <Kpi
            icon={BadgeCheck}
            label="Fichas aprovadas"
            valor={aprovadas.length}
            detalhe={valorAprovado ? `${moeda(valorAprovado)} em negociação` : 'Sem valores lançados'}
            tom="teal"
          />
          <Kpi icon={Handshake} label="Vendas concluídas" valor={vendas.length} detalhe={`Conversão de ${conversao}%`} tom="green" />
          <Kpi icon={CircleDollarSign} label="Total vendido" valor={moeda(valorVendido)} detalhe="Somatório das fichas concluídas" tom="green" />
          <Kpi icon={Wallet} label="Ticket médio" valor={moeda(ticketMedio)} detalhe="Por venda concluída" />
          <Kpi
            icon={TrendingUp}
            label="Em andamento"
            valor={total - vendas.length - fichas.filter((f) => ['reprovado', 'arquivado'].includes(f.status)).length}
            detalhe="Fichas ativas no funil"
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Fichas concluídas</CardTitle>
            <span className="text-[0.78rem] text-muted-foreground">Últimos 6 meses</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Destaque valor={vendas.length} rotulo={`vendas fechadas · conversão de ${conversao}%`} />
            <BarrasVerticais
              titulo="Fichas concluídas por mês"
              dados={vendasPorMes}
              cor="var(--brand-strong)"
              formatar={(v) => String(v)}
              vazio="Nenhuma ficha concluída nos últimos 6 meses."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Valor do estoque</CardTitle>
            <span className="text-[0.78rem] text-muted-foreground">{veiculos.length} veículos</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Destaque valor={moeda(valorEstoqueDisponivel)} rotulo="em carros disponíveis para venda" />
            <BarrasHorizontais
              titulo="Valor do estoque por situação"
              dados={estoquePorSituacao}
              cor="var(--success)"
              formatar={moeda}
              vazio="Nenhum veículo cadastrado no estoque."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Gastos com manutenção</CardTitle>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onIrPara('estoque')}>
              Ver estoque <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Destaque valor={moeda(gastoTotal)} rotulo="investidos nos veículos do estoque" />
            <BarrasHorizontais
              titulo="Gastos com manutenção por tipo"
              dados={gastosPorTipo}
              cor="var(--warning)"
              formatar={moeda}
              vazio="Nenhum gasto lançado nos veículos."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Funil por situação</CardTitle>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onIrPara('esteira')}>
              Abrir esteira <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {porStatus.map(({ status, meta, qtd }) => (
              <div key={status} className="grid grid-cols-[9.5rem_1fr_2.5rem] items-center gap-3">
                <span className="truncate text-[0.84rem] font-semibold text-muted-foreground">{meta.label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <span
                    className={cn('block h-full rounded-full transition-[width] duration-500', corDoStatus(status).solid)}
                    style={{ width: `${(qtd / maxQtd) * 100}%` }}
                  />
                </div>
                <span className="text-right font-display text-[0.95rem] font-bold tabular-nums">{qtd}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" /> Aguardando ação
            </CardTitle>
            <span className="text-[0.78rem] text-muted-foreground">Paradas há 5 dias ou mais</span>
          </CardHeader>
          <CardContent>
            {atrasadas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Nenhuma ficha atrasada. Bom trabalho!
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {atrasadas.map((ficha) => (
                  <li key={ficha.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirFicha(ficha.id)}
                      className="flex w-full flex-wrap items-center gap-2.5 rounded-xl border border-border px-3.5 py-3 text-left transition-colors hover:border-brand/40 hover:bg-secondary/60"
                    >
                      <span className="min-w-0 flex-1 truncate text-[0.9rem] font-semibold">{nomeDa(ficha)}</span>
                      <StatusPill status={ficha.status} />
                      <EsperaPill ficha={ficha} sufixo="parada" />
                      <span className="w-full text-[0.75rem] text-muted-foreground">
                        desde {fmtDate(ficha.atualizado_em)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
