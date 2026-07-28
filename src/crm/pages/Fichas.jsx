import { useMemo, useState } from 'react';
import { FilterX } from 'lucide-react';

import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';

import { EsperaPill, PageHeading, StatusPill } from '../components/Pills.jsx';
import {
  STATUS_OPTIONS,
  buscaEm,
  fmtBRL,
  fmtCPF,
  fmtDate,
  fmtPhone,
  idadeDe,
  nomeDa,
  regiaoDa,
} from '../lib/format.js';

const FAIXAS_IDADE = [
  { id: 'ate25', label: 'Até 25 anos', test: (i) => i != null && i <= 25 },
  { id: '26a35', label: '26 a 35 anos', test: (i) => i >= 26 && i <= 35 },
  { id: '36a50', label: '36 a 50 anos', test: (i) => i >= 36 && i <= 50 },
  { id: '50mais', label: 'Acima de 50', test: (i) => i > 50 },
];

const FAIXAS_ENTRADA = [
  { id: 'sem', label: 'Sem entrada', test: (v) => !v },
  { id: 'ate5k', label: 'Até R$ 5 mil', test: (v) => v > 0 && v <= 500000 },
  { id: '5a15k', label: 'R$ 5 a 15 mil', test: (v) => v > 500000 && v <= 1500000 },
  { id: '15kmais', label: 'Acima de R$ 15 mil', test: (v) => v > 1500000 },
];

const filtroInicial = { status: '', regiao: '', idade: '', veiculo: '', entrada: '', instituicao: '', indicacao: '' };

// O Radix Select reserva a string vazia, então "todos" representa o filtro desligado.
const TODOS = '__todos__';

function Filtro({ label, valor, onChange, opcoes, className }) {
  return (
    <Select value={valor || TODOS} onValueChange={(novo) => onChange(novo === TODOS ? '' : novo)}>
      <SelectTrigger size="sm" aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>{label}: todas</SelectItem>
        {opcoes.map(({ value, label: rotulo }) => (
          <SelectItem key={value} value={value}>
            {rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Fichas({ fichas, veiculos, busca, carregando, onAbrirFicha }) {
  const [filtros, setFiltros] = useState(filtroInicial);

  const opcoes = useMemo(() => {
    const unicos = (lista) => [...new Set(lista.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return {
      regioes: unicos(fichas.map(regiaoDa)),
      instituicoes: unicos(fichas.map((f) => f.instituicao_financeira)),
      indicacoes: unicos(fichas.map((f) => f.indicacao)),
    };
  }, [fichas]);

  const filtradas = useMemo(() => {
    return fichas.filter((ficha) => {
      if (!buscaEm(ficha, busca)) return false;
      if (filtros.status && ficha.status !== filtros.status) return false;
      if (filtros.regiao && regiaoDa(ficha) !== filtros.regiao) return false;
      if (filtros.veiculo && ficha.veiculo_id !== filtros.veiculo) return false;
      if (filtros.instituicao && ficha.instituicao_financeira !== filtros.instituicao) return false;
      if (filtros.indicacao && ficha.indicacao !== filtros.indicacao) return false;
      if (filtros.idade) {
        const faixa = FAIXAS_IDADE.find((f) => f.id === filtros.idade);
        if (!faixa?.test(idadeDe(ficha.dados?.cliente?.dataNascimento))) return false;
      }
      if (filtros.entrada) {
        const faixa = FAIXAS_ENTRADA.find((f) => f.id === filtros.entrada);
        if (!faixa?.test(ficha.valor_entrada_centavos)) return false;
      }
      return true;
    });
  }, [fichas, busca, filtros]);

  const set = (campo) => (valor) => setFiltros((atual) => ({ ...atual, [campo]: valor }));
  const temFiltro = busca || Object.values(filtros).some(Boolean);
  const paraOpcoes = (lista) => lista.map((item) => ({ value: item, label: item }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        titulo="Fichas cadastrais"
        descricao={
          carregando
            ? 'Carregando...'
            : `${filtradas.length} de ${fichas.length} ficha${fichas.length === 1 ? '' : 's'}${busca ? ` para "${busca}"` : ''}`
        }
      />

      <Card className="flex flex-row flex-wrap items-center gap-2.5 p-3">
        <Filtro label="Situação" valor={filtros.status} onChange={set('status')} opcoes={STATUS_OPTIONS} className="w-[10.5rem]" />
        <Filtro label="Região" valor={filtros.regiao} onChange={set('regiao')} opcoes={paraOpcoes(opcoes.regioes)} className="w-[10.5rem]" />
        <Filtro
          label="Idade"
          valor={filtros.idade}
          onChange={set('idade')}
          opcoes={FAIXAS_IDADE.map((f) => ({ value: f.id, label: f.label }))}
          className="w-[10rem]"
        />
        <Filtro
          label="Carro"
          valor={filtros.veiculo}
          onChange={set('veiculo')}
          opcoes={veiculos.map((v) => ({ value: v.id, label: `${v.nome} (${v.placa})` }))}
          className="w-[13rem]"
        />
        <Filtro
          label="Entrada"
          valor={filtros.entrada}
          onChange={set('entrada')}
          opcoes={FAIXAS_ENTRADA.map((f) => ({ value: f.id, label: f.label }))}
          className="w-[11rem]"
        />
        <Filtro
          label="Instituição"
          valor={filtros.instituicao}
          onChange={set('instituicao')}
          opcoes={paraOpcoes(opcoes.instituicoes)}
          className="w-[11.5rem]"
        />
        <Filtro label="Indicação" valor={filtros.indicacao} onChange={set('indicacao')} opcoes={paraOpcoes(opcoes.indicacoes)} className="w-[11rem]" />
        {temFiltro && (
          <Button variant="link" size="sm" onClick={() => setFiltros(filtroInicial)}>
            <FilterX /> Limpar filtros
          </Button>
        )}
      </Card>

      <Card className="overflow-hidden">
        {carregando ? (
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 6 }).map((_, indice) => (
              <Skeleton key={indice} className="h-12" />
            ))}
          </div>
        ) : (
          <Table className="min-w-[62rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Carro</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Espera</TableHead>
                <TableHead>Recebida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((ficha) => {
                const idade = idadeDe(ficha.dados?.cliente?.dataNascimento);
                return (
                  <TableRow key={ficha.id} onClick={() => onAbrirFicha(ficha.id)} className="cursor-pointer">
                    <TableCell>
                      <strong className="block font-semibold">{nomeDa(ficha)}</strong>
                      <small className="text-muted-foreground">
                        {[idade && `${idade} anos`, regiaoDa(ficha)].filter(Boolean).join(' · ') || '—'}
                      </small>
                    </TableCell>
                    <TableCell className="font-mono text-[0.82rem] tracking-wide">{ficha.protocolo}</TableCell>
                    <TableCell>
                      <span className="block whitespace-nowrap">{fmtPhone(ficha.celular)}</span>
                      <small className="font-mono text-[0.78rem] text-muted-foreground">{fmtCPF(ficha.cpf)}</small>
                    </TableCell>
                    <TableCell>
                      {ficha.veiculo ? (
                        <>
                          <span className="block">{ficha.veiculo.nome}</span>
                          <small className="text-muted-foreground">
                            {ficha.veiculo.placa} · {fmtBRL(ficha.veiculo.preco_centavos)}
                          </small>
                        </>
                      ) : (
                        <span className="text-muted-foreground/70">Sem carro</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{fmtBRL(ficha.valor_entrada_centavos)}</TableCell>
                    <TableCell>
                      <StatusPill status={ficha.status} />
                    </TableCell>
                    <TableCell>
                      <EsperaPill ficha={ficha} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(ficha.criado_em)}</TableCell>
                  </TableRow>
                );
              })}
              {filtradas.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    Nenhuma ficha encontrada com esses critérios.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
