# Frontend Integration Guide - Flutterwave v3

## Overview

This guide provides the recommended frontend implementation for integrating Flutterwave v3 payments into your application. The implementation follows best practices for secure payment processing and user experience.

## Recommended Implementation

### 1. Basic Payment Initiation

```javascript
import axios from 'axios';

const initiatePayment = async (paymentData) => {
  try {
    const response = await axios.post('/api/payments/initialize', {
      paymentType: 'course',
      itemId: 'course_123',
      paymentMethod: 'card', // Optional
      sponsorshipCode: 'SPONSOR123', // Optional
      callbackUrl: 'https://themobileprof.com/payment/callback'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (response.data.success) {
      // Redirect to Flutterwave's hosted checkout page
      const { checkout_url } = response.data.data;
      window.location.href = checkout_url;
    }
  } catch (error) {
    console.error('Payment initiation failed:', error.response?.data);
  }
};
```

### 2. Enhanced Payment Component (React)

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const PaymentComponent = ({ course, user, userToken }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sponsorshipCode, setSponsorshipCode] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/payments/initialize', {
        paymentType: 'course',
        itemId: course.id,
        paymentMethod: 'card',
        sponsorshipCode: sponsorshipCode || undefined,
        callbackUrl: `${window.location.origin}/payment/callback`
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      if (response.data.success) {
        const { checkout_url } = response.data.data;
        
        // Store payment reference in localStorage for verification
        localStorage.setItem('pendingPayment', response.data.data.reference);
        
        // Redirect to Flutterwave checkout
        window.location.href = checkout_url;
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-component">
      <h3>Complete Your Purchase</h3>
      
      <div className="course-details">
        <h4>{course.title}</h4>
        <p className="price">${course.price}</p>
      </div>

      {sponsorshipCode && (
        <div className="sponsorship-info">
          <p>Sponsorship Code Applied: {sponsorshipCode}</p>
        </div>
      )}

      <div className="sponsorship-input">
        <input
          type="text"
          placeholder="Enter sponsorship code (optional)"
          value={sponsorshipCode}
          onChange={(e) => setSponsorshipCode(e.target.value)}
        />
      </div>

      <button 
        onClick={handlePayment} 
        disabled={loading}
        className="payment-button"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default PaymentComponent;
```

### 3. Payment Callback Handler

```javascript
// payment-callback.js
export const handlePaymentCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('tx_ref');
  const paymentId = urlParams.get('payment_id');
  
  if (!reference) {
    console.error('No payment reference found');
    return;
  }

  try {
    // Verify payment with backend
    const response = await axios.get(`/api/payments/verify/${reference}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (response.data.success) {
      // Payment successful - redirect to success page
      window.location.href = '/payment/success';
    } else {
      // Payment failed - redirect to failure page
      window.location.href = '/payment/failed';
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
    window.location.href = '/payment/failed';
  }
};

// Call this function when the callback page loads
document.addEventListener('DOMContentLoaded', handlePaymentCallback);
```

### 4. Payment Success/Failure Pages

```jsx
// PaymentSuccess.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear pending payment from localStorage
    localStorage.removeItem('pendingPayment');
    
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-success">
      <div className="success-icon">✅</div>
      <h2>Payment Successful!</h2>
      <p>Your course has been enrolled successfully.</p>
      <p>You will receive a confirmation email shortly.</p>
      <button onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </button>
    </div>
  );
};

// PaymentFailed.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentFailed = () => {
  const navigate = useNavigate();

  return (
    <div className="payment-failed">
      <div className="error-icon">❌</div>
      <h2>Payment Failed</h2>
      <p>Something went wrong with your payment.</p>
      <p>Please try again or contact support if the problem persists.</p>
      <button onClick={() => navigate('/courses')}>
        Try Again
      </button>
    </div>
  );
};
```

### 5. Environment Configuration

```javascript
// .env.local
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_PAYMENT_CALLBACK_URL=http://localhost:3000/payment/callback

// config.js
export const config = {
  api: {
    baseURL: process.env.REACT_APP_API_BASE_URL,
  },
  payment: {
    callbackUrl: process.env.REACT_APP_PAYMENT_CALLBACK_URL,
  }
};
```

### 6. Error Handling & Validation

```javascript
// payment-validation.js
export const validatePaymentData = (paymentData) => {
  const errors = [];

  if (!paymentData.itemId) {
    errors.push('Item ID is required');
  }

  if (!paymentData.paymentType) {
    errors.push('Payment type is required');
  }

  if (paymentData.paymentType && !['course', 'class'].includes(paymentData.paymentType)) {
    errors.push('Invalid payment type');
  }

  if (paymentData.sponsorshipCode && paymentData.sponsorshipCode.length < 3) {
    errors.push('Sponsorship code must be at least 3 characters');
  }

  return errors;
};

// Enhanced payment initiation with validation
export const initiatePaymentWithValidation = async (paymentData) => {
  const validationErrors = validatePaymentData(paymentData);
  
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  return await initiatePayment(paymentData);
};
```

## Integration Steps

### 1. Setup Environment Variables
- Configure API base URL
- Set payment callback URL

### 2. Install Dependencies
```bash
npm install axios
# or
yarn add axios
```

### 3. Implement Payment Flow
1. **Payment Initiation**: Call `/api/payments/initialize` endpoint
2. **Redirect to Checkout**: Use returned `checkout_url` to redirect user
3. **Payment Callback**: Handle return from Flutterwave
4. **Payment Verification**: Verify payment with `/api/payments/verify/:reference`
5. **Success/Failure Handling**: Show appropriate UI based on result

**Note**: The backend automatically processes Flutterwave webhooks to update payment statuses. This provides an additional security layer and ensures payment statuses are kept up-to-date even if the frontend verification fails.

### 4. Additional Payment Endpoints

#### Get User Payments
```javascript
// GET /api/payments/user
const getUserPayments = async (limit = 20, offset = 0) => {
  try {
    const response = await axios.get(`/api/payments/user?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    return response.data.payments;
  } catch (error) {
    console.error('Failed to fetch user payments:', error);
    throw error;
  }
};
```

#### Get Payment Details
```javascript
// GET /api/payments/:id
const getPaymentDetails = async (paymentId) => {
  try {
    const response = await axios.get(`/api/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch payment details:', error);
    throw error;
  }
};
```

**Note**: The current implementation supports payment methods for Nigeria (NG), Ghana (GH), Kenya (KE), and South Africa (ZA). Some endpoints mentioned in the API documentation (such as `/payments/methods`) may not be fully implemented yet.

### 5. Test Integration
- Test with Flutterwave sandbox credentials
- Verify payment flow end-to-end
- Test error scenarios and edge cases

## Security Considerations

- **Never expose secret keys** in frontend code
- **Always verify payments** on the backend
- **Use HTTPS** in production
- **Validate all input data** before sending to API
- **Implement proper error handling** to avoid exposing sensitive information

## Best Practices

- **User Experience**: Show loading states and clear error messages
- **Error Handling**: Gracefully handle network errors and API failures
- **Accessibility**: Ensure payment forms are accessible to all users
- **Mobile Responsiveness**: Test payment flow on mobile devices
- **Analytics**: Track payment success/failure rates for monitoring

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend allows requests from frontend domain
2. **Authentication Errors**: Verify JWT token is valid and not expired
3. **Payment Verification Failures**: Check that payment reference is correct
4. **Callback URL Issues**: Ensure callback URL matches exactly what's configured

### Debug Tips

- Check browser console for JavaScript errors
- Verify network requests in browser dev tools
- Check backend logs for API errors
- Test with Flutterwave sandbox environment first

## Support

For additional support:
- Check Flutterwave documentation: https://developer.flutterwave.com/
- Review backend API documentation
- Contact development team for technical issues 