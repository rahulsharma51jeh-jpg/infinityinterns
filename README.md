# Infinity Interns — Internship Portal & Certificate Verification

A production-shaped internship portal for **Infinity Interns** (a unit of Infinity1 Career Counselling Private
Limited). Interns apply online, an administrator verifies their record, and the completion certificate is
**generated automatically on approval** — numbered, QR-coded, and publicly verifiable by certificate number.

The certificate artwork is a faithful rebuild of the official Infinity Interns "Certificate of Completion" design,
rendered from the database rather than from an editable image file.

---

## Contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [How certificates work](#how-certificates-work)
- [The certificate designer](#the-certificate-designer)
- [Verification API](#verification-api)
- [Routes](#routes)
- [Data model](#data-model)
- [Replacing the placeholder logos](#replacing-the-placeholder-logos)
- [Deployment notes](#deployment-notes)
- [Tests](#tests)

---

## What it does

**For interns**
- Register, browse internship domains, and apply in one short form.
- Track application status and see the administrator's notes on a dashboard.
- Download the certificate as PDF (print to A4 landscape) and download its QR code.

**For administrators**
- A review queue that refuses to approve records missing attendance, marks or dates — the values that get printed.
- Edit any certificate value before approving, with a **live preview of exactly what approval will produce**.
- Approve individually or in bulk; certificates are minted automatically.
- Revoke a certificate with a public reason, or restore it. Revocation shows on the public page instantly.
- Rebuild an issued certificate against fresh application data or a different template — **keeping its number**, so
  printed copies and QR codes stay valid.
- Redesign the certificate itself: layout, colours, frame, fonts, logos, wording, QR placement and data columns.
- Manage internship domains, users and portal settings; review an audit log of every administrative action.

**For anyone (no login)**
- Verify a certificate by number at `/verify`, or by scanning the QR code printed on it.
- Machine-readable verification through a JSON API.

---

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run seed          # creates data/portal.db with demo content
npm run dev           # http://localhost:3000
```

Demo accounts created by the seed:

| Role   | Email                        | Password       |
| ------ | ---------------------------- | -------------- |
| Admin  | `admin@infinityinterns.com`  | `Admin@12345`  |
| Intern | `mausam@example.com`         | `Intern@12345` |

The seed also issues two real certificates, so verification is demoable immediately — try
[`/verify/IIN-2026-01001`](http://localhost:3000/verify/IIN-2026-01001).

### Scripts

| Command                    | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `npm run dev`              | Development server                                             |
| `npm run build && npm start` | Production build and server                                  |
| `npm run seed`             | Seed demo data (additive, safe to re-run)                       |
| `npm run seed -- --reset`  | Wipe all tables and re-seed from scratch                        |
| `npm run lint`             | ESLint                                                          |
| `node scripts/e2e.mjs <url>` | End-to-end smoke test of the critical paths (see [Tests](#tests)) |

### Environment

Everything has a working default; nothing is required to run locally.

| Variable               | Default                        | Purpose                                                                             |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `AUTH_SECRET`          | insecure dev fallback          | **Set this in production.** HMAC key for signed session cookies.                     |
| `NEXT_PUBLIC_SITE_URL` | _unset_                        | Forces the origin used in QR codes and verify links. Overrides request-host detection. |
| `DATA_DIR`             | `./data`                       | Where `portal.db` lives.                                                             |

Origin resolution order for QR links: `NEXT_PUBLIC_SITE_URL` → live request host (`x-forwarded-host`, correct behind a
proxy) → the *Public site URL* setting in the admin console → `http://localhost:3000`.

---

## How certificates work

```
application (pending)
      │  admin fills attendance / marks / dates
      ▼
admin approves ──► issueCertificate()
                     │  allocates a unique number from the template's format
                     │  snapshots every field value into certificates.data
                     ▼
              certificate (active)
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
 /certificate/<no>            /verify/<no>
 print / save as PDF          public record + QR
```

Three properties worth calling out:

**Approval is a gate, not a formality.** Nothing is issued on enrolment. `reviewApplication` refuses to approve while
attendance, marks or either date is missing, and names what is missing. Bulk approval skips incomplete records and
reports them by name rather than silently issuing half-empty certificates.

**Issued certificates are frozen.** `certificates.data` stores a snapshot of every value at issue time. Later edits to
the application do **not** rewrite an issued certificate — otherwise a verified document could quietly change after a
recruiter had checked it. To deliberately pull in new data, use **Rebuild** on the certificate page; the certificate
number is preserved so existing printouts and QR codes keep resolving.

**Numbers are unique by construction.** `generateCertNo` expands the template's format string, then checks the database
and retries on collision. Format tokens: `{YEAR}` `{YY}` `{MONTH}` `{SEQ}` `{RAND}` — the default is `IIN-{YEAR}-{SEQ}`,
producing `IIN-2026-01001`.

Lookups are tolerant: case and internal whitespace are normalised, so a pasted `iin 2026 01001` resolves fine.

Every lookup — hit or miss — is written to `verification_log`. Failed lookups are surfaced on the admin overview,
since a cluster of them is a useful forgery signal.

---

## The certificate designer

`/admin/templates` lists templates with live thumbnails; `/admin/templates/<id>` is the editor. The renderer is
entirely data-driven — no part of the layout is hard-coded — so everything below is editable from the UI with a live
preview beside it:

| Group | What you can change |
| --- | --- |
| Page | Size preset (A4 landscape/portrait, US Letter), exact dimensions, background, inner padding |
| Frame | Ornate gold / double line / minimal / none, three tones, thickness, outer margin |
| Fonts & ink | Heading, body and signature font stacks; body ink; bold-accent colour |
| Header | Main logo (upload or path) + height, tagline, and any number of top-right authority logos |
| Title | Title and subtitle text, colours, sizes, letter spacing, flanking rules and their span |
| Body lines | Add / delete / reorder / hide each line; per line: content, type, size, weight, alignment, colour, spacing, line height, max width |
| QR code | On/off, six positions, size, module colour, caption, border |
| Certificate number | On/off, label, **number format**, position, size, colour, issue date |
| Verify badge | On/off, heading, domain, email, three colours |
| Footer logos | Add / delete / reorder accreditation logos |
| Signature | Company name, uploaded signature image or script text, designation, colour |
| Footer note | Text, size, colour |
| Watermark | On/off, text or image, opacity, size, rotation |
| Data columns | Add / rename / remove the columns that feed the placeholders |

**Body copy** supports `{{placeholder}}` interpolation and `**bold**` spans. Available placeholders are listed in the
editor and are click-to-copy.

**Data columns are the "extra fields" mechanism.** Each column becomes a placeholder. Its *source* names the
application column to read from; leave it blank and type a *fixed value* instead. So adding a "Grade" column and
writing `Grade: **{{grade}}**` into a body line is a two-minute change with no code.

Computed placeholders always available: `cert_no`, `issue_date`, `year`, `pronoun_subject`, `pronoun_object`,
`pronoun_possessive`, `verify_url`.

Multiple templates can coexist; one is the **default** used for newly issued certificates. Templates already used by
issued certificates cannot be deleted.

> Editing a template affects certificates issued **from now on**. Existing ones keep their snapshot until you
> explicitly rebuild them.

### PDF output

The certificate renders at its exact design size and is scaled for the screen with a CSS transform; the print
stylesheet removes that scaling and sets `@page { size: A4 landscape; margin: 0 }`. Use **Print / Save as PDF** on
`/certificate/<no>` with margins *None* and *Background graphics* enabled.

---

## Verification API

```
GET /api/verify/<certificateNumber>
```

Always returns `200` with `found` / `valid` booleans so integrators branch on the body, not on status codes.
`Access-Control-Allow-Origin: *`, no caching.

```json
{
  "found": true,
  "valid": true,
  "status": "active",
  "certificate_no": "IIN-2026-01001",
  "intern_name": "Mausam Kumari",
  "salutation": "Ms.",
  "institute": "Government Polytechnic Barh",
  "course": "Mechanical Engineering",
  "domain": "AutoCAD",
  "duration": "4 Weeks",
  "mode": "Online",
  "start_date": "02-06-2026",
  "end_date": "29-06-2026",
  "attendance_percent": 88,
  "marks_percent": 93,
  "issued_on": "2026-08-14",
  "revoke_reason": null,
  "verify_url": "https://example.com/verify/IIN-2026-01001",
  "issuer": "Infinity Interns (Infinity1 Career Counselling Private Limited)"
}
```

A revoked certificate returns `"found": true, "valid": false` with `revoke_reason` populated.

```
GET /api/qr/<certificateNumber>?size=1200&download=1
```

PNG QR code pointing at the certificate's public verification page.

---

## Routes

**Public**

| Path | Purpose |
| --- | --- |
| `/` | Marketing home with an inline verification box and a live sample certificate |
| `/programs`, `/programs/[slug]` | Internship domains |
| `/verify` | Verify by certificate number, plus FAQ and API docs |
| `/verify/[certNo]` | Verification result: record on file, QR, rendered certificate |
| `/certificate/[certNo]` | Standalone print/PDF page |
| `/about`, `/contact` | Company and support information |
| `/login`, `/register` | Authentication |

**Intern** — `/apply`, `/dashboard`

**Admin** — `/admin` (overview), `/admin/applications[/id]`, `/admin/certificates[/id]`,
`/admin/templates[/id]`, `/admin/programs`, `/admin/interns`, `/admin/settings`

---

## Data model

SQLite via `better-sqlite3`. Schema in [`src/lib/schema.sql`](src/lib/schema.sql), applied on first connection.

| Table | Role |
| --- | --- |
| `users` | Accounts; `role` is `intern` or `admin` |
| `programs` | Internship domains |
| `applications` | An intern's application and the values printed on their certificate |
| `templates` | Certificate designs (`config` is a JSON `TemplateConfig`) |
| `certificates` | Issued certificates: unique `cert_no`, frozen `data` snapshot, status, verify counter |
| `verification_log` | Every public lookup, hit or miss, with source (`web` / `qr` / `api`) |
| `audit_log` | Administrative actions |
| `settings` | Key/value portal configuration, including the certificate counter |

**Key modules**

| File | Responsibility |
| --- | --- |
| `src/lib/template.ts` | `TemplateConfig` type, system fields, and the default (official) design |
| `src/lib/certificate.ts` | Issue, rebuild, revoke, look up, QR generation, number allocation |
| `src/lib/render.ts` | Placeholder interpolation, `**bold**` parsing, date and pronoun formatting |
| `src/lib/auth.ts` | Password hashing and signed-cookie sessions (`jose`) |
| `src/components/certificate/` | `CertificateArtwork` (pure renderer), `OrnateFrame`, `CertificateStage` (scaling) |

Sessions are HTTP-only signed JWT cookies; the role is re-read from the database on every request, so revoking
someone's admin rights takes effect immediately rather than when their token expires.

---

## Replacing the placeholder logos

`public/logos/` contains **original SVG stand-ins** that approximate the shapes, colours and text of the marks on the
reference certificate (Infinity Interns wordmark, MCA, MSME, AICTE, National Internship Portal, ISO 9001:2015). They
exist so the layout is complete and reviewable — they are **not** the official artwork and should be replaced with the
real files before issuing certificates to interns.

Two ways to swap them:

1. **Overwrite the files** in `public/logos/` keeping the same names — no configuration change needed.
2. **Upload through the designer** (Header and Accreditation logo sections). Uploads are stored inline in the template
   as data URIs, capped at 400 KB each; SVG or compressed PNG is recommended.

The same applies to the director's signature: upload a scanned PNG with a transparent background in
**Signature block → Signature image**, which replaces the script-font rendering.

---

## Deployment notes

- **Set `AUTH_SECRET`** to a long random string. The development fallback is deliberately insecure.
- `better-sqlite3` is a native module and is declared in `serverExternalPackages`, so it is not bundled. SQLite needs a
  persistent writable disk — mount a volume at `DATA_DIR`. On platforms with ephemeral filesystems (Vercel, Lambda),
  point the data layer at a hosted database instead; only `src/lib/db.ts` and the SQL in the query modules would change.
- Put the app behind HTTPS: session cookies set `secure` in production, and `baseUrlFrom` trusts
  `x-forwarded-proto` / `x-forwarded-host`.
- Back up `data/portal.db` (plus its `-wal` file) — it holds every issued certificate.

### Known audit findings

`npm audit` reports advisories in `postcss` and `sharp`, both transitive dependencies inside Next.js's own tree, only
reachable through Next's image optimiser and build pipeline. Clearing them requires a Next.js major upgrade. The
critical Next.js advisory (CVE-2025-66478) **is** patched — this project pins `next@15.5.23`.

---

## Tests

`scripts/e2e.mjs` drives a real browser through the paths that matter and asserts on outcomes rather than on HTTP
status codes alone: public verification of a valid number, rejection of an unknown one, admin sign-in, every admin
page, editing and approving an application, that approval **auto-generates a certificate**, that the brand-new number
verifies over both the web page and the JSON API with the values just saved, revocation flipping the public result,
the designer round-tripping an edit through save and reload, the intern dashboard, and that an intern cannot reach the
admin console.

```bash
npm run build
npm start &                       # or: node node_modules/next/dist/bin/next start -p 3100
node scripts/e2e.mjs http://localhost:3000
```

It exits non-zero if any check fails and prints a `PASS`/`FAIL` line per check. 37 checks currently pass.

`scripts/shot.mjs <url> <out.png> [selector|page]` captures a pixel-exact screenshot — useful for reviewing certificate
artwork changes without a browser.

---

## Tech stack

Next.js 15 (App Router, Server Components, Server Actions) · TypeScript · Tailwind CSS v4 · SQLite
(`better-sqlite3`) · `jose` sessions · `bcryptjs` · `zod` validation · `qrcode` · Playwright for the smoke test.
