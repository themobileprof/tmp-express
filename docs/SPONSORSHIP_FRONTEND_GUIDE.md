# Sponsorship Discount Code – Frontend Integration Guide

This guide explains how to implement sponsorship discount codes on the frontend for both students and admins, with special attention to 100% discount (free enrollment) behavior.

## Overview
- Discount codes are validated via a public endpoint that returns a Sponsorship UUID.
- Enrollments MUST use the Sponsorship UUID, not the human-readable code.
- 100% discounts result in immediate, free enrollment (no payment), returning `is_free_enrollment: true` and enrollment data.
- Partial discounts follow the normal payment flow.

---

## Student Flow (Happy Path)
1. User enters discount code in the checkout UI
2. Validate code
   - GET `/sponsorships/code/{discountCode}` (public)
   - If valid, extract `sponsorship.id` (UUID)
3. Proceed to enrollment
   - If course flow: POST `/courses/{courseId}/enroll` with `{ sponsorshipId }`
   - If class flow: POST `/classes/{classId}` with `{ sponsorshipId }` (see classes flow)
4. Backend decides:
   - 100% discount → Free enrollment created immediately, returns `is_free_enrollment: true` + enrollment data
   - Partial discount → Continue to payment (Flutterwave) using Payments Initialize

---

## Key Endpoints

### 1) Validate Code (Public)
GET `/sponsorships/code/{discountCode}`

Successful (valid) example response (abbrev):
```json
{
  "valid": true,
  "sponsorship": {
    "id": "<uuid>",
    "courseName": "JavaScript Fundamentals",
    "coursePrice": 99.99,
    "discountType": "percentage",
    "discountValue": 100,
    "remainingSpots": 12,
    "isExpired": false,
    "isFull": false
  },
  "message": "Valid sponsorship code for JavaScript Fundamentals course"
}
```

UI logic:
- If `valid` is false, show error and disable continue
- If `isExpired` or `isFull` → show disabled state and guidance
- Save `sponsorship.id` into local state

### 2) Enroll (Free or Discounted)
Course enrollment (uses Sponsorship UUID):
POST `/courses/{courseId}/enroll`
```json
{
  "sponsorshipId": "<uuid-from-validation>"
}
```

Possible responses:
- Free enrollment (100% discount):
```json
{
  "is_free_enrollment": true,
  "enrollment": { /* enrollment object */ },
  "sponsorship": { /* sponsorship details */ }
}
```
- Validation error (examples):
```json
{
  "error": "Invalid Sponsorship",
  "message": "Invalid or inactive sponsorship",
  "details": {
    "sponsorshipId": "<uuid>",
    "reason": "expired|full|wrong_course|already_used|not_found"
  }
}
```

Class enrollment (discount code support):
POST `/classes/{id}`
```json
{
  "sponsorshipId": "<uuid-from-validation>"
}
```

### 3) Payments (Partial Discount Path)
When discount < 100%, initialize payment:
POST `/payments/initialize`
```json
{
  "paymentType": "course" | "class",
  "itemId": "<course-or-class-id>",
  "sponsorshipCode": "<optional-raw-code>",
  "paymentMethod": "card",
  "callbackUrl": "https://app.example.com/payments/callback"
}
```

Response (one of two):
- Free enrollment path (when sponsorship is 100%):
```json
{
  "success": true,
  "message": "Free enrollment successful",
  "data": {
    "is_free_enrollment": true,
    "enrollment": { /* enrollment */ },
    "sponsorship": { /* sponsorship */ },
    "originalPrice": 99.99,
    "discountAmount": 99.99,
    "finalPrice": 0
  }
}
```
- Regular payment path:
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "payment_id": "<uuid>",
    "reference": "TMP_xxx",
    "flutterwave_reference": "xxxx",
    "checkout_url": "https://checkout.flutterwave.com/xxxx",
    "original_amount": 99.99,
    "discount_amount": 9.99,
    "final_amount": 90.00,
    "payment_type": "course",
    "is_free_enrollment": false
  }
}
```

Then redirect the user to `checkout_url`.

Verification (return from Flutterwave):
GET `/payments/verify/{reference}` → returns enrollment/payment details.

---

## Frontend Pseudocode

```ts
// 1) Validate Code
const res = await GET(`/sponsorships/code/${code}`)
if (!res.valid || res.sponsorship.isExpired || res.sponsorship.isFull) {
  showError()
  return
}
const sponsorshipId = res.sponsorship.id

// 2) Attempt direct enrollment (course)
const enroll = await POST(`/courses/${courseId}/enroll`, { sponsorshipId })
if (enroll.is_free_enrollment) {
  navigateToCourse()
  return
}

// 3) Fallback to payment initialize (partial discounts)
const pay = await POST('/payments/initialize', {
  paymentType: 'course',
  itemId: courseId,
  sponsorshipCode: code,
  paymentMethod: 'card',
  callbackUrl: location.origin + '/payments/callback'
})
if (pay.data?.is_free_enrollment) {
  navigateToCourse()
} else {
  redirect(pay.data.checkout_url)
}
```

Error handling:
- For 400 responses on enroll: inspect `details.reason` and show user-friendly messages
- Disable CTA if code is expired/full/wrong course

---

## Admin Flow

### Create Sponsorship
POST `/sponsorships`
```json
{
  "courseId": "<uuid>",
  "discountType": "percentage" | "fixed",
  "discountValue": 100,
  "maxStudents": 50,
  "duration": 6,
  "notes": "Cohort A"
}
```
- Frontend: provide a form with basic validation; show generated `discountCode` returned by API (see backend response structure in your implementation).

### Share Code
- Show `discountCode` in the admin UI, allow copy and emailing directly.
- Optional: Send via endpoint (see `POST /sponsorships/{id}/email`).

### Monitor Usage/Stats
- GET `/sponsorships/{id}/stats` for utilization analytics
- GET `/admin/payments` and `/admin/payments/stats` for financials and adoption signals

### Manage Sponsorship Lifecycle
- PUT `/sponsorships/{id}` to update `status` (active|paused|expired|completed) or `notes`
- DELETE `/sponsorships/{id}` to remove

---

## UX Recommendations
- Validate code early (on blur or CTA click) and cache `sponsorship.id` in state.
- Display clear banners for free enrollment (100% discount) vs regular payment flows.
- On free enrollment, skip all payment UI and show success with direct navigation.
- Guard rails: disable enrollment if `isExpired` or `isFull` or `wrong_course`.

---

## QA Checklist
- Valid code → 100% discount → immediate enrollment
- Valid code → partial discount → checkout URL shown → verify success → enrollment exists
- Expired code → error surfaced; CTA disabled
- Full capacity → error surfaced; CTA disabled
- Wrong course → error surfaced; CTA disabled

---

## References (API)
- Validate: GET `/sponsorships/code/{discountCode}` (public)
- Enroll (course): POST `/courses/{id}/enroll` (requires auth)
- Enroll (class): POST `/classes/{id}` (requires auth)
- Payments Initialize: POST `/payments/initialize` (requires auth)
- Payments Verify: GET `/payments/verify/{reference}` (requires auth)
- Create Sponsorship (admin): POST `/sponsorships`
- Update Sponsorship (admin): PUT `/sponsorships/{id}`
- Sponsorship Stats (admin): GET `/sponsorships/{id}/stats`
- Email Code (admin): POST `/sponsorships/{id}/email`
- Admin Payments: GET `/admin/payments`, GET `/admin/payments/stats` 