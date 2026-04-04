-- Паспорт: кем/когда выдан; место жительства и адрес регистрации.
ALTER TABLE "verification_requests" ADD COLUMN "passportIssuedBy" VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE "verification_requests" ADD COLUMN "passportIssueDate" VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE "verification_requests" ADD COLUMN "residencePlace" VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE "verification_requests" ADD COLUMN "registrationAddress" TEXT NOT NULL DEFAULT '';
