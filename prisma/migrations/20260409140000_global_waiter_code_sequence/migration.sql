-- Единый глобальный счётчик порядковых кодов NNN-NNN (личные ссылки, заведения, сотрудники).
CREATE TABLE "waiter_code_sequence" (
    "id" VARCHAR(32) NOT NULL,
    "lastAllocated" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "waiter_code_sequence_pkey" PRIMARY KEY ("id")
);

INSERT INTO "waiter_code_sequence" ("id", "lastAllocated") VALUES ('global', 0);
