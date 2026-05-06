create table if not exists "PasswordResetRequest" (
  "id" text primary key,
  "userId" uuid not null references "User"("id") on delete cascade,
  "emailSnapshot" varchar(160) not null,
  "codeHash" varchar(128) not null,
  "expiresAt" timestamptz not null,
  "verifiedAt" timestamptz null,
  "usedAt" timestamptz null,
  "attempts" integer not null default 0,
  "maxAttempts" integer not null default 5,
  "requestedFromIp" varchar(120) null,
  "requestedFromDevice" varchar(512) null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "PasswordResetRequest_userId_createdAt_idx"
  on "PasswordResetRequest" ("userId", "createdAt");

create index if not exists "PasswordResetRequest_emailSnapshot_createdAt_idx"
  on "PasswordResetRequest" ("emailSnapshot", "createdAt");

create index if not exists "PasswordResetRequest_expiresAt_idx"
  on "PasswordResetRequest" ("expiresAt");

create index if not exists "PasswordResetRequest_usedAt_idx"
  on "PasswordResetRequest" ("usedAt");
