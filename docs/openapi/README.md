# TheMobileProf OpenAPI Specification

This directory contains the modular OpenAPI specification for TheMobileProf API, organized using `$ref` for better maintainability and organization.

## Structure

```
docs/openapi/
├── openapi.yaml              # Main OpenAPI specification file
├── paths/                    # API endpoint definitions
│   ├── index.yaml           # Paths index (references all path files)
│   ├── auth.yaml            # Authentication endpoints
│   ├── payments.yaml        # Payment endpoints (with 100% discount logic)
│   ├── uploads.yaml         # File upload endpoints
│   ├── notifications.yaml   # Notification endpoints
│   ├── search.yaml          # Search endpoints
│   ├── meta.yaml            # Metadata endpoints
│   ├── debug.yaml           # Debug and testing endpoints
│   ├── tests.yaml           # Test management and assessment endpoints
│   ├── scraping.yaml        # Web scraping management endpoints
│   └── users.yaml           # User management and profile endpoints
├── schemas/                  # Data model definitions
│   ├── index.yaml           # Schemas index (references all schema files)
│   ├── User.yaml            # User model
│   ├── UserProfile.yaml     # Frontend-compatible user profile
│   ├── Enrollment.yaml      # Course/class enrollment model
│   ├── Sponsorship.yaml     # Sponsorship program model
│   ├── Payment.yaml         # Payment transaction model
│   ├── Notification.yaml    # User notification model
│   ├── NotificationPreferences.yaml  # User notification settings
│   ├── Pagination.yaml      # Pagination metadata
│   └── Test.yaml            # Test model and assessment data
├── responses/                # Common response definitions
│   ├── index.yaml           # Responses index (references all response files)
│   ├── BadRequest.yaml      # 400 error responses
│   ├── Unauthorized.yaml    # 401 error responses
│   ├── Forbidden.yaml       # 403 error responses
│   ├── NotFound.yaml        # 404 error responses
│   └── Conflict.yaml        # 409 error responses
└── README.md                 # This file
```

## Key Features

### 1. **Modular Organization**
- **Main file**: `openapi.yaml` - Entry point with basic info and references
- **Paths**: Organized by functional area (auth, payments, uploads, etc.)
- **Schemas**: Reusable data models
- **Responses**: Standardized error responses

### 2. **100% Discount Payment Logic**
The payment endpoints now properly handle free enrollments:
- **Payment Initialization**: Automatically detects 100% discounts and marks payments as successful
- **Payment Verification**: Handles both regular payments and already-successful free enrollments
- **No Code Duplication**: Single enrollment path for all payment types
- **Smart Routing**: 100% discount cases route through existing verification flow
- **Consistent Logic**: All enrollments use the same business logic path

### 3. **Comprehensive File Upload System**
- **Multiple file types** supported (images, documents, videos)
- **Size limits** properly documented
- **Storage structure** clearly defined
- **Admin-only endpoints** properly secured

### 4. **Complete Notification System**
- **User preferences** for different notification types
- **Priority levels** (low, normal, high, urgent)
- **Bulk operations** for efficient management
- **Admin capabilities** for system notifications

### 5. **Comprehensive Test Management System**
- **Test lifecycle**: Create, update, delete tests and questions
- **Question types**: Multiple choice, true/false, short answer
- **Test attempts**: Start, submit, and track test progress
- **Analytics**: Performance statistics and question-level analytics
- **Image support**: Upload images for test questions
- **100% Discount Logic**: Proper handling of free enrollments

### 6. **Web Scraping Management**
- **URL management**: Add, update, delete scraped URLs
- **Bulk operations**: Process multiple URLs at once
- **Status tracking**: Monitor scraping progress and errors
- **Statistics**: Comprehensive analytics and reporting
- **Error handling**: Reset failed URLs for retry

### 7. **Advanced User Management**
- **Enrollment tracking**: Course and class enrollments with progress
- **Dashboard statistics**: User progress and completion metrics
- **Profile management**: Update settings and personal information
- **Current user endpoints**: Frontend-compatible user data access

## Usage

### **View in Swagger UI**
```bash
# Navigate to the openapi directory
cd docs/openapi

# Open the main specification file
open openapi.yaml
```

### **Import into Tools**
- **Postman**: Import `openapi.yaml` for API testing
- **Insomnia**: Use as API specification
- **Code Generation**: Generate client libraries
- **Documentation**: Generate HTML documentation

### **Development Workflow**
1. **Add new endpoints**: Create/modify files in `paths/`
2. **Update schemas**: Modify files in `schemas/`
3. **Add responses**: Create/modify files in `responses/`
4. **Update references**: Ensure all `$ref` paths are correct
5. **Validate**: Use OpenAPI validator tools

## API Organization

### **Available Tags**
- **Authentication**: User registration, login, OAuth, profile management
- **Payments**: Payment processing with 100% discount handling
- **File Uploads**: Comprehensive file upload system with validation
- **Notifications**: User notification system with preferences
- **Search**: Search and discovery endpoints
- **Meta**: Metadata and system information
- **Debug**: Testing and debugging endpoints
- **Tests**: Test management and assessment endpoints
- **Scraping**: Web scraping management and URL processing
- **Users**: User management and profile endpoints

## Benefits of Modular Structure

### **Maintainability**
- **Separation of concerns**: Each file has a specific purpose
- **Easier updates**: Modify specific areas without affecting others
- **Version control**: Better diff tracking for specific changes

### **Reusability**
- **Shared schemas**: Models can be referenced across endpoints
- **Common responses**: Standardized error handling
- **Consistent patterns**: Uniform API structure

### **Team Collaboration**
- **Parallel development**: Multiple developers can work on different areas
- **Clear ownership**: Each module has clear responsibilities
- **Easier reviews**: Smaller, focused changes

### **Documentation Generation**
- **Better organization**: Logical grouping of related endpoints
- **Easier navigation**: Developers can find specific areas quickly
- **Consistent formatting**: Uniform structure across all modules

## Validation

### **OpenAPI Validator**
```bash
# Install OpenAPI validator
npm install -g @apidevtools/swagger-cli

# Validate the specification
swagger-cli validate openapi.yaml
```

### **Online Validators**
- [Swagger Editor](https://editor.swagger.io/)
- [OpenAPI Validator](https://apitools.dev/swagger-parser/online/)

## Examples

### **Adding a New Endpoint**
1. Create/modify the appropriate path file in `paths/`
2. Add the endpoint definition directly to `openapi.yaml` in the appropriate section
3. Create any new schemas in `schemas/`
4. Update the main `openapi.yaml` if needed

### **Adding a New Schema**
1. Create the schema file in `schemas/`
2. Add the reference to `schemas/index.yaml`
3. Use `$ref: '../schemas/NewSchema.yaml'` in path files

### **Adding a New Response Type**
1. Create the response file in `responses/`
2. Add the reference to `responses/index.yaml`
3. Use `$ref: '../responses/NewResponse.yaml'` in path files

## Notes

- **File paths**: All `$ref` paths use relative paths from the referencing file
- **Consistency**: All files follow the same YAML formatting standards
- **Documentation**: Each file includes clear descriptions and examples
- **Updates**: The specification reflects the current implementation status

This modular structure makes the OpenAPI specification much easier to maintain and extend while providing a comprehensive and well-organized API documentation. 