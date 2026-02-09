# QR Token Format (Human-Readable)

Each repair gets a unique **QR token** stored in `repairs.qr_token`. It is used for QR scanning and manual lookup (`GET /repairs/by-qr/:token`).

## Format

- **Pattern**: `LAB` + `YYMMDD` + 4-digit daily sequence (no dash).
- **Examples**: `LAB2501310001`, `LAB2501310002`, `LAB2501311000` (1000th repair that day).

| Part     | Meaning                                              |
|----------|------------------------------------------------------|
| `LAB`    | Fixed prefix (lab/shop identifier).                  |
| `YYMMDD` | Server calendar date at intake (e.g. 250131 = 31 Jan 2025). |
| 4 digits | Daily sequence: 0001–9999, resets each day.        |

## Date

- **Source**: The date is derived from the **backend server** when the intake request is processed: `new Date()` then format as YYMMDD (year, month, date from server local time). No client-supplied date is used.
- **Implementation**: In `generateQrToken(transaction)` in `src/routes/repairs.js`, the date key is built from `d.getFullYear()`, `d.getMonth() + 1`, `d.getDate()` with zero-padding.

## Daily sequence

- **Storage**: Table `qr_daily_sequences` with columns `date_key` (PK, YYMMDD) and `last_value` (integer).
- **Behaviour**: For each intake, the backend gets or creates the row for today’s `date_key`, locks it, increments `last_value` by 1, and uses that value (zero-padded to 4 digits) in the token. The sequence resets each new day (new date key).
- **Concurrency**: Row locking inside the same transaction as repair creation ensures unique tokens under concurrent intakes.

## Legacy tokens

- Older or previously generated tokens (e.g. random format) may no longer be valid if not present in the DB. Lookup is by exact match on `qr_token`; only tokens stored in `repairs` work.

## Frontend: showing the QR code

- **Queue page**: Click a repair’s QR token in the table to open a modal that shows the actual scannable QR code (and the token text).
- **Repair workspace**: The Customer card shows the token and a scannable QR code image below it.

## Code references

- **Model**: `backend/src/models/QrDailySequence.js`
- **Generator**: `generateQrToken(transaction)` in `backend/src/routes/repairs.js` (called inside the intake transaction).
- **Schema**: Run `npm run db:sync` so the table `qr_daily_sequences` exists.
