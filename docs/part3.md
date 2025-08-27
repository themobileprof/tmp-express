### Sponsorships Endpoints

#### Get All Sponsorships (Sponsor)
**GET** `/api/sponsorships`

Get list of sponsorships for the authenticated sponsor.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status` - Filter by status (active, paused, expired, completed)
- `courseId` - Filter by course ID

**Response (200):**
```json
{
  "sponsorships": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseTitle": "JavaScript Fundamentals",
      "coursePrice": 99.99,
      "discountCode": "SPONSOR123",
      "discountType": "percentage",
      "discountValue": 20,
      "maxStudents": 50,
      "studentsUsed": 25,
      "remainingSpots": 25,
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "status": "active",
      "completionRate": 75.5,
      "notes": "Special discount for students",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Sponsorship
**POST** `/api/sponsorships`

Create a new sponsorship (sponsor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": "uuid",
  "discountType": "percentage",
  "discountValue": 20,
  "maxStudents": 50,
  "duration": 6,
  "notes": "Special discount for students"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "sponsorId": "uuid",
  "courseId": "uuid",
  "discountCode": "SPONSOR123",
  "discountType": "percentage",
  "discountValue": 20,
  "maxStudents": 50,
  "studentsUsed": 0,
  "startDate": "2024-01-01",
  "endDate": "2024-07-01",
  "status": "active",
  "completionRate": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Specific Sponsorship
**GET** `/api/sponsorships/:id`

Get details of a specific sponsorship.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "sponsorId": "uuid",
  "sponsorName": "John Doe",
  "courseId": "uuid",
  "courseTitle": "JavaScript Fundamentals",
  "coursePrice": 99.99,
  "courseDescription": "Learn JavaScript from scratch",
  "discountCode": "SPONSOR123",
  "discountType": "percentage",
  "discountValue": 20,
  "maxStudents": 50,
  "studentsUsed": 25,
  "remainingSpots": 25,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "status": "active",
  "completionRate": 75.5,
  "notes": "Special discount for students",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Sponsorship
**PUT** `/sponsorships/:id`

Update sponsorship details (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "paused",
  "notes": "Updated notes"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "paused",
  "notes": "Updated notes",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Sponsorship
**DELETE** `/api/sponsorships/:id`

Delete a sponsorship (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Sponsorship deleted successfully"
}
```

#### Use Sponsorship Code
**POST** `/api/sponsorships/:id/use`

Use a sponsorship code for enrollment.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "uuid",
  "courseId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "originalPrice": 99.99,
  "discountAmount": 19.99,
  "finalPrice": 80.00,
  "message": "Sponsorship code applied successfully"
}
```

#### Validate Sponsorship Code
**GET** `/api/sponsorships/code/:discountCode`

Validate a sponsorship discount code (public endpoint).

**Response (200):**
```json
{
  "valid": true,
  "sponsorship": {
    "id": "uuid",
    "courseName": "JavaScript Fundamentals",
    "coursePrice": 99.99,
    "discountType": "percentage",
    "discountValue": 20,
    "maxStudents": 50,
    "studentsUsed": 25,
    "remainingSpots": 25,
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "isExpired": false,
    "isFull": false
  }
}
```

#### Get Sponsorship Statistics
**GET** `/api/sponsorships/:id/stats`

Get detailed sponsorship statistics (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "sponsorship": {
    "id": "uuid",
    "courseTitle": "JavaScript Fundamentals",
    "discountCode": "SPONSOR123",
    "discountType": "percentage",
    "discountValue": 20,
    "maxStudents": 50,
    "studentsUsed": 25,
    "completionRate": 75.5,
    "status": "active"
  },
  "stats": {
    "totalUsage": 25,
    "totalDiscountGiven": 499.75,
    "averageFinalPrice": 80.00,
    "utilizationRate": "50.0"
  },
  "monthlyStats": [
    {
      "month": "2024-01",
      "studentsEnrolled": 15
    }
  ]
}
```

#### Send Sponsorship Email
**POST** `/api/sponsorships/:id/email`

Send sponsorship details via email (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientEmail": "student@example.com",
  "isForRecipient": true,
  "customMessage": "Congratulations! You've been selected for this educational sponsorship."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sponsorship details sent successfully"
}
```

### Sponsorship Opportunities Endpoints

#### Get All Opportunities
**GET** `/api/sponsorship-opportunities`

Get list of sponsorship opportunities (public endpoint).

**Query Parameters:**
- `isActive` - Filter by active status
- `urgency` - Filter by urgency level (low, medium, high)
- `limit` - Number of results (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "opportunities": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "courseDescription": "Learn JavaScript from scratch",
      "courseDuration": "8 weeks",
      "courseTopic": "Programming",
      "instructor": "John Doe",
      "instructorAvatar": "https://example.com/avatar.jpg",
      "targetStudents": 100,
      "fundingGoal": 5000.00,
      "fundingRaised": 2500.00,
      "fundingProgress": "50.00",
      "urgency": "high",
      "demographics": "Students aged 18-25",
      "impactDescription": "Help students learn programming",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Opportunity
**POST** `/api/sponsorship-opportunities`

Create a new sponsorship opportunity (instructor/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": "uuid",
  "targetStudents": 100,
  "fundingGoal": 5000.00,
  "urgency": "high",
  "demographics": "Students aged 18-25",
  "impactDescription": "Help students learn programming"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "targetStudents": 100,
  "fundingGoal": 5000.00,
  "fundingRaised": 0,
  "urgency": "high",
  "demographics": "Students aged 18-25",
  "impactDescription": "Help students learn programming",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Specific Opportunity
**GET** `/api/sponsorship-opportunities/:id`

Get details of a specific opportunity (public endpoint).

**Response (200):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseName": "JavaScript Fundamentals",
  "courseDescription": "Learn JavaScript from scratch",
  "courseDuration": "8 weeks",
  "courseTopic": "Programming",
  "coursePrice": 99.99,
  "instructor": "John Doe",
  "instructorAvatar": "https://example.com/avatar.jpg",
  "instructorBio": "Experienced JavaScript developer",
  "targetStudents": 100,
  "fundingGoal": 5000.00,
  "fundingRaised": 2500.00,
  "fundingProgress": "50.00",
  "urgency": "high",
  "demographics": "Students aged 18-25",
  "impactDescription": "Help students learn programming",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Opportunity
**PUT** `/api/sponsorship-opportunities/:id`

Update opportunity details (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "targetStudents": 150,
  "fundingGoal": 7500.00,
  "urgency": "medium",
  "demographics": "Students aged 18-30",
  "impactDescription": "Updated impact description",
  "isActive": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "targetStudents": 150,
  "fundingGoal": 7500.00,
  "fundingRaised": 2500.00,
  "urgency": "medium",
  "demographics": "Students aged 18-30",
  "impactDescription": "Updated impact description",
  "isActive": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Opportunity
**DELETE** `/api/sponsorship-opportunities/:id`

Delete an opportunity (owner/admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Sponsorship opportunity deleted successfully"
}
```

#### Contribute to Opportunity
**POST** `/api/sponsorship-opportunities/:id/contribute`

Contribute to a sponsorship opportunity.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 100.00,
  "message": "Supporting education"
}
```

**Response (200):**
```json
{
  "success": true,
  "amount": 100.00,
  "newFundingRaised": 2600.00,
  "message": "Contribution recorded successfully"
}
```

### Payments Endpoints (Flutterwave Standard v3.0.0)

> **Note:** The payment system uses **hosted payment integration** with Flutterwave Standard v3.0.0, providing a clean, reliable, and secure payment experience. The system uses **direct API authentication** and **verification** with Flutterwave's v3 API for reliable transaction tracking.

> **✅ Current Implementation:** The system uses **Flutterwave v3 API** (stable and production-ready) for reliable payment processing.

#### Initialize Payment
**POST** `/payments/initialize`

Initialize a payment for course or class enrollment using Flutterwave Standard v3.0.0.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "paymentType": "course",
  "itemId": "uuid-of-course-or-class",
  "paymentMethod": "card",
  "sponsorshipCode": "SPONSOR123456",
  "callbackUrl": "https://themobileprof.com/payment/callback"
}
```

**Parameters:**
- `paymentType` (required): "course" or "class"
- `itemId` (required): UUID of the course or class
- `paymentMethod` (optional): Payment method to use
- `sponsorshipCode` (optional): Sponsorship discount code
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
    "checkout_url": "https://checkout.flutterwave.com/v3/hosted/pay/...",
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



#### Get Supported Payment Methods
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

#### Payment Verification
**GET** `/payments/verify/:reference`

Payment verification method. Called by frontend when user returns from Flutterwave.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `reference` (required): Payment reference from our system (TMP_...)

**Response (200) - Success:**
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
  "message": "Payment verification failed",
  "code": "PAYMENT_ERROR",
  "details": {
    "reference": "TMP_1234567890_ABC123",
    "suggestedAction": "try_alternative_payment_method"
  }
}
```

**Important Notes:**
- **Flutterwave v3**: Stable, publicly available configuration
- **Direct API Authentication**: Uses secret key for secure API access
- **Direct Verification**: Payments are verified directly with Flutterwave's v3 API
- **Clean Callbacks**: Redirect URLs include proper parameters for reliable tracking
- **No Reference Mismatches**: Consistent reference handling throughout the payment flow
- **Reliable**: v3 is production-ready and widely used

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

#### Get User Payments
**GET** `/payments/user`

Get current user's payment history.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Number of results to skip (default: 0)

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "paymentType": "course",
      "amount": 99.99,
      "currency": "USD",
      "status": "successful",
      "paymentMethod": "card",
      "reference": "TMP_1234567890_ABC123_ABCD1234",
      "transactionId": "FLW123456789",
      "course": {
        "id": "uuid",
        "title": "JavaScript Fundamentals",
        "topic": "Programming"
      },
      "class": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Payment by ID
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
  "amount": 99.99,
  "currency": "USD",
  "status": "successful",
  "paymentMethod": "card",
  "reference": "TMP_1234567890_ABC123_ABCD1234",
  "flutterwaveReference": "TMP_1234567890_ABC123_ABCD1234",
  "flutterwaveTransactionId": "FLW-MOCK-c83e69e60f6cda5fc89da7389bd20fe1",
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



#### Admin Payment Management

##### Get All Payments (Admin)
**GET** `/api/admin/payments`

Get payment history with admin details.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Number of results (default: 20)
- `status` - Filter by status (successful, failed, pending)
- `paymentMethod` - Filter by payment method
- `search` - Search by user name or transaction ID

**Response (200):**
```json
{
  "payments": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "amount": 99.99,
      "currency": "USD",
      "status": "successful",
      "payment_method": "card",
      "reference": "TMP_1234567890_ABC123",
      "transaction_id": "FLW123456789",
      "course_title": "JavaScript Fundamentals",
      "class_title": null,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

##### Get Payment Statistics (Admin)
**GET** `/api/admin/payments/stats`

Get comprehensive payment statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `period` - Time period in days (default: 30)

**Response (200):**
```json
{
  "overview": {
    "total_payments": 500,
    "total_revenue": 49950.00,
    "successful_payments": 485,
    "failed_payments": 10,
    "pending_payments": 5,
    "average_payment": 99.90
  },
  "methodBreakdown": [
    {
      "payment_method": "card",
      "count": 300,
      "total_amount": 29970.00
    },
    {
      "payment_method": "bank_transfer",
      "count": 200,
      "total_amount": 19980.00
    }
  ],
  "dailyStats": [
    {
      "date": "2024-01-01",
      "payment_count": 15,
      "daily_revenue": 1498.50
    }
  ]
}
```

### Discussions Endpoints

The discussion system provides a comprehensive platform for learners to engage in meaningful conversations, ask questions, and collaborate on their learning journey. The system supports multiple discussion types and provides easy ways to organize and discover relevant conversations.

#### Discussion Organization

**Hierarchical Structure:**
- **Platform-wide**: General discussions accessible to all users
- **Course-specific**: Discussions related to a particular course
- **Lesson-specific**: Questions and clarifications for specific lessons
- **Class-specific**: Discussions for scheduled classes and workshops

**Categories and Tags:**
- **Categories**: Predefined discussion types (general, course, lesson, class, question, help, feedback)
- **Tags**: User-defined labels for better organization and discovery
- **Smart Filtering**: Combine category, course, lesson, and tag filters for precise results

**Discovery Features:**
- **Related Discussions**: Easily find discussions related to your current lesson or course
- **Popular Tags**: Discover trending topics and common questions
- **Search and Filter**: Advanced search with multiple filter options
- **Follow Conversations**: Track discussions you're interested in

#### Use Cases

**For Students:**
- Ask lesson-specific questions when stuck
- Discuss course concepts with peers
- Get help with assignments or projects
- Share learning experiences and tips

**For Instructors:**
- Announce course updates and changes
- Answer common questions in one place
- Facilitate group discussions
- Provide additional resources and clarifications

**For Course Communities:**
- Build knowledge bases through Q&A
- Create study groups and discussions
- Share resources and helpful links
- Foster peer-to-peer learning

---

#### Get Discussions
**GET** `/api/discussions`

List discussions with filters and pagination.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `category` - Filter by category (general, course, lesson, class, question, help, feedback)
- `courseId` - Filter by course ID for course-specific discussions
- `lessonId` - Filter by lesson ID for lesson-specific discussions
- `classId` - Filter by class ID for class-specific discussions
- `search` - Search in title/content
- `tags` - Filter by tags (comma-separated)
- `sort` - Sort field (created_at, title, last_activity, reply_count, likes_count)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Variables Question",
      "content": "I'm having trouble understanding how variables work in JavaScript...",
      "category": "lesson",
      "authorId": "uuid",
      "authorName": "John Doe",
      "authorAvatar": "https://example.com/avatar.jpg",
      "courseId": "uuid",
      "courseTitle": "JavaScript Fundamentals",
      "lessonId": "uuid",
      "lessonTitle": "Variables and Data Types",
      "classId": null,
      "classTitle": null,
      "tags": ["javascript", "variables", "beginner"],
      "isPinned": false,
      "replyCount": 3,
      "likesCount": 5,
      "lastActivityAt": "2024-07-01T12:00:00Z",
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### Get Discussion by ID
**GET** `/api/discussions/:id`

Get discussion details with replies and likes count.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "JavaScript Variables Question",
  "content": "I'm having trouble understanding how variables work in JavaScript...",
  "category": "lesson",
  "authorId": "uuid",
  "authorName": "John Doe",
  "authorAvatar": "https://example.com/avatar.jpg",
  "courseId": "uuid",
  "courseTitle": "JavaScript Fundamentals",
  "lessonId": "uuid",
  "lessonTitle": "Variables and Data Types",
  "classId": null,
  "classTitle": null,
  "tags": ["javascript", "variables", "beginner"],
  "isPinned": false,
  "replyCount": 3,
  "likesCount": 5,
  "lastActivityAt": "2024-07-01T12:00:00Z",
  "createdAt": "2024-07-01T10:00:00Z"
}
```

#### Create Discussion
**POST** `/api/discussions`

Create a new discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Discussion Title",
  "content": "Discussion content...",
  "category": "general",
  "courseId": "uuid",
  "lessonId": "uuid",
  "classId": "uuid",
  "tags": ["javascript", "beginner"]
}
```

**Fields:**
- `title` (required): Discussion title
- `content` (required): Discussion content
- `category` (required): Discussion category (general, course, lesson, class, question, help, feedback)
- `courseId` (optional): Course ID for course-specific discussions
- `lessonId` (optional): Lesson ID for lesson-specific discussions
- `classId` (optional): Class ID for class-specific discussions
- `tags` (optional): Array of tags for better organization

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Discussion Title",
  "content": "Discussion content...",
  "category": "general",
  "courseId": "uuid",
  "lessonId": "uuid",
  "classId": "uuid",
  "tags": ["javascript", "beginner"],
  "authorId": "uuid",
  "createdAt": "2024-07-01T10:00:00Z"
}
```

**Discussion Categories:**
- **general**: Platform-wide discussions
- **course**: Course-specific discussions and announcements
- **lesson**: Lesson-specific questions and clarifications
- **class**: Class-specific discussions and Q&A
- **question**: General questions seeking help
- **help**: Help requests and support
- **feedback**: Feedback and suggestions

#### Get Course Discussions
**GET** `/api/courses/:courseId/discussions`

Get all discussions for a specific course.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `category` - Filter by category (optional)
- `lessonId` - Filter by specific lesson (optional)
- `search` - Search in title/content (optional)
- `sort` - Sort field (created_at, title, last_activity, reply_count, likes_count)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "course": {
    "id": "uuid",
    "title": "JavaScript Fundamentals",
    "topic": "Programming"
  },
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Variables Question",
      "content": "I'm having trouble understanding how variables work...",
      "category": "lesson",
      "lessonId": "uuid",
      "lessonTitle": "Variables and Data Types",
      "authorName": "John Doe",
      "replyCount": 3,
      "likesCount": 5,
      "lastActivityAt": "2024-07-01T12:00:00Z",
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### Get Lesson Discussions
**GET** `/api/lessons/:lessonId/discussions`

Get all discussions for a specific lesson.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `category` - Filter by category (optional)
- `search` - Search in title/content (optional)
- `sort` - Sort field (created_at, title, last_activity, reply_count, likes_count)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "Variables and Data Types",
    "courseId": "uuid",
    "courseTitle": "JavaScript Fundamentals"
  },
  "discussions": [
    {
      "id": "uuid",
      "title": "JavaScript Variables Question",
      "content": "I'm having trouble understanding how variables work...",
      "category": "lesson",
      "authorName": "John Doe",
      "replyCount": 3,
      "likesCount": 5,
      "lastActivityAt": "2024-07-01T12:00:00Z",
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

#### Get Discussion Replies
**GET** `/api/discussions/:id/replies`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "replies": [
    {
      "id": "uuid",
      "content": "Reply content...",
      "authorId": "uuid",
      "authorName": "Jane Doe",
      "authorAvatar": "https://example.com/avatar.jpg",
      "createdAt": "2024-07-01T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### Add Reply
**POST** `/api/discussions/:id/replies`

Add a reply to a discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Reply content..."
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "content": "Reply content...",
  "authorId": "uuid",
  "discussionId": "uuid",
  "createdAt": "2024-07-01T11:00:00Z"
}
```

#### Like Discussion
**POST** `/api/discussions/:id/like`

Like a discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Discussion liked successfully"
}
```

#### Unlike Discussion
**DELETE** `/api/discussions/:id/like`

Unlike a discussion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Discussion unliked successfully"
}
```

#### Get Discussion Categories
**GET** `/api/discussions/categories`

Get available discussion categories and their descriptions.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "categories": [
    {
      "key": "general",
      "name": "General",
      "description": "Platform-wide discussions and announcements",
      "icon": "chat"
    },
    {
      "key": "course",
      "name": "Course",
      "description": "Course-specific discussions and announcements",
      "icon": "book"
    },
    {
      "key": "lesson",
      "name": "Lesson",
      "description": "Lesson-specific questions and clarifications",
      "icon": "lightbulb"
    },
    {
      "key": "class",
      "name": "Class",
      "description": "Class-specific discussions and Q&A",
      "icon": "users"
    },
    {
      "key": "question",
      "name": "Question",
      "description": "General questions seeking help",
      "icon": "help-circle"
    },
    {
      "key": "help",
      "name": "Help",
      "description": "Help requests and support",
      "icon": "life-buoy"
    },
    {
      "key": "feedback",
      "name": "Feedback",
      "description": "Feedback and suggestions",
      "icon": "message-square"
    }
  ]
}
```

#### Get Popular Tags
**GET** `/api/discussions/tags`

Get popular discussion tags for better organization.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `limit` - Number of tags to return (default: 50)

**Response (200):**
```json
{
  "tags": [
    {
      "tag": "javascript",
      "count": 125,
      "category": "programming"
    },
    {
      "tag": "beginner",
      "count": 89,
      "category": "level"
    },
    {
      "tag": "variables",
      "count": 45,
      "category": "concept"
    }
  ]
}
```

> **Note:** The discussion system now supports lesson-specific and course-specific discussions with proper categorization and tagging for better organization and discovery.

### Certifications Endpoints

#### Get User's Certifications
**GET** `/api/certifications/my`

Get user's earned certificates.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "certifications": [
    {
      "id": "uuid",
      "title": "JavaScript Developer",
      "description": "Certified JavaScript Developer",
      "issuerName": "TheMobileProf",
      "issuedAt": "2024-01-15T00:00:00Z",
      "expiryDate": "2026-01-15T00:00:00Z",
      "certificateUrl": "https://example.com/certificate.pdf",
      "verificationCode": "CERT123456",
      "status": "active"
    }
  ]
}
```

#### Download Certificate
**GET** `/api/certifications/:id/download`

Download certificate file or return signed URL.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "certificateUrl": "https://example.com/certificate.pdf",
  "downloadUrl": "https://api.themobileprof.com/certificates/download/uuid",
  "expiresAt": "2024-01-02T00:00:00Z"
}
```

#### Get Certification Progress
**GET** `/api/certifications/progress`

Get in-progress programs with progress fields.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "programs": [
    {
      "id": "uuid",
      "title": "Full-Stack Web Developer",
      "progress": 65,
      "completedModules": 3,
      "totalModules": 5,
      "nextRequirement": "Complete Frontend Fundamentals module",
      "estimatedCompletion": "2024-03-15T00:00:00Z"
    }
  ]
}
```

### Certification Programs Endpoints

#### Get Certification Programs
**GET** `/api/certification-programs`

List available certification programs with modules and pricing.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "programs": [
    {
      "id": "uuid",
      "title": "Full-Stack Web Developer",
      "description": "Comprehensive web development certification",
      "duration": "6 months",
      "level": "intermediate",
      "prerequisites": "Basic programming knowledge",
      "modules": [
        {
          "id": "uuid",
          "title": "Frontend Fundamentals",
          "description": "HTML, CSS, JavaScript basics",
          "duration": "4 weeks",
          "orderIndex": 1
        }
      ],
      "price": 299.99,
      "isActive": true
    }
  ]
}
```

#### Enroll in Certification Program
**POST** `/api/certification-programs/:id/enroll`

Enroll in a certification track.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Response (201):**
```json
{
  "message": "Successfully enrolled in certification program",
  "enrollment": {
    "id": "uuid",
    "programId": "uuid",
    "userId": "uuid",
    "enrolledAt": "2024-01-01T00:00:00Z",
    "status": "enrolled"
  }
}
```

---

### Lessons Endpoints

#### Get Lesson Details
**GET** `/lessons/:id`

Get details of a lesson by its ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseTitle": "Course Title",
  "title": "Lesson Title",
  "description": "Lesson description...",
  "content": "Lesson content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 45,
  "orderIndex": 1,
  "isPublished": true,
  "createdAt": "2024-07-01T10:00:00Z",
  "updatedAt": "2024-07-01T12:00:00Z"
}
```

#### Update Lesson
**PUT** `/lessons/:id`

Update a lesson by its ID. Requires authentication and owner/admin authorization.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Lesson Title",
  "description": "Updated description...",
  "content": "Updated content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 50,
  "orderIndex": 2,
  "isPublished": false
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Updated Lesson Title",
  "description": "Updated description...",
  "content": "Updated content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 50,
  "orderIndex": 2,
  "isPublished": false,
  "updatedAt": "2024-07-01T13:00:00Z"
}
```

#### Delete Lesson
**DELETE** `/lessons/:id`

Delete a lesson by its ID. Requires authentication and owner/admin authorization.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "message": "Lesson deleted successfully"
}
```

#### Mark Lesson as Completed
**POST** `/api/lessons/:id/complete`

Mark a lesson as completed for the authenticated user. This will automatically update course progress.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "timeSpentMinutes": 45
}
```

**Optional Fields:**
- `timeSpentMinutes` - Time spent on the lesson in minutes (number, default: 0)

**Response (200):**
```json
{
  "message": "Lesson marked as completed",
  "lessonId": "uuid",
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Lesson Progress
**GET** `/api/lessons/:id/progress`

Get the current progress for a lesson for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lessonId": "uuid",
  "isCompleted": true,
  "progressPercentage": 100,
  "timeSpentMinutes": 45,
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get All Lessons for a Course (Admin)
**GET** `/admin/courses/:courseId/lessons`

Get all lessons for a course (admin access).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "title": "Lesson Title",
      "description": "Lesson description...",
      "content": "Lesson content...",
      "videoUrl": "https://example.com/video.mp4",
      "durationMinutes": 45,
      "orderIndex": 1,
      "isPublished": true,
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### Create Lesson for a Course (Admin)
**POST** `/admin/courses/:courseId/lessons`

Create a new lesson for a course (admin access).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Lesson Title",
  "description": "Lesson description...",
  "content": "Lesson content...",
  "videoUrl": "https://example.com/video.mp4",
  "durationMinutes": 45,
  "orderIndex": 1,
  "isPublished": true
}
```

**Response (201):**
```json
{
  "lesson": {
    "id": "uuid",
    "courseId": "uuid",
    "title": "Lesson Title",
    "description": "Lesson description...",
    "content": "Lesson content...",
    "videoUrl": "https://example.com/video.mp4",
    "durationMinutes": 45,
    "orderIndex": 1,
    "isPublished": true,
    "createdAt": "2024-07-01T10:00:00Z"
  }
}
```

#### Get All Lessons for a Course
**GET** `/courses/:id/lessons`

Get all lessons for a course by course ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "lessons": [
    {
      "id": "uuid",
      "title": "Lesson Title",
      "description": "Lesson description...",
      "content": "Lesson content...",
      "videoUrl": "https://example.com/video.mp4",
      "durationMinutes": 45,
      "orderIndex": 1,
      "isPublished": true,
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ]
}
```

#### Get Course Analytics (Admin/Instructor)
**GET** `/api/courses/:id/analytics`

Get comprehensive analytics for all tests in a course, including both course-level and lesson-level tests.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalTests": 5,
  "totalAttempts": 150,
  "averageScore": 78.5,
  "passRate": 75.0,
  "averageTimeMinutes": 25.3,
  "questionAnalytics": [
    {
      "questionId": "uuid",
      "question": "What is the capital of France?",
      "questionType": "multiple_choice",
      "points": 1,
      "totalAnswers": 150,
      "correctAnswers": 135,
      "correctRate": 90.0
    }
  ]
}
```

### Courses Endpoints

#### Get Course by ID
**GET** `/api/courses/:id`

Get details of a course by its ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `id` (string, required): Course ID

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Course Title",
  "description": "Course description...",
  "topic": "Programming",
  "type": "online",
  "price": 99.99,
  "duration": "8 weeks",
  "certification": "Certificate of Completion",
  "difficulty": "intermediate",
  "objectives": "Learn advanced programming concepts and build real-world projects",
  "prerequisites": "Basic programming knowledge required",
  "syllabus": "Week 1: Introduction to Advanced Concepts\nWeek 2: Practical Applications\nWeek 3: Project Development",
  "tags": ["programming", "javascript", "web-development"],
  "imageUrl": "https://api.themobileprof.com/uploads/course-images/course-image.jpg",
  "instructorId": "uuid",
  "instructorName": "John Doe",
  "isPublished": true,
  "enrollmentCount": 25,
  "lessonCount": 8,
  "testCount": 3,
  "createdAt": "2024-07-01T10:00:00Z",
  "updatedAt": "2024-07-01T12:00:00Z"
}
```

#### Enroll in Course
**POST** `/api/courses/:id/enroll`

Enroll in a course. Supports sponsorship codes for discounted enrollment.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Parameters:**
- `id` (string, required): Course ID

**Request Body:**
```json
{
  "sponsorshipId": "uuid"
}
```

**Fields:**
- `sponsorshipId` (string, optional): Sponsorship ID for discounted enrollment

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "courseId": "uuid",
  "enrollmentType": "course",
  "progress": 0,
  "status": "enrolled",
  "sponsorshipId": "uuid",
  "enrolledAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400` - User is already enrolled in this course
- `400` - Invalid or inactive sponsorship
- `400` - Sponsorship has not been used by this user
- `404` - Course not found or not published

**Notes:**
- If `sponsorshipId` is provided, the system validates that the sponsorship is active and has been used by the student
- The sponsorship must be valid for the specific course
- Enrollment automatically updates the course student count

#### Get Course Lessons with Unlock Status
**GET** `/api/courses/:id/lessons`

Get all lessons for a course with their unlock and completion status. Lessons are unlocked sequentially based on test completion.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "courseId": "uuid",
  "lessons": [
    {
      "id": "uuid",
      "title": "Introduction to JavaScript",
      "description": "Learn the basics of JavaScript",
      "orderIndex": 1,
      "durationMinutes": 45,
      "isUnlocked": true,
      "isCompleted": false,
      "testPassed": false,
      "progress": 0,
      "timeSpentMinutes": 0,
      "completedAt": null,
      "test": {
        "id": "uuid",
        "title": "JavaScript Basics Quiz",
        "passingScore": 70,
        "maxAttempts": 3
      },
      "canAccess": true,
      "nextUnlocked": true
    },
    {
      "id": "uuid",
      "title": "Variables and Data Types",
      "description": "Understanding variables and data types",
      "orderIndex": 2,
      "durationMinutes": 60,
      "isUnlocked": false,
      "isCompleted": false,
      "testPassed": false,
      "progress": 0,
      "timeSpentMinutes": 0,
      "completedAt": null,
      "test": {
        "id": "uuid",
        "title": "Variables Quiz",
        "passingScore": 70,
        "maxAttempts": 3
      },
      "canAccess": false,
      "nextUnlocked": false
    }
  ],
  "courseStats": {
    "totalLessons": 19,
    "unlockedLessons": 1,
    "completedLessons": 0,
    "passedTests": 0,
    "totalProgress": 0
  }
}
```

#### Get Course Progression Status
**GET** `/api/courses/:id/progression`

Get detailed progression status for a course, showing which lessons are locked/unlocked and overall progress.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "courseId": "uuid",
  "progression": [
    {
      "id": "uuid",
      "title": "Introduction to JavaScript",
      "orderIndex": 1,
      "isUnlocked": true,
      "isCompleted": false,
      "testPassed": false,
      "progress": 0,
      "timeSpentMinutes": 0,
      "completedAt": null,
      "test": {
        "id": "uuid",
        "title": "JavaScript Basics Quiz",
        "passingScore": 70,
        "maxAttempts": 3
      },
      "nextUnlocked": true
    }
  ],
  "courseStats": {
    "totalLessons": 19,
    "unlockedLessons": 1,
    "completedLessons": 0,
    "passedTests": 0,
    "totalProgress": 0
  },
  "currentLesson": {
    "id": "uuid",
    "title": "Introduction to JavaScript"
  },
  "nextUnlockedLesson": {
    "id": "uuid",
    "title": "Variables and Data Types"
  }
}
```

**Error Responses:**
- `404` - Course not found
- `401` - Unauthorized (invalid or missing token)

#### Update Course Enrollment Progress
**PUT** `/api/courses/:id/enrollments/:enrollmentId`

Update the progress of a course enrollment for the authenticated user. This endpoint allows manual progress updates and is also used automatically by the progress tracking system.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "progress": 75,
  "status": "in_progress"
}
```

**Fields:**
- `progress` - Progress percentage (0-100, number, optional)
- `status` - Enrollment status: "pending", "in_progress", "completed", "dropped" (string, optional)

**Response (200):**
```json
{
  "id": "uuid",
  "progress": 75,
  "status": "in_progress",
  "completedAt": null
}
```

**Notes:**
- Progress is automatically calculated when lessons are completed or tests are passed
- Setting status to "completed" will automatically set `completedAt` timestamp
- Progress of 100% will automatically set status to "completed"

---

### Classes Endpoints

#### Get Upcoming Classes
**GET** `/api/classes/upcoming`

Get upcoming classes with filters and pagination.

#### Get Classes
**GET** `/api/classes`

List classes with filters and pagination.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `topic` - Filter by topic
- `type` - Filter by type (online/offline)
- `instructorId` - Filter by instructor ID
- `priceMin` - Minimum price filter
- `priceMax` - Maximum price filter
- `isPublished` - Filter by publication status
- `search` - Search in title/description
- `sort` - Sort field (start_date, title, price, available_slots, created_at)
- `order` - Sort order (asc/desc)
- `limit` - Items per page (default: 20)
- `offset` - Number to skip (default: 0)

**Response (200):**
```json
{
  "classes": [
    {
      "id": "uuid",
      "title": "Advanced JavaScript Workshop",
      "description": "Hands-on JavaScript workshop",
      "topic": "Programming",
      "type": "online",
      "instructorId": "uuid",
      "instructorName": "John Doe",
      "startDate": "2024-07-02T14:00:00Z",
      "endDate": "2024-07-02T16:00:00Z",
      "duration": "2 hours",
      "location": "Online",
      "price": 49.99,
      "availableSlots": 15,
      "totalSlots": 20,
      "isPublished": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Get Class by ID
**GET** `/api/classes/:id`

Get class details including schedule, duration, location, instructor, availableSlots/totalSlots, courses.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Advanced JavaScript Workshop",
  "description": "Hands-on JavaScript workshop",
  "topic": "Programming",
  "type": "online",
  "instructorId": "uuid",
  "instructorName": "John Doe",
  "instructorAvatar": "https://example.com/avatar.jpg",
  "startDate": "2024-07-02T14:00:00Z",
  "endDate": "2024-07-02T16:00:00Z",
  "duration": "2 hours",
  "location": "Online",
  "price": 49.99,
  "availableSlots": 15,
  "totalSlots": 20,
  "isPublished": true,
  "courses": [
    {
      "id": "uuid",
      "title": "JavaScript Fundamentals",
      "topic": "Programming",
      "duration": "8 weeks",
      "orderIndex": 1
    }
  ]
}
```

#### Enroll in Class
**POST** `/api/classes/:id/enroll`

Enroll in a class (supports sponsorship codes).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sponsorshipId": "uuid"
}
```

**Response (201):**
```json
{
  "message": "Successfully enrolled in class",
  "enrollment": {
    "id": "uuid",
    "classId": "uuid",
    "userId": "uuid",
    "enrolledAt": "2024-01-01T00:00:00Z",
    "status": "enrolled",
    "sponsorshipId": "uuid"
  }
}
```

#### Get Class Topics
**GET** `/api/classes/topics`

Get distinct topics for filters.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "topics": [
    {
      "topic": "Programming",
      "count": 25
    },
    {
      "topic": "Design",
      "count": 15
    }
  ]
}
```