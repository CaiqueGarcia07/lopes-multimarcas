import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  BriefcaseBusiness,
  CarFront,
  ChevronRight,
  Circle,
  CircleDollarSign,
  Copy,
  FileCheck2,
  Landmark,
  LoaderCircle,
  Lock,
  MapPinHouse,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { RadioCard, RadioGroup } from '@/components/ui/radio-group.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Separator } from '@/components/ui/separator.jsx';

import { buscarEnderecoPorCep } from './services/cepApi.js';
import { anoDoVeiculo, listarVitrine } from './services/estoqueApi.js';
import { submitProposal } from './services/proposalApi.js';
import {
  buildProposalPayload,
  CONSENT_TEXT,
  generateProtocol,
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskCurrency,
  maskPhone,
  onlyDigits,
  validateCNPJ,
  validateCPF,
} from './utils/form.js';

const ASSET = import.meta.env.BASE_URL;

// O Radix Select reserva a string vazia para "sem valor".
const SEM_VEICULO = '__sem_veiculo__';

const fmtBRL = (centavos) =>
  centavos == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

const initialForm = {
  nome: '',
  rg: '',
  cpf: '',
  estadoCivil: '',
  dataNascimento: '',
  nomeMae: '',
  nomePai: '',
  cidadeNascimento: '',
  ufNascimento: '',
  email: '',
  temCnh: '',

  veiculoId: '',

  ruaResidencial: '',
  numeroResidencial: '',
  complementoResidencial: '',
  bairroResidencial: '',
  cidadeResidencial: '',
  ufResidencial: '',
  cepResidencial: '',
  tempoResidencia: '',
  telefoneFixoResidencial: '',
  celular: '',

  nomeEmpresa: '',
  cargo: '',
  tempoEmpresa: '',
  rendaMensal: '',
  cnpjEmpresa: '',
  enderecoEmpresa: '',
  numeroEmpresa: '',
  bairroEmpresa: '',
  cidadeEmpresa: '',
  ufEmpresa: '',
  cepEmpresa: '',
  telefoneEmpresa: '',

  banco: '',
  agencia: '',
  conta: '',

  referencia1Nome: '',
  referencia1Parentesco: '',
  referencia1Telefone: '',
  referencia2Nome: '',
  referencia2Parentesco: '',
  referencia2Telefone: '',

  consentimento: false,
  website: '',
};

// Endereço do lead é obrigatório por inteiro — só o complemento é opcional.
const CAMPOS_ENDERECO = [
  ['cepResidencial', 'Informe o CEP.'],
  ['ruaResidencial', 'Informe a rua.'],
  ['numeroResidencial', 'Informe o número.'],
  ['bairroResidencial', 'Informe o bairro.'],
  ['cidadeResidencial', 'Informe a cidade.'],
  ['ufResidencial', 'Informe a UF.'],
];

const enderecoCompleto = (form) => CAMPOS_ENDERECO.every(([campo]) => String(form[campo] || '').trim());

// Itens do checklist lateral: cada um vale uma fatia do progresso.
const OBRIGATORIOS = [
  ['Nome completo', (f) => Boolean(f.nome.trim())],
  ['CPF', (f) => Boolean(f.cpf)],
  ['Data de nascimento', (f) => Boolean(f.dataNascimento)],
  ['Possui CNH?', (f) => Boolean(f.temCnh)],
  ['Telefone celular', (f) => Boolean(f.celular)],
  ['Endereço completo', enderecoCompleto],
  ['Autorização de uso dos dados', (f) => Boolean(f.consentimento)],
];

const CAMPOS_TELEFONE = [
  'telefoneFixoResidencial',
  'celular',
  'telefoneEmpresa',
  'referencia1Telefone',
  'referencia2Telefone',
];

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)', 'Outro'];

// Cada CEP preenche o bloco de endereço correspondente.
const CAMPOS_POR_CEP = {
  cepResidencial: {
    logradouro: 'ruaResidencial',
    bairro: 'bairroResidencial',
    cidade: 'cidadeResidencial',
    uf: 'ufResidencial',
  },
  cepEmpresa: {
    logradouro: 'enderecoEmpresa',
    bairro: 'bairroEmpresa',
    cidade: 'cidadeEmpresa',
    uf: 'ufEmpresa',
  },
};

function Field({ label, name, required, error, hint, className = '', children }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" /> {hint}
        </span>
      )}
      {error && (
        <span className="text-xs font-semibold text-destructive" id={`${name}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Campo de CEP com indicador de busca automática do endereço. */
function CepInput({ name, value, error, buscando, onChange }) {
  return (
    <div className="relative">
      <Input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        className="pr-10"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {buscando && (
        <LoaderCircle
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-brand-strong"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function SectionBadge({ pending = 0, complete = false, optional = false }) {
  if (pending > 0) {
    return (
      <Badge variant="warning">
        {pending} obrigatório{pending > 1 ? 's' : ''}
      </Badge>
    );
  }
  if (complete) {
    return (
      <Badge variant="success">
        <Check /> Completo
      </Badge>
    );
  }
  if (optional) return <Badge variant="outline">Opcional</Badge>;
  return null;
}

function FormSection({ value, icon: Icon, title, subtitle, badge, children }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/18 to-brand/5 text-brand-strong ring-1 ring-brand/20">
          <Icon className="size-5.5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="font-display text-[1.02rem] tracking-tight">{title}</strong>
          <small className="truncate text-[0.82rem] font-medium text-muted-foreground">{subtitle}</small>
        </span>
        {badge}
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [protocolCopied, setProtocolCopied] = useState(false);
  const [cepBuscando, setCepBuscando] = useState({});
  const [vitrine, setVitrine] = useState([]);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    listarVitrine().then(setVitrine);
  }, []);

  const veiculoEscolhido = vitrine.find((v) => v.id === form.veiculoId) || null;

  const requiredChecklist = useMemo(
    () => OBRIGATORIOS.map(([label, pronto]) => [label, pronto(form)]),
    [form],
  );

  const progress = useMemo(() => {
    const completed = requiredChecklist.filter(([, done]) => done).length;
    return Math.round((completed / requiredChecklist.length) * 100);
  }, [requiredChecklist]);

  const anyFilled = (fields) => fields.some((field) => Boolean(form[field]));
  const sectionStatus = {
    pessoais: {
      pending: ['nome', 'cpf', 'dataNascimento', 'temCnh'].filter((field) => !String(form[field]).trim()).length,
      complete: true,
    },
    residenciais: {
      pending:
        CAMPOS_ENDERECO.filter(([campo]) => !String(form[campo] || '').trim()).length + (form.celular ? 0 : 1),
      complete: true,
    },
    profissionais: {
      complete: anyFilled(['nomeEmpresa', 'cargo', 'rendaMensal']),
      optional: true,
    },
    bancarios: { complete: anyFilled(['banco', 'agencia', 'conta']), optional: true },
    referencias: { complete: anyFilled(['referencia1Nome', 'referencia2Nome']), optional: true },
  };

  const isDirty = useMemo(
    () => Object.entries(form).some(([key, value]) => key !== 'website' && Boolean(value)),
    [form],
  );

  const maxBirthDate = useMemo(() => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (!reviewOpen) return;
    confirmButtonRef.current?.focus();
  }, [reviewOpen]);

  // Busca o endereço no ViaCEP e preenche rua, bairro, cidade e UF do bloco.
  const preencherPeloCep = async (campoCep, cep) => {
    const campos = CAMPOS_POR_CEP[campoCep];
    setCepBuscando((atual) => ({ ...atual, [campoCep]: true }));

    const endereco = await buscarEnderecoPorCep(cep);

    setCepBuscando((atual) => ({ ...atual, [campoCep]: false }));
    if (!endereco) {
      setErrors((current) => ({ ...current, [campoCep]: 'CEP não encontrado.' }));
      return;
    }

    setForm((current) => ({
      ...current,
      [campos.logradouro]: endereco.logradouro || current[campos.logradouro],
      [campos.bairro]: endereco.bairro || current[campos.bairro],
      [campos.cidade]: endereco.cidade,
      [campos.uf]: endereco.uf,
    }));
  };

  const setField = (name, rawValue) => {
    let nextValue = rawValue;

    if (name === 'cpf') nextValue = maskCPF(rawValue);
    else if (name === 'cnpjEmpresa') nextValue = maskCNPJ(rawValue);
    else if (name in CAMPOS_POR_CEP) nextValue = maskCEP(rawValue);
    else if (name === 'rendaMensal') nextValue = maskCurrency(rawValue);
    else if (CAMPOS_TELEFONE.includes(name)) nextValue = maskPhone(rawValue);
    else if (name.startsWith('uf')) nextValue = rawValue.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);

    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setNotice('');

    if (name in CAMPOS_POR_CEP && onlyDigits(nextValue).length === 8) {
      preencherPeloCep(name, nextValue);
    }

    if (status === 'success' || status === 'error') {
      setStatus('idle');
      setResult(null);
    }
  };

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setField(name, type === 'checkbox' ? checked : value);
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome completo.';

    CAMPOS_ENDERECO.forEach(([campo, mensagem]) => {
      if (!String(form[campo] || '').trim()) nextErrors[campo] = mensagem;
    });

    if (!form.cpf) nextErrors.cpf = 'Informe o CPF.';
    else if (!validateCPF(form.cpf)) nextErrors.cpf = 'CPF inválido.';

    if (!form.dataNascimento) {
      nextErrors.dataNascimento = 'Informe a data de nascimento.';
    } else {
      const birthDate = new Date(`${form.dataNascimento}T00:00:00`);
      if (Number.isNaN(birthDate.getTime())) nextErrors.dataNascimento = 'Data inválida.';
      else if (form.dataNascimento > maxBirthDate) nextErrors.dataNascimento = 'A data não pode estar no futuro.';
    }

    if (!form.temCnh) nextErrors.temCnh = 'Selecione uma opção.';

    if (!form.celular) nextErrors.celular = 'Informe o telefone celular.';
    else if (onlyDigits(form.celular).length < 10) nextErrors.celular = 'Telefone incompleto.';

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'E-mail inválido.';
    }

    if (form.cnpjEmpresa && !validateCNPJ(form.cnpjEmpresa)) {
      nextErrors.cnpjEmpresa = 'CNPJ inválido.';
    }

    Object.keys(CAMPOS_POR_CEP).forEach((field) => {
      if (form[field] && onlyDigits(form[field]).length !== 8) nextErrors[field] = 'CEP incompleto.';
    });

    if (form.ufResidencial && form.ufResidencial.length !== 2) nextErrors.ufResidencial = 'UF deve ter 2 letras.';

    CAMPOS_TELEFONE.filter((field) => field !== 'celular').forEach((field) => {
      if (form[field] && onlyDigits(form[field]).length < 10) nextErrors[field] = 'Telefone incompleto.';
    });

    if (!form.consentimento) nextErrors.consentimento = 'É necessário autorizar o uso dos dados.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    if (status === 'submitting') return;
    setForm(initialForm);
    setErrors({});
    setNotice('');
    setStatus('idle');
    setResult(null);
    setProtocolCopied(false);
    setCepBuscando({});
    setReviewOpen(false);
  };

  const copyProtocol = async () => {
    if (!result?.protocolo) return;
    try {
      await navigator.clipboard.writeText(result.protocolo);
      setProtocolCopied(true);
      setTimeout(() => setProtocolCopied(false), 2200);
    } catch {
      // Sem acesso à área de transferência: o número continua visível na tela.
    }
  };

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      document.querySelector('[aria-invalid="true"]')?.focus();
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      setStatus('idle');
      setNotice('Revise os campos destacados antes de continuar.');
      focusFirstError();
      return;
    }

    setNotice('');
    setReviewOpen(true);
  };

  const performSubmit = async () => {
    setStatus('submitting');
    setNotice('');

    try {
      // Campo invisível preenchido normalmente indica submissão automatizada.
      if (form.website) {
        setResult({ protocolo: generateProtocol(), modoDemonstracao: true });
        setStatus('success');
        setReviewOpen(false);
        return;
      }

      const response = await submitProposal(buildProposalPayload(form, veiculoEscolhido), generateProtocol());
      setResult(response);
      setStatus('success');
      setReviewOpen(false);
    } catch (error) {
      setStatus('error');
      setNotice(error.message || 'Não foi possível enviar a ficha. Tente novamente.');
      setReviewOpen(false);
    }
  };

  const reviewItems = [
    ['Cliente', form.nome],
    ['CPF', form.cpf],
    ['Nascimento', form.dataNascimento.split('-').reverse().join('/')],
    ['Celular', form.celular],
    ['Endereço', `${form.ruaResidencial}, ${form.numeroResidencial} — ${form.cidadeResidencial}/${form.ufResidencial}`],
    ['E-mail', form.email || 'Não informado'],
    ['CNH', form.temCnh],
    ['Veículo', veiculoEscolhido ? veiculoEscolhido.nome : 'A definir com a equipe'],
  ];

  return (
    <div className="relative min-h-screen">
      {/* Fundo fotográfico: showroom desfocado sob um véu escuro, para o conteúdo respirar. */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${ASSET}hero-showroom.jpg)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f14]/88 via-[#0b0f14]/94 to-[#0b0f14]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,color-mix(in_srgb,var(--brand)_28%,transparent),transparent_55%)]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f14]/95">
        <div className="mx-auto flex h-[74px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <a href="#inicio" aria-label="Lopes Multimarcas" className="inline-flex items-center">
            <img className="h-10 w-auto" src={`${ASSET}lopes-multimarcas-logo.png`} alt="Lopes Multimarcas" />
          </a>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[0.8rem] font-semibold text-white/85">
            <ShieldCheck className="size-4 text-brand" /> Ambiente seguro
          </span>
        </div>
      </header>

      <main id="inicio" className="mx-auto max-w-[1320px] px-5 pb-16 sm:px-8">
        <section className="relative py-14 text-white sm:py-20 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/35 bg-brand/12 px-3.5 py-1.5 text-[0.74rem] font-bold tracking-[0.18em] text-brand uppercase">
            <Sparkles className="size-3.5" /> Simulação de financiamento
          </span>
          <h1 className="font-display mt-6 max-w-[16ch] text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.02] font-extrabold tracking-[-0.045em]">
            Sua próxima conquista{' '}
            <span className="bg-gradient-to-r from-brand to-[#7fe0ff] bg-clip-text text-transparent">
              começa aqui.
            </span>
          </h1>
          <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-relaxed text-white/72">
            Procedência, garantia e as melhores condições para você sair dirigindo hoje. Preencha seus dados e nossa
            equipe encontra o financiamento ideal para o seu veículo.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {[
              [BadgeCheck, 'Análise personalizada'],
              [ShieldCheck, 'Dados protegidos'],
              [Lock, 'Conforme a LGPD'],
            ].map(([Icon, texto]) => (
              <span
                key={texto}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[0.86rem] font-semibold text-white/90"
              >
                <Icon className="size-4 text-brand" /> {texto}
              </span>
            ))}
          </div>
        </section>

        <div className="grid items-start gap-6 [&>*]:min-w-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="glass-panel sticky top-[92px] hidden rounded-2xl border border-border/70 p-6 shadow-lift lg:block">
            <span className="text-[0.72rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Progresso da ficha
            </span>
            <div className="mt-2 flex items-end justify-between gap-3">
              <strong className="font-display text-4xl leading-none tracking-tight">{progress}%</strong>
              <span className="pb-1 text-xs font-semibold text-muted-foreground">
                {requiredChecklist.filter(([, done]) => done).length} de {requiredChecklist.length}
              </span>
            </div>
            <Progress className="mt-3" value={progress} aria-label={`${progress}% preenchido`} />

            <ul className="mt-6 flex flex-col gap-2.5">
              {requiredChecklist.map(([label, done]) => (
                <li
                  key={label}
                  className={`flex items-center gap-2.5 text-[0.88rem] font-medium transition-colors ${
                    done ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <Circle className="size-4 shrink-0 opacity-45" aria-hidden="true" />
                  )}
                  <span className={done ? 'line-through decoration-success/40' : ''}>{label}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <h2 className="font-display text-base font-bold tracking-tight">Antes de começar</h2>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-muted-foreground">
              Tenha em mãos seus documentos pessoais, dados de residência e informações profissionais.
            </p>

            <Alert variant="info" className="mt-5">
              <ShieldCheck />
              <AlertDescription>
                Seus dados são enviados de forma criptografada e usados somente para a análise do seu financiamento,
                conforme a LGPD.
              </AlertDescription>
            </Alert>
          </aside>

          {status === 'success' && result ? (
            <Card className="overflow-hidden" role="status">
              <div className="bg-gradient-to-br from-success/12 to-transparent px-6 pt-10 pb-8 text-center sm:px-10">
                <span className="mx-auto grid size-20 place-items-center rounded-full bg-success/12 text-success ring-8 ring-success/8">
                  <CheckCircle2 className="size-11" aria-hidden="true" />
                </span>
                <h2 className="font-display mt-6 text-[1.9rem] leading-tight font-extrabold tracking-tight">
                  Ficha enviada com sucesso!
                </h2>
                <p className="mx-auto mt-3 max-w-[52ch] leading-relaxed text-muted-foreground">
                  Recebemos seus dados com segurança. Guarde o número de protocolo para acompanhar sua análise.
                </p>
              </div>

              <CardContent className="flex flex-col gap-6 sm:px-10">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-brand/40 bg-accent/50 px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[0.72rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                      Protocolo
                    </span>
                    <strong className="font-display text-2xl tracking-tight">{result.protocolo}</strong>
                  </div>
                  <Button variant="secondary" type="button" onClick={copyProtocol}>
                    {protocolCopied ? <Check /> : <Copy />}
                    {protocolCopied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>

                {result.modoDemonstracao && (
                  <Alert variant="warning">
                    <AlertDescription>
                      Ficha validada em modo de demonstração. Configure o banco de dados para realizar o envio real.
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <h3 className="font-display text-base font-bold tracking-tight">Próximos passos</h3>
                  <ol className="mt-4 flex flex-col gap-3">
                    {[
                      'Nossa equipe analisa suas informações junto às instituições parceiras.',
                      'Entramos em contato pelo celular informado em até 1 dia útil.',
                      'Você recebe as melhores condições para sair dirigindo.',
                    ].map((passo, indice) => (
                      <li key={passo} className="flex gap-3 text-[0.92rem] leading-relaxed text-muted-foreground">
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand/12 text-[0.75rem] font-bold text-brand-strong">
                          {indice + 1}
                        </span>
                        {passo}
                      </li>
                    ))}
                  </ol>
                </div>

                <Button variant="brand" size="lg" type="button" onClick={resetForm} className="self-start">
                  <RefreshCcw /> Preencher nova ficha
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-br from-accent/70 to-transparent px-6 py-6">
                  <div>
                    <span className="text-[0.72rem] font-bold tracking-[0.16em] text-brand-strong uppercase">
                      Ficha cadastral
                    </span>
                    <h2 className="font-display mt-1.5 text-2xl leading-tight font-extrabold tracking-tight">
                      Conte um pouco sobre você
                    </h2>
                  </div>
                  <Badge variant="brand" className="px-3.5 py-1.5 text-[0.8rem]">
                    <CircleDollarSign /> Financiamento
                  </Badge>
                </div>

                <div className="px-6 py-5 lg:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[0.78rem] font-bold text-muted-foreground">Progresso da ficha</span>
                    <strong className="font-display text-lg">{progress}%</strong>
                  </div>
                  <Progress className="mt-2" value={progress} aria-label={`${progress}% preenchido`} />
                </div>
              </Card>

              <div className="sr-only" aria-hidden="true">
                <label htmlFor="website">Não preencha este campo</label>
                <input
                  id="website"
                  name="website"
                  value={form.website}
                  onChange={updateField}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {vitrine.length > 0 && (
                <Card>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/18 to-brand/5 text-brand-strong ring-1 ring-brand/20">
                        <CarFront className="size-5.5" aria-hidden="true" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <strong className="font-display text-[1.02rem] tracking-tight">Veículo de interesse</strong>
                        <small className="text-[0.82rem] font-medium text-muted-foreground">
                          Escolha o carro da nossa loja para simular o financiamento
                        </small>
                      </span>
                    </div>

                    <Select
                      value={form.veiculoId || SEM_VEICULO}
                      onValueChange={(valor) => setField('veiculoId', valor === SEM_VEICULO ? '' : valor)}
                    >
                      <SelectTrigger id="veiculoId" aria-label="Veículo de interesse">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEM_VEICULO}>Ainda não escolhi / quero uma indicação</SelectItem>
                        {vitrine.map((veiculo) => (
                          <SelectItem key={veiculo.id} value={veiculo.id}>
                            {veiculo.nome} · {fmtBRL(veiculo.preco_centavos)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {veiculoEscolhido && (
                      <div className="rounded-xl border border-brand/25 bg-accent/50 p-5">
                        <strong className="font-display block text-[1.05rem] leading-snug font-bold tracking-tight">
                          {veiculoEscolhido.nome}
                        </strong>
                        <span className="font-display mt-1 block text-2xl font-extrabold text-brand-strong tabular-nums">
                          {fmtBRL(veiculoEscolhido.preco_centavos)}
                        </span>
                        <dl className="mt-4 grid gap-3 border-t border-brand/20 pt-4 sm:grid-cols-3">
                          {[
                            ['Cor', veiculoEscolhido.cor],
                            ['Carroceria', veiculoEscolhido.carroceria],
                            ['Ano do modelo', anoDoVeiculo(veiculoEscolhido)],
                          ].map(([rotulo, valor]) => (
                            <div key={rotulo} className="flex flex-col gap-0.5">
                              <dt className="text-[0.7rem] font-bold tracking-wide text-muted-foreground uppercase">
                                {rotulo}
                              </dt>
                              <dd className="text-[0.92rem] font-semibold">{valor || '—'}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Accordion
                type="multiple"
                defaultValue={['pessoais', 'residenciais']}
                className="flex flex-col gap-4"
              >
                <FormSection
                  value="pessoais"
                  icon={UserRound}
                  title="Dados pessoais"
                  subtitle="Informações de identificação do cliente"
                  badge={<SectionBadge {...sectionStatus.pessoais} />}
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Nome completo" name="nome" required error={errors.nome} className="sm:col-span-2">
                      <Input
                        id="nome"
                        name="nome"
                        value={form.nome}
                        onChange={updateField}
                        autoComplete="name"
                        placeholder="Digite seu nome completo"
                        aria-invalid={Boolean(errors.nome)}
                        aria-describedby={errors.nome ? 'nome-error' : undefined}
                      />
                    </Field>
                    <Field label="RG" name="rg">
                      <Input id="rg" name="rg" value={form.rg} onChange={updateField} placeholder="00.000.000-0" />
                    </Field>
                    <Field
                      label="CPF"
                      name="cpf"
                      required
                      error={errors.cpf}
                      hint="Usado somente para a análise de crédito."
                    >
                      <Input
                        id="cpf"
                        name="cpf"
                        value={form.cpf}
                        onChange={updateField}
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        aria-invalid={Boolean(errors.cpf)}
                        aria-describedby={errors.cpf ? 'cpf-error' : undefined}
                      />
                    </Field>
                    <Field label="Estado civil" name="estadoCivil">
                      <Select
                        value={form.estadoCivil}
                        onValueChange={(valor) => setField('estadoCivil', valor)}
                      >
                        <SelectTrigger id="estadoCivil" aria-label="Estado civil">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_CIVIS.map((opcao) => (
                            <SelectItem key={opcao} value={opcao}>
                              {opcao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Data de nascimento" name="dataNascimento" required error={errors.dataNascimento}>
                      <Input
                        id="dataNascimento"
                        name="dataNascimento"
                        type="date"
                        max={maxBirthDate}
                        value={form.dataNascimento}
                        onChange={updateField}
                        aria-invalid={Boolean(errors.dataNascimento)}
                        aria-describedby={errors.dataNascimento ? 'dataNascimento-error' : undefined}
                      />
                    </Field>
                    <Field label="Nome da mãe" name="nomeMae" className="sm:col-span-2">
                      <Input
                        id="nomeMae"
                        name="nomeMae"
                        value={form.nomeMae}
                        onChange={updateField}
                        placeholder="Nome completo"
                      />
                    </Field>
                    <Field label="Nome do pai" name="nomePai" className="sm:col-span-2">
                      <Input
                        id="nomePai"
                        name="nomePai"
                        value={form.nomePai}
                        onChange={updateField}
                        placeholder="Nome completo"
                      />
                    </Field>
                    <Field label="Cidade de nascimento" name="cidadeNascimento">
                      <Input
                        id="cidadeNascimento"
                        name="cidadeNascimento"
                        value={form.cidadeNascimento}
                        onChange={updateField}
                        placeholder="Cidade onde nasceu"
                      />
                    </Field>
                    <Field label="UF de nascimento" name="ufNascimento">
                      <Input
                        id="ufNascimento"
                        name="ufNascimento"
                        value={form.ufNascimento}
                        onChange={updateField}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </Field>
                    <Field label="E-mail" name="email" error={errors.email} className="sm:col-span-2">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={updateField}
                        autoComplete="email"
                        placeholder="voce@exemplo.com"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                      />
                    </Field>
                    <Field label="Possui CNH?" name="temCnh" required error={errors.temCnh} className="sm:col-span-2">
                      <RadioGroup
                        className="flex flex-wrap gap-3"
                        value={form.temCnh}
                        onValueChange={(valor) => setField('temCnh', valor)}
                        aria-label="Possui CNH?"
                        aria-invalid={Boolean(errors.temCnh)}
                        aria-describedby={errors.temCnh ? 'temCnh-error' : undefined}
                      >
                        {['Sim', 'Não'].map((opcao) => (
                          <RadioCard key={opcao} value={opcao} id={`cnh-${opcao}`}>
                            {opcao}
                          </RadioCard>
                        ))}
                      </RadioGroup>
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  value="residenciais"
                  icon={MapPinHouse}
                  title="Dados residenciais"
                  subtitle="Endereço e formas de contato"
                  badge={<SectionBadge {...sectionStatus.residenciais} />}
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="CEP"
                      name="cepResidencial"
                      required
                      error={errors.cepResidencial}
                      hint="Preenchemos rua, bairro, cidade e UF automaticamente."
                    >
                      <CepInput
                        name="cepResidencial"
                        value={form.cepResidencial}
                        error={errors.cepResidencial}
                        buscando={cepBuscando.cepResidencial}
                        onChange={updateField}
                      />
                    </Field>
                    <Field label="Número" name="numeroResidencial" required error={errors.numeroResidencial}>
                      <Input
                        id="numeroResidencial"
                        name="numeroResidencial"
                        value={form.numeroResidencial}
                        onChange={updateField}
                        placeholder="123"
                        aria-invalid={Boolean(errors.numeroResidencial)}
                        aria-describedby={errors.numeroResidencial ? 'numeroResidencial-error' : undefined}
                      />
                    </Field>
                    <Field
                      label="Rua / Avenida"
                      name="ruaResidencial"
                      required
                      error={errors.ruaResidencial}
                      className="sm:col-span-2"
                    >
                      <Input
                        id="ruaResidencial"
                        name="ruaResidencial"
                        value={form.ruaResidencial}
                        onChange={updateField}
                        autoComplete="street-address"
                        placeholder="Nome da rua"
                        aria-invalid={Boolean(errors.ruaResidencial)}
                        aria-describedby={errors.ruaResidencial ? 'ruaResidencial-error' : undefined}
                      />
                    </Field>
                    <Field label="Complemento" name="complementoResidencial">
                      <Input
                        id="complementoResidencial"
                        name="complementoResidencial"
                        value={form.complementoResidencial}
                        onChange={updateField}
                        placeholder="Apto, bloco, casa (opcional)"
                      />
                    </Field>
                    <Field label="Bairro" name="bairroResidencial" required error={errors.bairroResidencial}>
                      <Input
                        id="bairroResidencial"
                        name="bairroResidencial"
                        value={form.bairroResidencial}
                        onChange={updateField}
                        placeholder="Bairro"
                        aria-invalid={Boolean(errors.bairroResidencial)}
                        aria-describedby={errors.bairroResidencial ? 'bairroResidencial-error' : undefined}
                      />
                    </Field>
                    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4 sm:col-span-2">
                      <Field label="Cidade" name="cidadeResidencial" required error={errors.cidadeResidencial}>
                        <Input
                          id="cidadeResidencial"
                          name="cidadeResidencial"
                          value={form.cidadeResidencial}
                          onChange={updateField}
                          placeholder="Cidade"
                          aria-invalid={Boolean(errors.cidadeResidencial)}
                          aria-describedby={errors.cidadeResidencial ? 'cidadeResidencial-error' : undefined}
                        />
                      </Field>
                      <Field label="UF" name="ufResidencial" required error={errors.ufResidencial}>
                        <Input
                          id="ufResidencial"
                          name="ufResidencial"
                          value={form.ufResidencial}
                          onChange={updateField}
                          placeholder="SP"
                          maxLength={2}
                          aria-invalid={Boolean(errors.ufResidencial)}
                          aria-describedby={errors.ufResidencial ? 'ufResidencial-error' : undefined}
                        />
                      </Field>
                    </div>
                    <Field label="Tempo de residência" name="tempoResidencia">
                      <Input
                        id="tempoResidencia"
                        name="tempoResidencia"
                        value={form.tempoResidencia}
                        onChange={updateField}
                        placeholder="Ex.: 3 anos"
                      />
                    </Field>
                    <Field label="Telefone fixo" name="telefoneFixoResidencial" error={errors.telefoneFixoResidencial}>
                      <Input
                        id="telefoneFixoResidencial"
                        name="telefoneFixoResidencial"
                        value={form.telefoneFixoResidencial}
                        onChange={updateField}
                        inputMode="tel"
                        placeholder="(00) 0000-0000"
                        aria-invalid={Boolean(errors.telefoneFixoResidencial)}
                        aria-describedby={
                          errors.telefoneFixoResidencial ? 'telefoneFixoResidencial-error' : undefined
                        }
                      />
                    </Field>
                    <Field label="Telefone celular" name="celular" required error={errors.celular}>
                      <Input
                        id="celular"
                        name="celular"
                        value={form.celular}
                        onChange={updateField}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(00) 00000-0000"
                        aria-invalid={Boolean(errors.celular)}
                        aria-describedby={errors.celular ? 'celular-error' : undefined}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  value="profissionais"
                  icon={BriefcaseBusiness}
                  title="Dados profissionais"
                  subtitle="Empresa, ocupação e renda mensal"
                  badge={<SectionBadge {...sectionStatus.profissionais} />}
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Nome da empresa" name="nomeEmpresa" className="sm:col-span-2">
                      <Input
                        id="nomeEmpresa"
                        name="nomeEmpresa"
                        value={form.nomeEmpresa}
                        onChange={updateField}
                        placeholder="Razão social ou nome fantasia"
                      />
                    </Field>
                    <Field label="Cargo / Função" name="cargo">
                      <Input id="cargo" name="cargo" value={form.cargo} onChange={updateField} placeholder="Sua função" />
                    </Field>
                    <Field label="Tempo de empresa" name="tempoEmpresa">
                      <Input
                        id="tempoEmpresa"
                        name="tempoEmpresa"
                        value={form.tempoEmpresa}
                        onChange={updateField}
                        placeholder="Ex.: 2 anos"
                      />
                    </Field>
                    <Field label="Renda mensal" name="rendaMensal" hint="Usada apenas para dimensionar as parcelas.">
                      <Input
                        id="rendaMensal"
                        name="rendaMensal"
                        value={form.rendaMensal}
                        onChange={updateField}
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                      />
                    </Field>
                    <Field label="CNPJ" name="cnpjEmpresa" error={errors.cnpjEmpresa}>
                      <Input
                        id="cnpjEmpresa"
                        name="cnpjEmpresa"
                        value={form.cnpjEmpresa}
                        onChange={updateField}
                        inputMode="numeric"
                        placeholder="00.000.000/0000-00"
                        aria-invalid={Boolean(errors.cnpjEmpresa)}
                        aria-describedby={errors.cnpjEmpresa ? 'cnpjEmpresa-error' : undefined}
                      />
                    </Field>
                    <Field
                      label="CEP"
                      name="cepEmpresa"
                      error={errors.cepEmpresa}
                      hint="Preenchemos o endereço automaticamente."
                    >
                      <CepInput
                        name="cepEmpresa"
                        value={form.cepEmpresa}
                        error={errors.cepEmpresa}
                        buscando={cepBuscando.cepEmpresa}
                        onChange={updateField}
                      />
                    </Field>
                    <Field label="Número" name="numeroEmpresa">
                      <Input
                        id="numeroEmpresa"
                        name="numeroEmpresa"
                        value={form.numeroEmpresa}
                        onChange={updateField}
                        placeholder="123"
                      />
                    </Field>
                    <Field label="Endereço da empresa" name="enderecoEmpresa" className="sm:col-span-2">
                      <Input
                        id="enderecoEmpresa"
                        name="enderecoEmpresa"
                        value={form.enderecoEmpresa}
                        onChange={updateField}
                        placeholder="Rua / Avenida"
                      />
                    </Field>
                    <Field label="Bairro" name="bairroEmpresa">
                      <Input
                        id="bairroEmpresa"
                        name="bairroEmpresa"
                        value={form.bairroEmpresa}
                        onChange={updateField}
                        placeholder="Bairro"
                      />
                    </Field>
                    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4">
                      <Field label="Cidade" name="cidadeEmpresa">
                        <Input
                          id="cidadeEmpresa"
                          name="cidadeEmpresa"
                          value={form.cidadeEmpresa}
                          onChange={updateField}
                          placeholder="Cidade"
                        />
                      </Field>
                      <Field label="UF" name="ufEmpresa">
                        <Input
                          id="ufEmpresa"
                          name="ufEmpresa"
                          value={form.ufEmpresa}
                          onChange={updateField}
                          placeholder="SP"
                          maxLength={2}
                        />
                      </Field>
                    </div>
                    <Field label="Telefone fixo" name="telefoneEmpresa" error={errors.telefoneEmpresa}>
                      <Input
                        id="telefoneEmpresa"
                        name="telefoneEmpresa"
                        value={form.telefoneEmpresa}
                        onChange={updateField}
                        inputMode="tel"
                        placeholder="(00) 0000-0000"
                        aria-invalid={Boolean(errors.telefoneEmpresa)}
                        aria-describedby={errors.telefoneEmpresa ? 'telefoneEmpresa-error' : undefined}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  value="bancarios"
                  icon={Landmark}
                  title="Dados bancários"
                  subtitle="Relacionamento bancário do cliente"
                  badge={<SectionBadge {...sectionStatus.bancarios} />}
                >
                  <Alert variant="info" className="mb-5">
                    <Lock />
                    <AlertDescription>
                      <span>
                        <strong>Campos opcionais</strong> que ajudam a acelerar sua aprovação. Nunca solicitamos senhas,
                        números de cartão ou códigos de segurança.
                      </span>
                    </AlertDescription>
                  </Alert>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label="Banco" name="banco">
                      <Input
                        id="banco"
                        name="banco"
                        value={form.banco}
                        onChange={updateField}
                        placeholder="Nome ou código"
                      />
                    </Field>
                    <Field label="Agência" name="agencia">
                      <Input id="agencia" name="agencia" value={form.agencia} onChange={updateField} placeholder="0000" />
                    </Field>
                    <Field label="Conta" name="conta">
                      <Input id="conta" name="conta" value={form.conta} onChange={updateField} placeholder="00000-0" />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  value="referencias"
                  icon={UsersRound}
                  title="Referências pessoais"
                  subtitle="Duas pessoas que possam confirmar seus dados"
                  badge={<SectionBadge {...sectionStatus.referencias} />}
                >
                  <div className="flex flex-col gap-4">
                    {[
                      { numero: '01', nome: 'referencia1Nome', parentesco: 'referencia1Parentesco', telefone: 'referencia1Telefone', exemplo: 'Ex.: irmão, amigo' },
                      { numero: '02', nome: 'referencia2Nome', parentesco: 'referencia2Parentesco', telefone: 'referencia2Telefone', exemplo: 'Ex.: irmã, colega' },
                    ].map((ref) => (
                      <div key={ref.numero} className="relative rounded-xl border border-border bg-secondary/40 p-5 pt-8">
                        <span className="absolute -top-3 left-5 rounded-md bg-brand-strong px-2.5 py-1 text-[0.7rem] font-bold text-white">
                          {ref.numero}
                        </span>
                        <div className="grid gap-5 sm:grid-cols-3">
                          <Field label="Nome" name={ref.nome}>
                            <Input
                              id={ref.nome}
                              name={ref.nome}
                              value={form[ref.nome]}
                              onChange={updateField}
                              placeholder="Nome completo"
                            />
                          </Field>
                          <Field label="Parentesco" name={ref.parentesco}>
                            <Input
                              id={ref.parentesco}
                              name={ref.parentesco}
                              value={form[ref.parentesco]}
                              onChange={updateField}
                              placeholder={ref.exemplo}
                            />
                          </Field>
                          <Field label="Telefone" name={ref.telefone} error={errors[ref.telefone]}>
                            <Input
                              id={ref.telefone}
                              name={ref.telefone}
                              value={form[ref.telefone]}
                              onChange={updateField}
                              inputMode="tel"
                              placeholder="(00) 00000-0000"
                              aria-invalid={Boolean(errors[ref.telefone])}
                              aria-describedby={errors[ref.telefone] ? `${ref.telefone}-error` : undefined}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </FormSection>
              </Accordion>

              <Card className={errors.consentimento ? 'border-destructive/60' : ''}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-2.5 font-bold">
                    <ShieldCheck className="size-5 text-brand-strong" aria-hidden="true" />
                    Privacidade e proteção de dados
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-brand/40">
                    <Checkbox
                      id="consentimento"
                      name="consentimento"
                      className="mt-0.5"
                      checked={form.consentimento}
                      onCheckedChange={(marcado) => setField('consentimento', marcado === true)}
                      aria-invalid={Boolean(errors.consentimento)}
                      aria-describedby={errors.consentimento ? 'consentimento-error' : undefined}
                    />
                    <span className="text-[0.9rem] leading-relaxed">
                      {CONSENT_TEXT}
                      <strong className="text-destructive"> *</strong>
                    </span>
                  </label>

                  {errors.consentimento && (
                    <span className="text-xs font-semibold text-destructive" id="consentimento-error">
                      {errors.consentimento}
                    </span>
                  )}

                  <details className="group rounded-xl border border-border px-4 py-3 text-[0.88rem]">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-brand-strong marker:hidden">
                      <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                      Como tratamos seus dados
                    </summary>
                    <ul className="mt-3 flex flex-col gap-2 pl-6 text-muted-foreground">
                      <li className="list-disc leading-relaxed">
                        <strong className="text-foreground">Finalidade:</strong> análise de crédito e simulação de
                        financiamento — nada além disso.
                      </li>
                      <li className="list-disc leading-relaxed">
                        <strong className="text-foreground">Quem acessa:</strong> apenas a equipe da Lopes Multimarcas e
                        as instituições financeiras parceiras envolvidas na sua análise.
                      </li>
                      <li className="list-disc leading-relaxed">
                        <strong className="text-foreground">Armazenamento:</strong> dados guardados em ambiente seguro,
                        com acesso restrito.
                      </li>
                      <li className="list-disc leading-relaxed">
                        <strong className="text-foreground">Seus direitos:</strong> você pode solicitar a atualização ou
                        a exclusão dos seus dados a qualquer momento pelos canais de atendimento da loja.
                      </li>
                    </ul>
                  </details>
                </CardContent>
              </Card>

              {notice && (
                <Alert variant={status === 'error' ? 'destructive' : 'warning'}>
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              )}

              {/* Opaco de propósito: fica sobre o conteúdo do formulário ao rolar. */}
              <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-lift">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={resetForm}
                  disabled={!isDirty || status === 'submitting'}
                >
                  <RefreshCcw /> Limpar
                </Button>
                <Button variant="brand" size="lg" type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? <LoaderCircle className="animate-spin" /> : <Send />}
                  {status === 'submitting' ? 'Validando...' : 'Enviar para análise'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#0b0f14]/85">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center gap-4 px-5 py-10 text-center sm:px-8">
          <img className="h-9 w-auto opacity-90" src={`${ASSET}lopes-multimarcas-logo.png`} alt="Lopes Multimarcas" />
          <span className="max-w-[62ch] text-[0.84rem] leading-relaxed text-white/55">
            Ficha cadastral para simulação de financiamento. Dados tratados conforme a LGPD (Lei nº 13.709/2018).
          </span>
        </div>
      </footer>

      <Dialog open={reviewOpen} onOpenChange={(aberto) => status !== 'submitting' && setReviewOpen(aberto)}>
        <DialogContent showCloseButton={status !== 'submitting'}>
          <DialogHeader>
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-strong ring-1 ring-brand/20">
                <FileCheck2 className="size-6" />
              </span>
              <div>
                <span className="text-[0.72rem] font-bold tracking-[0.16em] text-brand-strong uppercase">
                  Conferência final
                </span>
                <DialogTitle className="mt-0.5">Confirme os dados principais</DialogTitle>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Revise os dados principais antes de enviar a ficha para análise.
            </DialogDescription>
          </DialogHeader>

          <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {reviewItems.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 odd:bg-secondary/40">
                <dt className="text-[0.8rem] font-bold text-muted-foreground">{label}</dt>
                <dd className="truncate text-right text-[0.92rem] font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <Alert variant="info">
            <ShieldCheck />
            <AlertDescription>Os dados serão enviados somente após sua confirmação.</AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setReviewOpen(false)}
              disabled={status === 'submitting'}
            >
              Voltar e editar
            </Button>
            <Button
              ref={confirmButtonRef}
              variant="brand"
              type="button"
              onClick={performSubmit}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? <LoaderCircle className="animate-spin" /> : <Send />}
              {status === 'submitting' ? 'Enviando...' : 'Confirmar e enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
