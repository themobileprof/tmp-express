# Bulk Processing Guidelines

This document provides guidelines for bulk processing of course URLs and content for the course scraping agent.

## Input Formats

### 1. Text File (One URL per line)
```
https://learning.lpi.org/en/learning-materials/010-160/
https://learning.lpi.org/en/learning-materials/010-161/
https://learning.lpi.org/en/learning-materials/010-162/
https://learning.lpi.org/en/learning-materials/010-163/
```

### 2. CSV File with Metadata
```csv
url,title,category,level,description
https://learning.lpi.org/en/learning-materials/010-160/,Linux Essentials,programming,beginner,Introduction to Linux fundamentals
https://learning.lpi.org/en/learning-materials/010-161/,System Administration,programming,intermediate,Advanced Linux system administration
https://learning.lpi.org/en/learning-materials/010-162/,Networking,programming,intermediate,Linux networking concepts
```

### 3. JSON Array
```json
[
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-160/",
    "title": "Linux Essentials",
    "category": "programming",
    "level": "beginner",
    "description": "Introduction to Linux fundamentals",
    "tags": ["linux", "essentials", "basics"]
  },
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-161/",
    "title": "System Administration",
    "category": "programming",
    "level": "intermediate",
    "description": "Advanced Linux system administration",
    "tags": ["linux", "administration", "system"]
  }
]
```

### 4. Command Line Arguments
```bash
./agent.py --urls "url1,url2,url3" --category programming --level beginner
```

## Processing Workflow

### 1. Input Validation
```python
def validate_urls(urls):
    """Validate and clean input URLs"""
    valid_urls = []
    for url in urls:
        if url.startswith('https://learning.lpi.org/'):
            valid_urls.append(url.strip())
        else:
            log.warning(f"Invalid URL format: {url}")
    return valid_urls
```

### 2. Batch Processing
```python
def process_batch(urls, batch_size=5):
    """Process URLs in batches to avoid overwhelming the server"""
    for i in range(0, len(urls), batch_size):
        batch = urls[i:i + batch_size]
        process_url_batch(batch)
        time.sleep(2)  # Rate limiting
```

### 3. Progress Tracking
```python
def track_progress(total_urls, processed_urls, failed_urls):
    """Track and report processing progress"""
    progress = (processed_urls / total_urls) * 100
    print(f"Progress: {progress:.1f}% ({processed_urls}/{total_urls})")
    if failed_urls:
        print(f"Failed: {len(failed_urls)} URLs")
```

## File Processing Examples

### Text File Processing
```python
def process_text_file(filename):
    """Process URLs from a text file"""
    with open(filename, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    print(f"Found {len(urls)} URLs in {filename}")
    return process_urls(urls)
```

### CSV File Processing
```python
import csv

def process_csv_file(filename):
    """Process URLs and metadata from a CSV file"""
    courses = []
    with open(filename, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            courses.append({
                'url': row['url'],
                'title': row.get('title', ''),
                'category': row.get('category', 'programming'),
                'level': row.get('level', 'beginner'),
                'description': row.get('description', ''),
                'tags': row.get('tags', '').split(',') if row.get('tags') else []
            })
    
    print(f"Found {len(courses)} courses in {filename}")
    return process_courses(courses)
```

### JSON File Processing
```python
import json

def process_json_file(filename):
    """Process URLs and metadata from a JSON file"""
    with open(filename, 'r') as f:
        courses = json.load(f)
    
    print(f"Found {len(courses)} courses in {filename}")
    return process_courses(courses)
```

## Error Handling and Recovery

### 1. Failed URL Tracking
```python
def handle_failed_urls(failed_urls, output_file):
    """Save failed URLs for later retry"""
    with open(output_file, 'w') as f:
        for url, error in failed_urls:
            f.write(f"{url}\t{error}\n")
    
    print(f"Saved {len(failed_urls)} failed URLs to {output_file}")
```

### 2. Retry Logic
```python
def retry_failed_urls(failed_urls_file, max_retries=3):
    """Retry processing failed URLs"""
    with open(failed_urls_file, 'r') as f:
        failed_urls = [line.strip().split('\t') for line in f]
    
    for url, error in failed_urls:
        for attempt in range(max_retries):
            try:
                process_single_url(url)
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"Failed to process {url} after {max_retries} attempts")
```

### 3. Resume Processing
```python
def resume_processing(checkpoint_file):
    """Resume processing from a checkpoint"""
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, 'r') as f:
            processed_urls = set(line.strip() for line in f)
        
        print(f"Resuming from checkpoint: {len(processed_urls)} URLs already processed")
        return processed_urls
    return set()
```

## Output and Reporting

### 1. Processing Summary
```python
def generate_summary_report(processed_courses, failed_urls, output_file):
    """Generate a summary report of processing results"""
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_courses': len(processed_courses),
        'successful_courses': len(processed_courses),
        'failed_urls': len(failed_urls),
        'courses': [
            {
                'title': course['title'],
                'url': course['url'],
                'lessons_count': len(course['lessons']),
                'tests_count': len(course['tests'])
            }
            for course in processed_courses
        ],
        'failed_urls_details': failed_urls
    }
    
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"Summary report saved to {output_file}")
```

### 2. Progress Logging
```python
import logging

def setup_logging(log_file):
    """Setup logging for bulk processing"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
```

## Configuration Options

### 1. Processing Configuration
```python
PROCESSING_CONFIG = {
    'batch_size': 5,  # Number of URLs to process simultaneously
    'delay_between_batches': 2,  # Seconds to wait between batches
    'max_retries': 3,  # Maximum retry attempts for failed URLs
    'timeout': 30,  # Request timeout in seconds
    'max_concurrent_uploads': 3,  # Maximum concurrent file uploads
    'screenshot_quality': 'high',  # Screenshot quality setting
    'html_template': 'mobile_friendly',  # HTML template to use
    'test_questions_per_lesson': 8,  # Number of questions per lesson
    'passing_score': 70  # Default passing score for tests
}
```

### 2. Environment Variables
```bash
# Required
LMS_EMAIL=your_email@example.com
LMS_PASSWORD=your_password
LMS_BASE_URL=https://api.themobileprof.com

# Optional
BATCH_SIZE=5
DELAY_BETWEEN_BATCHES=2
MAX_RETRIES=3
LOG_LEVEL=INFO
OUTPUT_DIR=./output
```

## Usage Examples

### 1. Process URLs from Text File
```bash
python agent.py --input urls.txt --format text
```

### 2. Process URLs from CSV with Metadata
```bash
python agent.py --input courses.csv --format csv
```

### 3. Process URLs from JSON
```bash
python agent.py --input courses.json --format json
```

### 4. Process Single URL
```bash
python agent.py --url "https://learning.lpi.org/en/learning-materials/010-160/"
```

### 5. Resume Failed Processing
```bash
python agent.py --resume failed_urls.txt
```

## Quality Assurance

### 1. Content Validation
```python
def validate_processed_content(course):
    """Validate processed course content"""
    checks = [
        course.get('title'),
        course.get('description'),
        len(course.get('lessons', [])) > 0,
        all(lesson.get('content') for lesson in course.get('lessons', [])),
        all(lesson.get('screenshots') for lesson in course.get('lessons', [])),
        all(lesson.get('test') for lesson in course.get('lessons', []))
    ]
    return all(checks)
```

### 2. Duplicate Detection
```python
def detect_duplicates(courses):
    """Detect duplicate courses by URL or title"""
    seen_urls = set()
    seen_titles = set()
    duplicates = []
    
    for course in courses:
        if course['url'] in seen_urls:
            duplicates.append(('url', course['url']))
        if course['title'] in seen_titles:
            duplicates.append(('title', course['title']))
        
        seen_urls.add(course['url'])
        seen_titles.add(course['title'])
    
    return duplicates
```

## Best Practices

1. **Rate Limiting**: Always implement delays between requests
2. **Error Handling**: Log and track all errors for debugging
3. **Progress Tracking**: Provide clear progress indicators
4. **Resume Capability**: Allow resuming from where processing stopped
5. **Validation**: Validate all input and output data
6. **Logging**: Maintain detailed logs for troubleshooting
7. **Backup**: Keep backups of original data and processing results
8. **Testing**: Test with small batches before processing large datasets 