# Payments

## Payment Verification Architecture

### Dual-Verification System

The payment system uses a **dual-verification approach** to ensure reliable payment processing:

1. **Primary Verification (Frontend SDK)** - Immediate verification when user returns from Flutterwave
2. **Backup Verification (Webhook)** - Server-side verification as fallback

### Verification Flow

```
User Payment Flow:
1. User completes payment on Flutterwave
2. User redirected back to frontend with tx_ref
3. Frontend calls /api/payments/verify/:reference (Primary)
4. If primary fails, webhook processes payment (Backup)
5. User sees payment result
```

## Payment Endpoints

### Initialize Payment
**POST** `/payments/initialize`

Initialize a payment for a course or class using Flutterwave Standard v3.0.0.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "paymentType": "course",
  "itemId": "uuid",
  "paymentMethod": "card",
  "callbackUrl": "https://themobileprof.com/payment/callback"
}
```

**Parameters:**
- `paymentType` (required): "course" or "class"
- `itemId` (required): UUID of the course or class
- `paymentMethod` (optional): Payment method to use
- `callbackUrl` (optional): URL where user will be redirected after payment completion. If not provided, uses FRONTEND_URL environment variable

**Supported Payment Methods:**
- `card` - Credit/Debit cards
- `bank_transfer` - Direct bank transfers
- `ussd` - USSD payments
- `mobile_money` - Mobile money transfers
- `qr_code` - QR code payments
- `barter` - Barter payments
- `mpesa` - M-Pesa (Kenya)
- `gh_mobile_money` - Ghana Mobile Money
- `ug_mobile_money` - Uganda Mobile Money
- `franc_mobile_money` - Francophone Mobile Money
- `emalipay` - EmaliPay (Ethiopia)

**Response (200):**
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "payment_id": "uuid",
    "reference": "TMP_1234567890_ABC123_ABCD1234",
    "flutterwave_reference": "TMP_1234567890_ABC123_ABCD1234",
    "public_key": "FLWPUBK_TEST-...",
    "tx_ref": "TMP_1234567890_ABC123_ABCD1234",
    "amount": 7999,
    "currency": "USD",
    "customer": {
      "email": "user@example.com",
      "phone_number": "+1234567890",
      "name": "John Doe"
    },
    "customizations": {
      "title": "TheMobileProf LMS",
      "description": "Payment for JavaScript Fundamentals course",
      "logo": "https://themobileprof.com/assets/logo.jpg"
    },
    "payment_options": "card, ussd, banktransfer, mobilemoneyghana, mpesa",
    "callback_url": "https://themobileprof.com/payment/callback?reference=TMP_1234567890_ABC123_ABCD1234",
    "original_amount": 99.99,
    "final_amount": 79.99,
    "discount_amount": 20.00,
    "payment_type": "course",
    "sponsorship": {
      "id": "uuid",
      "discountCode": "SPONSOR123456",
      "discountType": "percentage",
      "discountValue": 20,
      "discountAmount": 20.00,
      "originalPrice": 99.99,
      "finalPrice": 79.99
    }
  }
}
```

**Error Response (400):**
```json
{
  "error": "Payment Error",
  "message": "Unsupported payment method: invalid_method"
}
```

### Get Supported Payment Methods
**GET** `/payments/methods`

Get supported payment methods for a specific country.

**Query Parameters:**
- `country` (optional): Country code (default: NG)

**Response (200):**
```json
{
  "country": "NG",
  "supportedMethods": [
    "card",
    "bank_transfer",
    "ussd",
    "mobile_money",
    "qr_code"
  ],
  "message": "Payment methods available for NG"
}
```

**Supported Countries:**
- **NG** (Nigeria): card, bank_transfer, ussd, mobile_money, qr_code
- **GH** (Ghana): card, bank_transfer, mobile_money, gh_mobile_money
- **KE** (Kenya): card, bank_transfer, mobile_money, mpesa
- **UG** (Uganda): card, bank_transfer, mobile_money, ug_mobile_money
- **CM** (Cameroon): card, bank_transfer, mobile_money, franc_mobile_money
- **ET** (Ethiopia): card, bank_transfer, mobile_money, emalipay

### Primary Payment Verification (Frontend SDK)
**GET** `/payments/verify/:reference`

Primary payment verification method. Called by frontend when user returns from Flutterwave.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment verified and enrollment completed",
  "payment": {
    "id": "uuid",
    "amount": 99.99,
    "status": "successful",
    "transactionId": "FLW123456789"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Payment Error",
  "message": "Payment verification failed"
}
```

**Enhanced Error Responses:**
```json
{
  "error": "Payment Error",
  "message": "Card was declined by bank",
  "code": "CARD_DECLINED",
  "details": {
    "paymentId": "uuid",
    "reference": "TMP_1234567890_ABC123_ABCD1234",
    "suggestedAction": "try_alternative_payment_method"
  }
}
```

### Backup Payment Verification (Webhook)
**POST** `/payments/webhook`

Backup verification method. Automatically called by Flutterwave when payment events occur.

**Headers:**
```
verif-hash: <webhook-signature>
```

**Supported Webhook Events:**
- `charge.completed` - Payment completed (successful or failed)
- `charge.failed` - Payment failed
- `transfer.completed` - Bank transfer completed
- `refund.processed` - Refund processed

**Request Body:**
```json
{
  "event": "charge.completed",
  "data": {
    "tx_ref": "TMP_1234567890_ABC123_ABCD1234",
    "status": "successful",
    "id": "FLW123456789",
    "failure_reason": null
  }
}
```

**Response (200):**
```json
{
  "status": "success"
}
```

**Backup Verification Logic:**
- Only processes payments with `pending` status
- Skips if payment already verified by frontend SDK
- Provides fallback for failed frontend verification
- Logs all webhook events for debugging

### Get User Payments
**GET** `/payments/user`

Get user's payment history.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "paymentType": "course",
      "amount": 99.99,
      "currency": "NGN",
      "status": "successful",
      "paymentMethod": "card",
      "reference": "TMP_1234567890_ABC123_ABCD1234",
      "transactionId": "FLW123456789",
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Payment by ID
**GET** `/payments/:id`

Get specific payment details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "paymentType": "course",
  "amount": 5000,
  "currency": "NGN",
  "status": "successful",
  "paymentMethod": "card",
  "reference": "TMP_1234567890_ABC123_ABCD1234",
  "transactionId": "FLW123456789",
  "errorMessage": null,
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "topic": "Programming"
  },
  "class": null,
  "metadata": {
    "itemTitle": "JavaScript Fundamentals",
    "itemDescription": "Payment for JavaScript Fundamentals course",
    "userEmail": "user@example.com",
    "userName": "John Doe"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (404):**
```json
{
  "error": "Payment Not Found",
  "message": "Payment not found"
}
```

---

## Payment Methods

### Supported Payment Methods by Country

#### Nigeria (NG)
- **Credit/Debit Cards** - Visa, Mastercard, American Express
- **Bank Transfers** - Direct bank transfers
- **USSD** - USSD payments
- **Mobile Money** - Mobile money transfers
- **QR Code** - QR code payments

#### Ghana (GH)
- **Credit/Debit Cards** - Visa, Mastercard, American Express
- **Bank Transfers** - Direct bank transfers
- **Mobile Money** - Mobile money transfers
- **Ghana Mobile Money** - MTN Mobile Money, Vodafone Cash

#### Kenya (KE)
- **Credit/Debit Cards** - Visa, Mastercard, American Express
- **Bank Transfers** - Direct bank transfers
- **Mobile Money** - Mobile money transfers
- **M-Pesa** - Safaricom M-Pesa

#### Uganda (UG)
- **Credit/Debit Cards** - Visa, Mastercard, American Express
- **Bank Transfers** - Direct bank transfers
- **Mobile Money** - Mobile money transfers
- **Uganda Mobile Money** - MTN Mobile Money, Airtel Money

#### Cameroon (CM)
- **Credit/Debit Cards** - Visa, Mastercard, American Express
- **Bank Transfers** - Direct bank transfers
- **Mobile Money** - Mobile money transfers
- **Francophone Mobile Money** - MTN Mobile Money, Orange Money

#### Ethiopia (ET)
- **Credit/Debit Cards** - Visa, Mastercard, American Express
- **Bank Transfers** - Direct bank transfers
- **Mobile Money** - Mobile money transfers
- **EmaliPay** - EmaliPay mobile payments

### Payment Processing
- **Flutterwave Standard Integration** - Latest v3.0.0 payment flow
- **Secure Processing** - PCI DSS compliant
- **Multiple Currencies** - NGN, USD, EUR, GBP
- **Real-time Processing** - Instant payment confirmation
- **Failed Payment Handling** - Automatic retry mechanisms
- **Enhanced Security** - Improved webhook verification
- **Dual Verification** - Frontend SDK + Webhook backup

---

## Payment Flow

### Dual-Verification Payment Flow
1. **User selects course/class** - Chooses item to purchase
2. **Payment initialization** - Creates payment record with unique reference
3. **Redirect to Flutterwave Standard** - User completes payment on hosted page
4. **Primary verification** - Frontend SDK verifies payment immediately
5. **Backup verification** - Webhook processes payment if primary fails
6. **Enrollment creation** - User automatically enrolled on successful payment
7. **Confirmation** - Payment and enrollment confirmed

### Verification Priority
1. **Primary (Frontend SDK)** - Immediate verification when user returns
2. **Backup (Webhook)** - Server-side verification as fallback
3. **Database Check** - Prevents duplicate processing

### Enhanced Webhook Processing
1. **Webhook verification** - Signature validation using SHA512
2. **Status check** - Only process if payment is still pending
3. **Event processing** - Handle multiple webhook events
4. **Payment status update** - Update payment record based on event
5. **Enrollment processing** - Create enrollment for successful payments
6. **Error handling** - Process failed payments and refunds

### Failed Payment Handling
1. **Payment failure detection** - Webhook or timeout
2. **User notification** - Email/SMS about failure
3. **Retry options** - Alternative payment methods
4. **Manual intervention** - Support team assistance
5. **Refund processing** - If partial payment made

---

## Payment Security

### Security Measures
- **Enhanced Webhook Verification** - SHA512 signature validation
- **HTTPS Encryption** - Secure data transmission
- **Token-based Authentication** - JWT for API access
- **Input Validation** - Sanitize all payment data
- **Fraud Detection** - Monitor suspicious transactions
- **Unique References** - Improved reference generation with UUID
- **Dual Verification** - Multiple verification methods

### Data Protection
- **PCI Compliance** - Payment card industry standards
- **Data Encryption** - Encrypt sensitive information
- **Access Controls** - Role-based permissions
- **Audit Logging** - Track all payment activities
- **Data Retention** - Secure storage policies

---

## Payment Analytics

### Transaction Analytics
- **Payment Success Rates** - Track completion rates
- **Verification Method Usage** - Primary vs backup verification
- **Revenue Tracking** - Monitor income generation
- **Payment Method Usage** - Popular payment options by country
- **Geographic Distribution** - Payment by location
- **Seasonal Trends** - Payment patterns over time

### Business Intelligence
- **Revenue Forecasting** - Predict future income
- **Customer Behavior** - Payment preferences by region
- **Conversion Optimization** - Improve payment success
- **Cost Analysis** - Payment processing costs
- **ROI Tracking** - Return on investment metrics

---

## Error Handling

### Common Payment Errors
- **Insufficient Funds** - User's account lacks funds
- **Card Declined** - Bank rejected transaction
- **Network Issues** - Connectivity problems
- **Invalid Card Details** - Incorrect card information
- **Transaction Timeout** - Payment session expired
- **Unsupported Payment Method** - Method not available for country
- **Verification Failure** - Both primary and backup verification failed

### Enhanced Error Response Format
```json
{
  "error": "PaymentError",
  "message": "Card was declined by bank",
  "code": "CARD_DECLINED",
  "details": {
    "paymentId": "uuid",
    "reference": "TMP_1234567890_ABC123_ABCD1234",
    "suggestedAction": "try_alternative_payment_method"
  }
}
```

### Error Mapping
- `INVALID_PUBLIC_KEY` - Payment service configuration error
- `INVALID_SECRET_KEY` - Payment service configuration error
- `INVALID_TX_REF` - Invalid payment reference
- `INVALID_AMOUNT` - Invalid payment amount
- `INVALID_CURRENCY` - Invalid currency specified
- `INVALID_CUSTOMER` - Invalid customer information
- `INVALID_PAYMENT_METHOD` - Unsupported payment method
- `INSUFFICIENT_FUNDS` - Insufficient funds for payment
- `CARD_DECLINED` - Card was declined by bank
- `TRANSACTION_FAILED` - Payment transaction failed
- `NETWORK_ERROR` - Network error occurred
- `TIMEOUT` - Payment request timed out

---

## Best Practices

### Payment Integration
- **Test Environment** - Use sandbox for development
- **Error Handling** - Graceful failure management with user-friendly messages
- **User Feedback** - Clear status messages
- **Retry Logic** - Automatic retry for failures
- **Monitoring** - Real-time payment monitoring
- **Webhook Reliability** - Enhanced webhook processing
- **Dual Verification** - Implement both verification methods

### User Experience
- **Clear Pricing** - Transparent cost breakdown
- **Multiple Options** - Various payment methods by country
- **Quick Processing** - Fast payment completion
- **Confirmation** - Clear success/failure messages
- **Support Access** - Easy help when needed
- **Localized Experience** - Payment methods relevant to user's country

### Security Compliance
- **Regular Audits** - Security assessment
- **Update Dependencies** - Keep libraries current
- **Monitor Threats** - Watch for security issues
- **Incident Response** - Plan for security breaches
- **User Education** - Security best practices
- **Enhanced Verification** - Improved webhook signature validation

---

## Quick Navigation

- **[API Overview](api-overview.md)** - Back to overview
- **[Courses & Classes](courses-classes.md)** - Course purchases
- **[Sponsorships](sponsorships.md)** - Discount codes
- **[Admin Endpoints](admin-endpoints.md)** - Payment administration 