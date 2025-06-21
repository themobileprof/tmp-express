# Payments

## Payment Endpoints

### Initialize Payment
**POST** `/payments/initialize`

Initialize a payment for a course or class.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "paymentType": "course",
  "itemId": "uuid",
  "paymentMethod": "card"
}
```

**Response (200):**
```json
{
  "success": true,
  "paymentId": "uuid",
  "reference": "TMP_1234567890_ABC123",
  "authorizationUrl": "https://checkout.flutterwave.com/v3/hosted/pay/...",
  "paymentData": {
    "link": "https://checkout.flutterwave.com/v3/hosted/pay/...",
    "status": "pending"
  }
}
```

### Verify Payment
**GET** `/payments/verify/:reference`

Verify payment status and complete enrollment.

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
      "reference": "TMP_1234567890_ABC123",
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

### Payment Webhook
**POST** `/payments/webhook`

Flutterwave webhook handler (no authentication required).

**Headers:**
```
verif-hash: <webhook-signature>
```

**Request Body:**
```json
{
  "event": "charge.completed",
  "data": {
    "tx_ref": "TMP_1234567890_ABC123",
    "status": "successful",
    "id": "FLW123456789"
  }
}
```

**Response (200):**
```json
{
  "status": "success"
}
```

---

## Payment Methods

### Supported Payment Methods
- **Credit/Debit Cards** - Visa, Mastercard, American Express
- **Bank Transfers** - Direct bank transfers
- **Mobile Money** - M-Pesa, MTN Mobile Money, Airtel Money
- **Digital Wallets** - PayPal, Apple Pay, Google Pay
- **Cryptocurrency** - Bitcoin, Ethereum (if enabled)

### Payment Processing
- **Flutterwave Integration** - Primary payment processor
- **Secure Processing** - PCI DSS compliant
- **Multiple Currencies** - NGN, USD, EUR, GBP
- **Real-time Processing** - Instant payment confirmation
- **Failed Payment Handling** - Automatic retry mechanisms

---

## Payment Flow

### Standard Payment Flow
1. **User selects course/class** - Chooses item to purchase
2. **Payment initialization** - Creates payment record
3. **Redirect to Flutterwave** - User completes payment
4. **Webhook notification** - Flutterwave confirms payment
5. **Enrollment creation** - User automatically enrolled
6. **Confirmation email** - Payment and enrollment confirmed

### Sponsorship Payment Flow
1. **User applies sponsorship code** - Validates discount
2. **Reduced payment amount** - Calculates final price
3. **Payment processing** - Standard payment flow
4. **Sponsorship tracking** - Records usage for reporting
5. **Enhanced confirmation** - Includes sponsorship details

### Failed Payment Handling
1. **Payment failure detection** - Webhook or timeout
2. **User notification** - Email/SMS about failure
3. **Retry options** - Alternative payment methods
4. **Manual intervention** - Support team assistance
5. **Refund processing** - If partial payment made

---

## Payment Security

### Security Measures
- **Webhook Verification** - Signature validation
- **HTTPS Encryption** - Secure data transmission
- **Token-based Authentication** - JWT for API access
- **Input Validation** - Sanitize all payment data
- **Fraud Detection** - Monitor suspicious transactions

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
- **Revenue Tracking** - Monitor income generation
- **Payment Method Usage** - Popular payment options
- **Geographic Distribution** - Payment by location
- **Seasonal Trends** - Payment patterns over time

### Business Intelligence
- **Revenue Forecasting** - Predict future income
- **Customer Behavior** - Payment preferences
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

### Error Response Format
```json
{
  "error": "PaymentError",
  "message": "Payment failed due to insufficient funds",
  "code": "INSUFFICIENT_FUNDS",
  "details": {
    "paymentId": "uuid",
    "reference": "TMP_1234567890_ABC123",
    "suggestedAction": "try_alternative_payment_method"
  }
}
```

---

## Best Practices

### Payment Integration
- **Test Environment** - Use sandbox for development
- **Error Handling** - Graceful failure management
- **User Feedback** - Clear status messages
- **Retry Logic** - Automatic retry for failures
- **Monitoring** - Real-time payment monitoring

### User Experience
- **Clear Pricing** - Transparent cost breakdown
- **Multiple Options** - Various payment methods
- **Quick Processing** - Fast payment completion
- **Confirmation** - Clear success/failure messages
- **Support Access** - Easy help when needed

### Security Compliance
- **Regular Audits** - Security assessment
- **Update Dependencies** - Keep libraries current
- **Monitor Threats** - Watch for security issues
- **Incident Response** - Plan for security breaches
- **User Education** - Security best practices

---

## Quick Navigation

- **[API Overview](api-overview.md)** - Back to overview
- **[Courses & Classes](courses-classes.md)** - Course purchases
- **[Sponsorships](sponsorships.md)** - Discount codes
- **[Admin Endpoints](admin-endpoints.md)** - Payment administration 