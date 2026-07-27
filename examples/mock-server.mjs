import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const MAX_BODY_BYTES = 100_000;

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  response.end(statusCode === 204 ? undefined : JSON.stringify(data));
}

function isValidPayload(payload) {
  return Boolean(
    payload?.cliente?.cpf &&
      payload?.cliente?.dataNascimento &&
      payload?.residencia?.celular &&
      payload?.consentimento?.autorizado,
  );
}

const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method !== 'POST' || request.url !== '/propostas') {
    sendJson(response, 404, { mensagem: 'Rota não encontrada.' });
    return;
  }

  let body = '';
  let receivedBytes = 0;
  let bodyTooLarge = false;

  request.on('data', (chunk) => {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_BODY_BYTES) {
      bodyTooLarge = true;
      return;
    }
    body += chunk;
  });

  request.on('end', () => {
    if (bodyTooLarge) {
      sendJson(response, 413, { mensagem: 'Payload muito grande.' });
      return;
    }

    try {
      const payload = JSON.parse(body);

      if (!isValidPayload(payload)) {
        sendJson(response, 422, { mensagem: 'Campos obrigatórios ausentes.' });
        return;
      }

      // Demonstração: não persiste nem imprime dados pessoais no terminal.
      const protocolo = `LM-${randomUUID().slice(0, 8).toUpperCase()}`;
      sendJson(response, 201, {
        protocolo,
        status: 'recebida',
      });
    } catch {
      sendJson(response, 400, { mensagem: 'JSON inválido.' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Mock da Lopes Multimarcas disponível em http://localhost:${PORT}/propostas`);
});
