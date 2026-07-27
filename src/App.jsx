import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  BriefcaseBusiness,
  Building2,
  CarFront,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  Landmark,
  LoaderCircle,
  MapPinHouse,
  RefreshCcw,
  Send,
  ShieldCheck,
  UserRound,
  X,
  UsersRound,
} from 'lucide-react';

import { submitProposal } from './services/proposalApi.js';
import {
  buildProposalPayload,
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskCurrency,
  maskPhone,
  onlyDigits,
  validateCNPJ,
  validateCPF,
} from './utils/form.js';


const initialForm = {
  nome: '',
  rg: '',
  cpf: '',
  estadoCivil: '',
  dataNascimento: '',
  nomeMae: '',
  nomePai: '',
  ufNascimento: '',
  email: '',
  temCnh: '',

  ruaResidencial: '',
  numeroResidencial: '',
  bairroResidencial: '',
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

const requiredFields = [
  'cpf',
  'dataNascimento',
  'temCnh',
  'celular',
  'consentimento',
];

function Field({ label, name, required, error, className = '', children, ...props }) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={name}>
        {label} {required && <span className="required">*</span>}
      </label>
      {children || (
        <input
          id={name}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
      )}
      {error && (
        <span className="field-error" id={`${name}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`form-section ${open ? 'is-open' : ''}`}>
      <button
        className="section-heading"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="section-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <span className="section-heading-copy">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
        <ChevronDown className="section-chevron" size={20} />
      </button>
      <div className="section-content">{children}</div>
    </section>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [result, setResult] = useState(null);
  const confirmButtonRef = useRef(null);

  const progress = useMemo(() => {
    const completed = requiredFields.filter((field) => Boolean(form[field])).length;
    return Math.round((completed / requiredFields.length) * 100);
  }, [form]);

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
    if (!reviewOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmButtonRef.current?.focus();

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && status !== 'submitting') setReviewOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [reviewOpen, status]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    let nextValue = type === 'checkbox' ? checked : value;

    if (name === 'cpf') nextValue = maskCPF(value);
    if (name === 'cnpjEmpresa') nextValue = maskCNPJ(value);
    if (['cepResidencial', 'cepEmpresa'].includes(name)) nextValue = maskCEP(value);
    if (
      ['telefoneFixoResidencial', 'celular', 'telefoneEmpresa', 'referencia1Telefone', 'referencia2Telefone'].includes(name)
    ) {
      nextValue = maskPhone(value);
    }
    if (name === 'rendaMensal') nextValue = maskCurrency(value);
    if (name === 'ufNascimento') nextValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);

    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setNotice('');

    if (status === 'success' || status === 'error') {
      setStatus('idle');
      setResult(null);
    }
  };

  const validate = () => {
    const nextErrors = {};

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

    ['cepResidencial', 'cepEmpresa'].forEach((field) => {
      if (form[field] && onlyDigits(form[field]).length !== 8) nextErrors[field] = 'CEP incompleto.';
    });

    ['telefoneFixoResidencial', 'telefoneEmpresa', 'referencia1Telefone', 'referencia2Telefone'].forEach((field) => {
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
    setReviewOpen(false);
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
        setResult({ protocolo: `LM-${Date.now().toString().slice(-10)}`, modoDemonstracao: true });
        setStatus('success');
        setReviewOpen(false);
        return;
      }

      const response = await submitProposal(buildProposalPayload(form));
      setResult(response);
      setStatus('success');
      setNotice(
        response.modoDemonstracao
          ? 'Ficha validada em modo de demonstração. Configure a API para realizar o envio real.'
          : 'Ficha enviada com sucesso para análise.',
      );
      setReviewOpen(false);
    } catch (error) {
      setStatus('error');
      setNotice(error.message || 'Não foi possível enviar a ficha. Tente novamente.');
      setReviewOpen(false);
    }
  };

  const reviewItems = [
    ['Cliente', form.nome || 'Não informado'],
    ['CPF', form.cpf],
    ['Nascimento', form.dataNascimento.split('-').reverse().join('/')],
    ['Celular', form.celular],
    ['E-mail', form.email || 'Não informado'],
    ['CNH', form.temCnh],
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Lopes Multimarcas">
          <span className="brand-mark"><CarFront size={28} /></span>
          <span>
            <strong>LOPES</strong>
            <small>MULTIMARCAS</small>
          </span>
        </a>
        <span className="secure-label"><ShieldCheck size={17} /> Ambiente seguro</span>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">Simulação de financiamento</span>
            <h1>Sua próxima conquista começa aqui.</h1>
            <p>
              Preencha seus dados para que nossa equipe encontre as melhores condições de financiamento para o seu veículo.
            </p>
            <div className="hero-trust">
              <span><BadgeCheck size={17} /> Análise personalizada</span>
              <span><ShieldCheck size={17} /> Dados protegidos</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <CarFront size={118} strokeWidth={1.35} />
          </div>
        </section>

        <div className="content-grid">
          <aside className="sidebar-card">
            <span className="sidebar-kicker">Progresso da ficha</span>
            <strong className="progress-value">{progress}%</strong>
            <div className="progress-track" aria-label={`${progress}% preenchido`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>Os campos marcados com <strong>*</strong> são obrigatórios.</p>
            <div className="sidebar-divider" />
            <h2>Antes de começar</h2>
            <p>Tenha em mãos seus documentos pessoais, dados de residência e informações profissionais.</p>
            <div className="security-box">
              <ShieldCheck size={22} />
              <div>
                <strong>Privacidade em primeiro lugar</strong>
                <span>Use HTTPS e envie os dados somente para serviços autorizados.</span>
              </div>
            </div>
          </aside>

          <form className="form-card" onSubmit={handleSubmit} noValidate>
            <div className="form-intro">
              <div>
                <span className="eyebrow dark">Ficha cadastral</span>
                <h2>Conte um pouco sobre você</h2>
              </div>
              <span className="form-badge"><CircleDollarSign size={18} /> Financiamento</span>
            </div>

            <div className="honeypot" aria-hidden="true">
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

            <Section
              icon={UserRound}
              title="Dados pessoais"
              subtitle="Informações de identificação do cliente"
            >
              <div className="fields-grid">
                <Field label="Nome completo" name="nome" className="span-2">
                  <input id="nome" name="nome" value={form.nome} onChange={updateField} autoComplete="name" placeholder="Digite seu nome completo" />
                </Field>
                <Field label="RG" name="rg">
                  <input id="rg" name="rg" value={form.rg} onChange={updateField} placeholder="00.000.000-0" />
                </Field>
                <Field label="CPF" name="cpf" required error={errors.cpf}>
                  <input id="cpf" name="cpf" value={form.cpf} onChange={updateField} inputMode="numeric" placeholder="000.000.000-00" aria-invalid={Boolean(errors.cpf)} aria-describedby={errors.cpf ? 'cpf-error' : undefined} />
                </Field>
                <Field label="Estado civil" name="estadoCivil">
                  <select id="estadoCivil" name="estadoCivil" value={form.estadoCivil} onChange={updateField}>
                    <option value="">Selecione</option>
                    <option>Solteiro(a)</option>
                    <option>Casado(a)</option>
                    <option>União estável</option>
                    <option>Divorciado(a)</option>
                    <option>Viúvo(a)</option>
                    <option>Outro</option>
                  </select>
                </Field>
                <Field label="Data de nascimento" name="dataNascimento" required error={errors.dataNascimento}>
                  <input id="dataNascimento" name="dataNascimento" type="date" max={maxBirthDate} value={form.dataNascimento} onChange={updateField} aria-invalid={Boolean(errors.dataNascimento)} aria-describedby={errors.dataNascimento ? 'dataNascimento-error' : undefined} />
                </Field>
                <Field label="Nome da mãe" name="nomeMae" className="span-2">
                  <input id="nomeMae" name="nomeMae" value={form.nomeMae} onChange={updateField} placeholder="Nome completo" />
                </Field>
                <Field label="Nome do pai" name="nomePai" className="span-2">
                  <input id="nomePai" name="nomePai" value={form.nomePai} onChange={updateField} placeholder="Nome completo" />
                </Field>
                <Field label="UF de nascimento" name="ufNascimento">
                  <input id="ufNascimento" name="ufNascimento" value={form.ufNascimento} onChange={updateField} placeholder="SP" maxLength={2} />
                </Field>
                <Field label="E-mail" name="email" error={errors.email} className="span-2">
                  <input id="email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" placeholder="voce@exemplo.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
                </Field>
                <Field label="Possui CNH?" name="temCnh" required error={errors.temCnh} className="span-2">
                  <div className="choice-group" role="radiogroup" aria-label="Possui CNH?" aria-invalid={Boolean(errors.temCnh)} aria-describedby={errors.temCnh ? 'temCnh-error' : undefined}>
                    {['Sim', 'Não'].map((option) => (
                      <label className={`choice-card ${form.temCnh === option ? 'selected' : ''}`} key={option}>
                        <input type="radio" name="temCnh" value={option} checked={form.temCnh === option} onChange={updateField} aria-invalid={Boolean(errors.temCnh)} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </Section>

            <Section
              icon={MapPinHouse}
              title="Dados residenciais"
              subtitle="Endereço e formas de contato"
            >
              <div className="fields-grid">
                <Field label="Rua / Avenida" name="ruaResidencial" className="span-2">
                  <input id="ruaResidencial" name="ruaResidencial" value={form.ruaResidencial} onChange={updateField} autoComplete="street-address" placeholder="Nome da rua" />
                </Field>
                <Field label="Número" name="numeroResidencial">
                  <input id="numeroResidencial" name="numeroResidencial" value={form.numeroResidencial} onChange={updateField} placeholder="123" />
                </Field>
                <Field label="Bairro" name="bairroResidencial">
                  <input id="bairroResidencial" name="bairroResidencial" value={form.bairroResidencial} onChange={updateField} placeholder="Bairro" />
                </Field>
                <Field label="CEP" name="cepResidencial" error={errors.cepResidencial}>
                  <input id="cepResidencial" name="cepResidencial" value={form.cepResidencial} onChange={updateField} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" aria-invalid={Boolean(errors.cepResidencial)} aria-describedby={errors.cepResidencial ? 'cepResidencial-error' : undefined} />
                </Field>
                <Field label="Tempo de residência" name="tempoResidencia">
                  <input id="tempoResidencia" name="tempoResidencia" value={form.tempoResidencia} onChange={updateField} placeholder="Ex.: 3 anos" />
                </Field>
                <Field label="Telefone fixo" name="telefoneFixoResidencial" error={errors.telefoneFixoResidencial}>
                  <input id="telefoneFixoResidencial" name="telefoneFixoResidencial" value={form.telefoneFixoResidencial} onChange={updateField} inputMode="tel" placeholder="(00) 0000-0000" aria-invalid={Boolean(errors.telefoneFixoResidencial)} aria-describedby={errors.telefoneFixoResidencial ? 'telefoneFixoResidencial-error' : undefined} />
                </Field>
                <Field label="Telefone celular" name="celular" required error={errors.celular}>
                  <input id="celular" name="celular" value={form.celular} onChange={updateField} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" aria-invalid={Boolean(errors.celular)} aria-describedby={errors.celular ? 'celular-error' : undefined} />
                </Field>
              </div>
            </Section>

            <Section
              icon={BriefcaseBusiness}
              title="Dados profissionais"
              subtitle="Empresa, ocupação e renda mensal"
              defaultOpen={false}
            >
              <div className="fields-grid">
                <Field label="Nome da empresa" name="nomeEmpresa" className="span-2">
                  <input id="nomeEmpresa" name="nomeEmpresa" value={form.nomeEmpresa} onChange={updateField} placeholder="Razão social ou nome fantasia" />
                </Field>
                <Field label="Cargo / Função" name="cargo">
                  <input id="cargo" name="cargo" value={form.cargo} onChange={updateField} placeholder="Sua função" />
                </Field>
                <Field label="Tempo de empresa" name="tempoEmpresa">
                  <input id="tempoEmpresa" name="tempoEmpresa" value={form.tempoEmpresa} onChange={updateField} placeholder="Ex.: 2 anos" />
                </Field>
                <Field label="Renda mensal" name="rendaMensal">
                  <input id="rendaMensal" name="rendaMensal" value={form.rendaMensal} onChange={updateField} inputMode="numeric" placeholder="R$ 0,00" />
                </Field>
                <Field label="CNPJ" name="cnpjEmpresa" error={errors.cnpjEmpresa}>
                  <input id="cnpjEmpresa" name="cnpjEmpresa" value={form.cnpjEmpresa} onChange={updateField} inputMode="numeric" placeholder="00.000.000/0000-00" aria-invalid={Boolean(errors.cnpjEmpresa)} aria-describedby={errors.cnpjEmpresa ? 'cnpjEmpresa-error' : undefined} />
                </Field>
                <Field label="Endereço da empresa" name="enderecoEmpresa" className="span-2">
                  <input id="enderecoEmpresa" name="enderecoEmpresa" value={form.enderecoEmpresa} onChange={updateField} placeholder="Rua / Avenida" />
                </Field>
                <Field label="Número" name="numeroEmpresa">
                  <input id="numeroEmpresa" name="numeroEmpresa" value={form.numeroEmpresa} onChange={updateField} placeholder="123" />
                </Field>
                <Field label="Bairro" name="bairroEmpresa">
                  <input id="bairroEmpresa" name="bairroEmpresa" value={form.bairroEmpresa} onChange={updateField} placeholder="Bairro" />
                </Field>
                <Field label="CEP" name="cepEmpresa" error={errors.cepEmpresa}>
                  <input id="cepEmpresa" name="cepEmpresa" value={form.cepEmpresa} onChange={updateField} inputMode="numeric" placeholder="00000-000" aria-invalid={Boolean(errors.cepEmpresa)} aria-describedby={errors.cepEmpresa ? 'cepEmpresa-error' : undefined} />
                </Field>
                <Field label="Telefone fixo" name="telefoneEmpresa" error={errors.telefoneEmpresa}>
                  <input id="telefoneEmpresa" name="telefoneEmpresa" value={form.telefoneEmpresa} onChange={updateField} inputMode="tel" placeholder="(00) 0000-0000" aria-invalid={Boolean(errors.telefoneEmpresa)} aria-describedby={errors.telefoneEmpresa ? 'telefoneEmpresa-error' : undefined} />
                </Field>
              </div>
            </Section>

            <Section
              icon={Landmark}
              title="Dados bancários"
              subtitle="Relacionamento bancário do cliente"
              defaultOpen={false}
            >
              <div className="fields-grid three-columns">
                <Field label="Banco" name="banco">
                  <input id="banco" name="banco" value={form.banco} onChange={updateField} placeholder="Nome ou código" />
                </Field>
                <Field label="Agência" name="agencia">
                  <input id="agencia" name="agencia" value={form.agencia} onChange={updateField} placeholder="0000" />
                </Field>
                <Field label="Conta" name="conta">
                  <input id="conta" name="conta" value={form.conta} onChange={updateField} placeholder="00000-0" />
                </Field>
              </div>
            </Section>

            <Section
              icon={UsersRound}
              title="Referências pessoais"
              subtitle="Duas pessoas que possam confirmar seus dados"
              defaultOpen={false}
            >
              <div className="reference-card">
                <span className="reference-number">01</span>
                <div className="fields-grid three-columns">
                  <Field label="Nome" name="referencia1Nome">
                    <input id="referencia1Nome" name="referencia1Nome" value={form.referencia1Nome} onChange={updateField} placeholder="Nome completo" />
                  </Field>
                  <Field label="Parentesco" name="referencia1Parentesco">
                    <input id="referencia1Parentesco" name="referencia1Parentesco" value={form.referencia1Parentesco} onChange={updateField} placeholder="Ex.: irmão, amigo" />
                  </Field>
                  <Field label="Telefone" name="referencia1Telefone" error={errors.referencia1Telefone}>
                    <input id="referencia1Telefone" name="referencia1Telefone" value={form.referencia1Telefone} onChange={updateField} inputMode="tel" placeholder="(00) 00000-0000" aria-invalid={Boolean(errors.referencia1Telefone)} aria-describedby={errors.referencia1Telefone ? 'referencia1Telefone-error' : undefined} />
                  </Field>
                </div>
              </div>
              <div className="reference-card">
                <span className="reference-number">02</span>
                <div className="fields-grid three-columns">
                  <Field label="Nome" name="referencia2Nome">
                    <input id="referencia2Nome" name="referencia2Nome" value={form.referencia2Nome} onChange={updateField} placeholder="Nome completo" />
                  </Field>
                  <Field label="Parentesco" name="referencia2Parentesco">
                    <input id="referencia2Parentesco" name="referencia2Parentesco" value={form.referencia2Parentesco} onChange={updateField} placeholder="Ex.: irmã, colega" />
                  </Field>
                  <Field label="Telefone" name="referencia2Telefone" error={errors.referencia2Telefone}>
                    <input id="referencia2Telefone" name="referencia2Telefone" value={form.referencia2Telefone} onChange={updateField} inputMode="tel" placeholder="(00) 00000-0000" aria-invalid={Boolean(errors.referencia2Telefone)} aria-describedby={errors.referencia2Telefone ? 'referencia2Telefone-error' : undefined} />
                  </Field>
                </div>
              </div>
            </Section>

            <div className={`consent-card ${errors.consentimento ? 'has-error' : ''}`}>
              <label>
                <input type="checkbox" name="consentimento" checked={form.consentimento} onChange={updateField} aria-invalid={Boolean(errors.consentimento)} aria-describedby={errors.consentimento ? 'consentimento-error' : undefined} />
                <span>
                  Autorizo o tratamento dos dados informados para análise e simulação de financiamento junto a instituições financeiras.
                  <strong> *</strong>
                </span>
              </label>
              {errors.consentimento && <span className="field-error" id="consentimento-error">{errors.consentimento}</span>}
            </div>

            {status === 'success' && result && (
              <div className="success-card" role="status">
                <span className="success-icon"><CheckCircle2 size={25} /></span>
                <div>
                  <strong>Ficha processada</strong>
                  <span>Protocolo: <b>{result.protocolo}</b></span>
                </div>
              </div>
            )}

            {notice && (
              <div className={`notice ${status === 'success' ? 'success' : status === 'error' ? 'error' : ''}`} role="status">
                {notice}
              </div>
            )}

            <div className="form-actions">
              <button className="button button-ghost" type="button" onClick={resetForm} disabled={!isDirty || status === 'submitting'}>
                <RefreshCcw size={18} /> Limpar
              </button>
              <button className="button button-primary" type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? <LoaderCircle className="spin" size={19} /> : <Send size={19} />}
                {status === 'submitting' ? 'Validando...' : 'Enviar para análise'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer>
        <div className="footer-brand"><Building2 size={18} /> Lopes Multimarcas</div>
        <span>Ficha cadastral para simulação de financiamento.</span>
      </footer>

      {reviewOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && status !== 'submitting') setReviewOpen(false);
          }}
        >
          <div className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
            <div className="modal-heading">
              <span className="modal-icon"><FileCheck2 size={25} /></span>
              <div>
                <span className="eyebrow dark">Conferência final</span>
                <h2 id="review-title">Confirme os dados principais</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setReviewOpen(false)}
                disabled={status === 'submitting'}
                aria-label="Fechar conferência"
              >
                <X size={20} />
              </button>
            </div>

            <dl className="review-list">
              {reviewItems.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="modal-security">
              <ShieldCheck size={19} />
              <span>Os dados serão enviados somente após sua confirmação.</span>
            </div>

            <div className="modal-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setReviewOpen(false)}
                disabled={status === 'submitting'}
              >
                Voltar e editar
              </button>
              <button
                ref={confirmButtonRef}
                className="button button-primary"
                type="button"
                onClick={performSubmit}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? <LoaderCircle className="spin" size={19} /> : <Send size={19} />}
                {status === 'submitting' ? 'Enviando...' : 'Confirmar e enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
