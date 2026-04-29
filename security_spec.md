# Security Specification: DocuForge AI

## 1. Data Invariants
- An Invoice cannot be created without a valid `fileName` and `fileType`.
- A Partner must have a `name` and `taxCode`.
- A GeneratedDoc must reference an existing `invoiceId`.
- Timestamps (`createdAt`, `updatedAt`) must be strictly validated against `request.time`.
- `taxCode` must follow a specific pattern (standard VN format is typically numeric, but we'll stick to a general identity pattern for IDs).

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

| ID | Collection | Action | Malicious Payload / Context | Expected Result |
|----|------------|--------|------------------------------|-----------------|
| P1 | partners | create | `{ name: "Evil Corp", taxCode: "123", representative: "Me", position: "Hacker" }` without auth | DENIED |
| P2 | partners | update | Changing `taxCode` of an existing partner | DENIED |
| P3 | invoices | create | `{ fileName: "../etc/passwd", fileType: "pdf" }` (Path injection) | DENIED |
| P4 | invoices | update | Changing `status` to "completed" without own auth | DENIED |
| P5 | invoices | update | Adding a ghost field `isVerified: true` | DENIED |
| P6 | partners | create | Tax code exceeding 1KB of junk data | DENIED |
| P7 | generated_docs | create | Referencing a non-existent `invoiceId` | DENIED |
| P8 | invoices | update | Overwriting `createdAt` with a backdated timestamp | DENIED |
| P9 | partners | delete | Authenticated user attempting to delete a partner they didn't create (if ownership applied) | DENIED |
| P10| partners | create | `{ name: 123 }` (Type mismatch) | DENIED |
| P11| invoices | create | Batching 1000 items in one document to cause resource exhaustion | DENIED |
| P12| * | list | Querying all partners without a filter when read limit is enforced | DENIED |

## 3. Test Runner Concept (firestore.rules.test.ts)
The test suite will use the Firebase Emulator to verify that:
1. `allow read: if true` is only a temporary bootstrap state.
2. `isValidPartner()` enforces schema.
3. `affectedKeys().hasOnly()` blocks shadow fields.
