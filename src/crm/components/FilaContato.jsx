import { MessageCircle, PhoneCall } from 'lucide-react';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';

import { esperaInfo, nomeDa } from '../lib/format.js';
import { filaDeContato, linkWhatsApp, nomeCurtoCarro, preencher, sugerirModelo } from '../lib/whatsapp.js';
import { EsperaPill, StatusPill } from './Pills.jsx';
import { registrarEnvio, useModelosMensagem } from './EnviarWhatsApp.jsx';

const LIMITE = 8;

const motivo = (ficha) => {
  if (ficha.status === 'novo') return 'Lead novo, responder rápido';
  if (ficha.status === 'aprovado') return 'Aprovado, falta fechar';
  return `Parado há ${esperaInfo(ficha).dias} dias`;
};

/** Quem precisa de contato hoje, com a mensagem certa a um clique. */
export default function FilaContato({ fichas, api, onAtualizar, onAbrirFicha }) {
  const { modelos } = useModelosMensagem(api);
  const fila = filaDeContato(fichas);

  if (fila.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PhoneCall className="size-4 text-brand-strong dark:text-brand" /> Para contatar hoje
        </CardTitle>
        <span className="text-[0.8rem] text-muted-foreground">
          {fila.length} ficha{fila.length === 1 ? '' : 's'}
          {fila.length > LIMITE ? `, mostrando as ${LIMITE} mais urgentes` : ''}
        </span>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <ul className="divide-y divide-border">
          {fila.slice(0, LIMITE).map((ficha) => {
            const modelo = modelos.find((m) => m.id === sugerirModelo(ficha)) || modelos[0];
            const link = linkWhatsApp(ficha.celular, preencher(modelo.texto, ficha));
            const carro = nomeCurtoCarro(ficha.veiculo?.nome || ficha.dados?.veiculoInteresse?.nome);
            return (
              <li key={ficha.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
                <button
                  type="button"
                  onClick={() => onAbrirFicha(ficha.id)}
                  className="min-w-[12rem] flex-1 text-left outline-none focus-visible:underline"
                >
                  <strong className="block truncate text-[0.92rem] font-semibold">{nomeDa(ficha)}</strong>
                  <small className="text-[0.78rem] text-muted-foreground">
                    {[motivo(ficha), carro, ficha.origem === 'meta-ads' && 'Meta Ads'].filter(Boolean).join(' · ')}
                  </small>
                </button>
                <div className="flex items-center gap-2">
                  <StatusPill status={ficha.status} />
                  <EsperaPill ficha={ficha} />
                </div>
                {link && (
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    title={`Mensagem: ${modelo.titulo}`}
                    className="text-emerald-700 dark:text-emerald-300"
                  >
                    <a href={link} target="_blank" rel="noreferrer" onClick={() => registrarEnvio({ ficha, modelo, api, onAtualizar })}>
                      <MessageCircle /> {modelo.titulo}
                    </a>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
