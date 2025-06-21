# Flutterwave Payment Integration Setup

This guide helps you set up Flutterwave payment integration for TheMobileProf LMS.

## Prerequisites

1. **Flutterwave Account**: Sign up at [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. **Business Verification**: Complete your business verification
3. **Webhook URL**: Your server must be accessible via HTTPS

## Flutterwave Dashboard Setup

### 1. Get API Keys

1. Log in to your Flutterwave Dashboard
2. Go to **Settings** → **API Keys**
3. Copy your API keys:
   - **Public Key**: `FLWPUBK_TEST-...` (for test) or `FLWPUBK-...` (for live)
   - **Secret Key**: `FLWSECK_TEST-...` (for test) or `FLWSECK-...` (for live)

### 2. Set Up Webhook

1. Go to **Settings** → **Webhooks**
2. Add a new webhook:
   - **URL**: `https://your-domain.com/api/payments/webhook`
   - **Events**: Select `charge.completed`
3. Copy the **Secret Hash** from the webhook settings

### 3. Configure Payment Methods

1. Go to **Settings** → **Payment Methods**
2. Enable the payment methods you want to support:
   - **Card Payments**
   - **Bank Transfers**
   - **USSD**
   - **Mobile Money**
   - **QR Code**

## Environment Variables

Add these variables to your `.env` file:

```env
# Flutterwave Configuration
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-b045d13e857debaf08f2d69daf60c15a-X
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-95b57f452a1bfa95e6fa7ac5e81560d6-X
FLUTTERWAVE_SECRET_HASH=FLWSECK_TESTe6a38c0c9ba4

# Frontend Configuration
FRONTEND_URL=https://your-frontend-domain.com
LOGO_URL=https://your-domain.com/logo.png
```

## Test Mode vs Live Mode

### Test Mode
- Use test API keys
- No real money transactions
- Perfect for development and testing
- Test cards available in Flutterwave documentation

### Live Mode
- Use live API keys
- Real money transactions
- Requires business verification
- Production environment only

## Payment Flow

### 1. Initialize Payment
```javascript
// Frontend: Initialize payment
const response = await fetch('/api/payments/initialize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paymentType: 'course',
    itemId: 'course-uuid',
    paymentMethod: 'card'
  })
});

const { authorizationUrl } = await response.json();
window.location.href = authorizationUrl;
```

### 2. Payment Processing
- User is redirected to Flutterwave checkout
- User completes payment
- Flutterwave redirects back to your site

### 3. Payment Verification
```javascript
// Frontend: Verify payment
const reference = new URLSearchParams(window.location.search).get('tx_ref');
const response = await fetch(`/api/payments/verify/${reference}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
if (result.success) {
  // Payment successful, user enrolled
  showSuccessMessage('Payment successful! You are now enrolled.');
} else {
  // Payment failed
  showErrorMessage('Payment failed. Please try again.');
}
```

## Webhook Processing

The webhook automatically:
1. Verifies payment status with Flutterwave
2. Updates payment record in database
3. Creates enrollment for successful payments
4. Updates course/class statistics

## Error Handling

### Common Payment Errors

1. **Insufficient Funds**
   - User doesn't have enough money
   - Handle gracefully with user-friendly message

2. **Card Declined**
   - Bank declined the transaction
   - Suggest alternative payment methods

3. **Network Issues**
   - Temporary connectivity problems
   - Retry mechanism built-in

4. **Invalid Reference**
   - Payment reference not found
   - Check payment initialization

### Error Response Format
```json
{
  "error": "Payment failed",
  "message": "Card declined by bank",
  "code": "PAYMENT_ERROR",
  "details": {
    "reference": "TMP_1234567890_ABC123",
    "status": "failed"
  }
}
```

## Security Best Practices

### 1. Webhook Verification
- Always verify webhook signatures
- Never trust unverified webhooks
- Log all webhook attempts

### 2. API Key Security
- Keep secret keys secure
- Never expose keys in frontend code
- Rotate keys regularly

### 3. Amount Validation
- Validate amounts on both frontend and backend
- Prevent price manipulation
- Use server-side calculations

### 4. Reference Uniqueness
- Ensure payment references are unique
- Prevent duplicate payments
- Use timestamp-based references

## Testing

### Test Cards
Use these test cards for development:

**Visa**
- Number: `4538600000000007`
- Expiry: Any future date
- CVV: Any 3 digits

**Mastercard**
- Number: `5555555555554444`
- Expiry: Any future date
- CVV: Any 3 digits

### Test Scenarios
1. **Successful Payment**: Use valid test card
2. **Failed Payment**: Use declined test card
3. **Insufficient Funds**: Use card with low balance
4. **Network Error**: Simulate network issues

## Monitoring

### Payment Analytics
Monitor these metrics:
- Payment success rate
- Average transaction value
- Payment method distribution
- Failed payment reasons

### Logs
Check these logs regularly:
- Payment initialization logs
- Webhook processing logs
- Error logs
- Transaction verification logs

## Troubleshooting

### Payment Not Initializing
1. Check API keys are correct
2. Verify environment variables
3. Check server logs for errors
4. Ensure Flutterwave service is up

### Webhook Not Working
1. Verify webhook URL is accessible
2. Check webhook signature verification
3. Ensure HTTPS is enabled
4. Check server logs for webhook errors

### Payment Verification Fails
1. Check payment reference exists
2. Verify Flutterwave transaction status
3. Check database connection
4. Review error logs

## Support

- **Flutterwave Support**: [support@flutterwave.com](mailto:support@flutterwave.com)
- **Documentation**: [Flutterwave Docs](https://developer.flutterwave.com)
- **API Reference**: [Flutterwave API](https://developer.flutterwave.com/reference)

## Production Checklist

Before going live:
- [ ] Switch to live API keys
- [ ] Verify webhook URL is HTTPS
- [ ] Test all payment methods
- [ ] Set up monitoring and alerts
- [ ] Configure error handling
- [ ] Test webhook processing
- [ ] Verify business verification is complete
- [ ] Set up payment analytics
- [ ] Configure backup webhook URLs
- [ ] Test refund process 