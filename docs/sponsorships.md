# Sponsorships

## Sponsorships Endpoints

### Get All Sponsorships
**GET** `/sponsorships`

Get list of sponsorships (sponsor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status` - Filter by status
- `courseId` - Filter by course

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

### Create Sponsorship
**POST** `/sponsorships`

Create a new sponsorship (sponsor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
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

### Validate Sponsorship Code
**GET** `/sponsorships/code/:discountCode`

Validate a sponsorship discount code.

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

### Use Sponsorship Code
**POST** `/sponsorships/:id/use`

Use a sponsorship code for enrollment.

**Headers:**
```
Authorization: Bearer <jwt-token>
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

### Send Sponsorship Email
**POST** `/sponsorships/:id/email`

Send sponsorship details via email.

**Headers:**
```
Authorization: Bearer <jwt-token>
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

### Get Sponsorship Statistics
**GET** `/sponsorships/:id/stats`

Get detailed sponsorship statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "totalSponsored": 25000,
  "studentsImpacted": 1250,
  "coursesSponsored": 12,
  "averageCompletionRate": 78,
  "monthlyStats": [
    {
      "month": "2024-01",
      "studentsEnrolled": 45,
      "completionRate": 82
    }
  ],
  "demographics": {
    "ageGroups": {
      "18-25": 45,
      "26-35": 35,
      "36+": 20
    },
    "locations": {
      "Nigeria": 60,
      "Ghana": 25,
      "Other": 15
    }
  }
}
```

---

## Sponsorship Opportunities Endpoints

### Get All Opportunities
**GET** `/sponsorship-opportunities`

Get list of sponsorship opportunities.

**Query Parameters:**
- `isActive` - Filter by active status
- `urgency` - Filter by urgency level
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

### Create Opportunity
**POST** `/sponsorship-opportunities`

Create a new sponsorship opportunity (instructor only).

**Headers:**
```
Authorization: Bearer <jwt-token>
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

### Contribute to Opportunity
**POST** `/sponsorship-opportunities/:id/contribute`

Contribute to a sponsorship opportunity.

**Headers:**
```
Authorization: Bearer <jwt-token>
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

---

## Sponsorship Management Features

### Discount Types
- **Percentage discount** - Percentage off original price
- **Fixed amount discount** - Specific amount reduction
- **Full sponsorship** - 100% coverage
- **Partial sponsorship** - Custom percentage coverage
- **Tiered discounts** - Different levels based on criteria

### Sponsorship Status
- **Active** - Available for use
- **Paused** - Temporarily suspended
- **Expired** - Past end date
- **Completed** - All spots filled
- **Cancelled** - Manually terminated

### Usage Tracking
- **Student tracking** - Who used the sponsorship
- **Usage limits** - Maximum uses per student
- **Geographic restrictions** - Location-based limitations
- **Time restrictions** - Valid date ranges
- **Course restrictions** - Specific course limitations

---

## Funding Opportunity Features

### Opportunity Types
- **Course sponsorship** - Fund specific courses
- **Student scholarships** - Fund individual students
- **Program funding** - Fund entire programs
- **Equipment funding** - Fund learning resources
- **Infrastructure funding** - Fund platform improvements

### Funding Models
- **Crowdfunding** - Multiple small contributions
- **Corporate sponsorship** - Large business contributions
- **Individual sponsorship** - Personal contributions
- **Matching funds** - Dollar-for-dollar matching
- **Recurring donations** - Monthly/quarterly contributions

### Impact Measurement
- **Student outcomes** - Completion rates and scores
- **Employment impact** - Job placement rates
- **Economic impact** - Income improvements
- **Social impact** - Community benefits
- **Long-term tracking** - Follow-up studies

---

## Best Practices

### Sponsorship Creation
- **Clear objectives** - Define sponsorship goals
- **Realistic targets** - Set achievable student numbers
- **Transparent pricing** - Clear cost breakdowns
- **Impact metrics** - Measurable success criteria
- **Regular reporting** - Progress updates to sponsors

### Opportunity Management
- **Compelling narratives** - Tell student success stories
- **Urgency indicators** - Highlight time-sensitive needs
- **Progress tracking** - Show funding progress
- **Donor recognition** - Acknowledge contributions
- **Impact reporting** - Demonstrate results

### Student Support
- **Clear eligibility** - Transparent selection criteria
- **Application process** - Simple and accessible
- **Ongoing support** - Mentorship and guidance
- **Progress monitoring** - Track student success
- **Graduation support** - Post-course assistance

---

## Quick Navigation

- **[API Overview](api-overview.md)** - Back to overview
- **[Courses & Classes](courses-classes.md)** - Course management
- **[Payments](payments.md)** - Payment processing
- **[Admin Endpoints](admin-endpoints.md)** - Sponsorship administration 