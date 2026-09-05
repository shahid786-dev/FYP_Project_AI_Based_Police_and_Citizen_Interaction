# PakVerify Project Audit Report

**Project:** AI-Based Police and Citizen Interaction / PakVerify
**Audit date:** September 5, 2026
**Audit type:** Read-only senior software engineering review
**Scope:** React/Vite frontend, Django REST backend, FastAPI AI service, Docker configuration, database models, APIs, tests, scripts, documentation, datasets, and repository hygiene.

> No project files were changed during the audit. This document records findings and recommended changes only.

---

## 1. Executive Summary

The project has a broad and valuable feature set. It combines citizen police-verification applications, police and authority dashboards, identity documents, facial verification, criminal-record search, emergency reports, complaints, notifications, digital certificates, QR verification, chatbot support, and a hash-based audit ledger.

The implementation is currently an advanced prototype rather than a production-ready police information system. The most important reasons are:

1. The frontend production build currently fails.
2. Sensitive credentials and insecure defaults are committed.
3. Several backend APIs require a complete object-level authorization review.
4. Criminal face search contains development fallback logic that can generate false criminal matches.
5. Public tracking endpoints expose personally identifiable information.
6. The blockchain feature is a database-backed hash chain, not a distributed blockchain.
7. Automated test coverage is insufficient for the sensitivity of the system.
8. The repository contains generated files, local databases, datasets, media, logs, and duplicated startup/configuration artifacts.

The project is a strong FYP foundation, but security, correctness, privacy, testing, and documentation must be improved before claiming deployment readiness.

---

## 2. Validation Results

### 2.1 Frontend build: failed

The recorded Vite build failed with:

```text
Identifier `videoRef` has already been declared
src/pages/LoginPage.jsx
```

The variable is declared twice in `src/pages/LoginPage.jsx`. This prevents `npm run build` from completing and blocks a reliable production frontend image.

### 2.2 Backend Django system check: passed

The Django system check completed successfully:

```text
System check identified no issues (0 silenced).
```

This confirms that the Django configuration and model registration are syntactically valid. It does not prove that authorization, business workflows, AI decisions, privacy, or API contracts are correct.

### 2.3 Automated test coverage: insufficient

The repository contains `backend/tests.py`, but the available test coverage does not adequately validate the critical workflows. There are no sufficient automated tests for the security-sensitive behavior described in this report.

### 2.4 Repository status

The audit was read-only. No project source files were modified.

---

## 3. Critical Build and Runtime Problems

### 3.1 Duplicate `videoRef` declaration

**File:** `src/pages/LoginPage.jsx`

The production build fails because `videoRef` is declared more than once. This must be fixed before any deployment or final demonstration.

**Impact:**

- `npm run build` fails.
- Docker frontend build is unreliable.
- CI/CD cannot pass.
- Deployment through nginx is blocked.

### 3.2 Development server used as production server

**File:** `docker-compose.yml`

The backend container uses:

```text
python manage.py runserver 0.0.0.0:8000
```

Django `runserver` is for development and should not be used in production. Use Gunicorn or another production WSGI server behind nginx.

### 3.3 Startup commands are not production-safe

The backend container runs migrations and seed data at startup. Running seed operations every time a container starts can cause duplicate data, unexpected state changes, or deployment race conditions. Migrations and seed operations should be separate controlled deployment steps.

---

## 4. Critical Security Problems

### 4.1 Hard-coded Django secret key

**File:** `backend/backend/settings.py`

A fixed secret key is committed in the source code. This can compromise Django signing, JWT signing, sessions, password-reset tokens, and other cryptographic operations.

**Required change:** Load the secret from an environment variable and rotate the existing value.

### 4.2 Debug mode enabled

**File:** `backend/backend/settings.py`

`DEBUG = True` is unsafe for production because it can expose stack traces, filesystem paths, configuration details, and internal application information.

**Required change:** Make it environment-controlled and ensure production uses `DEBUG = False`.

### 4.3 Wildcard allowed hosts

**File:** `backend/backend/settings.py`

`ALLOWED_HOSTS = ['*']` disables host-header restriction.

**Required change:** Configure the actual frontend, backend, and deployment domains explicitly.

### 4.4 Unsafe CORS configuration

The Django backend allows all origins while allowing credentials. The FastAPI service also allows wildcard origins, methods, and headers.

This is dangerous for a system handling CNIC data, identity documents, facial images, criminal records, and emergency reports.

**Required change:** Allow only known frontend origins. Do not expose the AI service publicly unless required.

### 4.5 Database password committed in Docker Compose

**File:** `docker-compose.yml`

A PostgreSQL password is present in the compose file, and a default password is also present in Django settings.

**Required change:** Use environment variables, Docker secrets, or a managed secret store. Rotate any credentials that have been used.

### 4.6 Administrative credentials committed

**File:** `admin_credentials.md`

This file appears to contain administrator credentials or setup information. Any valid credentials must be revoked and rotated. The file should be removed from source control and, if necessary, removed from Git history.

### 4.7 JWT stored in localStorage

The frontend stores access tokens in `localStorage`. Tokens can be stolen if an XSS vulnerability occurs.

**Recommended design:**

- short-lived access tokens,
- refresh tokens in `HttpOnly`, `Secure`, `SameSite` cookies,
- refresh-token rotation,
- server-side revocation,
- clear session expiration handling.

The current one-day access-token lifetime is long for a sensitive administrative platform.

---

## 5. Authorization and Data-Access Problems

### 5.1 Frontend route protection is not security

`src/App.jsx` restricts pages based on roles, but a user can bypass React routes and call the API directly.

Every backend endpoint must independently enforce authentication, role, object ownership, allowed state transitions, and jurisdiction/station restrictions.

### 5.2 Criminal-record creation permission handling is incorrect

The criminal admin view checks the role inside `perform_create()` and returns a `Response`. DRF `perform_create()` does not use that returned response as the endpoint response.

**Required change:** Use DRF permission classes, `has_permission`, `has_object_permission`, or raise `PermissionDenied`.

### 5.3 Criminal face-search fallback can create false matches

**File:** `backend/criminals/views.py`

When the AI request fails, fallback logic compares a criminal name with the logged-in user's name and may append the criminal record as a match.

This is not face verification and can falsely label a person as a criminal whenever the AI service is unavailable or an image fails.

**Required change:** Delete the fallback. Return an explicit inconclusive or service-unavailable result when verification cannot be completed.

### 5.4 Criminal face search is inefficient

The endpoint loops through every criminal mugshot and sends a separate request to the AI service for each record.

**Problems:**

- high latency,
- repeated inference,
- large network overhead,
- possible denial-of-service behavior,
- poor scalability.

**Recommended design:** Precompute embeddings, embed the submitted face once, and use a controlled similarity search with an indexed store.

### 5.5 Public tracking exposes personal information

**File:** `backend/incidents/views.py`

The unified tracking endpoint can return applicant names, complaint titles, descriptions, locations, assigned officers, application purposes, and emergency details.

Anyone who obtains or guesses a tracking ID may access sensitive data.

**Required change:** Use authenticated access or one-time tracking tokens, mask names, return only minimum status information, and never expose full descriptions or locations publicly.

### 5.6 Public blockchain endpoints may expose metadata

Blockchain list and detail endpoints use `AllowAny`. Public hashes do not automatically protect privacy if payloads, record IDs, action types, or user identifiers are exposed.

Review all public fields and expose only deliberately public verification information.

### 5.7 Object-level authorization requires complete testing

Broad querysets such as `Model.objects.all()` are not always incorrect, but every list and detail endpoint must be tested to ensure citizens cannot access another citizen's applications, complaints, SOS reports, evidence, documents, certificates, or payment records.

---

## 6. AI and Face-Verification Problems

### 6.1 AI service has no authentication

The FastAPI service exposes face-verification endpoints without service authentication. Anyone able to reach port `8001` may be able to submit images for inference.

**Required change:** Keep the service private or protect it with internal authentication, signed service requests, network rules, request limits, and rate limits.

### 6.2 Biometric consent and retention are not demonstrated

The project processes facial images and identity documents, but the implementation does not clearly demonstrate:

- explicit consent capture,
- retention duration,
- deletion workflow,
- encryption at rest,
- access logging,
- manual-review process,
- false-positive dispute process,
- model decision explanation.

These requirements should be documented even if the system is only an academic prototype.

### 6.3 Hard-coded model thresholds

Face and liveness thresholds are embedded in the implementation. A threshold must be supported by a documented evaluation rather than presented as universally reliable.

The FYP should report:

- dataset size and composition,
- genuine and impostor samples,
- false acceptance rate,
- false rejection rate,
- precision and recall,
- ROC or precision-recall analysis,
- performance under lighting, pose, and image-quality changes.

### 6.4 Liveness limitations

The liveness endpoint appears to process a single uploaded image. Single-image liveness can be vulnerable to printed-photo attacks, screen replay, manipulated images, and synthetic faces.

The project documentation should state these limitations. A stronger system would use a sequence, challenge-response motion, depth, or another anti-spoofing signal.

---

## 7. Incorrect or Misleading Functionalities

### 7.1 The blockchain is not a distributed blockchain

`backend/blockchain/service.py` creates hash-linked records inside the Django database. This is better described as a tamper-evident audit ledger.

It does not provide:

- peer-to-peer nodes,
- consensus,
- independent validation,
- distributed storage,
- protection from a database administrator rewriting records.

**Required documentation change:** Rename the feature to a tamper-evident audit ledger, or implement and justify a real permissioned blockchain.

### 7.2 Thread lock does not protect multiple workers

The Python thread lock only protects threads in one process. It does not protect writes across Gunicorn workers, containers, or servers.

Use database transactions, row locks, and unique constraints.

### 7.3 Random identifiers may collide

Application, complaint, and SOS identifiers use random six-digit values. Collisions are possible.

Use UUIDs, database sequences, or collision-retry logic.

### 7.4 Evidence records can be invalid

`IncidentEvidence` allows both parent references to be empty or both to be populated. Evidence should belong to exactly one complaint or SOS record.

Add database/model validation enforcing exactly one parent.

### 7.5 File uploads need stronger controls

Identity documents, face images, and evidence uploads need:

- maximum file size,
- MIME-type and extension validation,
- malware scanning,
- image decompression protection,
- private storage outside public web paths,
- authorization before download,
- access logging,
- retention and deletion policies.

### 7.6 Emergency SOS is not yet an operational emergency system

A stored SOS record is not equivalent to an emergency response service. The project does not clearly demonstrate reliable dispatch integration, SMS/push/phone escalation, acknowledgement deadlines, retries, offline support, location validation, or escalation when nobody responds.

Present this as an SOS reporting prototype unless those integrations are implemented.

### 7.7 Payment behavior needs verification

The payment workflow must not allow a client to mark an application paid by simply calling an endpoint. Payment confirmation must be server-side and tied to a payment provider, or the UI and documentation must clearly label it as a simulated payment workflow.

---

## 8. Frontend Problems

### 8.1 Hard-coded API URLs

The frontend uses fixed localhost URLs for the Django API and AI service. This breaks when deployed to another host or Docker environment.

Use environment variables such as:

```text
VITE_API_BASE_URL
VITE_AI_API_BASE_URL
```

### 8.2 Duplicated API surface

The frontend contains separate API methods for citizen, police, authority, admin, incidents, certificates, notifications, chatbot, and blockchain workflows. Without shared response contracts and error handling, endpoint paths and assumptions can drift.

Create a consistent API client with shared request handling, error normalization, and typed or documented response contracts.

### 8.3 Authentication state can become inconsistent

Authentication is stored in both Redux memory and localStorage. Expired tokens, multiple tabs, direct storage changes, and failed refreshes can leave the two states inconsistent.

Use a centralized session lifecycle and explicit token-expiration handling.

### 8.4 Incomplete error handling

The global API interceptor handles `401`, but pages must also handle `403`, `404`, `409`, validation errors, AI timeouts, network failures, and upload failures consistently.

Do not expose raw server errors to users.

### 8.5 Accessibility and operational usability need validation

Test keyboard navigation, focus management, screen readers, mobile layouts, low-bandwidth behavior, form validation, readable errors, and confirmation before irreversible actions.

---

## 9. Repetition, Unnecessary Files, and Repository Hygiene

### 9.1 Generated and local artifacts

The repository contains or appears to contain artifacts that should not normally be committed:

- `dist/`
- `node_modules/`
- `.venv/`
- SQLite database files
- runtime media
- logs
- build error output
- datasets
- local credentials

Strengthen `.gitignore` and remove already-tracked generated or sensitive artifacts from Git tracking.

### 9.2 Dataset placement

`Id_Card_Dataset` and related text data should not be mixed with application source unless the data is legally distributable and required for reproducibility.

Prefer anonymized sample data, a documented data-acquisition process, metadata, and a separate private data location.

### 9.3 Duplicate startup scripts

Both `run_all.bat` and `START_ALL.bat` are present. Consolidate them or document a clear difference between development, Docker, and production startup.

### 9.4 Documentation is still template-level

`README.md` is largely the default Vite template. It should document:

- architecture,
- prerequisites,
- environment variables,
- database setup,
- migrations,
- seed data,
- startup commands,
- roles,
- API endpoints,
- AI limitations,
- tests,
- deployment,
- security warnings.

### 9.5 Heavy and overlapping AI dependencies

The backend and AI service use a large collection of ML packages, including InsightFace, DeepFace, TensorFlow, MediaPipe, OpenCV, NumPy, and ONNX Runtime.

This increases build time, image size, memory requirements, and compatibility problems. Select one face-recognition pipeline and document the decision.

### 9.6 Encoding problems

Some files display corrupted characters such as `â”€` and `â€“`, indicating an encoding mismatch. Standardize files on UTF-8 and clean corrupted comments and generated text.

---

## 10. Required Testing Plan

### 10.1 Authentication tests

- Registration validation
- Password hashing
- Login and refresh behavior
- Logout and token revocation
- OTP expiry
- Password reset
- Disabled users
- Role restrictions

### 10.2 Authorization tests

- Citizen cannot access another citizen's application
- Staff cannot perform authority-only actions
- Authority cannot perform super-admin operations
- Unauthenticated users receive correct responses
- Direct API calls cannot bypass frontend roles

### 10.3 Application workflow tests

- Valid state transitions
- Invalid state transitions
- Duplicate payment attempts
- Certificate issuance requirements
- Document-upload ownership
- Certificate-download authorization

### 10.4 AI tests

- No-face image
- Multiple faces
- Low-quality image
- Spoofed image
- AI timeout
- AI service unavailable
- Threshold behavior
- No false criminal-match fallback

### 10.5 Incident and evidence tests

- SOS creation
- Identifier collision handling
- Complaint ownership
- Officer assignment permissions
- Evidence-parent validation
- File-size and file-type limits
- Public tracking privacy

### 10.6 Ledger and audit tests

- Genesis block
- Concurrent writes
- Tampered hash detection
- Payload sanitization
- Database rollback behavior
- Multi-worker behavior

### 10.7 Frontend tests

- Production build
- Route protection
- API errors
- Loading and empty states
- Upload failure
- Expired session
- Mobile layout

---

## 11. Recommended Priority Order

### Priority 0: Blockers

1. Fix the duplicate `videoRef` declaration.
2. Make `npm run build` pass.
3. Remove committed credentials and rotate them.
4. Disable production debug mode.
5. Move secrets to environment variables.
6. Restrict CORS and allowed hosts.
7. Remove the fake criminal face-match fallback.
8. Review every endpoint for object-level authorization.

### Priority 1: Security and correctness

1. Secure authentication and token storage.
2. Protect the AI microservice.
3. Restrict public tracking data.
4. Secure document, biometric, and evidence files.
5. Add upload validation and size limits.
6. Add transactions for workflow changes.
7. Correct criminal-record creation permissions.
8. Add real payment verification or label payments as simulated.

### Priority 2: Architecture

1. Replace `runserver` in production.
2. Use environment-based frontend API URLs.
3. Consolidate startup scripts.
4. Simplify the AI dependency stack.
5. Rename the blockchain feature or implement a real permissioned ledger.
6. Separate domain services from large view modules.
7. Add consistent API error and response schemas.

### Priority 3: Quality and FYP evidence

1. Add meaningful automated tests.
2. Add CI for lint, build, Django checks, and tests.
3. Add AI evaluation metrics.
4. Add a threat model and privacy documentation.
5. Improve the README.
6. Remove generated files, datasets, media, logs, and local databases from source control.
7. Add architecture and sequence diagrams to the final report.

---

## 12. Final Assessment

The project demonstrates substantial scope and successfully combines modern web development, REST APIs, role-based portals, AI services, face verification, incident reporting, notifications, certificates, and audit logging.

However, it should not currently be presented as production-ready or as a fully secure police information system. Before final submission, the essential improvements are:

- Make the frontend build pass.
- Remove security secrets.
- Fix backend authorization.
- Eliminate simulated AI decisions.
- Protect personal and biometric data.
- Add meaningful automated tests.
- Clarify which features are prototypes or simulations.
- Clean the repository.
- Document the architecture and limitations accurately.

The project has a strong FYP foundation, but security and correctness are core requirements for this domain, not optional polishing.
