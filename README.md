** CuraOne — Secure Medical Record Sharing & AI Platform**

**## Purpose**

**\*\*CuraOne\*\*** is a privacy-aware longitudinal medical-record platform. It enables

controlled sharing of patient medical records between healthcare institutions

(hospitals) and provides an AI-assisted question-answering interface over the

records a user is authorized to access.


**## App Goals**

1\. **\*\*Centralized but distributed\*\*** — Patients may receive care from multiple

   hospitals. Their records are scattered. CuraOne provides a single layer where

   patients exist as entities, hospitals/doctors are represented separately, and

   records are associated with patients and their originating hospitals.



2\. **\*\*Patient-controlled sharing\*\*** — A patient can grant another hospital access

   to **\*\*all\*\*** of their records or **\*\*selected\*\*** records. Grants can expire and

   be revoked at any time.


3\. **\*\*Server-side authorization\*\*** — Access is enforced in the backend. The

   frontend is never trusted to enforce permissions.



4\. **\*\*Auditable access\*\*** — Every sensitive action (viewing records, creating

   grants, RAG queries) is logged to an \`audit_logs\` table.



5\. **\*\*AI-assisted retrieval (planned)\*\*** — Authorized users can ask natural

   language questions about a patient's records. The system retrieves only

   authorized records and uses them as context for an LLM to generate a grounded

   answer with source citations.



6\. **\*\*Research evaluation (planned)\*\*** — The RAG retrieval strategies

   (keyword / vector / hybrid) and Top-K values are configurable and

   instrumented for experimental comparison (Precision\@K, Recall\@K, MRR).



\---



**## Key Features**



**### Authentication & Roles**



\| Role             | Capabilities                                                                                                 |

\| ---------------- | ------------------------------------------------------------------------------------------------------------ |

\| \`PATIENT\`        | View own profile, view own records, create/revoke sharing grants, ask RAG questions about own records        |

\| \`DOCTOR\`         | View authorized patients/records, create records where authorized, ask RAG questions over accessible records |

\| \`HOSPITAL_ADMIN\` | Manage doctors at their hospital, view hospital-level info, see patients with grants to their hospital       |

\| \`SYSTEM_ADMIN\`   | Manage all entities, approve doctor-hospital relationships, inspect audit logs, manage synthetic data        |



\- JWT access (short-lived) + refresh (long-lived) token rotation

\- bcrypt password hashing

\- Role checks via \`requireRole(...)\` middleware



**### Medical Records**



\- Structured record types: \`CONSULTATION\`, \`DIAGNOSIS\`, \`MEDICATION\`,

  \`TREATMENT\`, \`LAB_RESULT\`, \`NOTE\`

\- Companion tables for diagnoses, medications, treatments

\- Soft deletes (\`deleted_at\` timestamp)

\- Pagination + filtering by record type, hospital, date range



**### Patient Sharing / Consent**



\- \`ALL_RECORDS\` — grant access to all of the patient's records at a hospital

\- \`SELECTED_RECORDS\` — grant access to specific records only

\- Grants have status \`ACTIVE\` / \`REVOKED\` / \`EXPIRED\`

\- Server validates that the grantor controls the records being shared



**### Authorization Model (Core Security Invariant)**



\`\`\`

Doctor D affiliated (ACTIVE) with Hospital H

Patient P has an active sharing grant to Hospital H

Record R belongs to P, R.hospital_id = H'



D can read R iff:

  H == H' AND grant.scope = ALL_RECORDS

  OR H == H' AND grant.scope = SELECTED_RECORDS AND R.id IN sharing_grant_records

\`\`\`



**\*\*The access path is enforced at the SQL level\*\*** (\`WHERE id = ANY(authorizedIds)\`),

never by post-filtering after retrieval. Unauthorized records never reach the

application layer or LLM context.



**### Audit Logging**



\| Column          | Type      | Description                      |

\| --------------- | --------- | -------------------------------- |

\| \`actor_user_id\` | UUID FK   | Who performed the action         |

\| \`action\`        | VARCHAR   | e.g. \`VIEW_MEDICAL_RECORD\`       |

\| \`resource_type\` | VARCHAR   | e.g. \`medical_record\`, \`user\`    |

\| \`resource_id\`   | UUID      | Affected resource                |

\| \`patient_id\`    | UUID FK   | Relevant patient (if applicable) |

\| \`metadata\`      | JSONB     | Non-sensitive context            |

\| \`created_at\`    | TIMESTAMP | When it happened                 |



Audit writes are fire-and-forget (never crash the request path).



**### Seed Data**



A deterministic seed script reads Synthea synthetic CSV data

(25 patients, \~10 hospitals, \~500+ providers) and ingests:



\- Users (patients, doctors, system admin)

\- Hospitals and doctor-hospital affiliations

\- Medical records (encounters→consultations, conditions→diagnoses,

  medications, procedures→treatments, observations→lab results,

  allergies/immunizations/careplans→notes)

\- Sharing grants with intentional share/restrict/expiry scenarios



\---



**## Architecture**



**### Layered Modular Backend**



\`\`\`

Route

  ↓

Controller / Route Handler

  ↓

Service       ← Business logic, authorization checks

  ↓

Repository    ← Drizzle ORM queries

  ↓

Database (PostgreSQL + pgvector)

\`\`\`



Each module follows:



\`\`\`

module/

├── controller.ts (or inline routes)

├── service.ts

├── repository.ts

├── routes.ts

├── schemas.ts  (Zod validation)

└── types.ts

\`\`\`



**### Project Structure**



\`\`\`

src/

├── app.ts                  # Express app wiring (helmet, cors, logging, routes, error handler)

├── server.ts              # Boot + graceful shutdown

├── config/env.ts          # Zod-validated environment variables

├── db/

│   ├── index.ts            # pg pool + Drizzle instance

│   └── schema/             # 13 tables (users, patients, hospitals, doctors, doctor_hospitals,

│                          #   hospital_admins, medical_records, consultations, diagnoses,

│                          #   medications, treatments, sharing_grants, audit_logs)

├── lib/

│   ├── errors.ts           # AppError + subclasses (NotFoundError, ForbiddenError, etc.)

│   ├── authorization.ts    # getAuthorizedPatientIds, getAuthorizedRecordIds, canAccessRecord

│   └── providers.ts        # EmbeddingProvider / LLMProvider interfaces (stubs for Phase 8)

├── middleware/

│   ├── auth.ts             # JWT verification + requireRole

│   ├── error-handler.ts    # Centralized error → { error: { code, message } }

│   ├── validation.ts       # Zod validation middleware factory

├── modules/

│   ├── auth/               # register/login/refresh/logout/me

│   ├── users/              # list, update

│   ├── hospitals/          # CRUD + doctor affiliation + admin management

│   ├── doctors/            # /me, by-id, hospitals, patients

│   ├── patients/           # list (auth-scoped), get, create (admin), update

│   ├── records/            # list/get/create/update/delete (auth-scoped)

│   ├── consultations/      # list/get/create/update (with companion medical_record)

│   ├── sharing/            # create grant, list, revoke

│   ├── audit/              # admin/patient audit log views

│   └── health/             # GET /api/health

├── utils/

│   └── logger.ts           # Pino logger + pino-http request logging

└── scripts/

    ├── seed.ts             # Synthea CSV ingestion

    ├── synthea-csv.ts      # Streaming CSV reader

    └── synthea-mapper.ts   # Deterministic UUID mapping + helpers

\`\`\`



**### RAG Pipeline (Planned — Phases 8-10)**



\`\`\`

User question

  ↓  Authenticate

  ↓  Identify patient context

  ↓  Determine authorized records (authorization gate)

  ↓  Retrieve (keyword / vector / hybrid — configurable Top-K)

  ↓  Build context from authorized records only

  ↓  LLM generation

  ↓  Answer + source record citations

\`\`\`



\- **\*\*Keyword retrieval\*\***: PostgreSQL full-text search (tsvector/tsquery)

\- **\*\*Vector retrieval\*\***: pgvector cosine similarity (Gemini embeddings)

\- **\*\*Hybrid\*\***: Reciprocal Rank Fusion of keyword + vector candidates

\- **\*\*LLM\*\***: Gemini 1.5 Flash (behind a replaceable interface)



**### Technology Stack**



\| Layer      | Technology                            |

\| ---------- | ------------------------------------- |

\| Runtime    | Node.js + TypeScript (strict)         |

\| Framework  | Express                               |

\| Database   | PostgreSQL (+ pgvector, future)       |

\| ORM        | Drizzle ORM                           |

\| Validation | Zod                                   |

\| Auth       | JWT (jsonwebtoken) + bcryptjs         |

\| Queues     | BullMQ + Redis (future)               |

\| Embeddings | Google Gemini (replaceable interface) |

\| LLM        | Google Gemini 1.5 Flash (replaceable) |

\| Logging    | Pino + pino-http                      |

\| Security   | Helmet, CORS, JWT auth                |

\| Testing    | Vitest + Supertest (planned)          |



**### Infrastructure**



\- **\*\*PostgreSQL\*\***: Local (not containerized)

\- **\*\*Redis\*\***: Docker Compose (\`docker-compose.yml\`)

\- **\*\*Migrations\*\***: Drizzle Kit (\`drizzle/\` directory)



\---



**## API Endpoints (Implemented)**



All routes use \`/api\` prefix.



**### Health**



\`\`\`

GET /api/health

\`\`\`



**### Auth**



\`\`\`

POST /api/auth/register    # Register user (PATIENT creates patient profile, DOCTOR creates doctor profile)

POST /api/auth/login       # Login → access + refresh tokens

POST /api/auth/refresh     # Rotate refresh token

POST /api/auth/logout      # Revoke refresh token

GET  /api/auth/me          # Current user profile

\`\`\`



**### Users**



\`\`\`

GET  /api/users             # List users (SYSTEM_ADMIN)

GET  /api/users/me          # Current user

PATCH /api/users/:id        # Update user (self or SYSTEM_ADMIN)

\`\`\`



**### Hospitals**



\`\`\`

GET    /api/hospitals                    # List (paginated)

GET    /api/hospitals/:id                # Get by ID

POST   /api/hospitals                    # Create (SYSTEM_ADMIN)

PATCH  /api/hospitals/:id                # Update (SYSTEM_ADMIN)

POST   /api/hospitals/:hid/doctors/:did  # Affiliate doctor (SYSTEM_ADMIN, HOSPITAL_ADMIN)

DELETE /api/hospitals/:hid/doctors/:did  # Remove affiliation (SYSTEM_ADMIN, HOSPITAL_ADMIN)

GET    /api/hospitals/:hid/doctors       # List affiliated doctors

GET    /api/hospitals/:hid/admins        # List hospital admins (SYSTEM_ADMIN, HOSPITAL_ADMIN)

POST   /api/hospitals/:hid/admins/:uid   # Assign hospital admin (SYSTEM_ADMIN)

DELETE /api/hospitals/:hid/admins/:uid   # Remove hospital admin (SYSTEM_ADMIN)

\`\`\`



**### Doctors**



\`\`\`

GET /api/doctors                  # List (SYSTEM_ADMIN)

GET /api/doctors/me               # Own profile

GET /api/doctors/:doctorId        # Get by ID

GET /api/doctors/:doctorId/hospitals  # List affiliated hospitals

GET /api/doctors/me/patients      # Authorized patients

GET /api/doctors/:doctorId/patients   # Authorized patients for a doctor

\`\`\`



**### Patients**



\`\`\`

GET  /api/patients                     # List authorized patients

GET  /api/patients/:patientId          # Get by ID

POST /api/patients                     # Create patient (SYSTEM_ADMIN)

PATCH  /api/patients/:patientId        # Update own or admin (dateOfBirth)

\`\`\`



**### Medical Records**



\`\`\`

GET    /api/patients/:pid/records      # List records (auth-scoped, paginated, filtered)

GET    /api/records/:recordId           # Get by ID (auth-checked)

POST   /api/patients/:pid/records       # Create (DOCTOR, SYSTEM_ADMIN)

PATCH  /api/records/:recordId           # Update (creator or admin)

DELETE /api/records/:recordId           # Soft-delete (creator or admin)

\`\`\`



**\*\*Filters\*\***: \`recordType\`, \`hospitalId\`, \`from\`, \`to\`, \`limit\`, \`offset\`



**### Consultations**



\`\`\`

GET    /api/patients/:pid/consultations

GET    /api/consultations/:cid

POST   /api/patients/:pid/consultations

PATCH  /api/consultations/:cid

\`\`\`



Creating a consultation also creates a companion \`medical_record\` (record_type = \`CONSULTATION\`) atomically in a transaction.



**### Sharing Grants**



\`\`\`

POST  /api/patients/:pid/sharing-grants           # Create grant (ALL_RECORDS or SELECTED_RECORDS)

GET   /api/patients/:pid/sharing-grants           # List grants

GET   /api/sharing-grants/:grantId                 # Get grant

PATCH /api/sharing-grants/:grantId/revoke          # Revoke grant

\`\`\`



**### Audit**



\`\`\`

GET /api/audit-logs                      # List all (SYSTEM_ADMIN)

GET /api/patients/:patientId/audit-logs  # Patient's logs (self or SYSTEM_ADMIN)

\`\`\`



\---



**## Development Workflow**



**### Setup**



\`\`\`bash

cd CuraOne/backend

npm install

psql -U postgres -c "CREATE DATABASE curaone_dev;"

cp .env.example .env.development

\# Edit .env.development with DB credentials and JWT_SECRET (>=32 chars)

npm run db:generate    # Generate migrations (if schema changed)

npm run db:migrate     # Apply migrations

npm run redis:up       # Start Redis via Docker

npm run seed           # Seed synthetic data

npm run dev            # Start server

\`\`\`



**### Demo Credentials

Demo credentials are intentionally not included in this public repository.

For local development, create test accounts using your local seed
configuration or your own development credentials. Never commit passwords,
API keys, JWT secrets, database credentials, or other sensitive values.

\---



**## Implementation Status

Phases 0–7 are complete. RAG indexing, RAG retrieval/generation, research evaluation, and automated tests are not implemented yet; they remain planned phases.

## Status: Phases 0–7 Complete**



\| Phase | Description                           | Status                   |

\| ----- | ------------------------------------- | ------------------------ |

\| 0     | Project scaffolding                   | Complete                 |

\| 1     | Database schema & core entities       | Complete                 |

\| 2     | Authentication & users                | Complete                 |

\| 3     | Hospitals, doctors, patients CRUD     | Complete                 |

\| 4     | Medical records & consultations       | Complete                 |

\| 5     | Authorization engine & sharing grants | Complete                 |

\| 6     | Audit logging                         | Complete                 |

\| 7     | Seed data ingestion                   | Complete                 |

\| 8     | RAG indexing pipeline                 | Not started (stubs only) |

\| 9     | RAG retrieval & generation            | Not started              |

\| 10    | Research evaluation layer             | Not started              |

\| 11    | Automated tests                       | Not started              |



\---



**## Key Design Decisions & Assumptions**



1\. **\*\*Embedding/LLM provider\*\***: Google Gemini (not OpenAI as originally planned in implementation_plan.md) — Geminin is used because it's more cost-effective for this prototype. Providers are behind replaceable interfaces (\`EmbeddingProvider\`, \`LLMProvider\`).



2\. **\*\*HOSPITAL_ADMIN association\*\***: The spec defines the \`HOSPITAL_ADMIN\` role but doesn't specify how to associate an admin with a hospital. We added a \`hospital_admins\` join table (UUID PK, \`UNIQUE(userId, hospitalId)\`) to map users to the hospitals they manage.



3\. **\*\*No rate limiting\*\***: Not implemented yet — this is a demo prototype. Security requirements list it, but it's deferred to a later phase.



4\. **\*\*Logger location\*\***: The Pino logger is at \`src/utils/logger.ts\` (not \`src/lib/logger.ts\` as suggested in the spec's architecture section).
