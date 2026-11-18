import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MessageCircle, PencilLine, RotateCcw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { cn } from '@/lib/utils.js';

import {
  MODELOS_PADRAO,
  VARIAVEIS,
  linkWhatsApp,
  mesclarModelos,
  preencher,
  sugerirModelo,
  variaveisSemDado,
} from '../lib/whatsapp.js';

/*
  Modelos carregados uma vez e compartilhados entre as telas. O cache é preso à
  instância de api: ao sair, entrar com outra conta ou deixar o modo
  demonstração, o CRM recria a api e os modelos são buscados de novo — senão a
  sessão anterior continuaria valendo até alguém recarregar a página.
*/
let cacheApi = null;
let cacheModelos = null;
const ouvintes = new Set();

export function useModelosMensagem(api) {
  const [modelos, setModelos] = useState(() => (cacheApi === api && cacheModelos) || MODELOS_PADRAO);

  useEffect(() => {
    ouvintes.add(setModelos);
    if (api && cacheApi !== api) {
      cacheApi = api;
      cacheModelos = null;
      setModelos(MODELOS_PADRAO);
      api
        .lerModelosMensagem()
        .then((salvos) => {
          // Outra api assumiu enquanto a busca corria: descarta o resultado.
          if (cacheApi !== api) return;
          cacheModelos = mesclarModelos(salvos);
          ouvintes.forEach((ouvir) => ouvir(cacheModelos));
        })
        .catch(() => {});
    }
    return () => ouvintes.delete(setModelos);
  }, [api]);

  const salvar = async (novos) => {
    await api.salvarModelosMensagem(novos);
    cacheModelos = novos;
    ouvintes.forEach((ouvir) => ouvir(novos));
  };

  return { modelos, salvar };
}

/**
 * Depois do envio: registra no follow-up e, se a ficha ainda era nova,
 * passa para "Contatado" — o funil anda sozinho.
 */
export async function registrarEnvio({ ficha, modelo, api, onAtualizar }) {
  await api
    .addFollowup({
      proposta_id: ficha.id,
      nota: `WhatsApp enviado: ${modelo.titulo}`,
      status_anterior: null,
      status_novo: null,
    })
    .catch(() => {});
  if (ficha.status === 'novo' && onAtualizar) {
    await onAtualizar(ficha.id, { status: 'contatado' }).catch(() => {});
    await api
      .addFollowup({ proposta_id: ficha.id, nota: null, status_anterior: 'novo', status_novo: 'contatado' })
      .catch(() => {});
  }
}

export default function EnviarWhatsApp({ ficha, api, onAtualizar, onEnviado }) {
  const { modelos, salvar } = useModelosMensagem(api);
  const sugerido = sugerirModelo(ficha);
  const [modeloId, setModeloId] = useState(sugerido);
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [aviso, setAviso] = useState('');

  const modelo = modelos.find((m) => m.id === modeloId) || modelos[0];

  /*
    Remonta o texto com os dados atuais da ficha, mas nunca por cima do que o
    vendedor escreveu: a ficha é recriada a cada recarregar() da lista (um lead
    novo chegando, por exemplo), e sem essa trava a mensagem em digitação seria
    descartada sozinha. Trocar de modelo ou abrir outra ficha reabre a edição.
  */
  const editouTexto = useRef(false);

  useEffect(() => {
    if (editouTexto.current) return;
    setTexto(preencher(modelo.texto, ficha));
  }, [modelo, ficha]);

  useEffect(() => {
    editouTexto.current = false;
    setTexto(preencher(modelo.texto, ficha));
    // Só quando muda o modelo escolhido ou a ficha aberta.
  }, [modelo.id, ficha.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setModeloId(sugerirModelo(ficha));
  }, [ficha.id, ficha.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const semDado = useMemo(() => variaveisSemDado(modelo.texto, ficha), [modelo, ficha]);
  const link = linkWhatsApp(ficha.celular, texto);

  const aoEnviar = async () => {
    await registrarEnvio({ ficha, modelo, api, onAtualizar });
    setAviso(ficha.status === 'novo' ? 'Envio registrado. Ficha movida para Contatado.' : 'Envio registrado no follow-up.');
    setTimeout(() => setAviso(''), 3000);
    onEnviado?.();
  };

  const abrirEdicao = () => {
    setRascunho(modelo.texto);
    setEditando(true);
  };

  const salvarModelo = async () => {
    const novos = modelos.map((m) => (m.id === modelo.id ? { ...m, texto: rascunho.trim() } : m));
    await salvar(novos);
    setEditando(false);
  };

  const restaurarPadrao = () => {
    const padrao = MODELOS_PADRAO.find((m) => m.id === modelo.id);
    if (padrao) setRascunho(padrao.texto);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de mensagem">
        {modelos.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={m.id === modelo.id}
            onClick={() => {
              setModeloId(m.id);
              setEditando(false);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8rem] font-semibold transition-colors outline-none',
              'focus-visible:ring-[3px] focus-visible:ring-brand/35',
              m.id === modelo.id
                ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                : 'border-border text-muted-foreground hover:bg-secondary',
            )}
          >
            {m.id === sugerido && <Sparkles className="size-3.5" aria-label="Sugerido para esta ficha" />}
            {m.titulo}
          </button>
        ))}
      </div>

      {editando ? (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <span className="text-[0.8rem] font-semibold">Modelo “{modelo.titulo}” (vale para todas as fichas)</span>
          <Textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={4} />
          <div className="flex flex-wrap gap-1.5">
            {VARIAVEIS.map(([variavel, descricao]) => (
              <button
                key={variavel}
                type="button"
                title={descricao}
                onClick={() => setRascunho((atual) => `${atual}${atual.endsWith(' ') ? '' : ' '}${variavel}`)}
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.74rem] text-muted-foreground hover:bg-secondary"
              >
                {variavel}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={restaurarPadrao}>
              <RotateCcw /> Texto original
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvarModelo} disabled={!rascunho.trim()}>
              Salvar modelo
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Textarea
            value={texto}
            onChange={(e) => {
              editouTexto.current = true;
              setTexto(e.target.value);
            }}
            rows={4}
            aria-label="Mensagem que será enviada"
          />
          {semDado.length > 0 && (
            <p className="text-[0.76rem] text-amber-700 dark:text-amber-300">
              Sem {semDado.join(', ')} nesta ficha: a mensagem usa um texto neutro no lugar. Preencha a negociação ou ajuste o texto acima.
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!editando && (
          <Button variant="ghost" size="sm" onClick={abrirEdicao}>
            <PencilLine /> Editar modelo
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {aviso && (
            <span className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="size-4" /> {aviso}
            </span>
          )}
          {link ? (
            <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={link} target="_blank" rel="noreferrer" onClick={aoEnviar}>
                <MessageCircle /> Abrir no WhatsApp
              </a>
            </Button>
          ) : (
            <span className="text-[0.8rem] text-muted-foreground">Ficha sem celular válido.</span>
          )}
        </div>
      </div>
    </div>
  );
}
