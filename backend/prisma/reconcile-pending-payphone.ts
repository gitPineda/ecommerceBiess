import { config as loadEnv } from 'dotenv';
import { request as httpsRequest } from 'node:https';
import { resolve } from 'node:path';
import { Client } from 'pg';

type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_CANCELED'
  | 'PAYMENT_FAILED';

type PayphoneTransactionResponse = Record<string, unknown>;

type PendingOrderRow = {
  id: string;
  status: OrderStatus;
  userId: string;
  userEmail: string;
  paymentApprovedAt: Date | null;
  payphoneClientTransactionId: string | null;
  payphoneTransactionId: string | null;
  payphoneTransactionStatus: string | null;
  payphoneStatusCode: number | null;
  payphoneAuthorizationCode: string | null;
  payphoneMessage: string | null;
  payphoneMessageCode: number | null;
  payphoneResponse: unknown;
};

function readString(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
}

function normalizeApiBaseUrl(rawBaseUrl: string) {
  const normalized = rawBaseUrl.trim().replace(/\/+$/, '');

  if (/\/api\/sale$/i.test(normalized)) {
    return normalized.replace(/\/sale$/i, '');
  }

  return normalized;
}

function normalizeTransactionResponse(payload: unknown): PayphoneTransactionResponse | null {
  if (Array.isArray(payload)) {
    const firstEntry = payload.find(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        !Array.isArray(entry),
    );

    return firstEntry ? (firstEntry as PayphoneTransactionResponse) : null;
  }

  if (payload && typeof payload === 'object') {
    return payload as PayphoneTransactionResponse;
  }

  if (typeof payload === 'string' && payload.trim()) {
    try {
      return normalizeTransactionResponse(JSON.parse(payload));
    } catch {
      return null;
    }
  }

  return null;
}

function resolvePayphoneOrderStatus(response: PayphoneTransactionResponse): OrderStatus {
  const statusCode = readNumber(response.statusCode);
  const transactionStatus = readString(response.transactionStatus).toLowerCase().trim();
  const messageCode = readNumber(response.messageCode);

  if (statusCode === 3 || transactionStatus === 'approved') {
    return 'PAYMENT_APPROVED';
  }

  if (
    statusCode === 2 ||
    transactionStatus === 'canceled' ||
    transactionStatus === 'cancelled'
  ) {
    return 'PAYMENT_CANCELED';
  }

  if (
    statusCode === 1 ||
    transactionStatus === 'pending' ||
    transactionStatus === 'created' ||
    transactionStatus === 'initiated'
  ) {
    return 'PENDING_PAYMENT';
  }

  if (
    transactionStatus === 'failed' ||
    transactionStatus === 'rejected' ||
    transactionStatus === 'denied' ||
    transactionStatus === 'error' ||
    (statusCode !== null && statusCode !== 1 && statusCode !== 2 && statusCode !== 3) ||
    (messageCode !== null && messageCode !== 0)
  ) {
    return 'PAYMENT_FAILED';
  }

  return 'PENDING_PAYMENT';
}

function parseResponseBody(rawPayload: string, contentType: string | null) {
  const normalizedPayload = rawPayload.replace(/^\uFEFF/, '').trim();

  if (!normalizedPayload) {
    return null;
  }

  const normalizedLower = normalizedPayload.toLowerCase();

  if (normalizedLower === 'true') {
    return true;
  }

  if (normalizedLower === 'false') {
    return false;
  }

  if (normalizedLower === 'null') {
    return null;
  }

  const shouldAttemptJson =
    Boolean(contentType?.toLowerCase().includes('json')) ||
    normalizedPayload.startsWith('{') ||
    normalizedPayload.startsWith('[') ||
    normalizedPayload.startsWith('"');

  if (!shouldAttemptJson) {
    return normalizedPayload;
  }

  try {
    return JSON.parse(normalizedPayload);
  } catch {
    return normalizedPayload;
  }
}

async function fetchPayphoneStatus(
  baseUrl: string,
  token: string,
  clientTransactionId: string,
) {
  const url = `${baseUrl}/Sale/client/${encodeURIComponent(clientTransactionId)}`;

  return new Promise<PayphoneTransactionResponse | null>((resolvePromise, reject) => {
    const request = httpsRequest(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json, text/plain, */*',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const contentTypeHeader = response.headers['content-type'];
          const contentType = Array.isArray(contentTypeHeader)
            ? contentTypeHeader.join(', ')
            : contentTypeHeader ?? null;

          if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
            reject(
              new Error(
                `PayPhone respondio ${response.statusCode ?? 0} al consultar ${clientTransactionId}.`,
              ),
            );
            return;
          }

          resolvePromise(normalizeTransactionResponse(parseResponseBody(body, contentType)));
        });
      },
    );

    request.on('error', reject);
    request.end();
  });
}

async function main() {
  loadEnv({ path: resolve(__dirname, '..', '.env') });

  const connectionString = process.env.DATABASE_URL;
  const payphoneToken = process.env.PAYPHONE_TOKEN;
  const payphoneBaseUrl = normalizeApiBaseUrl(
    process.env.PAYPHONE_API_BASE_URL || 'https://pay.payphonetodoesposible.com/api',
  );

  if (!connectionString) {
    throw new Error('DATABASE_URL no esta configurado.');
  }

  if (!payphoneToken) {
    throw new Error('PAYPHONE_TOKEN no esta configurado.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rows } = await client.query<PendingOrderRow>(`
      select
        o.id,
        o.status,
        o."userId" as "userId",
        u.email as "userEmail",
        o."paymentApprovedAt" as "paymentApprovedAt",
        o."payphoneClientTransactionId" as "payphoneClientTransactionId",
        o."payphoneTransactionId" as "payphoneTransactionId",
        o."payphoneTransactionStatus" as "payphoneTransactionStatus",
        o."payphoneStatusCode" as "payphoneStatusCode",
        o."payphoneAuthorizationCode" as "payphoneAuthorizationCode",
        o."payphoneMessage" as "payphoneMessage",
        o."payphoneMessageCode" as "payphoneMessageCode",
        o."payphoneResponse" as "payphoneResponse"
      from "Order" o
      inner join "User" u on u.id = o."userId"
      where o."paymentProvider" = 'payphone'
        and o.status = 'PENDING_PAYMENT'
      order by o."createdAt" asc
    `);

    let repaired = 0;
    let approved = 0;
    let canceled = 0;
    let failed = 0;
    let skipped = 0;

    for (const order of rows) {
      const storedResponse = normalizeTransactionResponse(order.payphoneResponse);
      let liveResponse: PayphoneTransactionResponse | null = null;

      if (order.payphoneClientTransactionId) {
        try {
          liveResponse = await fetchPayphoneStatus(
            payphoneBaseUrl,
            payphoneToken,
            order.payphoneClientTransactionId,
          );
        } catch (error) {
          console.error(
            `[payphone-reconcile] No se pudo consultar ${order.payphoneClientTransactionId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const response = liveResponse || storedResponse;

      if (!response) {
        skipped += 1;
        continue;
      }

      const nextStatus = resolvePayphoneOrderStatus(response);

      if (nextStatus === 'PENDING_PAYMENT') {
        skipped += 1;
        continue;
      }

      const nextTransactionId =
        readString(response.transactionId) || order.payphoneTransactionId || '';
      const nextTransactionStatus =
        readString(response.transactionStatus) || order.payphoneTransactionStatus || '';
      const nextStatusCode =
        readNumber(response.statusCode) ?? order.payphoneStatusCode;
      const nextAuthorizationCode =
        readString(response.authorizationCode) ||
        order.payphoneAuthorizationCode ||
        '';
      const nextMessage =
        readString(response.message) || order.payphoneMessage || null;
      const nextMessageCode =
        readNumber(response.messageCode) ?? order.payphoneMessageCode;
      const responsePayload = JSON.stringify(liveResponse || storedResponse || response);
      const shouldRestoreStock =
        order.status === 'PENDING_PAYMENT' &&
        (nextStatus === 'PAYMENT_CANCELED' || nextStatus === 'PAYMENT_FAILED');

      await client.query('begin');

      try {
        if (shouldRestoreStock) {
          await client.query(
            `
              update "Product" p
              set stock = p.stock + source.quantity
              from (
                select "productId", sum(quantity)::int as quantity
                from "OrderItem"
                where "orderId" = $1
                group by "productId"
              ) as source
              where p.id = source."productId"
            `,
            [order.id],
          );
        }

        await client.query(
          `
            update "Order"
            set status = $2::"OrderStatus",
                "paymentApprovedAt" = case
                  when $2::"OrderStatus" = 'PAYMENT_APPROVED'::"OrderStatus" then coalesce("paymentApprovedAt", now())
                  else "paymentApprovedAt"
                end,
                "payphoneTransactionId" = $3,
                "payphoneTransactionStatus" = $4,
                "payphoneStatusCode" = $5,
                "payphoneAuthorizationCode" = $6,
                "payphoneMessage" = $7,
                "payphoneMessageCode" = $8,
                "payphoneResponse" = $9::jsonb,
                "updatedAt" = now()
            where id = $1
          `,
          [
            order.id,
            nextStatus,
            nextTransactionId,
            nextTransactionStatus,
            nextStatusCode,
            nextAuthorizationCode,
            nextMessage,
            nextMessageCode,
            responsePayload,
          ],
        );

        await client.query(
          `
            insert into auditoria (
              "userId",
              usuario,
              "fechaHora",
              actividad,
              "origenConexion",
              detalle
            )
            values ($1, $2, now(), 'PAGO_PAYPHONE_REPARADO', 'script:reconcile-pending-payphone', $3::jsonb)
          `,
          [
            order.userId,
            order.userEmail,
            JSON.stringify({
              pedidoId: order.id,
              clientTransactionId: order.payphoneClientTransactionId,
              statusAnterior: order.status.toLowerCase(),
              statusNuevo: nextStatus.toLowerCase(),
              stockRepuesto: shouldRestoreStock,
              reparadoDesde: liveResponse ? 'payphone-api' : 'payphone-response-cache',
              payphone: {
                transactionId: nextTransactionId,
                transactionStatus: nextTransactionStatus,
                statusCode: nextStatusCode,
                authorizationCode: nextAuthorizationCode,
                message: nextMessage,
                messageCode: nextMessageCode,
              },
            }),
          ],
        );

        await client.query('commit');

        repaired += 1;
        if (nextStatus === 'PAYMENT_APPROVED') {
          approved += 1;
        } else if (nextStatus === 'PAYMENT_CANCELED') {
          canceled += 1;
        } else if (nextStatus === 'PAYMENT_FAILED') {
          failed += 1;
        }

        console.log(
          `[payphone-reconcile] Pedido ${order.id} actualizado a ${nextStatus}.`,
        );
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }

    console.log(
      `[payphone-reconcile] Finalizado. Reparados=${repaired}, aprobados=${approved}, cancelados=${canceled}, fallidos=${failed}, omitidos=${skipped}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[payphone-reconcile] Error fatal:', error);
  process.exit(1);
});
