# Course Scraping Agent Documentation

This directory contains comprehensive documentation for creating a course scraping agent that extracts, customizes, and uploads LPI learning materials to TheMobileProf LMS.

## Overview

The course scraping agent is designed to:
1. **Scrape** course content from LPI learning materials (e.g., https://learning.lpi.org/en/learning-materials/010-160/)
2. **Customize** content into engaging, mobile-friendly HTML
3. **Generate** Termux-style screenshots for visual content
4. **Upload** content to TheMobileProf LMS API
5. **Create** tests and quizzes based on lesson content
6. **Leverage LLMs and Image Generation APIs** for content rewriting and screenshot/image creation

## Documentation Structure

### Core Documentation
- **[AGENT_PROMPT.md](AGENT_PROMPT.md)** - Complete agent prompt for creating the scraping agent
- **[API_ENDPOINTS.md](API_ENDPOINTS.md)** - Detailed API reference for LMS integration
- **[HTML_TEMPLATES.md](HTML_TEMPLATES.md)** - Templates and guidelines for content customization
- **[SCREENSHOT_GUIDELINES.md](SCREENSHOT_GUIDELINES.md)** - Guidelines for Termux-style screenshot generation
- **[TEST_GENERATION.md](TEST_GENERATION.md)** - Guidelines for creating tests and quizzes
- **[BULK_PROCESSING.md](BULK_PROCESSING.md)** - Guidelines for bulk URL processing

## Quick Start

### 1. Environment Setup
Create a `.env` file with your LMS credentials **and LLM/image generation API keys**:
```env
LMS_EMAIL=your_email@example.com
LMS_PASSWORD=your_password
LMS_BASE_URL=https://api.themobileprof.com

# LLM and Image Generation API Keys
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key
IMAGE_GEN_API_KEY=your_image_api_key
# Add other providers as needed
```

### 2. Input Formats
The agent supports multiple input formats:

**Text file (one URL per line):**
```
https://learning.lpi.org/en/learning-materials/010-160/
https://learning.lpi.org/en/learning-materials/010-161/
```

**CSV with metadata:**
```csv
url,title,category,level,description
https://learning.lpi.org/en/learning-materials/010-160/,Linux Essentials,programming,beginner,Introduction to Linux fundamentals
```

**JSON array:**
```json
[
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-160/",
    "title": "Linux Essentials",
    "category": "programming",
    "level": "beginner"
  }
]
```

### 3. Basic Usage
```bash
# Process single URL
python agent.py --url "https://learning.lpi.org/en/learning-materials/010-160/"

# Process from text file
python agent.py --input urls.txt --format text

# Process from CSV with metadata
python agent.py --input courses.csv --format csv

# Bulk processing with custom settings
python agent.py --input courses.json --format json --batch-size 5 --delay 2
```

## LLMs and Image Generation APIs

The agent can use Large Language Models (LLMs) and image generation APIs to:
- Rewrite and enhance lesson content for engagement and clarity
- Generate quiz/test questions from lesson text
- Create Termux-style screenshots or other images for visual content

### Supported Providers
- **OpenAI (ChatGPT, GPT-4, DALL·E, etc.)**
- **Google Gemini**
- **Anthropic Claude**
- **Stability AI (Stable Diffusion, etc.)**
- **DeepSeek**
- **Other image generation APIs**

### Configuration
- Set the relevant API keys in your `.env` file (see above)
- The agent should select the appropriate provider based on task and availability
- For content rewriting, use LLM endpoints (e.g., DeepSeek, OpenAI's `chat/completions`)
- For screenshot/image generation, use image API endpoints (e.g., DALL·E, Stable Diffusion)

### Example Usage
```python
import openai
import os

openai.api_key = os.getenv('IMAGE_GEN_API_KEY')
response = openai.Image.create(
    prompt="Termux terminal screenshot showing 'ls -la' command output, dark background, green text, realistic style.",
    n=1,
    size="480x800"  # Portrait, mobile-friendly, and cost-effective
)
image_url = response['data'][0]['url']
```

## Workflow Overview

### 1. Content Discovery
- Scrape main course page for metadata
- Extract lesson links and structure
- Follow links to individual lesson pages
- Parse course hierarchy and relationships

### 2. Content Processing
- Extract raw HTML content from lesson pages
- Clean and structure content
- Identify code examples and commands
- Extract key concepts for test generation
- **Rewrite/enhance content using LLMs**

### 3. Content Customization
- Transform content using HTML templates
- Add interactive elements and visual enhancements
- Ensure mobile responsiveness
- Maintain factual accuracy

### 4. Screenshot Generation
- **Generate Termux-style screenshots using image APIs or scripts**
- Generate visual content for code examples
- Optimize images for web display
- Maintain consistent styling

### 5. Content Upload
- Authenticate with LMS API
- Upload screenshots to file storage
- Create courses and lessons
- Associate content properly

### 6. Test Generation
- **Generate quiz/test questions using LLMs**
- Analyze lesson content for key concepts
- Generate multiple-choice and true/false questions
- Create scenario-based questions
- Upload tests to LMS

## Key Features

### Content Customization
- Mobile-first responsive design
- Interactive elements and tooltips
- Code syntax highlighting
- Visual enhancements with emojis and icons
- Accessibility compliance

### Screenshot Generation
- Termux-style terminal appearance
- Consistent color scheme and typography
- Realistic command examples
- Error handling demonstrations
- Professional quality output

### Test Generation
- Multiple question types (MCQ, True/False, Scenario)
- Difficulty level distribution
- Comprehensive explanations
- Practical application focus
- Quality assurance checks

### Bulk Processing
- Multiple input formats support
- Batch processing with rate limiting
- Error handling and recovery
- Progress tracking and reporting
- Resume capability

## API Integration

### Authentication
```python
# Login to LMS
response = requests.post(f"{LMS_BASE_URL}/api/auth/login", json={
    "email": LMS_EMAIL,
    "password": LMS_PASSWORD
})
access_token = response.json()['data']['tokens']['access']
```

### File Upload
```python
# Upload screenshot
with open('screenshot.png', 'rb') as f:
    files = {'file': f}
    response = requests.post(f"{LMS_BASE_URL}/api/upload", 
                           files=files, 
                           headers={'Authorization': f'Bearer {access_token}'})
image_url = response.json()['data']['url']
```

### Course Creation
```python
# Create course
course_data = {
    "title": "Linux Essentials",
    "description": "Introduction to Linux fundamentals",
    "category": "programming",
    "level": "beginner"
}
response = requests.post(f"{LMS_BASE_URL}/api/courses", 
                        json=course_data,
                        headers={'Authorization': f'Bearer {access_token}'})
```

## Quality Standards

### Content Quality
- ✅ Factual accuracy maintained
- ✅ Mobile-responsive design
- ✅ Accessibility compliance
- ✅ Interactive elements
- ✅ Professional presentation

### Screenshot Quality
- ✅ Termux-style appearance
- ✅ Clear, readable text
- ✅ Realistic scenarios
- ✅ Proper color scheme
- ✅ Optimized file sizes

### Test Quality
- ✅ Comprehensive coverage
- ✅ Clear, unambiguous questions
- ✅ Helpful explanations
- ✅ Appropriate difficulty levels
- ✅ Practical application focus

## Error Handling

### Common Issues
- **Network timeouts**: Implement retry logic
- **Authentication failures**: Refresh tokens automatically
- **Rate limiting**: Respect API limits
- **Content parsing errors**: Log and skip problematic content
- **Upload failures**: Retry with exponential backoff

### Recovery Strategies
- **Checkpoint system**: Save progress for resuming
- **Failed URL tracking**: Log failed URLs for retry
- **Partial success handling**: Continue processing other items
- **Detailed logging**: Comprehensive error reporting

## Performance Optimization

### Rate Limiting
- 2-second delay between batches
- Maximum 5 concurrent requests
- Respect API rate limits
- Implement exponential backoff

### Resource Management
- Optimize image sizes before upload
- Use connection pooling
- Implement proper cleanup
- Monitor memory usage

### Caching
- Cache authentication tokens
- Store processed content locally
- Avoid re-processing unchanged content
- Use efficient data structures

## Security Considerations

### Data Protection
- Never log credentials
- Validate all input URLs
- Sanitize HTML content
- Use HTTPS for all communications

### Access Control
- Implement proper authentication
- Validate API responses
- Handle authorization errors
- Secure file handling

## Monitoring and Logging

### Logging Levels
- **INFO**: General processing information
- **WARNING**: Non-critical issues
- **ERROR**: Processing failures
- **DEBUG**: Detailed debugging information

### Metrics Tracking
- Processing time per course
- Success/failure rates
- API response times
- Resource usage statistics

## Troubleshooting

### Common Problems
1. **Authentication failures**: Check credentials and token expiration
2. **Content parsing errors**: Verify HTML structure and selectors
3. **Upload failures**: Check file sizes and network connectivity
4. **Rate limiting**: Implement proper delays and retry logic
5. **Memory issues**: Optimize batch sizes and resource usage

### Debug Mode
```bash
python agent.py --debug --url "https://learning.lpi.org/en/learning-materials/010-160/"
```

## Contributing

When contributing to the agent development:

1. Follow the established coding standards
2. Add comprehensive error handling
3. Include proper logging
4. Test with various input formats
5. Validate output quality
6. Update documentation as needed

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the detailed documentation
3. Examine error logs
4. Test with minimal examples
5. Contact the development team

## License

This documentation and the agent implementation are part of TheMobileProf LMS project. Please refer to the main project license for usage terms.

**Note:**
> For all screenshot/image generation, prefer portrait (480x800) images. This format is mobile-optimized, reduces cost, and improves user experience on mobile devices. 