--
-- PostgreSQL database dump
--

\restrict 2TKJy0SZPHHlnYGKwN97Cg17qN9eGkWIXtPgMWWVGQQ3o2KFG9u5dUtRffOFpeV

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: PayoutStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PayoutStatus" AS ENUM (
    'CREATED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED'
);


--
-- Name: RegistrationRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RegistrationRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'CANCELLED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'RECIPIENT',
    'ADMIN',
    'SUPERADMIN',
    'ESTABLISHMENT_ADMIN',
    'EMPLOYEE'
);


--
-- Name: VerificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VerificationStatus" AS ENUM (
    'NONE',
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: employee_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_reviews (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    name character varying(255) NOT NULL,
    "position" character varying(100),
    coefficient numeric(10,2) DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "qrCodeIdentifier" character varying(50) NOT NULL,
    "userId" character varying(64),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "photoUrl" character varying(512),
    "printCardPhotoUrl" character varying(512)
);


--
-- Name: establishments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.establishments (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    phone character varying(50),
    "logoUrl" character varying(512),
    "uniqueSlug" character varying(50) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "maxEmployeesCount" integer,
    "tipPoolUserId" character varying(64),
    "primaryColor" character varying(20),
    "secondaryColor" character varying(20),
    "mainBackgroundColor" character varying(20),
    "blocksBackgroundColor" character varying(20),
    "fontColor" character varying(20),
    "borderColor" character varying(20),
    "borderWidthPx" integer,
    "borderOpacityPercent" integer,
    "mainBackgroundOpacityPercent" integer,
    "blocksBackgroundOpacityPercent" integer,
    "secondaryOpacityPercent" integer,
    "printCardWidthMm" integer,
    "printCardHeightMm" integer,
    "printCardFooterColor" character varying(20),
    "logoOpacityPercent" integer
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: paygine_cubbies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paygine_cubbies (
    id text NOT NULL,
    "sdRef" character varying(128) NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payout_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payout_requests (
    id text NOT NULL,
    "userId" text NOT NULL,
    "amountKop" bigint NOT NULL,
    details text NOT NULL,
    "recipientName" character varying(255),
    status public."PayoutStatus" DEFAULT 'CREATED'::public."PayoutStatus" NOT NULL,
    "externalId" character varying(255),
    "completedByUserId" character varying(64),
    "feeKop" bigint,
    "rejectionReason" character varying(500),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payout_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payout_rules (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    value numeric(10,4) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: registration_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_requests (
    id text NOT NULL,
    "fullName" character varying(255) NOT NULL,
    "dateOfBirth" character varying(20) NOT NULL,
    establishment character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    "activityType" character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    status public."RegistrationRequestStatus" DEFAULT 'PENDING'::public."RegistrationRequestStatus" NOT NULL,
    "registrationTokenId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestType" character varying(20) DEFAULT 'individual'::character varying NOT NULL,
    "companyName" character varying(255),
    "companyRole" character varying(255),
    "employeeCount" integer,
    "adminFullName" character varying(255),
    "adminContactPhone" character varying(50)
);


--
-- Name: registration_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_tokens (
    id text NOT NULL,
    "tokenHash" character varying(64) NOT NULL,
    "createdById" text NOT NULL,
    "usedById" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "establishmentId" character varying(64),
    "employeeId" character varying(64)
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "refreshToken" character varying(512) NOT NULL,
    "deviceInfo" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id text NOT NULL,
    "threadId" text NOT NULL,
    "authorId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: support_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_threads (
    id text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastReadAt" timestamp(3) without time zone
);


--
-- Name: system_default_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_default_limits (
    id text DEFAULT 'default'::text NOT NULL,
    "payoutDailyLimitCount" integer,
    "payoutDailyLimitKop" bigint,
    "payoutMonthlyLimitCount" integer,
    "payoutMonthlyLimitKop" bigint,
    "autoConfirmPayouts" boolean DEFAULT false NOT NULL,
    "autoConfirmPayoutThresholdKop" bigint,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tip_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tip_links (
    id text NOT NULL,
    "userId" text NOT NULL,
    slug character varying(50) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" character varying(64)
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id text NOT NULL,
    "linkId" text NOT NULL,
    "recipientId" text NOT NULL,
    "amountKop" bigint NOT NULL,
    "feeKop" bigint,
    "paymentMethod" character varying(16),
    "payerInfo" text,
    status public."TransactionStatus" DEFAULT 'PENDING'::public."TransactionStatus" NOT NULL,
    "externalId" character varying(255),
    "paygineOrderSdRef" character varying(128),
    "idempotencyKey" character varying(255) NOT NULL,
    "relocateStartedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    "uniqueId" integer NOT NULL,
    login character varying(50) NOT NULL,
    email character varying(255),
    "passwordHash" character varying(255) NOT NULL,
    role public."UserRole" DEFAULT 'RECIPIENT'::public."UserRole" NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL,
    "isBlocked" boolean DEFAULT false NOT NULL,
    "fullName" character varying(255),
    "birthDate" character varying(20),
    establishment character varying(255),
    "apiKey" character varying(64),
    "payoutDailyLimitCount" integer,
    "payoutDailyLimitKop" bigint,
    "payoutMonthlyLimitCount" integer,
    "payoutMonthlyLimitKop" bigint,
    "autoConfirmPayouts" boolean DEFAULT false NOT NULL,
    "autoConfirmPayoutThresholdKop" bigint,
    "paygineSdRef" character varying(128),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "apiKeyPrefix" character varying(20),
    "apiKeyHash" character varying(64),
    "establishmentId" character varying(64),
    "verificationStatus" public."VerificationStatus" DEFAULT 'NONE'::public."VerificationStatus" NOT NULL,
    "verificationRejectionReason" character varying(1000),
    "savingFor" character varying(500),
    "profilePhotoUrl" character varying(512)
);


--
-- Name: users_uniqueId_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."users_uniqueId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_uniqueId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."users_uniqueId_seq" OWNED BY public.users."uniqueId";


--
-- Name: verification_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_documents (
    id text NOT NULL,
    "requestId" text NOT NULL,
    type character varying(20) NOT NULL,
    "filePath" character varying(512) NOT NULL,
    "downloadedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: verification_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_requests (
    id text NOT NULL,
    "userId" text NOT NULL,
    "fullName" character varying(255) NOT NULL,
    "birthDate" character varying(20) NOT NULL,
    "passportSeries" character varying(10) NOT NULL,
    "passportNumber" character varying(20) NOT NULL,
    inn character varying(20) NOT NULL,
    status public."RegistrationRequestStatus" DEFAULT 'PENDING'::public."RegistrationRequestStatus" NOT NULL,
    "rejectionReason" character varying(1000),
    "reviewedAt" timestamp(3) without time zone,
    "reviewedByUserId" character varying(64),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: users uniqueId; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN "uniqueId" SET DEFAULT nextval('public."users_uniqueId_seq"'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
fed79d78-0446-4946-906f-6e5550ef163c	a601e1eff227b726a58ffd8d05707f0d9dc09ac31a28a33d08cf303df56db4cf	\N	20260125074219_auth_login_instead_of_phone	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260125074219_auth_login_instead_of_phone\n\nDatabase error code: 42710\n\nDatabase error:\nERROR: type "UserRole" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42710), message: "type \\"UserRole\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("typecmds.c"), line: Some(1167), routine: Some("DefineEnum") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260125074219_auth_login_instead_of_phone"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260125074219_auth_login_instead_of_phone"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	2026-02-28 16:01:44.936985+00	2026-02-28 16:00:21.653574+00	0
1c11cf76-734d-4155-abea-698e7b01dd9c	7a945d6b7dc20cb22b4db50e7a742712b1913f6acc46b8ee356f99389fb209e9	2026-02-28 15:59:12.19786+00	20250205120000_add_completed_by_user_id	\N	\N	2026-02-28 15:59:12.171911+00	1
85c45d1e-580c-4adb-8f9b-c9b0afe66dc3	a601e1eff227b726a58ffd8d05707f0d9dc09ac31a28a33d08cf303df56db4cf	2026-02-28 16:01:44.940933+00	20260125074219_auth_login_instead_of_phone		\N	2026-02-28 16:01:44.940933+00	0
8c584230-d4c3-43ae-8190-ecd9b051a27f	5be6abbad9a48ce5fb946703cdaaf70767551f0b5c601f07c63c6e196832defa	\N	20250206100000_add_registration_requests	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250206100000_add_registration_requests\n\nDatabase error code: 42710\n\nDatabase error:\nERROR: type "RegistrationRequestStatus" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42710), message: "type \\"RegistrationRequestStatus\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("typecmds.c"), line: Some(1167), routine: Some("DefineEnum") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250206100000_add_registration_requests"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250206100000_add_registration_requests"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	2026-02-28 16:00:19.545003+00	2026-02-28 15:59:12.198871+00	0
368a9f54-1bd9-438e-b9b1-48df1f41a449	5be6abbad9a48ce5fb946703cdaaf70767551f0b5c601f07c63c6e196832defa	2026-02-28 16:00:19.549981+00	20250206100000_add_registration_requests		\N	2026-02-28 16:00:19.549981+00	0
2f77f655-98e7-4161-b9b5-4c36a10dae91	7a6f1eb700c54c8d6394c36be36099921be0b46ff4bb94c6d0688e7f333cf1b3	2026-02-28 16:00:21.599056+00	20250211000000_add_user_payout_limits	\N	\N	2026-02-28 16:00:21.579558+00	1
8bf9e9a0-f63e-44df-8d21-1614055ccbba	84ce5b075d2a00f8d88a31084c7a0a6be8a178f97c83d046ec1767d96054c42a	2026-02-28 16:00:21.607278+00	20250211000001_add_auto_confirm_payouts	\N	\N	2026-02-28 16:00:21.600599+00	1
22d6c756-6368-475f-938a-5199277dd692	96186b005638a7a7d26ee0b9d4fc70c5856ef32b00470a3c03ecaae0ec0b0a43	2026-02-28 16:01:54.154585+00	20260218000000_add_paygine_sd_ref_fields	\N	\N	2026-02-28 16:01:54.146044+00	1
f02b3e75-f6b5-42b4-bdb7-2ce060c69bf9	c0e30aa36eec3c279b290d394f60cd6b86cc68adfe410fcd846be3bd13f84857	2026-02-28 16:00:21.620109+00	20250211000002_add_monthly_payout_limits	\N	\N	2026-02-28 16:00:21.60899+00	1
772c3396-9f6a-4ef4-9f02-337c8c07cd5f	c00abf4590947ccbf38f88b81ad9806e425efb54a1bca477857bb5678a55d0d2	2026-02-28 16:00:21.652297+00	20250228000000_add_system_default_limits	\N	\N	2026-02-28 16:00:21.623091+00	1
3c9ddb95-fd67-40e0-b8f1-77bf43da5e40	9dd5271fd520a2f3ad80e48c108d212f90fde41940def54a9d07de2322b01215	2026-02-28 16:01:54.160684+00	20260218100000_backfill_paygine_sd_ref	\N	\N	2026-02-28 16:01:54.155895+00	1
c1d693ee-cee2-41aa-9240-a948dc852a7d	4639c518c301eb68bbe8f6e8f1021a7f9c42d17db761c9c64c5ecd4c216e4b5f	\N	20260218110000_transaction_fee_kop	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260218110000_transaction_fee_kop\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "feeKop" of relation "transactions" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"feeKop\\" of relation \\"transactions\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7347), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260218110000_transaction_fee_kop"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260218110000_transaction_fee_kop"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	2026-02-28 16:02:15.320984+00	2026-02-28 16:01:54.161612+00	0
407dd963-fa3c-425e-9e47-759776413975	4639c518c301eb68bbe8f6e8f1021a7f9c42d17db761c9c64c5ecd4c216e4b5f	2026-02-28 16:02:15.325494+00	20260218110000_transaction_fee_kop		\N	2026-02-28 16:02:15.325494+00	0
15a58651-3fb1-46b5-b1c8-ff31e312476f	583f55cf9270c8c043ebde3f02be5016193f8b4bc8c84413ec1f2b4ea1558c83	2026-02-28 16:02:38.568131+00	20260219110000_add_relocate_started_at	\N	\N	2026-02-28 16:02:38.565097+00	1
3e9ed8c9-b66a-466a-8159-6f0265928654	1319cf26dc78acbd516ec686f60f22497eaa442d050f87773222695a81649788	\N	20260218120000_transaction_payment_method	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260218120000_transaction_payment_method\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "paymentMethod" of relation "transactions" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"paymentMethod\\" of relation \\"transactions\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7347), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260218120000_transaction_payment_method"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260218120000_transaction_payment_method"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	2026-02-28 16:02:36.74741+00	2026-02-28 16:02:17.411403+00	0
1a6ea9f9-93d2-4aed-9541-ed21bb499eb1	1319cf26dc78acbd516ec686f60f22497eaa442d050f87773222695a81649788	2026-02-28 16:02:36.751185+00	20260218120000_transaction_payment_method		\N	2026-02-28 16:02:36.751185+00	0
40f4dc8f-433c-4684-aefd-060e543b347c	7cba0d3237f949d36e980e6bbd4b4a203b81f34d23344bc89f299f877b7bc384	2026-02-28 16:02:38.564157+00	20260219100000_add_payout_rejection_reason	\N	\N	2026-02-28 16:02:38.556845+00	1
dcb4f4cb-1c3b-4341-b629-03f4977d02d8	0fed00c8542db7c42cd34d59f80354edefbd63678713cbc16aec2b2a72861d44	2026-03-05 19:33:55.548905+00	20260305120000_add_tiplink_employee_pool_user	\N	\N	2026-03-05 19:33:55.512797+00	1
728eb13f-ca74-473e-98f9-d7d0be1c031e	e6a88e9b428a1dd09b30772410e7bf262371c8ce10ef9b1bb831a95e31f2ce35	2026-02-28 16:02:38.577887+00	20260227000000_add_api_key_hash	\N	\N	2026-02-28 16:02:38.569091+00	1
dab14ae0-fcfc-4576-88cf-8126db5314d1	2a749d67c4c13cbe6b73ec89e6836942ac1079f09505c710477386969f22cede	2026-03-06 12:02:56.22828+00	20260306140000_add_password_reset_token	\N	\N	2026-03-06 12:02:56.161248+00	1
c9233fca-3f4e-48be-ad9c-635cd549d6f0	c36424d108ea96221163fe45e6a320282d2f448649184397882c88a8a04a5e4a	2026-02-28 17:43:49.337397+00	20260228120000_add_support_chat	\N	\N	2026-02-28 17:43:49.287253+00	1
8c2d65eb-3e45-4dae-86e9-fb8a60484b1c	112589cf8207ee6aa2904516a50340193d264034611ba84ebff5cb14027eaea1	2026-03-05 19:33:55.564102+00	20260305130000_establishment_branding_and_reviews	\N	\N	2026-03-05 19:33:55.550034+00	1
4584c884-d8dd-4652-8131-27b5d75da3c8	5571939977f58db5830e63eebead1b2337f2acbee5107413753c132cfc7d1b92	2026-02-28 19:10:09.020522+00	20260228140000_support_thread_last_read_at	\N	\N	2026-02-28 19:10:09.010073+00	1
443694a1-e69a-421b-b9b2-bd8bfa217173	6b79568fb47b47c962e12db6e15cee552b979d8e3378956a3af754e1664d6e48	2026-03-05 17:37:17.142612+00	20260305000000_add_establishments_employees_payout_rules	\N	\N	2026-03-05 17:37:17.088572+00	1
566a9ee6-8682-43d1-8e37-c1953af70527	cd92a8f2c60e21838b67451e304c2a07572a6c7347badfb9fe29b48d1df53624	2026-03-05 17:37:17.159758+00	20260305100000_establishment_max_employees_and_token_links	\N	\N	2026-03-05 17:37:17.143395+00	1
330521ac-d3b0-439b-95e4-35b53e0297f0	418fdda17c14857ea092c62cb1846910bef10cc029cddd2da076e9ace228b91e	2026-03-05 23:00:15.649209+00	20260306120000_establishment_brand_extended	\N	\N	2026-03-05 23:00:15.64175+00	1
9d445524-620f-46b5-b529-5e1fc4448abd	f9476b15e15beffb58b6a83e19e0fe771f23b9618dd5bc57c77e7bbfb6c3d5f1	2026-03-06 13:24:28.677884+00	20260306150000_registration_request_type_and_fields	\N	\N	2026-03-06 13:24:28.663291+00	1
4b3cd675-09bf-4cde-88ec-b53ff9ccf6ab	400e112e7b9cc8d8ce81963fd0e09920689f7dc70be410e98ed64e2d4c0dfa67	2026-03-05 23:00:15.653458+00	20260306130000_establishment_border_color	\N	\N	2026-03-05 23:00:15.650255+00	1
c3423312-8b92-448d-8da2-42596643bdd5	f43097c04398827d26f6966a15d7aef99c9ec2ea3801c0b56d9b945a240944a3	2026-03-11 01:29:39.930144+00	20260311000000_add_user_saving_for	\N	\N	2026-03-11 01:29:39.920522+00	1
2df4bf71-b743-4786-925b-e01fd63ab44c	5c054e5eecbb660da90d86bf241665f39617459fa3803bebc2ff97b1a9a74cff	2026-03-10 20:38:44.506158+00	20260310000000_add_verification	\N	\N	2026-03-10 20:38:44.454881+00	1
79d5c9ff-66a3-4b1c-9883-278c90bbaa57	da43d7076599240a5d1aff17d64661aef9aeace0efcae059a8d1ba8583994ccb	2026-03-11 02:45:26.574284+00	20260311100000_establishment_border_width_opacity	\N	\N	2026-03-11 02:45:26.562612+00	1
8d5c178c-9650-4dc5-a268-c5da42afda83	7c7e2be2992665fda8f6fb6bfa66f2a8685aa56f0abf45af194387380cda757b	2026-03-11 03:32:39.553912+00	20260312100000_establishment_opacity_per_block	\N	\N	2026-03-11 03:32:39.543804+00	1
e55f9c01-ea2b-4cb1-a812-4121947a14cd	f06dcc8a86b8800739c40cd2ea81da322cadeee0753880ba20a7728d7735db63	2026-03-11 03:32:39.560076+00	20260313100000_establishment_print_card_size	\N	\N	2026-03-11 03:32:39.555047+00	1
f4a4ae91-d0c1-447f-ae93-4c896cacb2f4	f35ced550c324f45b3e3868ffa2c5d47ef5601d278832a6f82bb974d16ce90f8	2026-03-11 03:32:39.565237+00	20260314100000_employee_photo_urls	\N	\N	2026-03-11 03:32:39.560813+00	1
79f8e841-ba67-4b28-a357-3ed794fa601a	c20a1a7b849fc2ad5078132d0559d2cd296b6d7679a39a0e8bae6a058425cb1d	2026-03-11 04:12:16.893532+00	20260315100000_print_card_footer_color	\N	\N	2026-03-11 04:12:16.884313+00	1
17268d77-8015-472d-8735-5ad23b2810e2	6a1e64e754a51f1bdd2521326553ddff7424a129e437332389c50524bd525226	2026-03-11 04:12:16.897977+00	20260316100000_logo_opacity	\N	\N	2026-03-11 04:12:16.894845+00	1
c0bc8924-bf98-4c02-af34-93dca75cdef8	f2b2970176655a3227bbd2f8d8084bcbfc8ab4d952119c33e0008b3393830731	2026-03-11 06:15:00.12294+00	20260317100000_add_user_profile_photo_url	\N	\N	2026-03-11 06:15:00.1121+00	1
\.


--
-- Data for Name: employee_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_reviews (id, "employeeId", rating, comment, "createdAt") FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, "establishmentId", name, "position", coefficient, "isActive", "qrCodeIdentifier", "userId", "createdAt", "updatedAt", "photoUrl", "printCardPhotoUrl") FROM stdin;
cmme1p7p8000ao91607v9q90d	cmmdsanwv0004s616zxznkcfy	1111	111	1.00	t	ohfyls60u5	cmme1pno4000go916ujm52vko	2026-03-05 22:36:43.965	2026-03-05 22:37:04.671	\N	\N
\.


--
-- Data for Name: establishments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.establishments (id, name, address, phone, "logoUrl", "uniqueSlug", "createdAt", "updatedAt", "maxEmployeesCount", "tipPoolUserId", "primaryColor", "secondaryColor", "mainBackgroundColor", "blocksBackgroundColor", "fontColor", "borderColor", "borderWidthPx", "borderOpacityPercent", "mainBackgroundOpacityPercent", "blocksBackgroundOpacityPercent", "secondaryOpacityPercent", "printCardWidthMm", "printCardHeightMm", "printCardFooterColor", "logoOpacityPercent") FROM stdin;
cmmdsanwv0004s616zxznkcfy	123123	\N	+79039981234	\N	lalala	2026-03-05 18:13:28.591	2026-03-11 04:00:35.643	7	cmme1p7p20008o916gt5zm27e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, "userId", "tokenHash", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: paygine_cubbies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paygine_cubbies (id, "sdRef", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payout_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payout_requests (id, "userId", "amountKop", details, "recipientName", status, "externalId", "completedByUserId", "feeKop", "rejectionReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payout_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payout_rules (id, "establishmentId", name, type, value, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: registration_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registration_requests (id, "fullName", "dateOfBirth", establishment, phone, "activityType", email, status, "registrationTokenId", "createdAt", "requestType", "companyName", "companyRole", "employeeCount", "adminFullName", "adminContactPhone") FROM stdin;
cmm71vet80008qg16ubhn5flj	Иван Иванов Иванович	1998-03-01	Мариотт	9999999999	Официант	beheje@mail.ru	APPROVED	cmmnqvy7a0001qr1702cihunt	2026-03-01 01:07:09.873	individual	\N	\N	\N	\N	\N
cmmnq2iws0006ql15pprwyoii	Иванов Иван Иванович	1996-03-18	Кафе	9995551212	Мастер	sjaggena@gmail.com	APPROVED	cmmnqx83d0003qr179ngi8rua	2026-03-12 17:08:51.388	individual	\N	\N	\N	Петров Петр	9995461212
cmmnwblpl000opd17wh0y5ko3	Теницкая Нина Ивановна	1985-05-20	вкусняшка для няшки	9211045813	оффициант	try695873@gmail.com	APPROVED	cmmnwcakw000spd17es9awe0b	2026-03-12 20:03:52.617	individual	\N	\N	\N	петр ильич занозин	9879736143
\.


--
-- Data for Name: registration_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registration_tokens (id, "tokenHash", "createdById", "usedById", "expiresAt", "createdAt", "usedAt", "establishmentId", "employeeId") FROM stdin;
cmm55h1jr0003mz1f3yyvqnj3	2dcdf2826eba8bf0fb11a4071f3839b99506dbb7f8df2e0ce1450fabacfc92c6	cmm55ev860000mzbgcqugyr38	\N	2026-02-27 18:12:25.621	2026-02-27 17:12:25.624	\N	\N	\N
cmm55hc820007mz1fo2u72v0z	c88ccb1030ae6abfc44c33651104d2efe55acb54f3fa593d29fb74eee383f452	cmm55ev860000mzbgcqugyr38	cmm55hstp0008mz1f61roz8ga	2026-02-27 18:12:39.457	2026-02-27 17:12:39.458	2026-02-27 17:13:00.985	\N	\N
cmm58ya9e0007ls1eodskc841	0d20bdbcdb4915a385a54c1d8a2c62ae6e34e557b642d8b78d6a37fee881399d	cmm55ev860000mzbgcqugyr38	\N	2026-02-27 19:49:48.913	2026-02-27 18:49:48.915	\N	\N	\N
cmm58z8ji0009ls1em9xghnal	8ddcff152b5547aa894117a303bd5e6b63dafa27605f74e9c6f84714ad2e1711	cmm55ev860000mzbgcqugyr38	\N	2026-02-27 19:50:33.341	2026-02-27 18:50:33.343	\N	\N	\N
cmm58z922000bls1ess9s1buh	3c1e2d9cb033fc38754fbb6391a7d8ad30eaa8e657d959840ba857a671bbdf69	cmm55ev860000mzbgcqugyr38	\N	2026-02-27 19:50:34.008	2026-02-27 18:50:34.01	\N	\N	\N
cmm5a79wv0005qt1epm98l4je	add67955f4d092068472dda4fc38086d5e6eaa9b0dfbecc5e88bd5cf710b611f	cmm55ev860000mzbgcqugyr38	\N	2026-02-27 20:24:47.982	2026-02-27 19:24:47.984	\N	\N	\N
cmm5cd5r90003pa16kh9ale4v	0be84d3ad5d29fd4951899da4c2c7bb90e17495cd354d19e8d0e1f9325a07409	cmm55ev860000mzbgcqugyr38	\N	2036-02-25 20:25:21.764	2026-02-27 20:25:21.765	\N	\N	\N
cmm6wo3or0005of16opcn4tjn	7d49a3db337895afbd16e6f6dd24ad67181e3eab853ae6f4e6f21bca701806f8	cmm55ev860000mzbgcqugyr38	\N	2036-02-26 22:41:30.794	2026-02-28 22:41:30.796	\N	\N	\N
cmm6wpxzs0009of16p473fy83	11f36873a87f3fc147e8bdda34de14292cc379583258377e871c2d25c0a22e4a	cmm55ev860000mzbgcqugyr38	\N	2036-02-26 22:42:56.727	2026-02-28 22:42:56.728	\N	\N	\N
cmm6wpz1v000bof16lj75ztqc	e92fd673b0557f16a8b10fde7f3575e14261f89c9fdf5f19cca0d91ece346d17	cmm55ev860000mzbgcqugyr38	\N	2036-02-26 22:42:58.098	2026-02-28 22:42:58.099	\N	\N	\N
cmmnq00020003ql15obd1uqb7	abaf3b3baee3d7aa85987369f85ad64b3952686223b71e445ac54e52edf04874	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:06:53.568	2026-03-12 17:06:53.57	2026-03-12 17:08:49.928	\N	\N
cmm6wpzu2000dof167auyk0b7	1af5efddf9ea890fd871c9d4f3da4fd2612ba772c4507dc64a8e83fa1183d077	cmm55ev860000mzbgcqugyr38	cmm6wqeyq000eof16062ru67j	2036-02-26 22:42:59.113	2026-02-28 22:42:59.114	2026-02-28 22:43:18.719	\N	\N
cmm6xgdte0005qv16x3vlg50b	110030c828dea0a76a59142acf389d6e2e0d75e6ca31beddd4d84df18b459ff0	cmm55ev860000mzbgcqugyr38	\N	2036-02-26 23:03:30.29	2026-02-28 23:03:30.291	\N	\N	\N
cmm6xgfv10007qv16g99hptax	fb9b88bbc30ee9307189e3861cc7243a39fdf1f9b1c76469ff9ebca3f7dfe226	cmm55ev860000mzbgcqugyr38	\N	2036-02-26 23:03:32.94	2026-02-28 23:03:32.941	\N	\N	\N
cmm706fk40003o616zmmqt7w8	d7abea45c3f7ac9f04aad95d842f510ac20a74f8a25a7da4e03d9ed0c6f15340	cmm55ev860000mzbgcqugyr38	\N	2036-02-27 00:19:44.836	2026-03-01 00:19:44.837	\N	\N	\N
cmm706gk50005o616rlx2zsm8	f420118d7011ca327bb73a4c16d43393c5acb60b4f52a86d2ee44a3a233cb6e7	cmm55ev860000mzbgcqugyr38	\N	2036-02-27 00:19:46.132	2026-03-01 00:19:46.133	\N	\N	\N
cmm706so70009o6163m5pljfe	6f0c1833163319f616acd20535c3a908179e921d505a87abad67dd529fe4b9ef	cmm55ev860000mzbgcqugyr38	\N	2036-02-27 00:20:01.83	2026-03-01 00:20:01.831	\N	\N	\N
cmm706w6y000bo616bd6gk4cj	e1c7c8ec1d00e4083ea303875dd0e1882d22528a4f61a2a0548368840182bac1	cmm55ev860000mzbgcqugyr38	\N	2036-02-27 00:20:06.393	2026-03-01 00:20:06.394	\N	\N	\N
cmm70g4pi0001pd16nhnhw3be	5f3e0d10a1c9b62f0c577f1bbc5eb661a88be532ef6a7b780a201e533b0b4926	cmm55ev860000mzbgcqugyr38	\N	2036-02-27 00:27:17.333	2026-03-01 00:27:17.334	\N	\N	\N
cmm70g7ip0003pd167wqjpiz6	05a8bc62a1571b3d31a1df5c4d5a00a4be7acddf69ac6bd4b6b92809fbce6454	cmm55ev860000mzbgcqugyr38	\N	2036-02-27 00:27:20.977	2026-03-01 00:27:20.978	\N	\N	\N
cmm70h9zr0009pd16slqrl0rq	4ac363a535c1202b2f41a34c82f4dc134f7a59aca748d4ce7454ba8919b90a21	cmm55ev860000mzbgcqugyr38	\N	2036-02-27 00:28:10.838	2026-03-01 00:28:10.839	\N	\N	\N
cmm70l9ru0001oe16jjxd9cd0	33a25542163d6c331e9d1bed8d40902183cd9502cf80c8c8a8c5e014f47072d8	cmm55ev860000mzbgcqugyr38	cmm70ltqq0002oe16m6thzy6j	2036-02-27 00:31:17.177	2026-03-01 00:31:17.179	2026-03-01 00:31:43.055	\N	\N
cmmds8w7e0003s616s6wly4w0	59d029f456277efbdf977437c7dec399529f44b78542603d8091d842f1264c44	cmm55ev860000mzbgcqugyr38	\N	2036-03-02 18:12:06.025	2026-03-05 18:12:06.026	\N	\N	\N
cmmdsanwx0006s616fpvfsqlh	efa6e9d2e8231b11ac78ff4af2bb1bb7376fc01036fceafd0e4c1fc5f1b22aff	cmm55ev860000mzbgcqugyr38	cmmdsbay70008s616zaz4lww3	2036-03-02 18:13:28.588	2026-03-05 18:13:28.593	2026-03-05 18:13:58.444	cmmdsanwv0004s616zxznkcfy	\N
cmmnq2hsd0005ql15tr8lzyet	3ba9c2603fe41d5dd7e34594fedc743336c1dff81655441a434cca314c2d9e48	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:08:49.927	2026-03-12 17:08:49.934	2026-03-12 17:23:37.126	\N	\N
cmme1p8pn000eo916tkyoof91	071f21e774c34b25bfefa8c65ae0379b6db3460578bf124777d7de1dca7220f4	cmmdsbay70008s616zaz4lww3	cmme1pno4000go916ujm52vko	2036-03-02 22:36:45.272	2026-03-05 22:36:45.275	2026-03-05 22:37:04.657	\N	cmme1p7p8000ao91607v9q90d
cmml1wnwj000bqx168zgi7yws	76927e5e1d660bd98a422cd097e601dc1f9061f91c47ce7fb681b4a8e54e8537	cmm55ev860000mzbgcqugyr38	\N	2036-03-07 20:16:54.786	2026-03-10 20:16:54.787	2026-03-10 23:12:46.352	\N	\N
cmml86tjp000nom16ucj4m5jw	5531f5825397f6830e4cff43b538f189bca48804c8f298dfe7cf615e3168eba8	cmm55ev860000mzbgcqugyr38	\N	2036-03-07 23:12:46.35	2026-03-10 23:12:46.357	2026-03-12 17:03:12.819	\N	\N
cmmnpv9o90005o016zy72eo22	73b81ca519aae14b44118975cf28b6bdf9c8ed57e8fc9132ca6ab43a66421115	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:03:12.816	2026-03-12 17:03:12.825	2026-03-12 17:05:47.205	\N	\N
cmmnpykss0001ql15b58mazp5	0e6a99e1aa444743025662549f217d0dbe94472b7aad90045880482d02812622	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:05:47.203	2026-03-12 17:05:47.212	2026-03-12 17:06:53.568	\N	\N
cmmnq3xxf0008ql15iaw9iv6a	9b0183ccec1e2486836a8f3cb98778d182c42c4ab8634608af3136579e38940c	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:09:57.506	2026-03-12 17:09:57.507	2026-03-12 17:23:38.841	\N	\N
cmmnqlicr000aql158yi3wxcc	b8bb178065914332ae71f8194acf6a0a747550f486fa70cf3f5b8facf2aa64c7	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:23:37.124	2026-03-12 17:23:37.131	2026-03-12 17:29:49.812	\N	\N
cmmnqthx70001ql16ghrp8lrq	294ce452a7b41a6ee0eba47a55110a055d4f693aa601eec30f1bf7d1c8af86fc	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:29:49.81	2026-03-12 17:29:49.819	2026-03-12 17:31:44.223	\N	\N
cmmnqvy7a0001qr1702cihunt	de38ea9b74491e3e92aa9926268dab4f61c63a196749d110219ed5c381e68a55	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:31:44.22	2026-03-12 17:31:44.231	\N	\N	\N
cmmnqljob000cql15bkx17uc6	f2967c2b4c6f9eebbc5ea26c27ed0f030bcd716e29b991f51e3a0ae6b53cdf36	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:23:38.84	2026-03-12 17:23:38.844	2026-03-12 17:32:43.702	\N	\N
cmmnqx83d0003qr179ngi8rua	fa5fe5bc96b1c7306bc0b79cf751bc0f70461c20325321c54fb64be409a2c2b0	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:32:43.701	2026-03-12 17:32:43.705	\N	\N	\N
cmmnrcx3f0005mr164cl4pr3z	902cea04972156c840d6828557b8634e9f7b872568b3aa1a4547415e3c12f12c	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 17:44:55.946	2026-03-12 17:44:55.947	\N	\N	\N
cmmnwc9ny000qpd17t295jzek	1432381a69e4275c2705007588316749a86655c53cf5ae8e3927b20fea30962f	cmm55ev860000mzbgcqugyr38	\N	2036-03-09 20:04:23.661	2026-03-12 20:04:23.662	2026-03-12 20:04:24.842	\N	\N
cmmnrczcz0007mr16jjhv4evj	62fd7d009cbcf9e06ec5a339f567d54b8167ebb0911bd2ec1acb1921d087e3db	cmm55ev860000mzbgcqugyr38	cmmnrk5ex0000pj16k8qj9sb2	2036-03-09 17:44:58.882	2026-03-12 17:44:58.883	2026-03-12 17:50:33.315	\N	\N
cmn347mce002fmt16a8q88cno	fd939c9c6c33b11ef60451d0f8efe737f50d76d07f0056e7c68a10c00489d08c	cmm55ev860000mzbgcqugyr38	\N	2036-03-20 11:41:16.381	2026-03-23 11:41:16.382	\N	\N	\N
cmmnwcakw000spd17es9awe0b	a60f42e39bca7e1f9b5bf5cfc960229f6654181871e5e697f9d9f453a1a11761	cmm55ev860000mzbgcqugyr38	cmmnwfwyz000tpd17503yww4k	2036-03-09 20:04:24.839	2026-03-12 20:04:24.849	2026-03-12 20:07:13.831	\N	\N
cmn347nez002hmt16fannnayn	dea093a200bf41c29901f58e05032c38d4d1ade3f88733ae67991f4b9abb245f	cmm55ev860000mzbgcqugyr38	cmn349rqe002imt1623foac4l	2036-03-20 11:41:17.771	2026-03-23 11:41:17.772	2026-03-23 11:42:56.673	\N	\N
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, "userId", "refreshToken", "deviceInfo", "expiresAt", "createdAt") FROM stdin;
cmm6w0gni000bp716dv2rbw2x	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIzMTczODcsImV4cCI6MTc3MjkyMjE4N30.W5hZ8H3ZyNID_bjKN6aR3B7yOhX_Uw2avqeJgXUNcnI	{"ip":"176.51.74.192"}	2026-03-07 22:23:07.853	2026-02-28 22:23:07.854
cmm55hsub000amz1ftq5ghmkb	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMTIzODAsImV4cCI6MTc3MjgxNzE4MH0.gAWycoH0WIAjDZyfKBAHntKL9HXAAv58ofd73dduSdc	{"ip":"176.51.74.192"}	2026-03-06 17:13:00.994	2026-02-27 17:13:00.995
cmm563yns0001mk1eq8eybmrb	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMTM0MTQsImV4cCI6MTc3MjgxODIxNH0.2rQGew3-nhJvE6N9Txuz36o7rcEF2jDN6UjROn66YzU	{"ip":"176.51.74.192"}	2026-03-06 17:30:14.966	2026-02-27 17:30:14.968
cmm58gcun0005ls1e1rssxekt	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMTczNTIsImV4cCI6MTc3MjgyMjE1Mn0.j3451P_bbM5IcDNCT4K-7_f-rBLizZdqWYOc9RNZQ04	{"ip":"176.51.74.192"}	2026-03-06 18:35:52.462	2026-02-27 18:35:52.464
cmm591smn000dls1ev14z370o	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMTgzNTIsImV4cCI6MTc3MjgyMzE1Mn0.TGvOrpmh5HWhVDT_bLFahzkpav0CThOL9QAeSDa8ASc	{"ip":"176.51.74.192"}	2026-03-06 18:52:32.686	2026-02-27 18:52:32.688
cmm59n2ik0001qt1ertlwddjg	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMTkzNDUsImV4cCI6MTc3MjgyNDE0NX0.iKM5JLP3OgjxdQhasPwO7iKnefK-IspoBae92cONsws	{"ip":"176.51.74.192"}	2026-03-06 19:09:05.275	2026-02-27 19:09:05.276
cmm5a76vy0003qt1e4m8azsaw	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjAyODQsImV4cCI6MTc3MjgyNTA4NH0.1AP3TY0xnMRFEJLPliulhILzPGbBDObyg316fzLqZCM	{"ip":"176.51.74.192"}	2026-03-06 19:24:44.061	2026-02-27 19:24:44.062
cmm5akrrn0001mu1eaqdyh8ae	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjA5MTcsImV4cCI6MTc3MjgyNTcxN30.wW5vbulIs-lB8UjrpK9cp2nqQuUBDyj8G4jN88NjRfI	{"ip":"176.51.74.192"}	2026-03-06 19:35:17.65	2026-02-27 19:35:17.652
cmm5akt7d0003mu1egj1uvpsp	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjA5MTksImV4cCI6MTc3MjgyNTcxOX0.GQ8DXvqSbyi6nFsYFDDxJ3GRMzClaeXds8KnkVAyuUk	{"ip":"176.51.74.192"}	2026-03-06 19:35:19.513	2026-02-27 19:35:19.514
cmm5akuak0005mu1eqk4hb2j4	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjA5MjAsImV4cCI6MTc3MjgyNTcyMH0.dCJL0UtaXq2uaXKCyCJaWpn57t0_T8n_kaKvkw9bAQ8	{"ip":"176.51.74.192"}	2026-03-06 19:35:20.923	2026-02-27 19:35:20.925
cmm5akx7i0007mu1euwskwulm	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjA5MjQsImV4cCI6MTc3MjgyNTcyNH0.sAWpicQI6Ow6L2E3eYB5qTca4RkxXYB6k9gOYhv_ST4	{"ip":"176.51.74.192"}	2026-03-06 19:35:24.701	2026-02-27 19:35:24.702
cmm5al2lo0009mu1e6e60d5em	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMjA5MzEsImV4cCI6MTc3MjgyNTczMX0.xFc0SJC8crLo9fuHJ4Vc-1Sz4flyEuatSoYHfZycWxE	{"ip":"176.51.74.192"}	2026-03-06 19:35:31.692	2026-02-27 19:35:31.693
cmm5allex000bmu1e3zk7dtcd	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjA5NTYsImV4cCI6MTc3MjgyNTc1Nn0.5ulaL5A8KBTUIYHHXCUg57K-a_3n2LsPxR5DH43ouc0	{"ip":"176.51.74.192"}	2026-03-06 19:35:56.072	2026-02-27 19:35:56.073
cmm5almwm000dmu1e038kb3zc	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjA5NTgsImV4cCI6MTc3MjgyNTc1OH0.lXyK0FrB6pT7smEpdjYcAH2jQfkom7NsaG2Fb-w4agw	{"ip":"176.51.74.192"}	2026-03-06 19:35:58.005	2026-02-27 19:35:58.006
cmm5am6t2000fmu1ee643y8vo	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMjA5ODMsImV4cCI6MTc3MjgyNTc4M30.V9rGWj_-ymdaUA2CT8B0HPkhd0clGWf8rq52GR-nylU	{"ip":"176.51.74.192"}	2026-03-06 19:36:23.797	2026-02-27 19:36:23.798
cmm5an0cj000hmu1e4ehw4nlj	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMjEwMjIsImV4cCI6MTc3MjgyNTgyMn0.dYHU6rG54GdnrrCBjZZGCCSSO872pHGsKap-UcA5U8Y	{"ip":"176.51.74.192"}	2026-03-06 19:37:02.082	2026-02-27 19:37:02.084
cmm5aoyov000jmu1ehc4fhjko	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjExMTMsImV4cCI6MTc3MjgyNTkxM30.Dxjok-xgoJHhDI6Dvstvi21F8byZerktB_o-tJKciEI	{"ip":"176.51.74.192"}	2026-03-06 19:38:33.245	2026-02-27 19:38:33.247
cmm5ap19w000lmu1elitk8cgv	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjExMTYsImV4cCI6MTc3MjgyNTkxNn0.vZYKDQiGxO5pgj-Qday5fMkhBrGeGnpMX6Hu-UoUMow	{"ip":"176.51.74.192"}	2026-03-06 19:38:36.594	2026-02-27 19:38:36.596
cmm5apngk000nmu1exheb8wcs	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjExNDUsImV4cCI6MTc3MjgyNTk0NX0.4r9nnxl7FixQPLbHj7rDFY0Feyd_Q5ROYUozYXF15BQ	{"ip":"176.51.74.192"}	2026-03-06 19:39:05.346	2026-02-27 19:39:05.348
cmm5aq8so000pmu1efe7q843k	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjExNzIsImV4cCI6MTc3MjgyNTk3Mn0.6wC3QDzATOQmL-drkkrUPrP7eYlhV_luhTIGN2nzVDY	{"ip":"176.51.74.192"}	2026-03-06 19:39:32.997	2026-02-27 19:39:33
cmm5aq9ty000rmu1eskc95haz	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjExNzQsImV4cCI6MTc3MjgyNTk3NH0.epY-t5dadEWdhFS2AnTm0-cBckJQQrml15IT7sTOwLM	{"ip":"176.51.74.192"}	2026-03-06 19:39:34.341	2026-02-27 19:39:34.342
cmmhq6i7d0005qf161xkyahsg	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3Mjk3MjcyMCwiZXhwIjoxNzczNTc3NTIwfQ.dHFoJFQFGpSAnPHBOwWXj14XWgMCqCcnSRNCsZnpcD0	{"ip":"unknown"}	2026-03-15 12:25:20.04	2026-03-08 12:25:20.041
cmmjiodyf000dqf16iwz87aa3	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzA4MTA0OSwiZXhwIjoxNzczNjg1ODQ5fQ.Zriz65JsxoQI6Tk2M_utHKgHN6T7XzdouIjn1B84tNk	{"ip":"unknown"}	2026-03-16 18:30:49.766	2026-03-09 18:30:49.767
cmm717q240001qg160bj7iryl	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjMyNjEyNCwiZXhwIjoxNzcyOTMwOTI0fQ.iTsyQvM9F4Nl1i4jFagxqY-5nZiUexbForjQZeTkbmg	{"ip":"176.51.74.192"}	2026-03-08 00:48:44.715	2026-03-01 00:48:44.716
cmm5ayetw0001nx1erpj2bmuq	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjE1NTQsImV4cCI6MTc3MjgyNjM1NH0.UnuV3PuqKTdxKmQliElgUfj-5XGc-F5_-7QiNCIddF8	{"ip":"176.51.74.192"}	2026-03-06 19:45:54.067	2026-02-27 19:45:54.068
cmm5azm8c0005nx1e6zixr18m	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjE2MTAsImV4cCI6MTc3MjgyNjQxMH0.o7tN1s2712YiQFNtU74IbbRD2WsU837sI1GYNnYPl0I	{"ip":"176.51.74.192"}	2026-03-06 19:46:50.315	2026-02-27 19:46:50.316
cmm5b1omf0007nx1eo1ehp0s3	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjE3MDYsImV4cCI6MTc3MjgyNjUwNn0.6-S3UZRkCwhR5JXBhttM9VxEl7fpSUXHgVAaGYCFa8E	{"ip":"176.51.74.192"}	2026-03-06 19:48:26.726	2026-02-27 19:48:26.727
cmm5bk1dx0001o51fsbnavdbw	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjI1NjMsImV4cCI6MTc3MjgyNzM2M30.7WndR_vQAzTQQhZ7OVOYn4llyCZ4dtkTTGsLKmObR38	{"ip":"176.51.74.192"}	2026-03-06 20:02:43.076	2026-02-27 20:02:43.077
cmm5bk5rh0003o51f4y0lrsz1	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMjI1NjgsImV4cCI6MTc3MjgyNzM2OH0.haYePelpwZWj0VLYA1MJxCKM95IL16qjT4thcX1paVg	{"ip":"176.51.74.192"}	2026-03-06 20:02:48.748	2026-02-27 20:02:48.749
cmm5blcp20005o51fljpnl8xd	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjI2MjQsImV4cCI6MTc3MjgyNzQyNH0.t-OkxQhc6r4mX8zlA8zsIMDaqrnaiFZpGPY3dtNBt78	{"ip":"176.51.74.192"}	2026-03-06 20:03:44.389	2026-02-27 20:03:44.39
cmm5bm53y0007o51fojvb6uai	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjI2NjEsImV4cCI6MTc3MjgyNzQ2MX0.VvWdOE38XZOTw9iNoWZTswduM1tabWpc3uHFkWPCGv8	{"ip":"176.51.74.192"}	2026-03-06 20:04:21.213	2026-02-27 20:04:21.215
cmm5bm8xo0009o51ffjcl85tt	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMjI2NjYsImV4cCI6MTc3MjgyNzQ2Nn0.bZM1YoAYRPPWuLHoOo1oNN9ro8ZrL9uAXyNBxWUzxOA	{"ip":"176.51.74.192"}	2026-03-06 20:04:26.171	2026-02-27 20:04:26.172
cmm5bwjiz0001qt16dgf0vtp1	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjMxNDYsImV4cCI6MTc3MjgyNzk0Nn0.ndIiA76IVIozaaVx6pBEnAQbNvsnFR8ZtDMS41HHtfI	{"ip":"176.51.74.192"}	2026-03-06 20:12:26.458	2026-02-27 20:12:26.46
cmm5bz5z40003qt166elefnch	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMjMyNjgsImV4cCI6MTc3MjgyODA2OH0.12lvqWm9cVGCG5-Fgp6-2KucJ3Rc_yUWMTfGtVuFRLE	{"ip":"176.51.74.192"}	2026-03-06 20:14:28.863	2026-02-27 20:14:28.864
cmm5cdwto0005pa168jga2hkx	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMjM5NTYsImV4cCI6MTc3MjgyODc1Nn0.w2-n9oPCjtW5BHOuIUrND9NbZYNX24cs6fHLgNxvNuU	{"ip":"176.51.74.192"}	2026-03-06 20:25:56.843	2026-02-27 20:25:56.844
cmm5cxnwp000bpa16qw0d1ooo	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyMjQ4NzgsImV4cCI6MTc3MjgyOTY3OH0.Ng3xbpWb-YP5uVw5Hw_1wZWlb74wizEK6Tvr2U9eydo	{"ip":"176.51.74.192"}	2026-03-06 20:41:18.408	2026-02-27 20:41:18.409
cmm5gdp7n000hpa16dfcjp36g	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyMzA2NjUsImV4cCI6MTc3MjgzNTQ2NX0.DBtahiL97KAUpC6iEapEfnVeBfFVPMPrO3LQzu_F93o	{"ip":"176.51.74.192"}	2026-03-06 22:17:45.442	2026-02-27 22:17:45.443
cmm63qyww000jpa1644fmdels	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyNjk5MTUsImV4cCI6MTc3Mjg3NDcxNX0._yqZSI1B-kjeWA9DyvYdpjzHrMQecGx65jDnYGYVO18	{"ip":"176.51.74.192"}	2026-03-07 09:11:55.71	2026-02-28 09:11:55.711
cmm667aim000lpa16efaiz5lo	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIyNzQwMzYsImV4cCI6MTc3Mjg3ODgzNn0.G_U_hhE6DNMbpD16MTUL3l_4vxTfZLdtUBNQWOuCF-A	{"ip":"176.51.74.192"}	2026-03-07 10:20:36.475	2026-02-28 10:20:36.478
cmm6y352c0005o417fi0onwot	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIzMjA4NzIsImV4cCI6MTc3MjkyNTY3Mn0.xY5WzwH9dUmLdCzJDa0mP2mfTzzJ-cSYwXnizEf8ewM	{"ip":"176.51.74.192"}	2026-03-07 23:21:12.035	2026-02-28 23:21:12.036
cmm6htivw0007pa16404cga5i	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyOTM1NDksImV4cCI6MTc3Mjg5ODM0OX0.gT1UVdSqN5qqUryUqPTkNLbJzrunuzeiY67BzIEVI9w	{"ip":"176.51.74.192"}	2026-03-07 15:45:49.531	2026-02-28 15:45:49.532
cmm6j34lr0005p516n2nwhpot	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyOTU2NzcsImV4cCI6MTc3MjkwMDQ3N30.rccR2hTlLUDG5zjOlUvrRwnt8VKRy-9um_TTI05L-gg	{"ip":"176.51.74.192"}	2026-03-07 16:21:17.198	2026-02-28 16:21:17.199
cmm6jto5w0003jz17isqxejoc	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyOTY5MTUsImV4cCI6MTc3MjkwMTcxNX0.fiZsHd9nx3mpLQNBFXjw84OjY7KQqZGi5bRFrHOTFNg	{"ip":"176.51.74.192"}	2026-03-07 16:41:55.603	2026-02-28 16:41:55.604
cmm6l9zmr0009lk16iqe8r8kn	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIyOTkzNTYsImV4cCI6MTc3MjkwNDE1Nn0.626zDuWQDlXOcu8oSJDB5Syn8Anz-5A4zPa9lZwwwGU	{"ip":"176.51.74.192"}	2026-03-07 17:22:36.578	2026-02-28 17:22:36.579
cmm6m6w0v0003nr16pquvvfd3	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIzMDA4OTEsImV4cCI6MTc3MjkwNTY5MX0._jiOQ5pIZR_OI5FUiKvtkDqKWQ3As-N3OAvkmBydRTc	{"ip":"176.51.74.192"}	2026-03-07 17:48:11.55	2026-02-28 17:48:11.551
cmm6mq9xx0005nr16fdvwednv	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIzMDE3OTYsImV4cCI6MTc3MjkwNjU5Nn0.OVznDPmSK_z82w7DPv4__r7Zd1Bc0pmIUOxf8naoxcI	{"ip":"176.51.74.192"}	2026-03-07 18:03:16.052	2026-02-28 18:03:16.053
cmm6nlnna000fo1157pu071s1	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIzMDMyNjAsImV4cCI6MTc3MjkwODA2MH0.7hkXdpDcjGnnu48LC3Zhv39jxQbNIpB-wbIaU_dt25s	{"ip":"176.51.74.192"}	2026-03-07 18:27:40.149	2026-02-28 18:27:40.15
cmm6z58xz0001p11674vm00j0	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIzMjI2NDksImV4cCI6MTc3MjkyNzQ0OX0.vkoDrp-3s8EFBsp5YOV3ySLIuw1tqY8qqbqOkaV19to	{"ip":"176.51.74.192"}	2026-03-07 23:50:49.99	2026-02-28 23:50:49.991
cmm70ltr50004oe16m9jfp8q3	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjMyNTEwMywiZXhwIjoxNzcyOTI5OTAzfQ.C_YZhkfsL0DHRxL6_R3YF9_zCc7xzYRkSGyh06-AIZg	{"ip":"176.51.74.192"}	2026-03-08 00:31:43.072	2026-03-01 00:31:43.074
cmm71w0n3000aqg163lct6nf7	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzIzMjcyNTgsImV4cCI6MTc3MjkzMjA1OH0.jJjSm2KLBdcidRKY8YudqtdGkmzZWIm8NBhhozxwMlo	{"ip":"176.51.74.192"}	2026-03-08 01:07:38.174	2026-03-01 01:07:38.175
cmm7nb9xf000eqg161hf0nfuc	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjM2MzI0MSwiZXhwIjoxNzcyOTY4MDQxfQ.aRp4nMdzPKh05Y4M0OMRYXAE2rO2CsJhuUqQuohYDXA	{"ip":"89.113.141.222"}	2026-03-08 11:07:21.986	2026-03-01 11:07:21.987
cmm7xkkrm0001qh16clsbgsbl	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjM4MDQ3MiwiZXhwIjoxNzcyOTg1MjcyfQ.zBzLblzR64vqtmySNeEcf2lvfzWZxzEUC2owagDlmr4	{"ip":"176.51.74.192"}	2026-03-08 15:54:32.097	2026-03-01 15:54:32.098
cmm8a0poa0005mq16jqvfaodi	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI0MDEzODAsImV4cCI6MTc3MzAwNjE4MH0.6TLOVrDP84scakH-2SPlYdeCc0eEnUahmul_poLz8fY	{"ip":"176.51.74.192"}	2026-03-08 21:43:00.345	2026-03-01 21:43:00.346
cmm8hfgz70007mq16x34zhklb	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzI0MTM4MjYsImV4cCI6MTc3MzAxODYyNn0.vaLeoa7ZT5eanA5nW1-cF1X-91hZVwSNtk3nwtoCdBg	{"ip":"176.119.147.58"}	2026-03-09 01:10:26.226	2026-03-02 01:10:26.227
cmmjy42mt0007pj166nw6vgwp	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxMDY5NzUsImV4cCI6MTc3MzcxMTc3NX0.p_VmatD5SbWj6eP9E2mYBqkcmbjznTFH51ydSIQuA_s	{"ip":"unknown"}	2026-03-17 01:42:55.828	2026-03-10 01:42:55.83
cmm998x37000bmq161qm1uez2	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI0NjA1NDksImV4cCI6MTc3MzA2NTM0OX0.VK365R3KpXvrNpH3K4nT8W5hFWt-WMZt9uADUy4GTWI	{"ip":"176.51.74.192"}	2026-03-09 14:09:09.762	2026-03-02 14:09:09.764
cmm6s8knr0003qg16wrau0v6b	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIzMTEwNDcsImV4cCI6MTc3MjkxNTg0N30.4b0ZneF4sFEjWkpskAWaZyR2VL-psMCrpDOKNO3j9pI	{"ip":"176.51.74.192"}	2026-03-07 20:37:27.83	2026-02-28 20:37:27.831
cmm9ln3mz000fmq16r30cnd1e	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjQ4MTM2NiwiZXhwIjoxNzczMDg2MTY2fQ.PM3A5o-YucaHeJhY0ZVV2QZk_l4CXqVFETfIPyGS3QY	{"ip":"176.119.147.58"}	2026-03-09 19:56:06.826	2026-03-02 19:56:06.827
cmm6st15f0005nl16otv1mdm8	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIzMTIwMDIsImV4cCI6MTc3MjkxNjgwMn0.I-y4_elBmKJQk5lePtY6QM-7q4ofPYm7HT8jFIu5_rg	{"ip":"176.51.74.192"}	2026-03-07 20:53:22.323	2026-02-28 20:53:22.324
cmm6te32w0001le16cz7psws5	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzIzMTI5ODQsImV4cCI6MTc3MjkxNzc4NH0.fzZMdigvU4I7WLVLm-ceWeGihCBtmE3-acbn5eNlN4g	{"ip":"176.51.74.192"}	2026-03-07 21:09:44.599	2026-02-28 21:09:44.601
cmm9lpnaq000hmq165pkc0s1w	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjQ4MTQ4NSwiZXhwIjoxNzczMDg2Mjg1fQ.6c_3qP963irdDNOzMxRGzd85KZeS02gonDdrQ3rM05E	{"ip":"176.51.74.192"}	2026-03-09 19:58:05.617	2026-03-02 19:58:05.618
cmm9q7j7x000jmq16j7soew8f	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjQ4OTAzOCwiZXhwIjoxNzczMDkzODM4fQ.SonSdHlcgeCsEVB4S7sNVvea-6CUC-TSZnZBlsEX38o	{"ip":"176.119.147.58"}	2026-03-09 22:03:58.604	2026-03-02 22:03:58.606
cmmaj1mt7000lmq16yqf7i8mv	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MjUzNzQ3MiwiZXhwIjoxNzczMTQyMjcyfQ.nNpNiVgqLwkTsSDRlzeM_ejVQgXWvb8oSFs0btP8ZCk	{"ip":"176.51.74.192"}	2026-03-10 11:31:12.186	2026-03-03 11:31:12.187
cmmkpneaj000lpj162kg85ros	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxNTMyMjcsImV4cCI6MTc3Mzc1ODAyN30.qf-r5QVVJlcBc3rQ-YKwSacyC7i02GBP-Y5ROAGMxg0	{"ip":"unknown"}	2026-03-17 14:33:47.034	2026-03-10 14:33:47.036
cmmdguezs0001s016zdzdg29b	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzI3MTUxNzQsImV4cCI6MTc3MzMxOTk3NH0.k9dY0u1WPhC3cjfBo5idQLUzmMYRm2I-xg0bo-rneJw	{"ip":"212.164.40.149"}	2026-03-12 12:52:54.759	2026-03-05 12:52:54.76
cmmdk1jgl000brp164bz6rl16	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3MjA1NDUsImV4cCI6MTc3MzMyNTM0NX0.i9LehBElBIvebboMHIn_HHRFx2bHzjnFF3det9GyUfw	{"ip":"212.164.40.149"}	2026-03-12 14:22:25.989	2026-03-05 14:22:25.989
cmmdlfj2x0001tf15ldrxl0so	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3MjI4NzgsImV4cCI6MTc3MzMyNzY3OH0.I7fOr_9DTDjPKHI0dTDBZHHiqHzRoZA8WWoVfz8jlz4	{"ip":"212.164.40.149"}	2026-03-12 15:01:18.296	2026-03-05 15:01:18.297
cmmdrkex80001pg16jd20x9g6	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzI3MzMxODMsImV4cCI6MTc3MzMzNzk4M30.AuK5BA6J8GGbHSYlJro2MQyvTMA2Se8JWtd2ri_IbzM	{"ip":"212.164.40.149"}	2026-03-12 17:53:03.883	2026-03-05 17:53:03.884
cmmdsdp7g000gs616qoz51ipg	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3MjczNDU1MCwiZXhwIjoxNzczMzM5MzUwfQ.OjBUATBeAPRFhsadPTBtRi7u_68ry1Gr0VHykt0k7bk	{"ip":"212.164.40.149"}	2026-03-12 18:15:50.235	2026-03-05 18:15:50.236
cmmdv6mz80001qt16tz8k4wz8	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3MjczOTI1OSwiZXhwIjoxNzczMzQ0MDU5fQ.NYWBsvsImQhGIx967CT5T8N4mLKMxIQrM-4Oau6wIi0	{"ip":"212.164.40.149"}	2026-03-12 19:34:19.603	2026-03-05 19:34:19.605
cmmdwabv60003qt16vi1x7u8g	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjc0MTExMSwiZXhwIjoxNzczMzQ1OTExfQ.4tK5fr1CMb2KiE20NpHhMy8nuNPbNfaz9EqopIIySgc	{"ip":"212.164.40.149"}	2026-03-12 20:05:11.44	2026-03-05 20:05:11.442
cmme0cewz0003nu16c85uo8rh	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjc0NzkyNywiZXhwIjoxNzczMzUyNzI3fQ.WHwt6gKnQH1mLiaSgFsEvEUlj-EuItpWFXk_0KsmYwk	{"ip":"212.164.40.149"}	2026-03-12 21:58:47.17	2026-03-05 21:58:47.171
cmmfpb0560001qf16d9ozvq4u	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjg1MDMxNywiZXhwIjoxNzczNDU1MTE3fQ.6_bP74pRl9bzpDAc-rcHYymo8jOUfemM0KHME1xg_FA	{"ip":"unknown"}	2026-03-14 02:25:17.945	2026-03-07 02:25:17.946
cmme0sqt20007nu16ikczgk55	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3NDg2ODksImV4cCI6MTc3MzM1MzQ4OX0.79EDYUk6AuK6gMzVQ3u_0J2u1h2qMgPlxUEQatHeAB0	{"ip":"212.164.40.149"}	2026-03-12 22:11:29.077	2026-03-05 22:11:29.078
cmme1jb7a0005o916w3lthecb	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3NDk5MjgsImV4cCI6MTc3MzM1NDcyOH0.2GQblJe4PbMlUWueoJpE0AMzRl85id7SYqCL_G6U2dE	{"ip":"212.164.40.149"}	2026-03-12 22:32:08.566	2026-03-05 22:32:08.567
cmme1jk8d0007o916zd2ry7kr	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjc0OTk0MCwiZXhwIjoxNzczMzU0NzQwfQ._fj5tOHKBHpby9ZG8D_5ZpeX-mrEBJOn_1A2t0ZpifM	{"ip":"212.164.40.149"}	2026-03-12 22:32:20.268	2026-03-05 22:32:20.269
cmme1pnol000io916erjf908d	cmme1pno4000go916ujm52vko	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1lMXBubzQwMDBnbzkxNnVqbTUydmtvIiwibG9naW4iOiJWYXN5YTEiLCJyb2xlIjoiRU1QTE9ZRUUiLCJpYXQiOjE3NzI3NTAyMjQsImV4cCI6MTc3MzM1NTAyNH0.z1ycz812uPU4iKSy0efdPAD4U3hjnEhO8bethS6LOX0	{"ip":"212.164.40.149"}	2026-03-12 22:37:04.677	2026-03-05 22:37:04.677
cmme2bfv9000mo916fx7yn19b	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjc1MTI0MCwiZXhwIjoxNzczMzU2MDQwfQ.uq8zPjRjVx1ctqtd_UwcXQ8nTIBYnA3PU7BllV-2EY4	{"ip":"212.164.40.149"}	2026-03-12 22:54:00.98	2026-03-05 22:54:00.981
cmme2qvd70001mk168n2r03lo	cmme1pno4000go916ujm52vko	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1lMXBubzQwMDBnbzkxNnVqbTUydmtvIiwibG9naW4iOiJWYXN5YTEiLCJyb2xlIjoiRU1QTE9ZRUUiLCJpYXQiOjE3NzI3NTE5NjAsImV4cCI6MTc3MzM1Njc2MH0.PJKVastN_64MMflM4i_l0Ee3IVyN-YFro80oNBGDW_g	{"ip":"212.164.40.149"}	2026-03-12 23:06:00.906	2026-03-05 23:06:00.908
cmme2wfu10003mk16120mf18j	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjc1MjIyMCwiZXhwIjoxNzczMzU3MDIwfQ.wfi0C95rNAbRyqF9jx1Maa41wMBNJQtOthWxS2NFFWY	{"ip":"212.164.40.149"}	2026-03-12 23:10:20.712	2026-03-05 23:10:20.713
cmmlfi80q0005qt17qh5dzbaa	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3MzE5NjY1NSwiZXhwIjoxNzczODAxNDU1fQ.CTzV_p1pyL_1q2KglU7YoF6BBDRrrKzsawwPq_Sax_Y	{"ip":"unknown"}	2026-03-18 02:37:35.641	2026-03-11 02:37:35.642
cmmjm6lmt0003pj16agfmuis5	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMwODY5MzgsImV4cCI6MTc3MzY5MTczOH0.9p-gPolI7Hg_pSNEKdr7Lk2dlUvr52te2_cnAD1cSZI	{"ip":"unknown"}	2026-03-16 20:08:58.372	2026-03-09 20:08:58.373
cmme3rosf0009pd16a8yju8hi	cmme1pno4000go916ujm52vko	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1lMXBubzQwMDBnbzkxNnVqbTUydmtvIiwibG9naW4iOiJWYXN5YTEiLCJyb2xlIjoiRU1QTE9ZRUUiLCJpYXQiOjE3NzI3NTM2NzgsImV4cCI6MTc3MzM1ODQ3OH0.OFxGMwk-pY8Ko7bZZ9AQh1nV5hFMW0MH7lNWZt5YJ_8	{"ip":"212.164.40.149"}	2026-03-12 23:34:38.655	2026-03-05 23:34:38.656
cmme3v10h000dpd16fhypvxn5	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3NTM4MzQsImV4cCI6MTc3MzM1ODYzNH0.5LFfI-KqDLfUKKbuynAc-PNKSEnyMGktEDZeuT-9PZg	{"ip":"212.164.40.149"}	2026-03-12 23:37:14.464	2026-03-05 23:37:14.465
cmme4h40e0001pd16mvtoarfy	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjc1NDg2NCwiZXhwIjoxNzczMzU5NjY0fQ.6gN-bgXvq29aF7Mv7ohBwryLievx97LrjnTS4WqbT0Q	{"ip":"212.164.40.149"}	2026-03-12 23:54:24.781	2026-03-05 23:54:24.782
cmml2nul0000dqx16umo7tlo0	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzMxNzUwODMsImV4cCI6MTc3Mzc3OTg4M30.Vfbb3JrN_g691SoDZAOZiRUQBkFA8e3n18exXM3UOtQ	{"ip":"unknown"}	2026-03-17 20:38:03.154	2026-03-10 20:38:03.155
cmml2pobo0003p617ojb9d12l	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE3NTE2OCwiZXhwIjoxNzczNzc5OTY4fQ.Bi5tpTHoii4eNIAYWpVIsyGzk_2c-hhUOBXm0pFqRR4	{"ip":"unknown"}	2026-03-17 20:39:28.355	2026-03-10 20:39:28.356
cmml4o82e000ho216ctfn09at	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE3ODQ1OSwiZXhwIjoxNzczNzgzMjU5fQ.s3VJNlPUNTbFSWd-HyzkEhafEHJQvyTFLuuJhVROEtM	{"ip":"unknown"}	2026-03-17 21:34:19.861	2026-03-10 21:34:19.862
cmml5jqd80001qh16brhk58fl	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE3OTkyOSwiZXhwIjoxNzczNzg0NzI5fQ.Y5mHIJ_pqWuyLaKqvWdZBiHenuzkPMiCKJNdMAyTMac	{"ip":"unknown"}	2026-03-17 21:58:49.915	2026-03-10 21:58:49.916
cmml736vb0009qr16myp5bocr	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxODI1MTcsImV4cCI6MTc3Mzc4NzMxN30.0sdhjw6-PJC9zTd3Cej_i1Vp9npdOeR58wIrZ2hmMUk	{"ip":"unknown"}	2026-03-17 22:41:57.382	2026-03-10 22:41:57.383
cmmlbanbz0009o616drlms6vb	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE4OTU4MywiZXhwIjoxNzczNzk0MzgzfQ.TkdlpHDS18K286m50JNz-a7ulfhM-cFwVOrFExGSo6M	{"ip":"unknown"}	2026-03-18 00:39:43.773	2026-03-11 00:39:43.775
cmmlbhc6l0001rw16amtpa5o4	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE4OTg5NSwiZXhwIjoxNzczNzk0Njk1fQ.FnpJTvvw18LpdoyynrYHbP9rlkPshA8J14rSMyiT3p4	{"ip":"unknown"}	2026-03-18 00:44:55.916	2026-03-11 00:44:55.918
cmme5319g0001o016a0tcew4l	cmme1pno4000go916ujm52vko	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1lMXBubzQwMDBnbzkxNnVqbTUydmtvIiwibG9naW4iOiJWYXN5YTEiLCJyb2xlIjoiRU1QTE9ZRUUiLCJpYXQiOjE3NzI3NTU4ODcsImV4cCI6MTc3MzM2MDY4N30.qVNAPkLRQxL9MujUja6J5f7KuFX0-bQSuYYF1lU6OmU	{"ip":"212.164.40.149"}	2026-03-13 00:11:27.65	2026-03-06 00:11:27.652
cmme5993n0003nv16atqb54aq	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3NTYxNzcsImV4cCI6MTc3MzM2MDk3N30.CC-HR-ZWhpCQn2EyqfK9uR19leVP52E_LX-Hi80h5WU	{"ip":"212.164.40.149"}	2026-03-13 00:16:17.746	2026-03-06 00:16:17.747
cmmervt740001nv167dfyew6q	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3OTQxODEsImV4cCI6MTc3MzM5ODk4MX0.XuURTAqF6hrNsX5PFLLvk8q8QAh5OMUog6FWvsdQMPs	{"ip":"212.164.40.149"}	2026-03-13 10:49:41.775	2026-03-06 10:49:41.776
cmmetsthw0001tb16culn5rzb	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3Mjc5NzQwMSwiZXhwIjoxNzczNDAyMjAxfQ.vWI0tC3ZfzIBXpniy1aIafRomO1N2Zi6NuPLKbSpJNM	{"ip":"212.164.40.149"}	2026-03-13 11:43:21.419	2026-03-06 11:43:21.428
cmmeuli6l0001s316uxo97xdz	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3OTg3MzksImV4cCI6MTc3MzQwMzUzOX0._Y-5Hd17vFIiDIEKWttUnvXFVfh4EeqXIczAF4_bOmI	{"ip":"212.164.40.149"}	2026-03-13 12:05:39.787	2026-03-06 12:05:39.789
cmmev6lyz000bs3161bogpkpn	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI3OTk3MjQsImV4cCI6MTc3MzQwNDUyNH0.YSs8_hN450Kusozcac9v32mWgQ2JYctFc5Qdv_mZjwI	{"ip":"212.164.40.149"}	2026-03-13 12:22:04.474	2026-03-06 12:22:04.476
cmmjq9o070005pj16kwzkx96u	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMwOTM3OTksImV4cCI6MTc3MzY5ODU5OX0._K5S45HLO6h4_7ED_Z4HScbPGywIT0x3ESCXxGhC5UE	{"ip":"unknown"}	2026-03-16 22:03:19.877	2026-03-09 22:03:19.879
cmmk4a31n000bpj1624m59jku	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxMTczMzMsImV4cCI6MTc3MzcyMjEzM30.jovvG97ZvU_BB2bhMTDNbChK-9gDP_Mvl1Wg-rE1qfY	{"ip":"unknown"}	2026-03-17 04:35:33.993	2026-03-10 04:35:33.995
cmmkotcn5000hpj163d44mf1i	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxNTE4MjUsImV4cCI6MTc3Mzc1NjYyNX0.uQgwsO7YFw-NfBDorcODtsgtenaqcgsmJ_DVivFYaUE	{"ip":"unknown"}	2026-03-17 14:10:25.215	2026-03-10 14:10:25.217
cmml0ws1d0005qx16j4lqwzxj	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxNzIxNDAsImV4cCI6MTc3Mzc3Njk0MH0.6Qn5UceTPtFawJkqGB4RnLaZP7bYh-inywRiDhHimWE	{"ip":"unknown"}	2026-03-17 19:49:00.527	2026-03-10 19:49:00.529
cmml1ufni0009qx16pi6w3tk2	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzMxNzM3MTAsImV4cCI6MTc3Mzc3ODUxMH0.4hQ7pph4blFR-BTdHWxyZmtxqq1UKAABx7X_iF0ZaDg	{"ip":"unknown"}	2026-03-17 20:15:10.78	2026-03-10 20:15:10.781
cmml39cv00007p617fvkror7z	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE3NjA4NiwiZXhwIjoxNzczNzgwODg2fQ.70rSQS2oShjmNtpteYC1rQjcJov-fEIqL4UAxw_r8R8	{"ip":"unknown"}	2026-03-17 20:54:46.619	2026-03-10 20:54:46.62
cmmf0852l0003mv16dacf5tud	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI4MDgxOTMsImV4cCI6MTc3MzQxMjk5M30.gX_T-yp3QQc6l3t_Lebe3IxOuXB74cHo9BvLBHDqeL0	{"ip":"212.164.40.149"}	2026-03-13 14:43:13.963	2026-03-06 14:43:13.965
cmmf12s4r0001pd16hx8xzgj3	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI4MDk2MjMsImV4cCI6MTc3MzQxNDQyM30.JdFNMMcKtdLYh2b4Wsx4v2ejgmgjwsc4mFrPgjggpq4	{"ip":"176.119.147.58"}	2026-03-13 15:07:03.53	2026-03-06 15:07:03.531
cmmfdlueo0001mk16dfdjugrf	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI4MzA2NjgsImV4cCI6MTc3MzQzNTQ2OH0.TjprVykW0zoIKotWDE646crb30axgSoQiQGyC6IZenk	{"ip":"unknown"}	2026-03-13 20:57:48.334	2026-03-06 20:57:48.336
cmml41w7p000fo216h6ut33cc	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE3NzQxOCwiZXhwIjoxNzczNzgyMjE4fQ.pclGEoh_eVPVcowsWeqkeGnSzC3-VPdIEPlOVSxVEF4	{"ip":"unknown"}	2026-03-17 21:16:58.068	2026-03-10 21:16:58.069
cmml509ik000jo2161wenfuyr	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE3OTAyMSwiZXhwIjoxNzczNzgzODIxfQ.aH20qGnw94CbDd8PUznyxh1xbAvwiYOF49dHmQ4yn2o	{"ip":"unknown"}	2026-03-17 21:43:41.611	2026-03-10 21:43:41.612
cmmfjx6y70001s216o173u74d	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzI4NDEyNzUsImV4cCI6MTc3MzQ0NjA3NX0.AvkhGER_mzszMiKReymcX1F8YJG5tKrCaXTYMzz1AKQ	{"ip":"unknown"}	2026-03-13 23:54:35.501	2026-03-06 23:54:35.503
cmmfku5xd0001lu168ubmi7oc	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3Mjg0MjgxMywiZXhwIjoxNzczNDQ3NjEzfQ.ZXOvuSYyto7EAxl0G_PbaHPy1Z3BM8RU2zIsLPUvLkc	{"ip":"unknown"}	2026-03-14 00:20:13.824	2026-03-07 00:20:13.826
cmml6ylnt0005qr16rcnee1sj	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE4MjMwMywiZXhwIjoxNzczNzg3MTAzfQ.JxgMTFEnvG88Ina1X9Wt5BRCfFt29Kar3_14jqj-l9I	{"ip":"unknown"}	2026-03-17 22:38:23.273	2026-03-10 22:38:23.274
cmml7dfry000bqr164iotyofk	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE4Mjk5NSwiZXhwIjoxNzczNzg3Nzk1fQ.xBYnHFAB_f-pEJN1y1sclx9q6CY6_lHC7I7U6xzBDDc	{"ip":"unknown"}	2026-03-17 22:49:55.484	2026-03-10 22:49:55.486
cmmla0my2000fmz16uhz4aa40	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxODc0MzcsImV4cCI6MTc3Mzc5MjIzN30.tShOvAeYNwbAYWSjEXtYzwkgxo54243n_TH9dusC1wU	{"ip":"unknown"}	2026-03-18 00:03:57.097	2026-03-11 00:03:57.098
cmmlawpdk0001o6168ts1n6jt	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE4ODkzMywiZXhwIjoxNzczNzkzNzMzfQ.kWZJKtHNpSFstHBUkonZY_Jp19naQEACuYhO6cD07LQ	{"ip":"unknown"}	2026-03-18 00:28:53.239	2026-03-11 00:28:53.24
cmmlbshsw0005rw1691p9crfx	cmme1pno4000go916ujm52vko	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1lMXBubzQwMDBnbzkxNnVqbTUydmtvIiwibG9naW4iOiJWYXN5YTEiLCJyb2xlIjoiRU1QTE9ZRUUiLCJpYXQiOjE3NzMxOTA0MTYsImV4cCI6MTc3Mzc5NTIxNn0.0c3OEMzPGTZyDtXl8VTFVoEUmeT6WwHwHDrX6geBoFw	{"ip":"unknown"}	2026-03-18 00:53:36.415	2026-03-11 00:53:36.416
cmmlc9dcn0001nu16zmxfz81s	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzE5MTIwMywiZXhwIjoxNzczNzk2MDAzfQ.ygPsrM4qFI0Ig1duES44cSIabT8jw8lEt7M6WefnoUg	{"ip":"unknown"}	2026-03-18 01:06:43.798	2026-03-11 01:06:43.799
cmmlcecz70005nu16udjfs5q8	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMxOTE0MzYsImV4cCI6MTc3Mzc5NjIzNn0.K6vcMqisq_g48KpmbFsvTNRW7DtP0-tbQw8fMpL4QsY	{"ip":"unknown"}	2026-03-18 01:10:36.594	2026-03-11 01:10:36.595
cmmldyjwq000bmx16nmge21vy	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3MzE5NDA1OCwiZXhwIjoxNzczNzk4ODU4fQ.roHsWOLFqc13lERwRWvMpL7TZ-jHJhgx1jtcret2FYQ	{"ip":"unknown"}	2026-03-18 01:54:18.313	2026-03-11 01:54:18.314
cmmley8zp0003qt177ogp1dnf	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3MzE5NTcyMywiZXhwIjoxNzczODAwNTIzfQ.wW_dYPXivXFPjXXZICkzmEasg3eQZM-CFJ_W5fbe1bg	{"ip":"unknown"}	2026-03-18 02:22:03.78	2026-03-11 02:22:03.781
cmmlfise20001rx160ewjtoty	cmmdsbay70008s616zaz4lww3	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1kc2JheTcwMDA4czYxNnphejRsd3czIiwibG9naW4iOiJtYXNsZW5vazEyOTgiLCJyb2xlIjoiRVNUQUJMSVNITUVOVF9BRE1JTiIsImlhdCI6MTc3MzE5NjY4MiwiZXhwIjoxNzczODAxNDgyfQ.IcW7_k8NcIHPMDmy08K1Cz6ZxDiuCSRlXEveY5XWYIw	{"ip":"unknown"}	2026-03-18 02:38:02.041	2026-03-11 02:38:02.042
cmnes4e0c0007qy169jyxxi4r	cmnepzq4q0000tj3mb8m6hj5n	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW5lcHpxNHEwMDAwdGozbWI4bTZoajVuIiwibG9naW4iOiJBaG1lZE01RjkwIiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3NDk3MTM2NCwiZXhwIjoxNzc1NTc2MTY0fQ.VcXStAv-6SHgFBVq_S6I8bX6DcY58tIGXoqF3O1JpLg	{"ip":"unknown"}	2026-04-07 15:36:04.331	2026-03-31 15:36:04.332
cmmlkmm0o0003pd167uhzsey1	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMyMDUyNTgsImV4cCI6MTc3MzgxMDA1OH0.CrvFsibGQD0JP56sP_fjwKO1dfWxV3SGI6LvGdUKTag	{"ip":"unknown"}	2026-03-18 05:00:58.488	2026-03-11 05:00:58.489
cmng96fqm0005qn150sokfct2	cmnepzq4q0000tj3mb8m6hj5n	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW5lcHpxNHEwMDAwdGozbWI4bTZoajVuIiwibG9naW4iOiJBaG1lZE01RjkwIiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3NTA2MDQ3OSwiZXhwIjoxNzc1NjY1Mjc5fQ.xqKJ3y0qyA31BpgOGlMo92silowKA7wa3S9cmpaAok4	{"ip":"unknown"}	2026-04-08 16:21:19.533	2026-04-01 16:21:19.534
cmmm8051p0003p716m88sf68o	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMyNDQ1MjAsImV4cCI6MTc3Mzg0OTMyMH0.tM0B5cEsin9MSQkgiuu4bw0Fq0dNOefIwT7KDR9ybKA	{"ip":"unknown"}	2026-03-18 15:55:20.842	2026-03-11 15:55:20.845
cmmnrk5g30002pj16192jn81g	cmmnrk5ex0000pj16k8qj9sb2	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1ucms1ZXgwMDAwcGoxNms4cWo5c2IyIiwibG9naW4iOiJ0cmFkZXIxOSIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMzMzc4MzMsImV4cCI6MTc3Mzk0MjYzM30.QCbXhjMJuqE5UtAV6AaHoahw3CuK-vfOlhgZOQe_w1A	{"ip":"unknown"}	2026-03-19 17:50:33.362	2026-03-12 17:50:33.363
cmmntojkr000dpd17nlbvfblm	cmmnrk5ex0000pj16k8qj9sb2	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1ucms1ZXgwMDAwcGoxNms4cWo5c2IyIiwibG9naW4iOiJ0cmFkZXIxOSIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMzNDEzOTcsImV4cCI6MTc3Mzk0NjE5N30.qDW-yQMZALGBph-1X_Dkb_uEMzkya2uezjW91mNUF3o	{"ip":"unknown"}	2026-03-19 18:49:57.53	2026-03-12 18:49:57.531
cmmnv5lhx000npd17wcz94i8y	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzMzNDM4NzIsImV4cCI6MTc3Mzk0ODY3Mn0.j0jonGom5ZoAb4n_5xHaYAJbUWPB3tPf-VxIgQKb1lg	{"ip":"unknown"}	2026-03-19 19:31:12.788	2026-03-12 19:31:12.789
cmmnwfwzg000vpd17vibf8zkl	cmmnwfwyz000tpd17503yww4k	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW1ud2Z3eXowMDB0cGQxNzUwM3l3dzRrIiwibG9naW4iOiJJdmFub3YiLCJyb2xlIjoiUkVDSVBJRU5UIiwiaWF0IjoxNzczMzQ2MDMzLCJleHAiOjE3NzM5NTA4MzN9.Efw0WQBcKGH04e9zGwnUyzzozv2tcKxd9nWX1Txxh64	{"ip":"unknown"}	2026-03-19 20:07:13.851	2026-03-12 20:07:13.852
cmmnx207f0001qs16h34861ov	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzMzNDcwNjQsImV4cCI6MTc3Mzk1MTg2NH0.37yTYmO9zvK9-ulFAB7CGGNg8dpV60P7viNu4BAXsWU	{"ip":"unknown"}	2026-03-19 20:24:24.458	2026-03-12 20:24:24.459
cmmo2equ50001o616elkxbzzc	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzMzNTYwNTYsImV4cCI6MTc3Mzk2MDg1Nn0.XDDZtsKFRUUreWMaqoBqSGZB0DUBr0Y9Kc9O29xIbAI	{"ip":"unknown"}	2026-03-19 22:54:16.923	2026-03-12 22:54:16.925
cmnerxgw00003qy16bnuqmfre	cmnepzq4q0000tj3mb8m6hj5n	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW5lcHpxNHEwMDAwdGozbWI4bTZoajVuIiwibG9naW4iOiJBaG1lZE01RjkwIiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3NDk3MTA0MSwiZXhwIjoxNzc1NTc1ODQxfQ.8NVz7C6NGa5FXqdiU3FUpdQA9quZe9Ozl_rThq5uwzY	{"ip":"unknown"}	2026-04-07 15:30:41.472	2026-03-31 15:30:41.473
cmmo9gjlv0009l516fqpn3fq6	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzMzNjc4OTgsImV4cCI6MTc3Mzk3MjY5OH0.oDni-pJi6Y2mnPHE3zDLGHQH_mc79QAofZcGLtbGRkM	{"ip":"unknown"}	2026-03-20 02:11:38.178	2026-03-13 02:11:38.179
cmmoc6h6c0003ll16bvxfd75c	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzM3MjQ2NywiZXhwIjoxNzczOTc3MjY3fQ.S_ntJp13X1I9St9rEXVqhpHIfulkisr_dvCOnp9fMAY	{"ip":"unknown"}	2026-03-20 03:27:47.315	2026-03-13 03:27:47.316
cmng1ivrp000bp315ehsc93e8	cmn349rqe002imt1623foac4l	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW4zNDlycWUwMDJpbXQxNjIzZm9hYzRsIiwibG9naW4iOiJUZXN0MTExMiIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzUwNDc2MjMsImV4cCI6MTc3NTY1MjQyM30.HJvoeyELQvZoR0IXL7t6pb_WfUtlQXlOARcyRBnCqFU	{"ip":"unknown"}	2026-04-08 12:47:03.252	2026-04-01 12:47:03.253
cmmp8m6w7000fmt163vsbtrhd	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzM0MjY5NDgsImV4cCI6MTc3NDAzMTc0OH0.ml8f-m7O3a0yKH59jBQYnRa9aa7IvQRQRy7iOw5PYps	{"ip":"unknown"}	2026-03-20 18:35:48.198	2026-03-13 18:35:48.2
cmmrmhkfs000nmt164w8epikr	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzU3MTE3OSwiZXhwIjoxNzc0MTc1OTc5fQ.Fw1ttxoNbU7Nq9vBNIuJlGQPHd5BpFlx9Rgzr_w8VH0	{"ip":"unknown"}	2026-03-22 10:39:39.446	2026-03-15 10:39:39.448
cmmt7um9b000tmt16k2k2gmpf	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3MzY2NzUyNiwiZXhwIjoxNzc0MjcyMzI2fQ.Mg54TvQWyGPNdNYb6IGmL6EWYbi3LwuU-jeIZ6mLikI	{"ip":"unknown"}	2026-03-23 13:25:26.446	2026-03-16 13:25:26.447
cmmt7vx6a000vmt16k6vqd71e	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzM2Njc1ODcsImV4cCI6MTc3NDI3MjM4N30.ESctSHCSAzMar_tuNL19WmWOn83sgypx3WDdDeEX6To	{"ip":"unknown"}	2026-03-23 13:26:27.249	2026-03-16 13:26:27.25
cmmvw5iuv0013mt16isrgfn29	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzM4MjkyNzgsImV4cCI6MTc3NDQzNDA3OH0.xQG6W06V6ElShBCI_K-jCo3YlYJeDftg7wS4PSvSqcA	{"ip":"unknown"}	2026-03-25 10:21:18.39	2026-03-18 10:21:18.391
cmmvzfijz0015mt16vhghqlvi	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzM4MzQ3ODMsImV4cCI6MTc3NDQzOTU4M30.dOhCSxllTFBaQLOWTNjniXbrv1CuOTSTquxScp6mUdQ	{"ip":"unknown"}	2026-03-25 11:53:03.406	2026-03-18 11:53:03.407
cmmw6pren0017mt16p7oo1o3p	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3Mzg0NzAxOCwiZXhwIjoxNzc0NDUxODE4fQ.50iIaFWbqr82bDVkHRVKlMrNHQs6zyhY28hggzYrGI8	{"ip":"unknown"}	2026-03-25 15:16:58.75	2026-03-18 15:16:58.752
cmn0k0a3v001fmt16p33mtsum	cmm55hstp0008mz1f61roz8ga	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWhzdHAwMDA4bXoxZjYxcm96OGdhIiwibG9naW4iOiJ2YXNlazEyMyIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzQxMTEyMDksImV4cCI6MTc3NDcxNjAwOX0.WJ6dVM2Afs5u29in05av7PiyXX8GoD7NexeTGaoffQI	{"ip":"unknown"}	2026-03-28 16:40:09.257	2026-03-21 16:40:09.259
cmn34e4hd002omt16wfml2fao	cmn349rqe002imt1623foac4l	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW4zNDlycWUwMDJpbXQxNjIzZm9hYzRsIiwibG9naW4iOiJUZXN0MTExMiIsInJvbGUiOiJSRUNJUElFTlQiLCJpYXQiOjE3NzQyNjYzNzksImV4cCI6MTc3NDg3MTE3OX0.cqmCuTlfnTZ2jJXOBJDcjEqSKVd33pUTNbyKgQymt60	{"ip":"unknown"}	2026-03-30 11:46:19.825	2026-03-23 11:46:19.826
cmn3htiel002smt16zy27arif	cmm70ltqq0002oe16m6thzy6j	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW03MGx0cXEwMDAyb2UxNm02dGh6eTZqIiwibG9naW4iOiJ2YXNlazEyMzQ1Iiwicm9sZSI6IlJFQ0lQSUVOVCIsImlhdCI6MTc3NDI4ODkzMiwiZXhwIjoxNzc0ODkzNzMyfQ.TxSWKPLW3j5Ql7_LodiMw56vgvpXh2al30Z60m7nW24	{"ip":"unknown"}	2026-03-30 18:02:12.716	2026-03-23 18:02:12.717
cmn4ybh5x0038mt163jvf7a1d	cmm55ev860000mzbgcqugyr38	eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjbW01NWV2ODYwMDAwbXpiZ2NxdWd5cjM4IiwibG9naW4iOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzQzNzcxMTAsImV4cCI6MTc3NDk4MTkxMH0.N4ic-gyEDD5a8r5emMjEBpB34P2QVUfgGFl0LDg__ig	{"ip":"unknown"}	2026-03-31 18:31:50.949	2026-03-24 18:31:50.95
\.


--
-- Data for Name: support_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_messages (id, "threadId", "authorId", body, "createdAt") FROM stdin;
cmm6nj3w60003o115c6cm31dd	cmm6nj3w00001o115zut3hnod	cmm55hstp0008mz1f61roz8ga	йцвйцв	2026-02-28 18:25:41.239
cmm6njhao0007o115hj9qdkis	cmm6nj3w00001o115zut3hnod	cmm55ev860000mzbgcqugyr38	йцвцййцв	2026-02-28 18:25:58.609
cmm6nljzz000do1157r586f7j	cmm6nj3w00001o115zut3hnod	cmm55hstp0008mz1f61roz8ga	йцвйцв	2026-02-28 18:27:35.424
cmm6pdq6p0005nl16oc3y7zla	cmm6nj3w00001o115zut3hnod	cmm55hstp0008mz1f61roz8ga	1	2026-02-28 19:17:29.426
cmm8a0mfk0003mq16suemqu54	cmm6nj3w00001o115zut3hnod	cmm55ev860000mzbgcqugyr38	о	2026-03-01 21:42:56.144
cmnem3u14006ymt16dij6w34l	cmnem3u0z006wmt16ndwk627l	cmn349rqe002imt1623foac4l	ауе жизнь ворам	2026-03-31 12:47:40.744
\.


--
-- Data for Name: support_threads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_threads (id, "userId", "createdAt", "updatedAt", "lastReadAt") FROM stdin;
cmm6nj3w00001o115zut3hnod	cmm55hstp0008mz1f61roz8ga	2026-02-28 18:25:41.233	2026-03-13 03:50:53.451	2026-03-13 03:50:53.45
cmnem3u0z006wmt16ndwk627l	cmn349rqe002imt1623foac4l	2026-03-31 12:47:40.739	2026-03-31 21:30:12.586	2026-03-31 21:30:12.585
\.


--
-- Data for Name: system_default_limits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_default_limits (id, "payoutDailyLimitCount", "payoutDailyLimitKop", "payoutMonthlyLimitCount", "payoutMonthlyLimitKop", "autoConfirmPayouts", "autoConfirmPayoutThresholdKop", "updatedAt") FROM stdin;
default	5	1000000	150	5000000	t	500000	2026-02-28 22:05:44.091
\.


--
-- Data for Name: tip_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tip_links (id, "userId", slug, "createdAt", "employeeId") FROM stdin;
cmm55hwfx000cmz1f4fyz8afk	cmm55hstp0008mz1f61roz8ga	6c8mi5cuz1	2026-02-27 17:13:05.661	\N
cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	q7e0ta51q0	2026-03-01 00:31:48.034	\N
cmme1p7pb000co916dls6kq3s	cmme1p7p20008o916gt5zm27e	ohfyls60u5	2026-03-05 22:36:43.967	cmme1p7p8000ao91607v9q90d
cmme1q2yx000ko916ws75rla2	cmme1pno4000go916ujm52vko	nm9q4buasq	2026-03-05 22:37:24.489	\N
cmmfmmk990007pl16ggehyu2z	cmmdsbay70008s616zaz4lww3	cru8vu6y0h	2026-03-07 01:10:18.382	\N
cmmntoz4c000fpd17sj5iqe5a	cmmnrk5ex0000pj16k8qj9sb2	xo6of4cjj5	2026-03-12 18:50:17.676	\N
cmmo1auj60002vtponk7yte07	cmmo1auiw0000vtpobhee38ju	test-waiter-1	2026-03-12 22:23:15.474	\N
cmmo1auji0005vtponyzxvrgh	cmmo1aujb0003vtpoch9vxmqq	test-waiter-2	2026-03-12 22:23:15.486	\N
cmmo1aujo0008vtpou8in5t6k	cmmo1aujl0006vtposrk8b0yo	test-waiter-3	2026-03-12 22:23:15.493	\N
cmmo1aujv000bvtpo6c6cvlr6	cmmo1aujr0009vtpov2oqz503	test-waiter-4	2026-03-12 22:23:15.499	\N
cmmo1auk0000evtpo5yg77c9e	cmmo1aujx000cvtporb235g22	test-waiter-5	2026-03-12 22:23:15.505	\N
cmmo1auk6000hvtpo2b9wznxa	cmmo1auk3000fvtpoby2tlh0r	test-waiter-6	2026-03-12 22:23:15.51	\N
cmmo1auka000kvtpoof6aigvv	cmmo1auk8000ivtpo6agcqlqi	test-waiter-7	2026-03-12 22:23:15.515	\N
cmmo1aukf000nvtpobpv7kalq	cmmo1aukc000lvtpo5xrtyw1i	test-waiter-8	2026-03-12 22:23:15.52	\N
cmmo1aukj000qvtpo87iv5zw8	cmmo1aukh000ovtpotnfx05jq	test-waiter-9	2026-03-12 22:23:15.524	\N
cmmo1auko000tvtpo1cvq57tp	cmmo1aukl000rvtpozl5h1wr7	test-waiter-10	2026-03-12 22:23:15.528	\N
cmmo1auks000wvtpovnkihl03	cmmo1aukq000uvtposu8uvc30	test-waiter-11	2026-03-12 22:23:15.533	\N
cmmo1aukx000zvtpo9wuch51o	cmmo1aukv000xvtpo44rxv7ss	test-waiter-12	2026-03-12 22:23:15.537	\N
cmmo1aul10012vtpo4mc4ku3l	cmmo1aukz0010vtpo0pvge7pr	test-waiter-13	2026-03-12 22:23:15.541	\N
cmmo1aul50015vtpoh28obwgy	cmmo1aul30013vtpo97vdk9cc	test-waiter-14	2026-03-12 22:23:15.545	\N
cmmo1aul90018vtpoyixyy0h9	cmmo1aul70016vtpojf1plnm6	test-waiter-15	2026-03-12 22:23:15.55	\N
cmmo1auld001bvtpoxylwtea6	cmmo1aulb0019vtpo277ztx56	test-waiter-16	2026-03-12 22:23:15.554	\N
cmmo1auli001evtpo9rw3x2h0	cmmo1aulf001cvtpoezcqvdl3	test-waiter-17	2026-03-12 22:23:15.559	\N
cmmo1auln001hvtpoqo7q7h3w	cmmo1aulk001fvtpo5jtb6330	test-waiter-18	2026-03-12 22:23:15.563	\N
cmmo1aulr001kvtpofl9fu0pi	cmmo1aulo001ivtpoamtuejj8	test-waiter-19	2026-03-12 22:23:15.567	\N
cmmo1aulv001nvtpoq20u1d3k	cmmo1ault001lvtpoteowvsy3	test-waiter-20	2026-03-12 22:23:15.572	\N
cmmo1aum0001qvtpoub4lg9ys	cmmo1aulx001ovtpojddtj2yb	test-waiter-21	2026-03-12 22:23:15.576	\N
cmmo1aum4001tvtpohox01xwc	cmmo1aum1001rvtpo2hje6alx	test-waiter-22	2026-03-12 22:23:15.58	\N
cmmo1auma001wvtpol29tho8b	cmmo1aum6001uvtpodc2s9y81	test-waiter-23	2026-03-12 22:23:15.586	\N
cmmo1aume001zvtpoiib8ui4i	cmmo1aumc001xvtpobo1x51wc	test-waiter-24	2026-03-12 22:23:15.591	\N
cmmo1aumj0022vtporo95q35y	cmmo1aumg0020vtpo2wmldqji	test-waiter-25	2026-03-12 22:23:15.595	\N
cmmo1aumn0025vtpojaz34umw	cmmo1aumk0023vtpofo0ur454	test-waiter-26	2026-03-12 22:23:15.599	\N
cmmo1aumr0028vtpo75dmohbo	cmmo1aump0026vtpo030grl1c	test-waiter-27	2026-03-12 22:23:15.604	\N
cmmo1aumv002bvtpoerzro1wg	cmmo1aumt0029vtpoprizgj91	test-waiter-28	2026-03-12 22:23:15.608	\N
cmmo1aun0002evtpo62h40xuv	cmmo1aumx002cvtpottmwowvx	test-waiter-29	2026-03-12 22:23:15.613	\N
cmmo1aun5002hvtpohz6fnjp1	cmmo1aun2002fvtpohwpsy06v	test-waiter-30	2026-03-12 22:23:15.617	\N
cmmo1aun9002kvtpo1c0qi8gm	cmmo1aun6002ivtpocz4nnc0p	test-waiter-31	2026-03-12 22:23:15.622	\N
cmmo1aund002nvtpolgcbgh9q	cmmo1aunb002lvtpo1u9eqkse	test-waiter-32	2026-03-12 22:23:15.626	\N
cmmo1auni002qvtpozl3wdrvg	cmmo1aunf002ovtpolth5x0dz	test-waiter-33	2026-03-12 22:23:15.63	\N
cmmo1aunm002tvtpo96d2l3qr	cmmo1aunk002rvtpo8gzylb7g	test-waiter-34	2026-03-12 22:23:15.635	\N
cmmo1aunr002wvtpo4wzkaw4k	cmmo1auno002uvtpobzv59nl5	test-waiter-35	2026-03-12 22:23:15.639	\N
cmmo1aunv002zvtpoglhsqtmk	cmmo1aunt002xvtpo0cnrbkji	test-waiter-36	2026-03-12 22:23:15.643	\N
cmmo1auo80032vtpoxmzfncvc	cmmo1aunx0030vtpo2pprkrwz	test-waiter-37	2026-03-12 22:23:15.657	\N
cmmo1auod0035vtpo7335k44l	cmmo1auoa0033vtpo0nc8nwfu	test-waiter-38	2026-03-12 22:23:15.661	\N
cmmo1auom0038vtpoht1osjji	cmmo1auog0036vtpon7xab2zd	test-waiter-39	2026-03-12 22:23:15.671	\N
cmmo1auor003bvtpo3pf8xnm1	cmmo1auoo0039vtpoygj8r15p	test-waiter-40	2026-03-12 22:23:15.676	\N
cmmo1auow003evtpo00vr5c1s	cmmo1auot003cvtpo2pp5tog4	test-waiter-41	2026-03-12 22:23:15.681	\N
cmmo1aup1003hvtposi4p24na	cmmo1auoy003fvtpoawjmymry	test-waiter-42	2026-03-12 22:23:15.685	\N
cmmo1aup6003kvtpocsbolk7l	cmmo1aup3003ivtpovt8705ut	test-waiter-43	2026-03-12 22:23:15.69	\N
cmmo1aupa003nvtpogz7yxcmu	cmmo1aup8003lvtpozhquhidc	test-waiter-44	2026-03-12 22:23:15.695	\N
cmmo1aupf003qvtpo3tqcm6fi	cmmo1aupc003ovtpozrrc31rm	test-waiter-45	2026-03-12 22:23:15.699	\N
cmmo1aupk003tvtpo7i70wg8e	cmmo1auph003rvtpoer7z9eoq	test-waiter-46	2026-03-12 22:23:15.704	\N
cmmo1aupo003wvtpohm1oezwq	cmmo1aupm003uvtpona6rkbls	test-waiter-47	2026-03-12 22:23:15.709	\N
cmmo1aupt003zvtpozjnoan2r	cmmo1aupr003xvtpodjfy36vh	test-waiter-48	2026-03-12 22:23:15.714	\N
cmmo1aupy0042vtpo4a8brbmx	cmmo1aupv0040vtpoj27c39kh	test-waiter-49	2026-03-12 22:23:15.718	\N
cmmo1auq30045vtpofyebt0um	cmmo1auq00043vtpon5w5nu4s	test-waiter-50	2026-03-12 22:23:15.723	\N
cmmo1auq80048vtpop0aek7ko	cmmo1auq50046vtpoi2s2j61x	test-waiter-51	2026-03-12 22:23:15.729	\N
cmmo1auqd004bvtpoyyt9320e	cmmo1auqa0049vtpowmsyoedg	test-waiter-52	2026-03-12 22:23:15.733	\N
cmmo1auqh004evtpooebjd381	cmmo1auqe004cvtpo0160w9a2	test-waiter-53	2026-03-12 22:23:15.737	\N
cmmo1auql004hvtpos5ur1kw3	cmmo1auqj004fvtpom6rmdh2w	test-waiter-54	2026-03-12 22:23:15.742	\N
cmmo1auqp004kvtpocjh5x5cb	cmmo1auqn004ivtpoh3bdrlr2	test-waiter-55	2026-03-12 22:23:15.746	\N
cmmo1auqu004nvtpoqjpist84	cmmo1auqr004lvtpou66jutwy	test-waiter-56	2026-03-12 22:23:15.75	\N
cmmo1auqz004qvtpoknm9cbwt	cmmo1auqw004ovtpo4wqh97w4	test-waiter-57	2026-03-12 22:23:15.755	\N
cmmo1aur3004tvtposnclc8n8	cmmo1aur1004rvtpohvqy2l8j	test-waiter-58	2026-03-12 22:23:15.76	\N
cmmo1aur8004wvtpoegkup4pk	cmmo1aur5004uvtpo6ab6df6m	test-waiter-59	2026-03-12 22:23:15.765	\N
cmmo1aurd004zvtpono3it428	cmmo1aurb004xvtpouj7w4xyr	test-waiter-60	2026-03-12 22:23:15.77	\N
cmmo1aurh0052vtpo1xih53s3	cmmo1aurf0050vtpo981bq7g4	test-waiter-61	2026-03-12 22:23:15.774	\N
cmmo1aurl0055vtpoc5x4b746	cmmo1aurj0053vtpo6xj1z0z7	test-waiter-62	2026-03-12 22:23:15.778	\N
cmmo1aurq0058vtpojj1d6nco	cmmo1aurn0056vtpo7g1j6ed0	test-waiter-63	2026-03-12 22:23:15.782	\N
cmmo1auru005bvtpo7yl4862i	cmmo1aurr0059vtposq2uzr5o	test-waiter-64	2026-03-12 22:23:15.786	\N
cmmo1aury005evtpogainl5vk	cmmo1aurw005cvtpod1cqsb2p	test-waiter-65	2026-03-12 22:23:15.791	\N
cmmo1aus3005hvtponsihwf4t	cmmo1aus1005fvtpo2qkww966	test-waiter-66	2026-03-12 22:23:15.796	\N
cmmo1aus8005kvtpoz4fo6h8w	cmmo1aus5005ivtpouco3ntg2	test-waiter-67	2026-03-12 22:23:15.801	\N
cmmo1ausd005nvtpotb3zev0g	cmmo1ausa005lvtpoy0wv7gik	test-waiter-68	2026-03-12 22:23:15.805	\N
cmmo1aush005qvtpope9vnqtz	cmmo1ause005ovtpo9u1yhuz1	test-waiter-69	2026-03-12 22:23:15.809	\N
cmmo1ausl005tvtpobe28b86e	cmmo1ausi005rvtpo3xpkcv9y	test-waiter-70	2026-03-12 22:23:15.813	\N
cmmo1ausp005wvtponojwcs9g	cmmo1ausn005uvtpo9v8cy2bo	test-waiter-71	2026-03-12 22:23:15.818	\N
cmmo1ausv005zvtpoa453ggxm	cmmo1auss005xvtpow5t7erx4	test-waiter-72	2026-03-12 22:23:15.823	\N
cmmo1aut00062vtpo4bt6tij1	cmmo1ausx0060vtpoa0w24lux	test-waiter-73	2026-03-12 22:23:15.828	\N
cmmo1aut40065vtpoqa76ulzv	cmmo1aut20063vtpokqk7thxc	test-waiter-74	2026-03-12 22:23:15.833	\N
cmmo1aut90068vtpo4vdrw4be	cmmo1aut60066vtponki623qc	test-waiter-75	2026-03-12 22:23:15.837	\N
cmmo1autd006bvtpo9953pnly	cmmo1autb0069vtpo4kgbkcu8	test-waiter-76	2026-03-12 22:23:15.842	\N
cmmo1auti006evtpovjru0olj	cmmo1autf006cvtpoisketabj	test-waiter-77	2026-03-12 22:23:15.846	\N
cmmo1autm006hvtpo69zmpj2d	cmmo1autk006fvtpoowh029ab	test-waiter-78	2026-03-12 22:23:15.85	\N
cmmo1autq006kvtpod3eqi3oi	cmmo1auto006ivtpotbnwvn0q	test-waiter-79	2026-03-12 22:23:15.855	\N
cmmo1autu006nvtpob2ei1v8y	cmmo1auts006lvtpodyynaz3o	test-waiter-80	2026-03-12 22:23:15.859	\N
cmmo1autz006qvtpowioj5h2l	cmmo1autx006ovtpos9399u02	test-waiter-81	2026-03-12 22:23:15.864	\N
cmmo1auu4006tvtpo3t9tzmnx	cmmo1auu1006rvtpo9n85845w	test-waiter-82	2026-03-12 22:23:15.868	\N
cmmo1auu7006wvtpolijoj21o	cmmo1auu5006uvtpo4c7uh1vk	test-waiter-83	2026-03-12 22:23:15.872	\N
cmmo1auub006zvtpokcb9gsrs	cmmo1auu9006xvtpod5bz090e	test-waiter-84	2026-03-12 22:23:15.876	\N
cmmo1auuf0072vtpobr2hor47	cmmo1auud0070vtpociugsxw2	test-waiter-85	2026-03-12 22:23:15.88	\N
cmmo1auuj0075vtpohr0wlcf6	cmmo1auuh0073vtpoa3fgglml	test-waiter-86	2026-03-12 22:23:15.883	\N
cmmo1auuo0078vtpohab4glbo	cmmo1auul0076vtpouam5pmjr	test-waiter-87	2026-03-12 22:23:15.888	\N
cmmo1auus007bvtpoy9rhimic	cmmo1auuq0079vtpostwroh0x	test-waiter-88	2026-03-12 22:23:15.892	\N
cmmo1auuw007evtpo39ema3rm	cmmo1auuu007cvtpo9dgf9uz7	test-waiter-89	2026-03-12 22:23:15.897	\N
cmmo1auv0007hvtpobktneiiq	cmmo1auuy007fvtpoad6ebwvh	test-waiter-90	2026-03-12 22:23:15.901	\N
cmmo1auv5007kvtpoh2u7gqlb	cmmo1auv2007ivtpoqmq7jd70	test-waiter-91	2026-03-12 22:23:15.905	\N
cmmo1auv9007nvtpoihydbach	cmmo1auv7007lvtpobbls09kk	test-waiter-92	2026-03-12 22:23:15.91	\N
cmmo1auvd007qvtpophpuxu26	cmmo1auvb007ovtpouhmibru3	test-waiter-93	2026-03-12 22:23:15.914	\N
cmmo1auvj007tvtpoygb46wj7	cmmo1auvf007rvtpoehw14sjw	test-waiter-94	2026-03-12 22:23:15.919	\N
cmmo1auvn007wvtponda5bn3q	cmmo1auvl007uvtpo3cc3urt3	test-waiter-95	2026-03-12 22:23:15.924	\N
cmmo1auvs007zvtpoinf2qgye	cmmo1auvp007xvtpom4651vg0	test-waiter-96	2026-03-12 22:23:15.928	\N
cmmo1auvx0082vtpocoh2w47p	cmmo1auvu0080vtpojs1axtu1	test-waiter-97	2026-03-12 22:23:15.933	\N
cmmo1auw10085vtpoydwv49f2	cmmo1auvz0083vtpojrclfmmz	test-waiter-98	2026-03-12 22:23:15.938	\N
cmmo1auw60088vtpomur8xpr1	cmmo1auw30086vtpostq1ga22	test-waiter-99	2026-03-12 22:23:15.942	\N
cmmo1auwa008bvtpo730xbuml	cmmo1auw70089vtpoc6uxgfbl	test-waiter-100	2026-03-12 22:23:15.946	\N
cmmo2b2uy0002vt228eansgn3	cmmo2b2ui0000vt22filwnn45	test-waiter-e2e	2026-03-12 22:51:25.882	\N
cmmo385i40002vt6jxstwjsmf	cmmo385hn0000vt6jgq610ucu	test-waiter-e2e-1	2026-03-12 23:17:08.956	\N
cmmo385ic0005vt6j7mrat519	cmmo385i80003vt6jd244zdt4	test-waiter-e2e-2	2026-03-12 23:17:08.964	\N
cmmo385il0008vt6jt65zs70g	cmmo385ig0006vt6j2xi02m4a	test-waiter-e2e-3	2026-03-12 23:17:08.973	\N
cmmo385is000bvt6jxf8ltce9	cmmo385in0009vt6j9s7j3q24	test-waiter-e2e-4	2026-03-12 23:17:08.981	\N
cmmo385j1000evt6jql8q5r7s	cmmo385iw000cvt6j6doo2cud	test-waiter-e2e-5	2026-03-12 23:17:08.989	\N
cmmo385j7000hvt6jio19ovby	cmmo385j3000fvt6jp3gcg9ug	test-waiter-e2e-6	2026-03-12 23:17:08.996	\N
cmmo385jf000kvt6ji0lt6jzs	cmmo385ja000ivt6j4f2pgr96	test-waiter-e2e-7	2026-03-12 23:17:09.003	\N
cmmo385jl000nvt6j9bduqyjt	cmmo385jh000lvt6jv7epteqv	test-waiter-e2e-8	2026-03-12 23:17:09.009	\N
cmmo385jq000qvt6jeht2vcb8	cmmo385jn000ovt6jj5rvl3v9	test-waiter-e2e-9	2026-03-12 23:17:09.015	\N
cmmo385jv000tvt6jyj2sjdy6	cmmo385js000rvt6jitqzanaf	test-waiter-e2e-10	2026-03-12 23:17:09.02	\N
cmmo385k2000wvt6jny2mgwcq	cmmo385jy000uvt6j9uwbk323	test-waiter-e2e-11	2026-03-12 23:17:09.026	\N
cmmo385k7000zvt6jq8r1iomd	cmmo385k4000xvt6jmeh29r3m	test-waiter-e2e-12	2026-03-12 23:17:09.032	\N
cmmo385kd0012vt6jenrs66ai	cmmo385k90010vt6jf1fu46g2	test-waiter-e2e-13	2026-03-12 23:17:09.037	\N
cmmo385ki0015vt6jr5dc16o8	cmmo385kf0013vt6jwbxjdqno	test-waiter-e2e-14	2026-03-12 23:17:09.043	\N
cmmo385ko0018vt6j6ugsbj1b	cmmo385kl0016vt6j1k59ldvl	test-waiter-e2e-15	2026-03-12 23:17:09.048	\N
cmmo385kt001bvt6jc5zdsxyb	cmmo385kq0019vt6j1k7n17ty	test-waiter-e2e-16	2026-03-12 23:17:09.054	\N
cmmo385l1001evt6jkzhqa51w	cmmo385kw001cvt6ju405km2v	test-waiter-e2e-17	2026-03-12 23:17:09.061	\N
cmmo385l8001hvt6jpumqjr76	cmmo385l3001fvt6jax9gfpi0	test-waiter-e2e-18	2026-03-12 23:17:09.069	\N
cmmo385le001kvt6jkeyyg3n2	cmmo385la001ivt6jjykr6w9b	test-waiter-e2e-19	2026-03-12 23:17:09.074	\N
cmmo385lk001nvt6jtb5hifwe	cmmo385lg001lvt6jut68f7cg	test-waiter-e2e-20	2026-03-12 23:17:09.08	\N
cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	sznb3kj93w	2026-03-31 13:56:30.671	\N
cmnepzq520002tj3msqzm1i21	cmnepzq4q0000tj3mb8m6hj5n	ahmedm5f90	2026-03-31 14:36:27.542	\N
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, "linkId", "recipientId", "amountKop", "feeKop", "paymentMethod", "payerInfo", status, "externalId", "paygineOrderSdRef", "idempotencyKey", "relocateStartedAt", "createdAt", "updatedAt") FROM stdin;
cmnfye5q80003sc15vwwa0vk3	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-84e54f1a-ce9e-486c-8932-d51514fa3a65	\N	2026-04-01 11:19:24.032	2026-04-01 11:19:24.199
cmnfyek3j0005sc15usxwt2uk	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-decff613-3d21-4172-a7d9-04e7cb35b7ad	\N	2026-04-01 11:19:42.655	2026-04-01 11:19:42.807
cmnfyh65w0007sc155tnpmv89	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-533c225c-b9f9-4fc2-958f-c61a60f6feed	\N	2026-04-01 11:21:44.564	2026-04-01 11:21:44.815
cmnfyhnzv0009sc15x92j8qfw	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-ee521e0a-ce2b-4ace-b2ed-a6680844a001	\N	2026-04-01 11:22:07.675	2026-04-01 11:22:07.887
cmnfyjfxn000bsc151jd6z575	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-e7e9c950-b0c7-4952-859c-a56bfbcdaddb	\N	2026-04-01 11:23:30.538	2026-04-01 11:23:30.757
cmnfykcui000dsc15m27rct96	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-2e8d93e4-0e98-4fab-ab16-c641d7be0e0b	\N	2026-04-01 11:24:13.195	2026-04-01 11:24:13.418
cmnfykpsj000fsc15y6fhsrfy	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-be568154-4a9d-4ce4-a82f-4df62c942772	\N	2026-04-01 11:24:29.972	2026-04-01 11:24:30.165
cmnfypppz000hsc15jxrv6347	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-dd19bfe3-afde-4ad8-88f5-b3e5839d6251	\N	2026-04-01 11:28:23.159	2026-04-01 11:28:23.357
cmnfyqgn6000lsc15e5tq2qud	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-402026dc-6cac-402d-94cd-58ae28e43cda	\N	2026-04-01 11:28:58.05	2026-04-01 11:28:58.26
cmnfyqwxb000nsc158qk627n3	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-4904eef7-d9ec-42bc-9cdf-6aea6d761d39	\N	2026-04-01 11:29:19.152	2026-04-01 11:29:19.293
cmnfyr2hl000psc15kbe5x4is	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	20000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-q7e0ta51q0-86bbf958-2671-41d7-bd26-73a704738535	\N	2026-04-01 11:29:26.361	2026-04-01 11:29:26.506
cmnfz492j000tsc15pbc9k1qu	cmnepzq520002tj3msqzm1i21	cmnepzq4q0000tj3mb8m6hj5n	5000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-ahmedm5f90-8d870382-43f3-4082-a07f-9b7741008f16	\N	2026-04-01 11:39:41.419	2026-04-01 11:39:41.671
cmnfz4gnx000vsc15n8814udb	cmnepzq520002tj3msqzm1i21	cmnepzq4q0000tj3mb8m6hj5n	5000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-ahmedm5f90-b74c1e4f-b4a3-45bb-ba67-1001a7563760	\N	2026-04-01 11:39:51.262	2026-04-01 11:39:51.432
cmnfz5803000zsc15l851xw28	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-sznb3kj93w-5618f606-e0a6-462c-955f-f299e8a00162	\N	2026-04-01 11:40:26.692	2026-04-01 11:40:26.848
cmnfz7bap0011sc15upxjcck9	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-sznb3kj93w-db981558-d735-47b5-b5cd-0053bc22098c	\N	2026-04-01 11:42:04.274	2026-04-01 11:42:04.486
cmnfz9w0p0013sc15hlme0q34	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	50000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-sznb3kj93w-3ed17bcb-ac24-483f-92e8-62510756ddf5	\N	2026-04-01 11:44:04.442	2026-04-01 11:44:04.66
cmnfzlqf60001nj16u0wump9r	cmnepzq520002tj3msqzm1i21	cmnepzq4q0000tj3mb8m6hj5n	15000	\N	card	{"comment":"Сосал за мку","paygineMethod":"card"}	FAILED	\N	\N	pay-ahmedm5f90-386abcb5-6132-4c94-bfa9-fc8c342870bf	\N	2026-04-01 11:53:17.059	2026-04-01 11:53:17.339
cmnfzo49p0003nj16mab486jj	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	50000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-sznb3kj93w-7f7dca67-ef19-427d-a9a6-5d004e27e31f	\N	2026-04-01 11:55:08.318	2026-04-01 11:55:08.486
cmnfzpm050005nj16s8z2726f	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-sznb3kj93w-87993780-288a-469e-a411-b7cc02bbae38	\N	2026-04-01 11:56:17.957	2026-04-01 11:56:18.111
cmnfzrwyc0007nj16wf3dbshg	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-sznb3kj93w-943861b0-80a9-4e9a-aafc-d72c33260ce9	\N	2026-04-01 11:58:05.46	2026-04-01 11:58:05.732
cmnfzseh70009nj16a32kn7l1	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	10000	\N	card	{"paygineMethod":"card"}	FAILED	\N	\N	pay-sznb3kj93w-f70b6d0a-21d7-4323-accc-f8fc0a227d7e	\N	2026-04-01 11:58:28.172	2026-04-01 11:58:28.327
cmng043os0001qm165ouj7yc8	cmneokcpb0074mt16837xstlq	cmn349rqe002imt1623foac4l	10000	\N	card	{"paygineMethod":"card","paygineCallbackOperationId":"3970453367"}	FAILED	3278673413	1tips_t_cmng043os0001qm165ou_mng043ow	pay-sznb3kj93w-cdcf8584-8f7f-4179-9976-b3bcaaa36285	2026-04-01 12:08:06.11	2026-04-01 12:07:34.06	2026-04-01 12:08:16.435
cmng1awls0001p315p80zdewt	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9615	\N	card	{"paygineMethod":"card"}	PENDING	3278814515	1tips_t_cmng1awls0001p315p80_mng1awlw	pay-q7e0ta51q0-b3ba0629-6f69-415d-a4f8-b84a7647539f	\N	2026-04-01 12:40:51.088	2026-04-01 12:40:51.478
cmng1dlq10003p3155jwf62mg	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	10000	\N	card	{"paygineMethod":"card"}	PENDING	3278823735	1tips_t_cmng1dlq10003p3155jw_mng1dlq5	pay-q7e0ta51q0-f36f474d-25b0-4ae2-b707-f63c1762ac81	\N	2026-04-01 12:42:56.953	2026-04-01 12:42:57.213
cmng1dvtg0005p315ubig0d2n	cmm70lxkx0006oe16sew1wwry	cmm70ltqq0002oe16m6thzy6j	9756	\N	card	{"paygineMethod":"card"}	PENDING	3278824736	1tips_t_cmng1dvtg0005p315ubi_mng1dvti	pay-q7e0ta51q0-a2f46fd9-5cc0-47c7-9eaa-b58bc02714f8	\N	2026-04-01 12:43:10.036	2026-04-01 12:43:10.239
cmng49e8c0003qn15eprx7kle	cmnepzq520002tj3msqzm1i21	cmnepzq4q0000tj3mb8m6hj5n	99900	\N	card	{"paygineMethod":"card"}	PENDING	3279182005	1tips_t_cmng49e8c0003qn15epr_mng49e8f	pay-ahmedm5f90-64d9b52a-354a-4d0f-98cd-4415cc748d46	\N	2026-04-01 14:03:39.468	2026-04-01 14:03:39.75
cmng2t84u0001qn15k9zkshne	cmnepzq520002tj3msqzm1i21	cmnepzq4q0000tj3mb8m6hj5n	15000	\N	card	{"comment":"На мку похуй","paygineMethod":"card","paygineCallbackOperationId":"3970794571"}	FAILED	3279003830	1tips_t_cmng2t84u0001qn15k9z_mng2t84y	pay-ahmedm5f90-7ea32081-a2a1-4e2b-9b89-28fbe2cbba8d	2026-04-01 13:24:01.882	2026-04-01 13:23:05.454	2026-04-01 13:24:12.356
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, "uniqueId", login, email, "passwordHash", role, "mustChangePassword", "isBlocked", "fullName", "birthDate", establishment, "apiKey", "payoutDailyLimitCount", "payoutDailyLimitKop", "payoutMonthlyLimitCount", "payoutMonthlyLimitKop", "autoConfirmPayouts", "autoConfirmPayoutThresholdKop", "paygineSdRef", "createdAt", "updatedAt", "apiKeyPrefix", "apiKeyHash", "establishmentId", "verificationStatus", "verificationRejectionReason", "savingFor", "profilePhotoUrl") FROM stdin;
cmm55ev860000mzbgcqugyr38	1	superadmin	\N	$2a$12$0V9R45kRDMkU7NE5pNUi1ee/ZcVdNlSW7ZpeQczCQa/ICljcyYj3S	SUPERADMIN	f	f	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_1	2026-02-27 17:10:44.119	2026-02-27 17:11:52.907	\N	\N	\N	NONE	\N	\N	\N
cmmo1auk3000fvtpoby2tlh0r	15	test-waiter-6	test-waiter-6@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auk3000fvtpoby2tlh0r	2026-03-12 22:23:15.507	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auk8000ivtpo6agcqlqi	16	test-waiter-7	test-waiter-7@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auk8000ivtpo6agcqlqi	2026-03-12 22:23:15.512	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auul0076vtpouam5pmjr	96	test-waiter-87	test-waiter-87@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auul0076vtpouam5pmjr	2026-03-12 22:23:15.886	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmdsbay70008s616zaz4lww3	5	maslenok1298	maslenok1298@icloud.com	$2a$12$0ThDL9nIIxWEAa.unfk5DOa4aPh41WEjpHvYUGWtDU3VhNEbG013.	ESTABLISHMENT_ADMIN	f	t	\N	\N	\N	\N	5	1000000	150	5000000	t	500000	FreeTips_w_cmmdsbay70008s616zaz4lww3	2026-03-05 18:13:58.447	2026-04-01 12:46:36.403	\N	\N	cmmdsanwv0004s616zxznkcfy	NONE	\N	ывпывпывпыпыв	\N
cmmo1aukc000lvtpo5xrtyw1i	17	test-waiter-8	test-waiter-8@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aukc000lvtpo5xrtyw1i	2026-03-12 22:23:15.517	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmm6wqeyq000eof16062ru67j	3	vasek1234	vasek1234@mail.ru	$2a$12$ZJqPlhDS7oEtTGJt.PcZReh9oIqbATXaq3nzhO//X8fcxcJ5yQZJq	RECIPIENT	f	t	\N	\N	\N	\N	5	1000000	150	5000000	t	500000	FreeTips_w_3	2026-02-28 22:43:18.723	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmnrk5ex0000pj16k8qj9sb2	8	trader19	678899aw@gmail.com	$2a$12$6aXTPUgsLoRsH1fVpZ27A.cjIgZiayPp8Dx2GBMkTDEE6lt0g.lr6	RECIPIENT	f	t	\N	\N	\N	\N	50	10000000	1500	50000000	t	5000000	FreeTips_w_cmmnrk5ex0000pj16k8qj9sb2	2026-03-12 17:50:33.321	2026-04-01 12:46:36.403	\N	\N	\N	VERIFIED	\N	\N	\N
cmme1p7p20008o916gt5zm27e	6	pool-cmmdsanwv0004s616zxznkcfy	\N	$2a$12$U977eS/sVNg3Kr4H69U.Tu9k58q0fOk/Ym99sx/RSjCTSyA.kk7Wa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	2026-03-05 22:36:43.959	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmme1pno4000go916ujm52vko	7	Vasya1	vasya1@mail.ru	$2a$12$VUbEaeRSa/UEP87BjMVeY.t0Jo8exPD7q2/ybpXsnU3xGvgPdZ.F6	EMPLOYEE	f	t	\N	\N	\N	\N	5	1000000	150	5000000	t	500000	FreeTips_w_cmme1pno4000go916ujm52vko	2026-03-05 22:37:04.66	2026-04-01 12:46:36.403	\N	\N	cmmdsanwv0004s616zxznkcfy	NONE	\N	\N	\N
cmmnwfwyz000tpd17503yww4k	9	Ivanov	try695873@gmail.com	$2a$12$mhANB/Lmsdt3i511JSyveegA2V61KdHKkQfWepwxBZp8trlJz5efy	RECIPIENT	f	t	\N	\N	\N	\N	5	1000000	150	5000000	t	500000	FreeTips_w_cmmnwfwyz000tpd17503yww4k	2026-03-12 20:07:13.835	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auiw0000vtpobhee38ju	10	test-waiter-1	test-waiter-1@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auiw0000vtpobhee38ju	2026-03-12 22:23:15.465	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aujb0003vtpoch9vxmqq	11	test-waiter-2	test-waiter-2@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aujb0003vtpoch9vxmqq	2026-03-12 22:23:15.48	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aujl0006vtposrk8b0yo	12	test-waiter-3	test-waiter-3@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aujl0006vtposrk8b0yo	2026-03-12 22:23:15.489	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aujr0009vtpov2oqz503	13	test-waiter-4	test-waiter-4@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aujr0009vtpov2oqz503	2026-03-12 22:23:15.495	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aujx000cvtporb235g22	14	test-waiter-5	test-waiter-5@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aujx000cvtporb235g22	2026-03-12 22:23:15.502	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385kw001cvt6ju405km2v	127	e2e-waiter-17-1773357429056	e2e-waiter-17@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385kw001cvt6ju405km2v	2026-03-12 23:17:09.056	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aukh000ovtpotnfx05jq	18	test-waiter-9	test-waiter-9@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aukh000ovtpotnfx05jq	2026-03-12 22:23:15.521	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aukl000rvtpozl5h1wr7	19	test-waiter-10	test-waiter-10@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aukl000rvtpozl5h1wr7	2026-03-12 22:23:15.526	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aukq000uvtposu8uvc30	20	test-waiter-11	test-waiter-11@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aukq000uvtposu8uvc30	2026-03-12 22:23:15.53	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aukv000xvtpo44rxv7ss	21	test-waiter-12	test-waiter-12@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aukv000xvtpo44rxv7ss	2026-03-12 22:23:15.535	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aukz0010vtpo0pvge7pr	22	test-waiter-13	test-waiter-13@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aukz0010vtpo0pvge7pr	2026-03-12 22:23:15.539	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aul30013vtpo97vdk9cc	23	test-waiter-14	test-waiter-14@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aul30013vtpo97vdk9cc	2026-03-12 22:23:15.543	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aul70016vtpojf1plnm6	24	test-waiter-15	test-waiter-15@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aul70016vtpojf1plnm6	2026-03-12 22:23:15.547	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aulb0019vtpo277ztx56	25	test-waiter-16	test-waiter-16@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aulb0019vtpo277ztx56	2026-03-12 22:23:15.552	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aulf001cvtpoezcqvdl3	26	test-waiter-17	test-waiter-17@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aulf001cvtpoezcqvdl3	2026-03-12 22:23:15.556	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aulk001fvtpo5jtb6330	27	test-waiter-18	test-waiter-18@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aulk001fvtpo5jtb6330	2026-03-12 22:23:15.561	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aulo001ivtpoamtuejj8	28	test-waiter-19	test-waiter-19@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aulo001ivtpoamtuejj8	2026-03-12 22:23:15.565	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1ault001lvtpoteowvsy3	29	test-waiter-20	test-waiter-20@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1ault001lvtpoteowvsy3	2026-03-12 22:23:15.569	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aulx001ovtpojddtj2yb	30	test-waiter-21	test-waiter-21@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aulx001ovtpojddtj2yb	2026-03-12 22:23:15.574	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aum1001rvtpo2hje6alx	31	test-waiter-22	test-waiter-22@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aum1001rvtpo2hje6alx	2026-03-12 22:23:15.578	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmm70ltqq0002oe16m6thzy6j	4	vasek12345	vasek12345@mail.ru	$2a$12$eoC5JyzmMF6AesdjZe2SoucAFQkjoUwoMoL7lHutk9Q0qcy1x1ElW	RECIPIENT	f	t	\N	\N	\N	\N	5	1000000	150	5000000	t	500000	FreeTips_w_cmm70ltqq0002oe16m6thzy6j	2026-03-01 00:31:43.058	2026-04-01 12:46:36.403	\N	\N	\N	REJECTED	111	\N	\N
cmmo1aum6001uvtpodc2s9y81	32	test-waiter-23	test-waiter-23@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aum6001uvtpodc2s9y81	2026-03-12 22:23:15.582	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aumc001xvtpobo1x51wc	33	test-waiter-24	test-waiter-24@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aumc001xvtpobo1x51wc	2026-03-12 22:23:15.588	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aumg0020vtpo2wmldqji	34	test-waiter-25	test-waiter-25@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aumg0020vtpo2wmldqji	2026-03-12 22:23:15.593	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aumk0023vtpofo0ur454	35	test-waiter-26	test-waiter-26@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aumk0023vtpofo0ur454	2026-03-12 22:23:15.597	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aump0026vtpo030grl1c	36	test-waiter-27	test-waiter-27@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aump0026vtpo030grl1c	2026-03-12 22:23:15.601	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aumt0029vtpoprizgj91	37	test-waiter-28	test-waiter-28@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aumt0029vtpoprizgj91	2026-03-12 22:23:15.605	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aumx002cvtpottmwowvx	38	test-waiter-29	test-waiter-29@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aumx002cvtpottmwowvx	2026-03-12 22:23:15.61	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aun2002fvtpohwpsy06v	39	test-waiter-30	test-waiter-30@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aun2002fvtpohwpsy06v	2026-03-12 22:23:15.615	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aun6002ivtpocz4nnc0p	40	test-waiter-31	test-waiter-31@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aun6002ivtpocz4nnc0p	2026-03-12 22:23:15.619	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aunb002lvtpo1u9eqkse	41	test-waiter-32	test-waiter-32@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aunb002lvtpo1u9eqkse	2026-03-12 22:23:15.623	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aunf002ovtpolth5x0dz	42	test-waiter-33	test-waiter-33@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aunf002ovtpolth5x0dz	2026-03-12 22:23:15.628	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aunk002rvtpo8gzylb7g	43	test-waiter-34	test-waiter-34@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aunk002rvtpo8gzylb7g	2026-03-12 22:23:15.632	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auno002uvtpobzv59nl5	44	test-waiter-35	test-waiter-35@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auno002uvtpobzv59nl5	2026-03-12 22:23:15.637	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aunt002xvtpo0cnrbkji	45	test-waiter-36	test-waiter-36@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aunt002xvtpo0cnrbkji	2026-03-12 22:23:15.641	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aunx0030vtpo2pprkrwz	46	test-waiter-37	test-waiter-37@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aunx0030vtpo2pprkrwz	2026-03-12 22:23:15.645	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auoa0033vtpo0nc8nwfu	47	test-waiter-38	test-waiter-38@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auoa0033vtpo0nc8nwfu	2026-03-12 22:23:15.659	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auog0036vtpon7xab2zd	48	test-waiter-39	test-waiter-39@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auog0036vtpon7xab2zd	2026-03-12 22:23:15.664	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auoo0039vtpoygj8r15p	49	test-waiter-40	test-waiter-40@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auoo0039vtpoygj8r15p	2026-03-12 22:23:15.673	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auot003cvtpo2pp5tog4	50	test-waiter-41	test-waiter-41@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auot003cvtpo2pp5tog4	2026-03-12 22:23:15.678	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auoy003fvtpoawjmymry	51	test-waiter-42	test-waiter-42@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auoy003fvtpoawjmymry	2026-03-12 22:23:15.683	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aup3003ivtpovt8705ut	52	test-waiter-43	test-waiter-43@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aup3003ivtpovt8705ut	2026-03-12 22:23:15.687	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aup8003lvtpozhquhidc	53	test-waiter-44	test-waiter-44@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aup8003lvtpozhquhidc	2026-03-12 22:23:15.692	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aupc003ovtpozrrc31rm	54	test-waiter-45	test-waiter-45@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aupc003ovtpozrrc31rm	2026-03-12 22:23:15.696	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auph003rvtpoer7z9eoq	55	test-waiter-46	test-waiter-46@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auph003rvtpoer7z9eoq	2026-03-12 22:23:15.701	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aupm003uvtpona6rkbls	56	test-waiter-47	test-waiter-47@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aupm003uvtpona6rkbls	2026-03-12 22:23:15.706	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aupr003xvtpodjfy36vh	57	test-waiter-48	test-waiter-48@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aupr003xvtpodjfy36vh	2026-03-12 22:23:15.711	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aupv0040vtpoj27c39kh	58	test-waiter-49	test-waiter-49@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aupv0040vtpoj27c39kh	2026-03-12 22:23:15.716	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auq00043vtpon5w5nu4s	59	test-waiter-50	test-waiter-50@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auq00043vtpon5w5nu4s	2026-03-12 22:23:15.72	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auq50046vtpoi2s2j61x	60	test-waiter-51	test-waiter-51@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auq50046vtpoi2s2j61x	2026-03-12 22:23:15.725	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auqa0049vtpowmsyoedg	61	test-waiter-52	test-waiter-52@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auqa0049vtpowmsyoedg	2026-03-12 22:23:15.731	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auqe004cvtpo0160w9a2	62	test-waiter-53	test-waiter-53@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auqe004cvtpo0160w9a2	2026-03-12 22:23:15.735	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auqj004fvtpom6rmdh2w	63	test-waiter-54	test-waiter-54@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auqj004fvtpom6rmdh2w	2026-03-12 22:23:15.739	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auqn004ivtpoh3bdrlr2	64	test-waiter-55	test-waiter-55@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auqn004ivtpoh3bdrlr2	2026-03-12 22:23:15.743	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auqr004lvtpou66jutwy	65	test-waiter-56	test-waiter-56@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auqr004lvtpou66jutwy	2026-03-12 22:23:15.748	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auqw004ovtpo4wqh97w4	66	test-waiter-57	test-waiter-57@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auqw004ovtpo4wqh97w4	2026-03-12 22:23:15.753	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aur1004rvtpohvqy2l8j	67	test-waiter-58	test-waiter-58@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aur1004rvtpohvqy2l8j	2026-03-12 22:23:15.757	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aur5004uvtpo6ab6df6m	68	test-waiter-59	test-waiter-59@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aur5004uvtpo6ab6df6m	2026-03-12 22:23:15.762	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aurb004xvtpouj7w4xyr	69	test-waiter-60	test-waiter-60@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aurb004xvtpouj7w4xyr	2026-03-12 22:23:15.767	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aurf0050vtpo981bq7g4	70	test-waiter-61	test-waiter-61@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aurf0050vtpo981bq7g4	2026-03-12 22:23:15.772	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aurj0053vtpo6xj1z0z7	71	test-waiter-62	test-waiter-62@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aurj0053vtpo6xj1z0z7	2026-03-12 22:23:15.776	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aurn0056vtpo7g1j6ed0	72	test-waiter-63	test-waiter-63@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aurn0056vtpo7g1j6ed0	2026-03-12 22:23:15.78	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aurr0059vtposq2uzr5o	73	test-waiter-64	test-waiter-64@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aurr0059vtposq2uzr5o	2026-03-12 22:23:15.784	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aurw005cvtpod1cqsb2p	74	test-waiter-65	test-waiter-65@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aurw005cvtpod1cqsb2p	2026-03-12 22:23:15.788	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aus1005fvtpo2qkww966	75	test-waiter-66	test-waiter-66@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aus1005fvtpo2qkww966	2026-03-12 22:23:15.793	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aus5005ivtpouco3ntg2	76	test-waiter-67	test-waiter-67@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aus5005ivtpouco3ntg2	2026-03-12 22:23:15.798	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1ausa005lvtpoy0wv7gik	77	test-waiter-68	test-waiter-68@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1ausa005lvtpoy0wv7gik	2026-03-12 22:23:15.803	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1ause005ovtpo9u1yhuz1	78	test-waiter-69	test-waiter-69@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1ause005ovtpo9u1yhuz1	2026-03-12 22:23:15.807	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1ausi005rvtpo3xpkcv9y	79	test-waiter-70	test-waiter-70@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1ausi005rvtpo3xpkcv9y	2026-03-12 22:23:15.811	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1ausn005uvtpo9v8cy2bo	80	test-waiter-71	test-waiter-71@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1ausn005uvtpo9v8cy2bo	2026-03-12 22:23:15.815	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auss005xvtpow5t7erx4	81	test-waiter-72	test-waiter-72@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auss005xvtpow5t7erx4	2026-03-12 22:23:15.821	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1ausx0060vtpoa0w24lux	82	test-waiter-73	test-waiter-73@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1ausx0060vtpoa0w24lux	2026-03-12 22:23:15.825	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aut20063vtpokqk7thxc	83	test-waiter-74	test-waiter-74@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aut20063vtpokqk7thxc	2026-03-12 22:23:15.83	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1aut60066vtponki623qc	84	test-waiter-75	test-waiter-75@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1aut60066vtponki623qc	2026-03-12 22:23:15.834	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1autb0069vtpo4kgbkcu8	85	test-waiter-76	test-waiter-76@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1autb0069vtpo4kgbkcu8	2026-03-12 22:23:15.839	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1autf006cvtpoisketabj	86	test-waiter-77	test-waiter-77@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1autf006cvtpoisketabj	2026-03-12 22:23:15.843	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1autk006fvtpoowh029ab	87	test-waiter-78	test-waiter-78@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1autk006fvtpoowh029ab	2026-03-12 22:23:15.848	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auto006ivtpotbnwvn0q	88	test-waiter-79	test-waiter-79@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auto006ivtpotbnwvn0q	2026-03-12 22:23:15.852	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auts006lvtpodyynaz3o	89	test-waiter-80	test-waiter-80@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auts006lvtpodyynaz3o	2026-03-12 22:23:15.856	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1autx006ovtpos9399u02	90	test-waiter-81	test-waiter-81@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1autx006ovtpos9399u02	2026-03-12 22:23:15.861	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auu1006rvtpo9n85845w	91	test-waiter-82	test-waiter-82@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auu1006rvtpo9n85845w	2026-03-12 22:23:15.866	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auu5006uvtpo4c7uh1vk	92	test-waiter-83	test-waiter-83@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auu5006uvtpo4c7uh1vk	2026-03-12 22:23:15.87	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auu9006xvtpod5bz090e	93	test-waiter-84	test-waiter-84@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auu9006xvtpod5bz090e	2026-03-12 22:23:15.873	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auud0070vtpociugsxw2	94	test-waiter-85	test-waiter-85@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auud0070vtpociugsxw2	2026-03-12 22:23:15.877	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auuh0073vtpoa3fgglml	95	test-waiter-86	test-waiter-86@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auuh0073vtpoa3fgglml	2026-03-12 22:23:15.881	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auuq0079vtpostwroh0x	97	test-waiter-88	test-waiter-88@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auuq0079vtpostwroh0x	2026-03-12 22:23:15.89	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auuu007cvtpo9dgf9uz7	98	test-waiter-89	test-waiter-89@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auuu007cvtpo9dgf9uz7	2026-03-12 22:23:15.894	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auuy007fvtpoad6ebwvh	99	test-waiter-90	test-waiter-90@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auuy007fvtpoad6ebwvh	2026-03-12 22:23:15.899	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auv2007ivtpoqmq7jd70	100	test-waiter-91	test-waiter-91@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auv2007ivtpoqmq7jd70	2026-03-12 22:23:15.903	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auv7007lvtpobbls09kk	101	test-waiter-92	test-waiter-92@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auv7007lvtpobbls09kk	2026-03-12 22:23:15.907	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auvb007ovtpouhmibru3	102	test-waiter-93	test-waiter-93@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auvb007ovtpouhmibru3	2026-03-12 22:23:15.911	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auvf007rvtpoehw14sjw	103	test-waiter-94	test-waiter-94@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auvf007rvtpoehw14sjw	2026-03-12 22:23:15.916	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auvl007uvtpo3cc3urt3	104	test-waiter-95	test-waiter-95@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auvl007uvtpo3cc3urt3	2026-03-12 22:23:15.921	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auvp007xvtpom4651vg0	105	test-waiter-96	test-waiter-96@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auvp007xvtpom4651vg0	2026-03-12 22:23:15.926	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auvu0080vtpojs1axtu1	106	test-waiter-97	test-waiter-97@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auvu0080vtpojs1axtu1	2026-03-12 22:23:15.93	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auvz0083vtpojrclfmmz	107	test-waiter-98	test-waiter-98@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auvz0083vtpojrclfmmz	2026-03-12 22:23:15.935	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auw30086vtpostq1ga22	108	test-waiter-99	test-waiter-99@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auw30086vtpostq1ga22	2026-03-12 22:23:15.94	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo1auw70089vtpoc6uxgfbl	109	test-waiter-100	test-waiter-100@test.local	$2a$12$M6lj1X9EiN1BwqBhOmQp7eHcDTvbofVMrJrRnxUA51pIHVWlGCmzG	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo1auw70089vtpoc6uxgfbl	2026-03-12 22:23:15.944	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo2b2ui0000vt22filwnn45	110	e2e-waiter-1773355885865	e2e-waiter@test.local	$2a$12$ro5e3ro4rMSrfP6tuphDQeppSfqgu3pY2zWgU8kcvyuFcNVjpQX0m	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo2b2ui0000vt22filwnn45	2026-03-12 22:51:25.867	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385hn0000vt6jgq610ucu	111	e2e-waiter-1-1773357428937	e2e-waiter-1@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385hn0000vt6jgq610ucu	2026-03-12 23:17:08.939	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385i80003vt6jd244zdt4	112	e2e-waiter-2-1773357428959	e2e-waiter-2@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385i80003vt6jd244zdt4	2026-03-12 23:17:08.96	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385ig0006vt6j2xi02m4a	113	e2e-waiter-3-1773357428967	e2e-waiter-3@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385ig0006vt6j2xi02m4a	2026-03-12 23:17:08.968	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385in0009vt6j9s7j3q24	114	e2e-waiter-4-1773357428975	e2e-waiter-4@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385in0009vt6j9s7j3q24	2026-03-12 23:17:08.976	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385iw000cvt6j6doo2cud	115	e2e-waiter-5-1773357428983	e2e-waiter-5@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385iw000cvt6j6doo2cud	2026-03-12 23:17:08.985	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385j3000fvt6jp3gcg9ug	116	e2e-waiter-6-1773357428991	e2e-waiter-6@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385j3000fvt6jp3gcg9ug	2026-03-12 23:17:08.992	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385ja000ivt6j4f2pgr96	117	e2e-waiter-7-1773357428997	e2e-waiter-7@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385ja000ivt6j4f2pgr96	2026-03-12 23:17:08.998	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385jh000lvt6jv7epteqv	118	e2e-waiter-8-1773357429005	e2e-waiter-8@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385jh000lvt6jv7epteqv	2026-03-12 23:17:09.006	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385jn000ovt6jj5rvl3v9	119	e2e-waiter-9-1773357429010	e2e-waiter-9@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385jn000ovt6jj5rvl3v9	2026-03-12 23:17:09.011	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385js000rvt6jitqzanaf	120	e2e-waiter-10-1773357429016	e2e-waiter-10@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385js000rvt6jitqzanaf	2026-03-12 23:17:09.017	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385jy000uvt6j9uwbk323	121	e2e-waiter-11-1773357429021	e2e-waiter-11@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385jy000uvt6j9uwbk323	2026-03-12 23:17:09.022	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385k4000xvt6jmeh29r3m	122	e2e-waiter-12-1773357429028	e2e-waiter-12@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385k4000xvt6jmeh29r3m	2026-03-12 23:17:09.028	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385k90010vt6jf1fu46g2	123	e2e-waiter-13-1773357429033	e2e-waiter-13@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385k90010vt6jf1fu46g2	2026-03-12 23:17:09.034	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385kf0013vt6jwbxjdqno	124	e2e-waiter-14-1773357429038	e2e-waiter-14@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385kf0013vt6jwbxjdqno	2026-03-12 23:17:09.039	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385kl0016vt6j1k59ldvl	125	e2e-waiter-15-1773357429044	e2e-waiter-15@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385kl0016vt6j1k59ldvl	2026-03-12 23:17:09.045	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385kq0019vt6j1k7n17ty	126	e2e-waiter-16-1773357429050	e2e-waiter-16@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385kq0019vt6j1k7n17ty	2026-03-12 23:17:09.05	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385l3001fvt6jax9gfpi0	128	e2e-waiter-18-1773357429063	e2e-waiter-18@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385l3001fvt6jax9gfpi0	2026-03-12 23:17:09.064	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385la001ivt6jjykr6w9b	129	e2e-waiter-19-1773357429070	e2e-waiter-19@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385la001ivt6jjykr6w9b	2026-03-12 23:17:09.071	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmmo385lg001lvt6jut68f7cg	130	e2e-waiter-20-1773357429076	e2e-waiter-20@test.local	$2a$12$VIHcb/OPj3iHMk6HQpAJc.Xs8JFuMAY6gcpaSuVLIw5oj7LOlaASa	RECIPIENT	f	t	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmmo385lg001lvt6jut68f7cg	2026-03-12 23:17:09.077	2026-04-01 12:46:36.403	\N	\N	\N	NONE	\N	\N	\N
cmm55hstp0008mz1f61roz8ga	2	vasek123	vasek123@mail.ru	$2a$12$0PfVJbHj1F1bAhu3nfs3.epa0UZR6gfgr24MvSs8INmaJEi47Xxpe	RECIPIENT	f	t	\N	\N	\N	\N	5	1000000	150	5000000	t	500000	FreeTips_w_2	2026-02-27 17:13:00.973	2026-04-01 12:46:36.403	3d31b95c798dd924	2a2f3172b869628b06aede32f5aad69d2b6156d80df2c70244f63a1d27f74c59	\N	VERIFIED	\N	111221123123123	recipients/cmm55hstp0008mz1f61roz8ga/avatar.jpg
cmn349rqe002imt1623foac4l	131	Test1112	gost0512@icloud.com	$2a$12$WiOIGDrMCLKAOqkpP6HTr.TFtWpEjB9XmFsz/5AFb8HQuI6copV4K	RECIPIENT	f	f	Питер Паркер Иванович	2001-01-01	Человек-Паук	\N	50	10000000	150	5000000	f	\N	FreeTips_w_cmn349rqe002imt1623foac4l	2026-03-23 11:42:56.678	2026-04-01 12:46:43.095	\N	\N	\N	VERIFIED	\N	\N	\N
cmnepzq4q0000tj3mb8m6hj5n	132	AhmedM5F90	\N	$2a$12$K24WJmO9UIe6WWvY3dMhMeyMqck5TBGQjxB7NfI9MsRXIm5X2GMdm	RECIPIENT	f	f	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	FreeTips_w_cmnepzq4q0000tj3mb8m6hj5n	2026-03-31 14:36:27.53	2026-04-01 14:03:11.059	6616d61a2f1b38a1	6d2e359b6718cec39950ae67b3fc339e2406453b81dc675355c446a3769d9668	\N	VERIFIED	\N	мку	\N
\.


--
-- Data for Name: verification_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification_documents (id, "requestId", type, "filePath", "downloadedAt", "createdAt") FROM stdin;
cmml3u96m0005no16bp8svvfg	cmml2wlgx0005p617yndxm0k4	passport_spread	verification/cmml2wlgx0005p617yndxm0k4/passport_spread.jpg	\N	2026-03-10 21:11:01.63
cmml3ub1b0007no16d4ndb7o1	cmml2wlgx0005p617yndxm0k4	selfie	verification/cmml2wlgx0005p617yndxm0k4/selfie.jpg	\N	2026-03-10 21:11:04.032
cmml3tqrr0003no16zsu2f5hw	cmml2wlgx0005p617yndxm0k4	passport_main	verification/cmml2wlgx0005p617yndxm0k4/passport_main.jpg	2026-03-10 21:11:27.44	2026-03-10 21:10:37.767
cmml4108f0007o216yg2i1j38	cmml40xki0005o21645lsm8ve	passport_main	verification/cmml40xki0005o21645lsm8ve/passport_main.jpg	\N	2026-03-10 21:16:16.624
cmml412y60009o216zxtrrlq9	cmml40xki0005o21645lsm8ve	passport_spread	verification/cmml40xki0005o21645lsm8ve/passport_spread.jpg	\N	2026-03-10 21:16:20.142
cmml4157k000bo216dr0fr4d9	cmml40xki0005o21645lsm8ve	selfie	verification/cmml40xki0005o21645lsm8ve/selfie.jpg	\N	2026-03-10 21:16:23.072
cmml7y63h000bom16yiwmzetg	cmml7xxrs0009om16nnytbyn5	passport_main	verification/cmml7xxrs0009om16nnytbyn5/passport_main.jpg	\N	2026-03-10 23:06:02.718
cmml7y8ho000dom168ltaho2c	cmml7xxrs0009om16nnytbyn5	passport_spread	verification/cmml7xxrs0009om16nnytbyn5/passport_spread.jpg	\N	2026-03-10 23:06:05.82
cmml7yas9000fom16qlgxztz0	cmml7xxrs0009om16nnytbyn5	selfie	verification/cmml7xxrs0009om16nnytbyn5/selfie.jpg	\N	2026-03-10 23:06:08.793
cmml8857n000tom16dnuhhvzr	cmml882kp000rom161m5f1xtv	passport_main	verification/cmml882kp000rom161m5f1xtv/passport_main.jpg	\N	2026-03-10 23:13:48.132
cmml887a1000vom160w1eivhh	cmml882kp000rom161m5f1xtv	passport_spread	verification/cmml882kp000rom161m5f1xtv/passport_spread.jpg	\N	2026-03-10 23:13:50.809
cmml8891y000xom16bvmpvoqp	cmml882kp000rom161m5f1xtv	selfie	verification/cmml882kp000rom161m5f1xtv/selfie.jpg	\N	2026-03-10 23:13:53.11
\.


--
-- Data for Name: verification_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification_requests (id, "userId", "fullName", "birthDate", "passportSeries", "passportNumber", inn, status, "rejectionReason", "reviewedAt", "reviewedByUserId", "createdAt", "updatedAt") FROM stdin;
cmml2wlgx0005p617yndxm0k4	cmm70ltqq0002oe16m6thzy6j	уцацуа цуа цуа	1999-02-11	1231	123123	1231231231	REJECTED	12312	2026-03-10 21:14:39.662	cmm55ev860000mzbgcqugyr38	2026-03-10 20:44:51.25	2026-03-10 21:14:39.665
cmml40xki0005o21645lsm8ve	cmm70ltqq0002oe16m6thzy6j	1231 123123	2111-03-12	1131	123123	111112312123	REJECTED	111	2026-03-10 21:16:54.685	cmm55ev860000mzbgcqugyr38	2026-03-10 21:16:13.17	2026-03-10 21:16:54.688
cmml7xxrs0009om16nnytbyn5	cmm55hstp0008mz1f61roz8ga	123123	1111-11-11	1231	123123	123131312321	REJECTED	132	2026-03-10 23:08:44.58	cmm55ev860000mzbgcqugyr38	2026-03-10 23:05:51.929	2026-03-10 23:08:44.583
cmml882kp000rom161m5f1xtv	cmm55hstp0008mz1f61roz8ga	131312	0012-03-12	1231	123123	123123123231	APPROVED	\N	2026-03-10 23:51:34.303	cmm55ev860000mzbgcqugyr38	2026-03-10 23:13:44.713	2026-03-10 23:51:34.305
cmmlb48ip0007o616un9j2q92	cmm70ltqq0002oe16m6thzy6j	Лаьвьвдвт	2026-03-13	1212	515115	121281484845	PENDING	\N	\N	\N	2026-03-11 00:34:44.642	2026-03-11 03:54:06.472
\.


--
-- Name: users_uniqueId_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."users_uniqueId_seq"', 132, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: employee_reviews employee_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_reviews
    ADD CONSTRAINT employee_reviews_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: establishments establishments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.establishments
    ADD CONSTRAINT establishments_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: paygine_cubbies paygine_cubbies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paygine_cubbies
    ADD CONSTRAINT paygine_cubbies_pkey PRIMARY KEY (id);


--
-- Name: payout_requests payout_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT payout_requests_pkey PRIMARY KEY (id);


--
-- Name: payout_rules payout_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_rules
    ADD CONSTRAINT payout_rules_pkey PRIMARY KEY (id);


--
-- Name: registration_requests registration_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_requests
    ADD CONSTRAINT registration_requests_pkey PRIMARY KEY (id);


--
-- Name: registration_tokens registration_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT registration_tokens_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_threads support_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_threads
    ADD CONSTRAINT support_threads_pkey PRIMARY KEY (id);


--
-- Name: system_default_limits system_default_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_default_limits
    ADD CONSTRAINT system_default_limits_pkey PRIMARY KEY (id);


--
-- Name: tip_links tip_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tip_links
    ADD CONSTRAINT tip_links_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_documents verification_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT verification_documents_pkey PRIMARY KEY (id);


--
-- Name: verification_requests verification_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_reviews_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "employee_reviews_employeeId_idx" ON public.employee_reviews USING btree ("employeeId");


--
-- Name: employees_establishmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "employees_establishmentId_idx" ON public.employees USING btree ("establishmentId");


--
-- Name: employees_qrCodeIdentifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "employees_qrCodeIdentifier_idx" ON public.employees USING btree ("qrCodeIdentifier");


--
-- Name: employees_qrCodeIdentifier_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "employees_qrCodeIdentifier_key" ON public.employees USING btree ("qrCodeIdentifier");


--
-- Name: employees_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "employees_userId_key" ON public.employees USING btree ("userId");


--
-- Name: establishments_tipPoolUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "establishments_tipPoolUserId_key" ON public.establishments USING btree ("tipPoolUserId");


--
-- Name: establishments_uniqueSlug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "establishments_uniqueSlug_idx" ON public.establishments USING btree ("uniqueSlug");


--
-- Name: establishments_uniqueSlug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "establishments_uniqueSlug_key" ON public.establishments USING btree ("uniqueSlug");


--
-- Name: password_reset_tokens_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "password_reset_tokens_expiresAt_idx" ON public.password_reset_tokens USING btree ("expiresAt");


--
-- Name: password_reset_tokens_tokenHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "password_reset_tokens_tokenHash_idx" ON public.password_reset_tokens USING btree ("tokenHash");


--
-- Name: password_reset_tokens_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON public.password_reset_tokens USING btree ("tokenHash");


--
-- Name: password_reset_tokens_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "password_reset_tokens_userId_idx" ON public.password_reset_tokens USING btree ("userId");


--
-- Name: paygine_cubbies_sdRef_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "paygine_cubbies_sdRef_idx" ON public.paygine_cubbies USING btree ("sdRef");


--
-- Name: paygine_cubbies_sdRef_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "paygine_cubbies_sdRef_key" ON public.paygine_cubbies USING btree ("sdRef");


--
-- Name: paygine_cubbies_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "paygine_cubbies_userId_idx" ON public.paygine_cubbies USING btree ("userId");


--
-- Name: payout_requests_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payout_requests_createdAt_idx" ON public.payout_requests USING btree ("createdAt");


--
-- Name: payout_requests_externalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payout_requests_externalId_idx" ON public.payout_requests USING btree ("externalId");


--
-- Name: payout_requests_externalId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payout_requests_externalId_key" ON public.payout_requests USING btree ("externalId");


--
-- Name: payout_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payout_requests_status_idx ON public.payout_requests USING btree (status);


--
-- Name: payout_requests_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payout_requests_userId_idx" ON public.payout_requests USING btree ("userId");


--
-- Name: payout_rules_establishmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payout_rules_establishmentId_idx" ON public.payout_rules USING btree ("establishmentId");


--
-- Name: registration_requests_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "registration_requests_createdAt_idx" ON public.registration_requests USING btree ("createdAt");


--
-- Name: registration_requests_registrationTokenId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "registration_requests_registrationTokenId_key" ON public.registration_requests USING btree ("registrationTokenId");


--
-- Name: registration_requests_requestType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "registration_requests_requestType_idx" ON public.registration_requests USING btree ("requestType");


--
-- Name: registration_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registration_requests_status_idx ON public.registration_requests USING btree (status);


--
-- Name: registration_tokens_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "registration_tokens_createdById_idx" ON public.registration_tokens USING btree ("createdById");


--
-- Name: registration_tokens_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "registration_tokens_employeeId_idx" ON public.registration_tokens USING btree ("employeeId");


--
-- Name: registration_tokens_establishmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "registration_tokens_establishmentId_idx" ON public.registration_tokens USING btree ("establishmentId");


--
-- Name: registration_tokens_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "registration_tokens_expiresAt_idx" ON public.registration_tokens USING btree ("expiresAt");


--
-- Name: registration_tokens_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "registration_tokens_tokenHash_key" ON public.registration_tokens USING btree ("tokenHash");


--
-- Name: registration_tokens_usedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "registration_tokens_usedById_idx" ON public.registration_tokens USING btree ("usedById");


--
-- Name: sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_expiresAt_idx" ON public.sessions USING btree ("expiresAt");


--
-- Name: sessions_refreshToken_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_refreshToken_idx" ON public.sessions USING btree ("refreshToken");


--
-- Name: sessions_refreshToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "sessions_refreshToken_key" ON public.sessions USING btree ("refreshToken");


--
-- Name: sessions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");


--
-- Name: support_messages_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "support_messages_createdAt_idx" ON public.support_messages USING btree ("createdAt");


--
-- Name: support_messages_threadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "support_messages_threadId_idx" ON public.support_messages USING btree ("threadId");


--
-- Name: support_threads_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "support_threads_updatedAt_idx" ON public.support_threads USING btree ("updatedAt");


--
-- Name: support_threads_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "support_threads_userId_idx" ON public.support_threads USING btree ("userId");


--
-- Name: support_threads_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "support_threads_userId_key" ON public.support_threads USING btree ("userId");


--
-- Name: tip_links_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tip_links_employeeId_idx" ON public.tip_links USING btree ("employeeId");


--
-- Name: tip_links_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tip_links_slug_idx ON public.tip_links USING btree (slug);


--
-- Name: tip_links_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tip_links_slug_key ON public.tip_links USING btree (slug);


--
-- Name: tip_links_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tip_links_userId_idx" ON public.tip_links USING btree ("userId");


--
-- Name: tip_links_userId_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "tip_links_userId_slug_key" ON public.tip_links USING btree ("userId", slug);


--
-- Name: transactions_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_createdAt_idx" ON public.transactions USING btree ("createdAt");


--
-- Name: transactions_externalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_externalId_idx" ON public.transactions USING btree ("externalId");


--
-- Name: transactions_externalId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "transactions_externalId_key" ON public.transactions USING btree ("externalId");


--
-- Name: transactions_idempotencyKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_idempotencyKey_idx" ON public.transactions USING btree ("idempotencyKey");


--
-- Name: transactions_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "transactions_idempotencyKey_key" ON public.transactions USING btree ("idempotencyKey");


--
-- Name: transactions_linkId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_linkId_idx" ON public.transactions USING btree ("linkId");


--
-- Name: transactions_recipientId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "transactions_recipientId_idx" ON public.transactions USING btree ("recipientId");


--
-- Name: transactions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_status_idx ON public.transactions USING btree (status);


--
-- Name: users_apiKeyPrefix_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_apiKeyPrefix_idx" ON public.users USING btree ("apiKeyPrefix");


--
-- Name: users_apiKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_apiKey_key" ON public.users USING btree ("apiKey");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_establishmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_establishmentId_idx" ON public.users USING btree ("establishmentId");


--
-- Name: users_login_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_login_idx ON public.users USING btree (login);


--
-- Name: users_login_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_login_key ON public.users USING btree (login);


--
-- Name: users_uniqueId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_uniqueId_key" ON public.users USING btree ("uniqueId");


--
-- Name: verification_documents_downloadedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "verification_documents_downloadedAt_idx" ON public.verification_documents USING btree ("downloadedAt");


--
-- Name: verification_documents_requestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "verification_documents_requestId_idx" ON public.verification_documents USING btree ("requestId");


--
-- Name: verification_requests_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "verification_requests_createdAt_idx" ON public.verification_requests USING btree ("createdAt");


--
-- Name: verification_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_requests_status_idx ON public.verification_requests USING btree (status);


--
-- Name: verification_requests_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "verification_requests_userId_idx" ON public.verification_requests USING btree ("userId");


--
-- Name: employee_reviews employee_reviews_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_reviews
    ADD CONSTRAINT "employee_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_establishmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public.establishments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: establishments establishments_tipPoolUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.establishments
    ADD CONSTRAINT "establishments_tipPoolUserId_fkey" FOREIGN KEY ("tipPoolUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: paygine_cubbies paygine_cubbies_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paygine_cubbies
    ADD CONSTRAINT "paygine_cubbies_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payout_requests payout_requests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT "payout_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payout_rules payout_rules_establishmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_rules
    ADD CONSTRAINT "payout_rules_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public.establishments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registration_requests registration_requests_registrationTokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_requests
    ADD CONSTRAINT "registration_requests_registrationTokenId_fkey" FOREIGN KEY ("registrationTokenId") REFERENCES public.registration_tokens(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: registration_tokens registration_tokens_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT "registration_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: registration_tokens registration_tokens_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT "registration_tokens_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registration_tokens registration_tokens_establishmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT "registration_tokens_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public.establishments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: registration_tokens registration_tokens_usedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT "registration_tokens_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_messages support_messages_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT "support_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_messages support_messages_threadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT "support_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES public.support_threads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: support_threads support_threads_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_threads
    ADD CONSTRAINT "support_threads_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tip_links tip_links_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tip_links
    ADD CONSTRAINT "tip_links_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tip_links tip_links_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tip_links
    ADD CONSTRAINT "tip_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transactions transactions_linkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES public.tip_links(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transactions transactions_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "transactions_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_establishmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public.establishments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: verification_documents verification_documents_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT "verification_documents_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.verification_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: verification_requests verification_requests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT "verification_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2TKJy0SZPHHlnYGKwN97Cg17qN9eGkWIXtPgMWWVGQQ3o2KFG9u5dUtRffOFpeV

