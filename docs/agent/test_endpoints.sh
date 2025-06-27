#!/bin/bash

# Test script for TheMobileProf LMS API endpoints
# This script tests courses, lessons, and tests endpoints

BASE_URL="https://api.themobileprof.com"
EMAIL="info@themobileprof.com"
PASSWORD="tummy654"

echo "🔐 Authenticating with TheMobileProf LMS..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')
USER_ID=$(echo $TOKEN_RESPONSE | jq -r '.user.id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed"
    echo $TOKEN_RESPONSE
    exit 1
fi

echo "✅ Authentication successful"
echo "User ID: $USER_ID"
echo "Token: ${TOKEN:0:50}..."

# Function to make authenticated requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN"
    fi
}

echo ""
echo "📚 Testing Course Endpoints..."

# 1. Get all courses
echo "1. Getting all courses..."
COURSES_RESPONSE=$(make_request "GET" "/api/courses")
echo $COURSES_RESPONSE | jq '.'

# 2. Create a test course
echo ""
echo "2. Creating a test course..."
COURSE_DATA='{
  "title": "API Test Course",
  "description": "This is a test course created via API",
  "topic": "Testing",
  "type": "online",
  "price": 99.99,
  "duration": "4 weeks",
  "instructorId": "'$USER_ID'"
}'

CREATE_COURSE_RESPONSE=$(make_request "POST" "/api/courses" "$COURSE_DATA")
echo $CREATE_COURSE_RESPONSE | jq '.'

COURSE_ID=$(echo $CREATE_COURSE_RESPONSE | jq -r '.id')
if [ "$COURSE_ID" = "null" ] || [ -z "$COURSE_ID" ]; then
    echo "❌ Failed to create course"
    exit 1
fi

echo "✅ Course created with ID: $COURSE_ID"

# 3. Get course by ID
echo ""
echo "3. Getting course by ID..."
COURSE_DETAILS=$(make_request "GET" "/api/courses/$COURSE_ID")
echo $COURSE_DETAILS | jq '.'

# 4. Update course
echo ""
echo "4. Updating course..."
UPDATE_DATA='{
  "title": "Updated API Test Course",
  "price": 149.99,
  "isPublished": true
}'

UPDATE_RESPONSE=$(make_request "PUT" "/api/courses/$COURSE_ID" "$UPDATE_DATA")
echo $UPDATE_RESPONSE | jq '.'

echo ""
echo "📖 Testing Lesson Endpoints..."

# 5. Create a lesson
echo "5. Creating a lesson..."
LESSON_DATA='{
  "title": "API Test Lesson",
  "description": "This is a test lesson created via API",
  "content": "<h2>Test Lesson Content</h2><p>This lesson was created to test the API endpoints.</p>",
  "durationMinutes": 30
}'

CREATE_LESSON_RESPONSE=$(make_request "POST" "/api/courses/$COURSE_ID/lessons" "$LESSON_DATA")
echo $CREATE_LESSON_RESPONSE | jq '.'

LESSON_ID=$(echo $CREATE_LESSON_RESPONSE | jq -r '.id')
if [ "$LESSON_ID" = "null" ] || [ -z "$LESSON_ID" ]; then
    echo "❌ Failed to create lesson"
    exit 1
fi

echo "✅ Lesson created with ID: $LESSON_ID"

# 6. Get lesson by ID
echo ""
echo "6. Getting lesson by ID..."
LESSON_DETAILS=$(make_request "GET" "/api/lessons/$LESSON_ID")
echo $LESSON_DETAILS | jq '.'

# 7. Update lesson
echo ""
echo "7. Updating lesson..."
LESSON_UPDATE_DATA='{
  "title": "Updated API Test Lesson",
  "content": "<h2>Updated Test Lesson Content</h2><p>This lesson was updated via API.</p>",
  "durationMinutes": 45,
  "isPublished": true
}'

LESSON_UPDATE_RESPONSE=$(make_request "PUT" "/api/lessons/$LESSON_ID" "$LESSON_UPDATE_DATA")
echo $LESSON_UPDATE_RESPONSE | jq '.'

# 8. Get course lessons
echo ""
echo "8. Getting all lessons for the course..."
COURSE_LESSONS=$(make_request "GET" "/api/courses/$COURSE_ID/lessons")
echo $COURSE_LESSONS | jq '.'

echo ""
echo "🧪 Testing Test Endpoints..."

# 9. Create a test
echo "9. Creating a test..."
TEST_DATA='{
  "title": "API Test Quiz",
  "description": "This is a test quiz created via API",
  "durationMinutes": 30,
  "passingScore": 70,
  "maxAttempts": 3,
  "questions": [
    {
      "question": "What is the purpose of this test?",
      "questionType": "multiple_choice",
      "options": ["To test the API", "To learn programming", "To pass time", "None of the above"],
      "correctAnswer": 0,
      "points": 10
    },
    {
      "question": "Is this a valid test question?",
      "questionType": "multiple_choice",
      "options": ["Yes", "No", "Maybe", "I don\'t know"],
      "correctAnswer": 0,
      "points": 10
    }
  ]
}'

CREATE_TEST_RESPONSE=$(make_request "POST" "/api/lessons/$LESSON_ID/tests" "$TEST_DATA")
echo $CREATE_TEST_RESPONSE | jq '.'

TEST_ID=$(echo $CREATE_TEST_RESPONSE | jq -r '.test.id')
if [ "$TEST_ID" = "null" ] || [ -z "$TEST_ID" ]; then
    echo "❌ Failed to create test"
    exit 1
fi

echo "✅ Test created with ID: $TEST_ID"

# 10. Get test by ID
echo ""
echo "10. Getting test by ID..."
TEST_DETAILS=$(make_request "GET" "/api/tests/$TEST_ID")
echo $TEST_DETAILS | jq '.'

# 11. Get test questions
echo ""
echo "11. Getting test questions..."
TEST_QUESTIONS=$(make_request "GET" "/api/tests/$TEST_ID/questions")
echo $TEST_QUESTIONS | jq '.'

# 12. Update test
echo ""
echo "12. Updating test..."
TEST_UPDATE_DATA='{
  "title": "Updated API Test Quiz",
  "durationMinutes": 45,
  "passingScore": 80,
  "isPublished": true
}'

TEST_UPDATE_RESPONSE=$(make_request "PUT" "/api/tests/$TEST_ID" "$TEST_UPDATE_DATA")
echo $TEST_UPDATE_RESPONSE | jq '.'

# 13. Get course tests
echo ""
echo "13. Getting all tests for the course..."
COURSE_TESTS=$(make_request "GET" "/api/courses/$COURSE_ID/tests")
echo $COURSE_TESTS | jq '.'

# 14. Get lesson tests
echo ""
echo "14. Getting all tests for the lesson..."
LESSON_TESTS=$(make_request "GET" "/api/lessons/$LESSON_ID/tests")
echo $LESSON_TESTS | jq '.'

echo ""
echo "📊 Summary of Created Resources:"
echo "Course ID: $COURSE_ID"
echo "Lesson ID: $LESSON_ID"
echo "Test ID: $TEST_ID"

echo ""
echo "✅ All endpoint tests completed!"
echo "You can now verify these resources exist in your LMS admin panel." 