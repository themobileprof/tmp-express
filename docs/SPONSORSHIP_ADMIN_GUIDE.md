# Sponsorship Admin Guide (Payment Tracking + Invoices)

This guide documents recent enhancements enabling admins to create sponsorships that may not pass through a paywall, track whether they are paid, and generate invoice data.

## Database Fields (sponsorships)
Added columns (idempotent migration):
- `is_paid` (boolean, default false)
- `paid_at` (timestamp, nullable)
- `payment_id` (uuid, nullable; references `payments.id`)
- `payment_reference` (string, nullable)
- `paid_amount` (decimal, nullable)
- `paid_currency` (string, default 'USD')
- `created_by` (string: 'sponsor' | 'admin', default 'sponsor')
- `admin_note` (text, nullable)
- `invoice_number` (string, unique)

Run migration:
```bash
node src/database/migrate.js
```

## Create Sponsorship (Admin)
POST `/api/admin/sponsorships`

Body:
```json
{
  "sponsorId": "<uuid>",
  "courseIds": ["<course-uuid-1>", "<course-uuid-2>"],
  "discountType": "percentage",
  "discountValue": 50,
  "maxStudents": 100,
  "startDate": "2025-09-01",
  "endDate": "2026-09-01",
  "notes": "Internal note",
  "adminNote": "Created offline by admin"
}
```
Notes:
- Sets `created_by = 'admin'`.
- Supports multi-course sponsorships via `sponsorship_courses` table.

## Get Sponsorship Payment Status (Admin)
GET `/api/admin/sponsorships/{id}/payment-status`

Response:
```json
{
  "id": "<sponsorship-id>",
  "isPaid": false,
  "paidAt": null,
  "paidAmount": null,
  "paidCurrency": "USD",
  "paymentId": null,
  "paymentReference": null,
  "invoiceNumber": "INV-2509-598BAFDF"
}
```

## Mark Sponsorship Invoice as Paid (Admin)
POST `/api/admin/sponsorships/{id}/mark-paid`

Body (all fields optional except `id` in path):
```json
{
  "amount": 20000,
  "currency": "USD",
  "paymentId": "<payment-uuid-or-ref>",
  "reference": "OFFLINE-TRANSFER-REF-123",
  "paidAt": "2025-08-28T08:00:00.000Z"
}
```
Response:
```json
{
  "id": "<sponsorship-id>",
  "isPaid": true,
  "paidAt": "2025-08-28T08:00:00.000Z",
  "paidAmount": 20000,
  "paidCurrency": "USD",
  "paymentId": "<payment-uuid-or-ref>",
  "paymentReference": "OFFLINE-TRANSFER-REF-123",
  "invoiceNumber": "INV-2509-598BAFDF"
}
```

## Generate Sponsorship Invoice (Admin)
GET `/api/admin/sponsorships/{id}/invoice`

- Returns invoice JSON including sponsor info, courses, sponsorship terms, and payment metadata.
- Automatically generates `invoice_number` if missing (format: `INV-YYMM-<sponsorshipIdPrefix>`).
- Invoice `amount` is calculated as the average price of the covered courses multiplied by `maxStudents`.

Sample Response:
```json
{
  "invoiceNumber": "INV-2509-598BAFDF",
  "issueDate": "2025-08-28T07:12:00.000Z",
  "dueDate": "2025-08-28T07:12:00.000Z",
  "status": "unpaid",
  "sponsor": {
    "id": "<sponsor-uuid>",
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  },
  "sponsorship": {
    "id": "<sponsorship-id>",
    "discountCode": "COV3K3346I",
    "discountType": "percentage",
    "discountValue": 50,
    "maxStudents": 100,
    "startDate": "2025-09-01",
    "endDate": "2026-09-01",
    "createdBy": "admin",
    "adminNote": "Created offline by admin"
  },
  "courses": [
    { "id": "<course-uuid-1>", "title": "Linux Essentials", "price": 200 },
    { "id": "<course-uuid-2>", "title": "Linux Essentials Empty", "price": 200 }
  ],
  "amount": 20000,
  "payment": {
    "isPaid": false,
    "paidAt": null,
    "amount": null,
    "currency": "USD",
    "paymentId": null,
    "reference": null
  }
}
```

## Recommended Admin Flow
1. Create sponsorship via POST `/api/admin/sponsorships` (with `courseIds`).
2. Share generated `discountCode` with sponsor.
3. If sponsor pays offline, update payment fields via your internal admin tool (set `is_paid`, `paid_at`, etc.).
4. Use GET `/api/admin/sponsorships/{id}/payment-status` to verify paid/unpaid state for reporting.
5. Use GET `/api/admin/sponsorships/{id}/invoice` to display/print an invoice.

## Frontend Notes
- For student enrollments, nothing changes: validate code, attempt enrollment or payment initialize.
- Admin dashboards can render invoice JSON and payment status for sponsorships created offline. 