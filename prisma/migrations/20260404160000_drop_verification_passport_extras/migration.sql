-- Откат полей «кем выдан», дата выдачи, адреса (остаются ФИО, д. р., серия/номер).
ALTER TABLE "verification_requests" DROP COLUMN IF EXISTS "passportIssuedBy";
ALTER TABLE "verification_requests" DROP COLUMN IF EXISTS "passportIssueDate";
ALTER TABLE "verification_requests" DROP COLUMN IF EXISTS "residencePlace";
ALTER TABLE "verification_requests" DROP COLUMN IF EXISTS "registrationAddress";
