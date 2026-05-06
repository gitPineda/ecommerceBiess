DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderFlowStatus') THEN
    CREATE TYPE "OrderFlowStatus" AS ENUM (
      'PENDIENTE',
      'CONFIRMADO',
      'EN_PREPARACION',
      'EN_CAMINO',
      'ENTREGADO',
      'PAGADO',
      'COMPLETADO',
      'CANCELADO',
      'RECHAZADO'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM (
      'PENDING',
      'PAID',
      'FAILED',
      'CANCELED'
    );
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "customerRating" DECIMAL(4, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "customerStarsTotal" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "customerRatedOrdersCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "orderStatus" "OrderFlowStatus" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "assignedSellerId" UUID,
  ADD COLUMN IF NOT EXISTS "deliveryOtp" VARCHAR(12),
  ADD COLUMN IF NOT EXISTS "deliveryOtpGeneratedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveryOtpVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "preparingAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "inTransitAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "customerRatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sellerCustomerRating" INTEGER,
  ADD COLUMN IF NOT EXISTS "sellerCustomerRatedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Order_assignedSellerId_fkey'
      AND table_name = 'Order'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_assignedSellerId_fkey"
      FOREIGN KEY ("assignedSellerId") REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
  "id" SERIAL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "fromStatus" "OrderFlowStatus",
  "toStatus" "OrderFlowStatus" NOT NULL,
  "changedByUserId" UUID NOT NULL,
  "changedByRole" VARCHAR(32) NOT NULL,
  "note" VARCHAR(255),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'OrderStatusHistory_orderId_fkey'
      AND table_name = 'OrderStatusHistory'
  ) THEN
    ALTER TABLE "OrderStatusHistory"
      ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'OrderStatusHistory_changedByUserId_fkey'
      AND table_name = 'OrderStatusHistory'
  ) THEN
    ALTER TABLE "OrderStatusHistory"
      ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey"
      FOREIGN KEY ("changedByUserId") REFERENCES "User"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Order_orderStatus_idx" ON "Order"("orderStatus");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_assignedSellerId_idx" ON "Order"("assignedSellerId");
CREATE INDEX IF NOT EXISTS "Order_completedAt_idx" ON "Order"("completedAt");
CREATE INDEX IF NOT EXISTS "Order_deliveredAt_idx" ON "Order"("deliveredAt");
CREATE INDEX IF NOT EXISTS "Order_paidAt_idx" ON "Order"("paidAt");
CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderStatusHistory_changedByUserId_idx" ON "OrderStatusHistory"("changedByUserId");

UPDATE "Order"
SET
  "orderStatus" = CASE
    WHEN "status" = 'PAYMENT_APPROVED' THEN 'COMPLETADO'::"OrderFlowStatus"
    WHEN "status" = 'PAID' THEN 'PAGADO'::"OrderFlowStatus"
    WHEN "status" = 'PAYMENT_CANCELED' THEN 'CANCELADO'::"OrderFlowStatus"
    WHEN "status" = 'PAYMENT_FAILED' THEN 'CANCELADO'::"OrderFlowStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELADO'::"OrderFlowStatus"
    WHEN "status" = 'PENDING_PAYMENT' THEN 'PENDIENTE'::"OrderFlowStatus"
    WHEN "status" = 'CONFIRMED' AND "paymentMethod" = 'contra_entrega' THEN 'PENDIENTE'::"OrderFlowStatus"
    WHEN "status" = 'CONFIRMED' THEN 'CONFIRMADO'::"OrderFlowStatus"
    ELSE COALESCE("orderStatus", 'PENDIENTE'::"OrderFlowStatus")
  END,
  "paymentStatus" = CASE
    WHEN "status" = 'PAYMENT_APPROVED' THEN 'PAID'::"PaymentStatus"
    WHEN "status" = 'PAID' THEN 'PAID'::"PaymentStatus"
    WHEN "status" = 'PAYMENT_FAILED' THEN 'FAILED'::"PaymentStatus"
    WHEN "status" = 'PAYMENT_CANCELED' THEN 'CANCELED'::"PaymentStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELED'::"PaymentStatus"
    ELSE COALESCE("paymentStatus", 'PENDING'::"PaymentStatus")
  END,
  "paidAt" = COALESCE("paidAt", "paymentApprovedAt"),
  "completedAt" = CASE
    WHEN "status" = 'PAYMENT_APPROVED' THEN COALESCE("completedAt", "paymentApprovedAt", "updatedAt")
    ELSE "completedAt"
  END,
  "customerRatedAt" = COALESCE(
    "customerRatedAt",
    (
      SELECT MAX("ratedAt")
      FROM "OrderItem"
      WHERE "OrderItem"."orderId" = "Order"."id"
        AND "OrderItem"."ratedAt" IS NOT NULL
    )
  );

WITH single_seller_orders AS (
  SELECT
    oi."orderId",
    MIN(oi."sellerId") AS "sellerId"
  FROM "OrderItem" oi
  GROUP BY oi."orderId"
  HAVING COUNT(DISTINCT oi."sellerId") = 1
)
UPDATE "Order" o
SET "assignedSellerId" = sso."sellerId"
FROM single_seller_orders sso
WHERE o."id" = sso."orderId"
  AND o."assignedSellerId" IS NULL;

INSERT INTO "OrderStatusHistory" (
  "orderId",
  "fromStatus",
  "toStatus",
  "changedByUserId",
  "changedByRole",
  "note",
  "metadata"
)
SELECT
  o."id",
  NULL,
  o."orderStatus",
  o."userId",
  'system',
  'Estado inicial migrado desde el flujo legado',
  jsonb_build_object(
    'legacyStatus', o."status",
    'paymentMethod', o."paymentMethod",
    'paymentStatus', o."paymentStatus"
  )
FROM "Order" o
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrderStatusHistory" osh
  WHERE osh."orderId" = o."id"
);
