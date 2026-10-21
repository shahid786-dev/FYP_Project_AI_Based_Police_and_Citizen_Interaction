# Blockchain Functionality Report

## Scope and method

This report describes the repository as inspected on 7 October 2026. It is based on the current source, route configuration, dependency manifests, and frontend calls. No source code, database, blockchain configuration, or application behavior was changed to prepare it.

## Executive summary

The application has an actively used, database-backed, SHA-256 hash-chained audit ledger. Workflow services append audit records to the Django `BlockchainBlock` table, and an API can recompute the hashes and links to detect some changes to those rows.

**This is not an integration with Ethereum, Polygon, a private-chain node, or another external blockchain.** No Solidity contract, contract address, ABI, RPC endpoint, wallet, transaction submission, or network confirmation was found. The word “blockchain” in the UI and model name describes the local hash-chain ledger; it should not be taken to mean that records are published to a distributed blockchain.

**Certificate QR verification is currently database-backed.** It checks the certificate row's status and expiry and reports whether a matching `CERTIFICATE_ISSUE` ledger row exists. It does not recalculate the PDF hash, compare that hash to the ledger payload, or run the chain-integrity verifier.

### Overall verdict: STATUS B — PARTIALLY FUNCTIONAL

The implemented hash-chain audit ledger is used by application workflows and has a functioning integrity-checking routine. Important blockchain properties and certificate-verification steps are absent: there is no external blockchain network, no independent consensus or distributed copy, no smart contract, and no end-to-end certificate hash verification. This verdict does **not** mean a real public or permissioned blockchain is partially connected; no such connection was found.

## 1. Blockchain-related files discovered

| File | What it does |
|---|---|
| `backend/blockchain/models.py` | Defines the `BlockchainBlock` Django database model and its action types. |
| `backend/blockchain/service.py` | Creates a genesis row, appends hash-linked rows, verifies the locally stored chain, and queries record history. |
| `backend/blockchain/views.py` | Provides authenticated APIs for listing and retrieving rows, checking chain integrity, and querying a record's history. |
| `backend/blockchain/serializers.py` | Serializes block fields, including the JSON payload. |
| `backend/blockchain/urls.py` | Maps the blockchain API paths to the views. |
| `backend/blockchain/apps.py` | Registers the Django app as “Blockchain Ledger.” |
| `backend/blockchain/admin.py` | Displays ledger rows in Django admin and disallows adding/deleting them through the admin interface. |
| `backend/blockchain/migrations/0001_initial.py`, `0002_alter_blockchainblock_action_type_and_more.py` | Create/update the database schema and event choices. |
| `backend/backend/urls.py` | Mounts the endpoints under `/api/blockchain/`. |
| `backend/backend/settings.py` | Selects the database where ledger rows are stored; SQLite is the default, PostgreSQL can be selected by environment settings. |
| `backend/applications/views.py` | Appends application, document, payment, staff-review, authority-decision, and challan events. |
| `backend/applications/certificate_service.py` | Generates a certificate PDF, computes its SHA-256 digest, and appends a certificate-issue event. |
| `backend/applications/models.py` | Stores certificate metadata and the PDF file reference in the database/media storage. |
| `backend/face_verification/service.py` | Appends AI face-verification audit events and stores a reference to the resulting ledger row on the face report. |
| `backend/criminals/service.py` | Appends criminal-check result events. |
| `frontend/src/api/apiClient.js` | Defines frontend HTTP calls for blockchain endpoints and public certificate verification. |
| `frontend/src/pages/BlockchainExplorer.jsx` | Renders the ledger, integrity result, and record-history search. |
| `frontend/src/App.jsx` | Routes staff, authority, and super-admin users to the protected blockchain explorer page. |
| `frontend/src/pages/DigitalCertificatePage.jsx` | Calls the public certificate-verification endpoint when the QR URL is opened. |

No Solidity (`.sol`) source file was found. The backend requirements do not include `web3.py`; the frontend dependencies do not include `ethers` or `web3.js`.

## 2. Blockchain technology and network

| Question | Finding |
|---|---|
| Blockchain/network | **Not found in the current implementation.** The code creates a hash-linked ledger in Django's relational database. |
| Ethereum, Polygon, Ganache, Hardhat, or another node | **Not found in the current implementation.** |
| RPC URL/provider | **Not found in the current implementation.** |
| Smart contract | **Not found in the current implementation.** |
| Contract address, ABI, Solidity version | **Not found in the current implementation.** |
| Backend Web3 library | **Not found in the current implementation.** The service uses Python `hashlib`, `json`, Django ORM, and database transactions. |
| Frontend Web3 library | **Not found in the current implementation.** The explorer uses the application's Axios API client. |
| Wallet/private key/MetaMask | **Not found in the current implementation.** |
| Blockchain transaction submission or confirmation | **Not found in the current implementation.** A database row is created; there is no network transaction to confirm. |
| Database storing the ledger | `BlockchainBlock` is a Django model. `backend/backend/settings.py` defaults to SQLite and supports PostgreSQL through environment configuration. |

The ledger's persisted data is therefore only as decentralized and durable as the configured application database and its operational backups. The code itself does not replicate ledger rows to independent nodes.

## 3. What the implemented ledger does

The central service is `BlockchainService` in `backend/blockchain/service.py`.

### Creating blocks

`BlockchainService.add_block(action_type, record_id, performed_by, payload)`:

1. Checks that `action_type` is in `BlockchainBlock.ACTION_TYPES`.
2. Opens a Django database transaction and takes a thread-level lock while choosing the next index.
3. Creates a genesis row if the table is empty.
4. Uses the previous database row's `current_hash` as the next row's `previous_hash`.
5. Serializes the supplied payload as JSON and hashes it with SHA-256 to make `data_hash`.
6. Hashes the block fields to make `current_hash`:

   `SHA256(index | timestamp | previous_hash | data_hash | action_type | nonce)`
7. Saves the resulting values and the JSON payload in the `BlockchainBlock` database table.

The `nonce` is always set to `0`; there is no proof-of-work search or consensus algorithm.

The service removes payload keys whose names exactly match a small denylist (`password`, `token`, `otp_code`, `otp`, `secret`, `refresh`, `access`). This is a limited key filter, not a general mechanism that detects all sensitive information.

For non-system actors, `performed_by` is stored as an unsalted SHA-256 hash of the supplied identifier. This is pseudonymization, not guaranteed anonymization: identifiers with a small or predictable search space may be guessed and hashed for comparison.

### Verifying the stored chain

`BlockchainService.verify_chain()` checks:

- Whether a non-empty chain begins with a genesis block at index zero.
- Whether block indexes are sequential.
- Whether each `previous_hash` points to the preceding block's `current_hash`.
- Whether each stored payload still matches its `data_hash`.
- Whether each stored `current_hash` matches a recomputation from that row's stored fields.

The result is returned as `{valid, total_blocks, issues}`. An empty table is reported as valid with zero blocks. This validates internal consistency of the rows currently in the database; it does not compare them to an external or independently held blockchain record.

### Immutability controls and their boundary

`BlockchainBlock.save()` refuses to save an existing row, and `delete()` refuses model-instance deletion. Django admin also disallows adding and deleting ledger records and shows fields as read-only.

These are application-layer guardrails. They do not make the database physically immutable: direct SQL/database access, bulk ORM operations that bypass model methods, database replacement, or a sufficiently privileged operator can change or remove rows. Because there is no external anchor or independent replica, a privileged operator able to rewrite the ledger and recompute its hashes could create a different internally consistent chain.

## 4. Smart contract details

**No smart contract was found in the current implementation.** There is no contract name, Solidity source, contract function, event, modifier, ABI, deployed address, or transaction caller to document.

The similarly named Python `BlockchainService` is a Django service class, not a smart contract. Its `add_block`, `verify_chain`, and `get_record_history` methods operate on database rows.

## 5. Backend integration and endpoints

The Django URL configuration mounts the following routes under `/api/blockchain/`:

| Endpoint | Implementation | Behavior/access |
|---|---|---|
| `GET /api/blockchain/blocks/` | `BlockchainBlockListView` | Lists newest-first ledger rows, with a default page size of 20 and optional `action_type` filter. Requires an authenticated `POLICE_STAFF`, `POLICE_AUTHORITY`, or `SUPER_ADMIN` user. |
| `GET /api/blockchain/blocks/<pk>/` | `BlockchainBlockDetailView` | Retrieves one database row. Uses the same role permission. |
| `GET /api/blockchain/verify/` | `BlockchainVerifyView` | Runs the local database chain-integrity check. Uses the same role permission. |
| `GET /api/blockchain/record/<record_id>/` | `BlockchainRecordHistoryView` | Returns `{count, blocks}` for a record ID. Uses the same role permission. |

Although the list-view docstring says “Public read access,” its actual `permission_classes` use `BlockchainAuditPermission`, which requires authentication and one of the three allowed roles. It is not public.

The serializer includes `payload_json`, actor hash, record ID, data hash, current hash, timestamp, and other block fields. Ledger payloads are therefore readable to authorized explorer users; they are not encrypted by this service.

The frontend currently calls the list, verify, and history endpoints. The backend has a detail route, but no corresponding detail method was found in the frontend `blockchainAPI` wrapper.

## 6. Complete event/data flow

### Application and verification workflow

The following events append ledger rows as part of existing backend workflow code:

| Event/action | Source and trigger | Data passed to the ledger |
|---|---|---|
| `APPLICATION_SUBMIT` | `ApplicationListCreateView.create()` after saving a citizen's application | Application database ID as `record_id`; tracking ID and application type in payload; actor supplied as citizen CNIC and stored as its SHA-256 hash. |
| `DOCUMENT_UPLOAD` | `UploadDocumentView.post()` after saving a document | Application database ID; document type and tracking ID; actor hash. The document bytes are not passed to the ledger. |
| `AI_FACE_VERIFY` | `_append_blockchain_block()` called from `FaceVerificationService` verification paths | Face report UUID as `record_id`; report ID, result/status, similarity percentage, model, threshold, and verification time in payload; actor hash or `SYSTEM`. A successful append also stores the block index and current hash on the face-verification report. |
| `CRIMINAL_CHECK` | `perform_criminal_check()` for either a clean result or a database match | Application database ID; result and tracking ID, plus matched-record database ID when applicable; actor hash. The full report summary is not passed as the event payload. |
| `STAFF_REVIEW` | `StaffRemarkView.post()` after setting review fields/status | Application database ID; recommendation and tracking ID; staff actor hash. |
| `STAFF_FORWARD` | `StaffForwardView.post()` after forwarding | Application database ID; tracking ID; staff actor hash. |
| `AUTHORITY_APPROVE` / `AUTHORITY_REJECT` | `AuthorityDecisionView.post()` after recording the decision | Application database ID; tracking ID; authority actor hash. The rejection reason is not in this ledger payload. |
| `STAFF_CONFIRM` | `StaffConfirmView.post()` after setting confirmation status | Application database ID; tracking ID; staff actor hash. |
| `CHALLAN_GENERATE` | `_generate_challan()` | Application database ID; challan number, amount, and tracking ID; applicant actor hash. |
| `PAYMENT_SUBMIT` | `ProcessPaymentView.post()` after creating the payment record and changing status | Application database ID; payment transaction ID, method, amount, and tracking ID; citizen actor hash. |
| `PAYMENT_VERIFY` | `StaffVerifyPaymentView.post()` after marking payment verified | Application database ID; payment transaction ID and tracking ID; staff actor hash. |
| `CERTIFICATE_ISSUE` | `CertificateService.generate_certificate()` after rendering and hashing the PDF | Application database ID; certificate number, tracking ID, and PDF SHA-256 digest; applicant actor hash. |

The chain append is normally after a corresponding business database save, but the business update and ledger append are not consistently enclosed in one shared database transaction. Face-verification ledger failures are explicitly caught and logged as non-fatal. Other callers do not all use the same fallback behavior.

### Certificate issuance, end to end

1. A staff payment-verification action is handled by `StaffVerifyPaymentView.post()` at `POST /api/staff/applications/<pk>/verify-payment/`.
2. The backend updates the payment/application state, appends a `PAYMENT_VERIFY` row, and invokes `CertificateService.generate_certificate(application)`.
3. The certificate service validates the application status, creates a `Certificate` database row, assigns a certificate number and UUID-backed QR value, and builds a verification URL.
4. `render_certificate_pdf()` creates the PDF using applicant/certificate values and embeds a QR code for the verification URL.
5. `hashlib.sha256(pdf_bytes).hexdigest()` calculates the PDF digest. That digest is stored in the certificate's `certificate_hash` database field.
6. The PDF is saved through the certificate `FileField` under media storage.
7. `BlockchainService.add_block('CERTIFICATE_ISSUE', ...)` creates a **database ledger row** whose payload has the certificate number, tracking ID, and PDF digest.
8. The ledger row's `current_hash` is copied into the certificate's `blockchain_transaction_hash` field. Despite the field's name, this value is not a network transaction hash; it is the local ledger row's current hash.
9. The certificate and application status are saved. The API returns the certificate number/status to the frontend.

### What is not part of this flow

There is no call to an RPC endpoint or smart contract, no wallet signing, no network transaction, and no external transaction receipt/confirmation. The flow ends at the local Django database.

## 7. On-ledger vs off-ledger data

### Actual on-chain data

**None.** The current implementation submits no data to a blockchain network.

### Data stored in the application's hash-chain ledger table

Each `BlockchainBlock` database row contains:

- Block index and timestamp.
- Previous hash, current hash, and payload/data hash.
- Event/action type and related `record_id` (usually the application database ID; for AI face verification it is the face report UUID).
- `performed_by`, which is `SYSTEM` or a deterministic SHA-256 hash of the actor identifier.
- Nonce (currently always zero).
- JSON event payload.

Payload examples include tracking IDs, application type, document type, payment transaction ID/method/amount, criminal-check result, certificate number, and certificate PDF hash. These values are in the database ledger, not on a network blockchain. A hash of an identifier does not guarantee that the identifier is unrecoverable.

### Off-ledger/application storage

The relational database and media storage hold the full workflow and supporting records, including application/citizen fields, identity and application details, staff/admin decisions, uploaded document files, face/criminal-check records, payments/challans, certificate metadata, and the generated certificate PDF. The certificate's `certificate_hash` and `blockchain_transaction_hash` are also stored in the relational database. The face report separately stores its ledger block index and hash.

Keeping large files and sensitive personal records off a public chain is generally a sound design goal. In this project, however, there is no public chain: the local database ledger stores selected metadata, and the full application and files remain in the configured database/media storage.

## 8. Certificate verification and QR behavior

### Actual QR path

1. The certificate PDF embeds a URL such as `/verify/CERT-<year>-<number>`.
2. `DigitalCertificatePage` reads the route parameter and calls `certAPI.verify(certNumber)`.
3. The API client sends `GET /api/certificates/verify/<certificate_number>/`.
4. `PublicCertificateVerifyView.get()` looks up a `Certificate` by `certificate_number` or `qr_code_hash` in the Django database.
5. It reports validity based on the certificate database status and expiry date.
6. It queries `BlockchainBlock` for the first `CERTIFICATE_ISSUE` row with that application ID.
7. It returns that row's `current_hash` as `blockchain_hash` and sets `blockchain_verified` to whether the row exists.

### What this does and does not prove

- QR scanning does reach the backend; it is not just a static QR graphic.
- The QR endpoint's certificate lookup and validity decision are database-based.
- The response's `blockchain_verified: true` means a matching certificate-issue database ledger row was found. The endpoint does **not** call `BlockchainService.verify_chain()`.
- It does not retrieve or re-hash the presented/current PDF, compare that result with `Certificate.certificate_hash`, or compare it with the `certificate_hash` inside the ledger payload.
- It does not ask an independent blockchain node to confirm anything.
- Therefore the current QR flow is not an end-to-end blockchain proof that the certificate file has not changed.

The PDF SHA-256 digest is generated and included in the database ledger event, which is useful audit metadata. The present verification endpoint does not use that digest to validate the PDF.

## 9. Security and decentralization assessment

### Immutability and tamper detection

The hash links make ordinary edits to an existing ledger row detectable by `verify_chain()` if the attacker changes a row without repairing all dependent hashes. The model methods and Django admin add guardrails against normal application-level edits.

This is **tamper-evident under limited assumptions**, not immutable in the same sense as an independently replicated blockchain. A database administrator or attacker with sufficient database access can alter rows; there is no external checkpoint, consensus, node replication, or independently verifiable transaction history to prevent or reliably expose a full rewrite.

### Hashing

For certificate issuance, the code computes:

`generated PDF bytes -> SHA-256 -> certificate_hash database field and CERTIFICATE_ISSUE payload`

The block payload is then SHA-256 hashed, and that data hash participates in the block's hash. The hash-chain verifier can check the stored payload and links. However, the public certificate-verification endpoint does not repeat the PDF hashing/comparison step, so the intended `current PDF -> recompute -> compare to recorded digest` certificate test is not implemented in that endpoint.

### Auditability and trust

The ledger gives authorized staff/authority/admin users an application-level chronology of selected events and a local consistency check. It can make accidental or unsophisticated edits to individual ledger rows apparent. Compared with ordinary unlinked audit rows, previous/current hashes make row-to-row alterations easier to detect.

It does not provide an independent trust authority beyond the same application/database operator. A conventional MySQL/PostgreSQL database is not inherently immutable either, but this implementation does not add external consensus or an independently held copy that would prevent a privileged database operator from rewriting both application data and the local ledger.

### Decentralization

**No meaningful decentralization is present in the code.** The ledger is served by one Django application and persisted in its configured database. No peer nodes, validators, consensus, replicated ledger, public-chain address, or permissioned-chain network configuration was found.

### Other relevant boundaries

- Event payloads and actor hashes are stored as readable database values, not encrypted by `BlockchainService`.
- The payload-key filter is a small exact-name denylist; it is not general PII detection.
- Actor hashing is deterministic and unsalted, so predictable identifiers may be guessed.
- The API serializer includes the JSON payload for authorized ledger readers.
- The frontend explorer silently catches list/verification/history errors, which can make API failures look like empty/incomplete results.

## 10. Frontend explorer functionality and observed gaps

The protected `/blockchain` page calls the list and chain-verification endpoints and presents:

- A paginated block list, action labels, block hash snippets, actor-hash snippets, and timestamps.
- The returned chain-validity state and issue messages.
- Counts based on the blocks currently loaded by the page.
- A record-history search field.

Two implementation details limit what the page currently shows:

1. The backend history API returns an object shaped like `{count, blocks: [...]}`, but `BlockchainExplorer` reads `r.data` as an array or looks for `r.data.results`; it does not read `r.data.blocks`. Thus a successful history API response is currently turned into an empty history in the UI.
2. The backend list API is paginated (20 by default), while the page loads it once and paginates the received array locally. The displayed list and its “total” count therefore represent only the fetched page, not necessarily every ledger row.

These are observations about existing behavior, not proposed changes.

## 11. Declared action types vs events found in call sites

`BlockchainBlock.ACTION_TYPES` declares:

`CITIZEN_REGISTER`, `PROFILE_UPDATE`, `APPLICATION_SUBMIT`, `DOCUMENT_UPLOAD`, `AI_FACE_VERIFY`, `NADRA_VERIFY`, `CRIMINAL_CHECK`, `STAFF_REVIEW`, `AUTHORITY_APPROVE`, `AUTHORITY_REJECT`, `CHALLAN_GENERATE`, `STAFF_FORWARD`, `STAFF_CONFIRM`, `PAYMENT_SUBMIT`, `PAYMENT_VERIFY`, `PAYMENT_CONFIRM`, `CERTIFICATE_ISSUE`, `CERTIFICATE_DOWNLOAD`, `RECORD_MODIFY`, and `GENESIS`.

Call sites for these were found: `APPLICATION_SUBMIT`, `DOCUMENT_UPLOAD`, `AI_FACE_VERIFY`, `CRIMINAL_CHECK`, `STAFF_REVIEW`, `AUTHORITY_APPROVE`, `AUTHORITY_REJECT`, `CHALLAN_GENERATE`, `STAFF_FORWARD`, `STAFF_CONFIRM`, `PAYMENT_SUBMIT`, `PAYMENT_VERIFY`, and `CERTIFICATE_ISSUE`. `GENESIS` is created by the service when the table is first used.

No call site was found for `CITIZEN_REGISTER`, `PROFILE_UPDATE`, `NADRA_VERIFY`, `PAYMENT_CONFIRM`, `CERTIFICATE_DOWNLOAD`, or `RECORD_MODIFY`. Their presence in the choices/UI labels alone does not mean those events are recorded.

## 12. Architecture diagram of the current implementation

```text
Citizen / Staff / Authority / Admin browser
                    |
                    | JWT-authenticated application requests
                    v
             Django REST API
                    |
          workflow/application services
          /          |             \
         v           v              v
 application DB   face/criminal    certificate PDF
 records/files    check services   + SHA-256 digest
          \          |              /
           \         |             /
            +------ BlockchainService ------+
                       |                     |
                       | Django ORM +        |
                       | database transaction|
                       v                     |
        BlockchainBlock table in the same configured
          SQLite (default) or PostgreSQL database
                       |
                       +--> /api/blockchain/verify/
                       +--> /api/blockchain/blocks/
                       +--> /api/blockchain/record/<id>/
                                      |
                                      v
                           Protected Blockchain Explorer

Certificate QR:
PDF QR URL -> React DigitalCertificatePage -> public certificate API
           -> Certificate database lookup + CERTIFICATE_ISSUE row-existence lookup
           -> status/expiry/hash fields in API response

No RPC/provider, wallet, smart contract, blockchain network,
on-chain transaction, or network confirmation exists in this flow.
```

## 13. Realistic example based on the current code

The names/numbers below are fictional.

1. **Citizen submits:** Shahid Ali submits a police-verification application. `ApplicationListCreateView.create()` saves the application row and appends an `APPLICATION_SUBMIT` database-ledger row containing its application ID, tracking ID, and application type. His CNIC is SHA-256 hashed for the `performed_by` field.
2. **Checks and review:** When the face-verification and criminal-check services run, they append their respective audit rows. Staff review/forward and authority decision endpoints append additional event rows with action and tracking metadata.
3. **Payment and issue:** After staff verifies payment, `CertificateService.generate_certificate()` creates the certificate and PDF. Suppose it creates certificate number `CERT-2026-123456`.
4. **PDF digest:** The backend hashes the generated PDF bytes and stores the digest in the certificate record. The `CERTIFICATE_ISSUE` payload includes `CERT-2026-123456`, the application's tracking ID, and the digest.
5. **“Blockchain” call:** `BlockchainService.add_block()` links a new row to the previous row's hash and saves it to the same Django-configured database. No external network, contract, wallet, or transaction receipt is involved. The row's `current_hash` is saved in the certificate field named `blockchain_transaction_hash`.
6. **QR scan:** A later scan opens the certificate URL and calls the public verify API. The backend finds the certificate row, checks its database status/expiry, and checks whether a corresponding `CERTIFICATE_ISSUE` row exists. It returns that row's current hash and a boolean indicating row existence.
7. **What the example does not do:** The QR check does not fetch the PDF, recalculate its SHA-256 hash, compare the result to the stored digest, or independently verify an on-chain transaction. It validates application database records and reports whether the local audit entry exists.

## 14. Viva questions and student-friendly answers

### Q1. Why did you use blockchain in your FYP?

The project uses a hash-linked audit ledger to record important events such as application submission, reviews, payment checks, and certificate issuance. The purpose is to make changes to individual audit entries easier to detect. In the current code, this is a database-backed ledger, not a distributed blockchain network.

### Q2. Where exactly is blockchain used?

The main code is `backend/blockchain/service.py`. Application, face-verification, criminal-check, and certificate services call it to append events. The explorer APIs and page let authorized police staff, authorities, and super admins view the local ledger and check its hash links.

### Q3. What information do you store on blockchain?

Strictly speaking, the project does not store anything on a blockchain network. It stores database ledger rows containing event types, record IDs, timestamps, linked hashes, and event metadata. Examples include tracking IDs, payment details, and certificate hashes. The actor value is stored as a hash of the supplied identifier.

### Q4. Why don't you store the complete citizen record on blockchain?

The current implementation keeps full identity/application data and files in the application database and media storage, while the ledger payloads contain selected event metadata. That avoids putting the complete citizen record into the ledger. In a real public blockchain, keeping sensitive personal information off-chain would be especially important.

### Q5. How does blockchain protect a certificate from tampering?

In this project, the certificate PDF is hashed with SHA-256 and that digest is included in a certificate-issue ledger entry. The ledger verifier can detect certain changes to the stored ledger rows. However, the QR verification endpoint does not compare the presented PDF's hash to that digest, and the ledger is not on an independent blockchain, so I cannot claim the current QR flow proves the PDF is unchanged.

### Q6. What is the role of the hash?

A hash is a fixed-length fingerprint of data. The code uses one hash for a ledger payload and another for the block fields, including the previous block's hash. This links database entries and makes a simple edit detectable when the integrity check is run.

### Q7. How does your system verify a certificate?

The QR opens the certificate page, which calls the public certificate API. The API looks up the certificate in the database and checks its status and expiry. It also checks whether a certificate-issue ledger row exists. It does not currently recompute the PDF hash or verify a real blockchain transaction.

### Q8. What is a smart contract?

A smart contract is code deployed on a blockchain that runs when a transaction calls it. My current repository does not contain a Solidity contract or use a smart contract; its `BlockchainService` writes to the Django database.

### Q9. How does your backend communicate with the blockchain?

It does not communicate with an external blockchain. The Python service uses Django's ORM and a database transaction to write a `BlockchainBlock` row. There is no RPC provider or Web3 library in this implementation.

### Q10. What happens when a blockchain transaction is created?

No blockchain transaction is created. When a workflow calls `add_block`, the service builds hashes and inserts a row into the configured application database. There is no network broadcast or confirmation step.

### Q11. What is the transaction hash?

The certificate model has a field named `blockchain_transaction_hash`, but the value assigned is the ledger row's `current_hash`. It is a local block hash, not a transaction hash issued by a blockchain network.

### Q12. Is your blockchain decentralized?

No. The ledger is stored by the Django application in its configured database. The code does not set up peer nodes, independent validators, a consensus process, or replicated copies.

### Q13. What happens if someone modifies the certificate after issuance?

The PDF's digest was recorded at issuance, but the current public verification endpoint does not recalculate the PDF's hash. Therefore, that endpoint may not detect a modified PDF file. The ledger integrity API checks the stored ledger rows, not the current PDF bytes.

### Q14. What happens if the database record is changed?

The chain checker can detect changes made to ledger fields if their hashes/links no longer match. It does not compare every application database field against an audit event. A privileged operator able to rewrite the ledger and recompute hashes is outside the protection this local design provides.

### Q15. What security does blockchain provide that MySQL alone does not?

The hash links add a tamper-evidence check compared with plain unlinked audit rows. But this project stores the chain in the same application database; it does not get the independent copies and consensus of a real distributed blockchain. It should be described as a database-backed hash-chain audit ledger.

### Q16. Is blockchain responsible for authentication?

No. Authentication is handled by the application's existing JWT authentication and permissions. Blockchain ledger entries are not used to log users in.

### Q17. Is blockchain responsible for face recognition?

No. The face-verification service performs the face-check workflow. The ledger only records metadata about a face-verification report when the service appends an `AI_FACE_VERIFY` event.

### Q18. What are the limitations of your blockchain implementation?

It has no external network, smart contract, wallet, or consensus; it is not decentralized; its records live in the application database; the QR verification checks for an audit row instead of verifying the PDF digest; and the explorer's history response handling does not match the backend response shape.

## 15. 30-second explanation for my Sir

“In my FYP, blockchain is intended for keeping a tamper-evident audit trail of important verification and certificate events. When application steps such as staff review, payment verification, or certificate issuance happen, the backend creates a SHA-256 hash-linked record in its database. Certificate issuance also stores the generated PDF's hash in that record. The hash links can reveal some changes to ledger entries, but my current project does not connect to a distributed blockchain or smart contract. When someone scans the certificate QR, the system checks the certificate and ledger records in the database; it does not independently verify the PDF hash against an on-chain transaction. So the current feature mainly provides a local audit trail rather than decentralized blockchain verification.”
