# Payment Integration Guide

## Overview

This guide defines the responsibilities and integration points between backend and frontend for the TheMobileProf payment system.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Flutterwave   │
│                 │    │                 │    │                 │
│ • Payment Modal │◄──►│ • Payment APIs  │◄──►│ • Hosted Pages  │
│ • User Interface│    │ • Verification  │    │ • Payment Form  │
│ • Error Display │    │ • Webhooks      │    │ • Processing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Backend Responsibilities

### 1. Payment Initialization
**Endpoint:** `POST /api/payments/initialize`

**Responsibilities:**
- ✅ Validate payment data (course/class exists, user authenticated)
- ✅ Check enrollment status (prevent duplicate enrollments)
- ✅ Handle sponsorship codes and discounts
- ✅ Create payment record in database
- ✅ Generate unique payment reference
- ✅ Call Flutterwave API to create payment
- ✅ Return payment configuration to frontend

**Code Location:** `src/routes/payments.js`

### 2. Payment Configuration
**Endpoint:** `GET /api/payments/modal-config/:paymentId`

**Responsibilities:**
- ✅ Retrieve payment details from database
- ✅ Get course/class information
- ✅ Build customer data
- ✅ Generate callback URLs
- ✅ Return Flutterwave configuration

### 3. Payment Verification
**Endpoint:** `GET /api/payments/verify/:reference`

**Responsibilities:**
- ✅ Verify payment with Flutterwave API
- ✅ Update payment status in database
- ✅ Create enrollment record
- ✅ Handle sponsorship usage
- ✅ Return verification result

### 4. Webhook Processing
**Endpoint:** `POST /api/payments/webhook`

**Responsibilities:**
- ✅ Validate webhook signature
- ✅ Process payment notifications
- ✅ Update payment status
- ✅ Create enrollments for successful payments
- ✅ Handle failed payments

### 5. Security
**Responsibilities:**
- ✅ JWT token validation
- ✅ API rate limiting
- ✅ Input validation and sanitization
- ✅ Secure storage of payment data
- ✅ Protection against CSRF attacks

## Frontend Responsibilities

### 1. User Interface
**Responsibilities:**
- ✅ Payment modal/popup design
- ✅ Loading states and animations
- ✅ Error message display
- ✅ Success confirmation
- ✅ Responsive design (mobile/desktop)

**Implementation:** Frontend team builds custom modal component

### 2. Flutterwave Integration
**Responsibilities:**
- ✅ Load Flutterwave JavaScript SDK
- ✅ Initialize payment form
- ✅ Handle payment form submission
- ✅ Process payment responses
- ✅ Manage iframe/popup display

### 3. User Experience
**Responsibilities:**
- ✅ Design payment modal/popup
- ✅ Implement smooth transitions
- ✅ Add keyboard navigation (ESC to close)
- ✅ Handle click outside to close
- ✅ Show loading indicators
- ✅ Provide error recovery options

### 4. State Management
**Responsibilities:**
- ✅ Track payment status
- ✅ Handle payment cancellation
- ✅ Manage loading states
- ✅ Store temporary payment data

### 5. Error Handling
**Responsibilities:**
- ✅ Display user-friendly error messages
- ✅ Handle network errors
- ✅ Provide retry options
- ✅ Log errors for debugging

## Integration Points

### 1. Payment Flow

```javascript
// Frontend initiates payment
const paymentData = {
    paymentType: 'course',
    itemId: 'course-uuid',
    paymentMethod: 'card',
    callbackUrl: window.location.origin + '/payment/callback'
};

// Backend processes and returns configuration
const response = await fetch('/api/payments/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(paymentData)
});

// Frontend uses response to build their own payment modal
const config = await response.json();
// Frontend team implements their own modal using config.data
```

### 2. Frontend Integration Examples

#### Basic Payment Modal Implementation
```javascript
// Frontend team creates their own modal component
class PaymentModal {
  constructor(options) {
    this.apiBaseUrl = options.apiBaseUrl;
    this.token = options.token;
    this.onSuccess = options.onSuccess;
    this.onError = options.onError;
  }

  async open(paymentData) {
    try {
      // 1. Initialize payment with backend
      const response = await fetch(`${this.apiBaseUrl}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const result = await response.json();
      
      // 2. Get modal configuration
      const configResponse = await fetch(`${this.apiBaseUrl}/api/payments/modal-config/${result.data.payment_id}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const config = await configResponse.json();
      
      // 3. Frontend implements their own modal using config.data
      this.showPaymentModal(config.data);
      
    } catch (error) {
      this.onError(error);
    }
  }

  showPaymentModal(config) {
    // Frontend team implements their own modal UI
    // This could be a custom modal, popup, or iframe
    console.log('Frontend implements modal with config:', config);
  }
}

// Usage
const paymentModal = new PaymentModal({
  apiBaseUrl: 'https://api.themobileprof.com',
  token: 'your-jwt-token',
  onSuccess: (response) => console.log('Payment successful:', response),
  onError: (error) => console.error('Payment failed:', error)
});

paymentModal.open({
  paymentType: 'course',
  itemId: 'course-uuid',
  paymentMethod: 'card',
  callbackUrl: window.location.origin + '/payment/callback'
});
```

#### Flutterwave Integration Example
```javascript
// Frontend team loads Flutterwave SDK
function loadFlutterwave() {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Frontend team creates payment form
async function createPaymentForm(config) {
  await loadFlutterwave();
  
  window.FlutterwaveCheckout({
    public_key: config.public_key,
    tx_ref: config.reference,
    amount: config.amount,
    currency: config.currency,
    customer: config.customer,
    customizations: config.customizations,
    payment_options: config.payment_options,
    redirect_url: config.redirect_url,
    callback: (response) => {
      console.log('Payment successful:', response);
      // Frontend handles success
    },
    onClose: () => {
      console.log('Payment cancelled');
      // Frontend handles cancellation
    }
  });
}
```

### 2. Payment Verification

```javascript
// Frontend verifies payment after completion
const verification = await fetch(`/api/payments/verify/${reference}`, {
    headers: { 'Authorization': `Bearer ${token}` }
});

// Backend verifies with Flutterwave and updates database
const result = await verification.json();
```

### 3. Error Handling

```javascript
// Frontend displays errors
paymentModal.onError = (error) => {
    showErrorMessage(error.message);
};

// Backend logs errors
console.error('Payment error:', error);
```

## API Contract

### Backend Provides:

1. **Payment Initialization**
   ```json
   {
     "success": true,
     "data": {
       "payment_id": "uuid",
       "reference": "TMP_1234567890_ABC123_ABCD1234",
       "checkout_url": "https://checkout.flutterwave.com/v3/hosted/pay/...",
       "original_amount": 200.00,
       "final_amount": 150.00,
       "discount_amount": 50.00,
       "currency": "USD",
       "payment_type": "course"
     }
   }
   ```

2. **Modal Configuration**
   ```json
   {
     "success": true,
     "data": {
       "payment_id": "uuid",
       "reference": "TMP_1234567890_ABC123_ABCD1234",
       "amount": 20000,
       "currency": "USD",
       "customer": { "email": "user@example.com", "name": "John Doe" },
       "customizations": { "title": "TheMobileProf LMS" },
       "payment_options": "card, ussd, banktransfer",
       "redirect_url": "https://yoursite.com/payment/callback?reference=...",
       "public_key": "FLWPUBK_TEST-..."
     }
   }
   ```

3. **Payment Verification**
   ```json
   {
     "success": true,
     "message": "Payment verified and enrollment completed",
     "payment": {
       "id": "uuid",
       "amount": 200.00,
       "status": "successful",
       "transactionId": "FLW123456789"
     }
   }
   ```

### Frontend Provides:

1. **Payment Data**
   ```json
   {
     "paymentType": "course",
     "itemId": "uuid",
     "paymentMethod": "card",
     "sponsorshipCode": "SAVE50",
     "callbackUrl": "https://yoursite.com/payment/callback"
   }
   ```

2. **Authentication**
   ```
   Authorization: Bearer <jwt-token>
   ```

## Error Handling

### Backend Error Responses

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

### Frontend Error Display

```javascript
const errorMessages = {
  'CARD_DECLINED': 'Your card was declined. Please try a different card.',
  'INSUFFICIENT_FUNDS': 'Insufficient funds. Please try a different payment method.',
  'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
  'TIMEOUT': 'Payment request timed out. Please try again.'
};
```

## Security Considerations

### Backend Security
- ✅ Validate all input data
- ✅ Verify JWT tokens
- ✅ Rate limit API endpoints
- ✅ Sanitize database queries
- ✅ Validate webhook signatures
- ✅ Log security events

### Frontend Security
- ✅ Use HTTPS for all API calls
- ✅ Validate user input
- ✅ Sanitize data before display
- ✅ Handle sensitive data carefully
- ✅ Implement proper error boundaries

## Testing Strategy

### Backend Testing
- ✅ Unit tests for payment logic
- ✅ Integration tests for API endpoints
- ✅ Webhook testing with Flutterwave
- ✅ Security testing (penetration tests)
- ✅ Performance testing

### Frontend Testing
- ✅ Unit tests for modal component
- ✅ Integration tests for payment flow
- ✅ User acceptance testing
- ✅ Cross-browser testing
- ✅ Mobile device testing

## Deployment Checklist

### Backend Deployment
- ✅ Set environment variables
- ✅ Configure webhook URLs
- ✅ Set up database migrations
- ✅ Configure SSL certificates
- ✅ Set up monitoring and logging

### Frontend Deployment
- ✅ Include payment modal script
- ✅ Configure API base URL
- ✅ Set up error tracking
- ✅ Test payment flow in staging
- ✅ Configure analytics tracking

## Monitoring and Analytics

### Backend Metrics
- Payment success rate
- API response times
- Error rates by type
- Webhook delivery success
- Database performance

### Frontend Metrics
- Modal open/close rates
- Payment completion rate
- User interaction patterns
- Error occurrence rates
- Page load performance

## Support and Maintenance

### Backend Maintenance
- Monitor payment processing
- Handle Flutterwave API changes
- Update security patches
- Database maintenance
- Performance optimization

### Frontend Maintenance
- Update UI components
- Browser compatibility
- Performance optimization
- User experience improvements
- Bug fixes and updates

This shared responsibility approach ensures both teams can work independently while maintaining a cohesive payment experience. 