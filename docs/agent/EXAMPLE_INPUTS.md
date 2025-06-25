# Example Input Files

This document provides example input files in various formats for testing the course scraping agent.

## Text File Examples

### urls.txt (Basic URL List)
```
https://learning.lpi.org/en/learning-materials/010-160/
https://learning.lpi.org/en/learning-materials/010-161/
https://learning.lpi.org/en/learning-materials/010-162/
https://learning.lpi.org/en/learning-materials/010-163/
https://learning.lpi.org/en/learning-materials/010-164/
```

### lpi_courses.txt (Commented URL List)
```
# LPI Linux Essentials Courses
https://learning.lpi.org/en/learning-materials/010-160/
https://learning.lpi.org/en/learning-materials/010-161/

# LPI System Administration Courses  
https://learning.lpi.org/en/learning-materials/010-162/
https://learning.lpi.org/en/learning-materials/010-163/

# LPI Networking Courses
https://learning.lpi.org/en/learning-materials/010-164/
```

## CSV File Examples

### courses_basic.csv
```csv
url,title,category,level,description
https://learning.lpi.org/en/learning-materials/010-160/,Linux Essentials,programming,beginner,Introduction to Linux fundamentals
https://learning.lpi.org/en/learning-materials/010-161/,System Administration,programming,intermediate,Advanced Linux system administration
https://learning.lpi.org/en/learning-materials/010-162/,Networking,programming,intermediate,Linux networking concepts
https://learning.lpi.org/en/learning-materials/010-163/,Security,programming,advanced,Linux security administration
https://learning.lpi.org/en/learning-materials/010-164/,Web Services,programming,intermediate,Linux web server administration
```

### courses_detailed.csv
```csv
url,title,category,level,description,tags,price,duration
https://learning.lpi.org/en/learning-materials/010-160/,Linux Essentials,programming,beginner,Introduction to Linux fundamentals,"linux,essentials,basics",0,120
https://learning.lpi.org/en/learning-materials/010-161/,System Administration,programming,intermediate,Advanced Linux system administration,"linux,administration,system",0,180
https://learning.lpi.org/en/learning-materials/010-162/,Networking,programming,intermediate,Linux networking concepts,"linux,networking,protocols",0,150
https://learning.lpi.org/en/learning-materials/010-163/,Security,programming,advanced,Linux security administration,"linux,security,firewall",0,200
https://learning.lpi.org/en/learning-materials/010-164/,Web Services,programming,intermediate,Linux web server administration,"linux,web,apache,nginx",0,160
```

## JSON File Examples

### courses_basic.json
```json
[
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-160/",
    "title": "Linux Essentials",
    "category": "programming",
    "level": "beginner",
    "description": "Introduction to Linux fundamentals"
  },
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-161/",
    "title": "System Administration",
    "category": "programming",
    "level": "intermediate",
    "description": "Advanced Linux system administration"
  },
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-162/",
    "title": "Networking",
    "category": "programming",
    "level": "intermediate",
    "description": "Linux networking concepts"
  }
]
```

### courses_detailed.json
```json
[
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-160/",
    "title": "Linux Essentials",
    "category": "programming",
    "level": "beginner",
    "description": "Introduction to Linux fundamentals including basic commands, file system navigation, and system administration concepts.",
    "tags": ["linux", "essentials", "basics", "commands", "filesystem"],
    "price": 0,
    "duration": 120,
    "thumbnail_url": "https://example.com/thumbnails/linux-essentials.jpg",
    "is_published": true,
    "metadata": {
      "certification": "LPI Linux Essentials",
      "prerequisites": "Basic computer literacy",
      "target_audience": "Beginners to Linux"
    }
  },
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-161/",
    "title": "System Administration",
    "category": "programming",
    "level": "intermediate",
    "description": "Advanced Linux system administration covering process management, user administration, and system monitoring.",
    "tags": ["linux", "administration", "system", "processes", "users"],
    "price": 0,
    "duration": 180,
    "thumbnail_url": "https://example.com/thumbnails/system-admin.jpg",
    "is_published": true,
    "metadata": {
      "certification": "LPI System Administration",
      "prerequisites": "Linux Essentials or equivalent",
      "target_audience": "System administrators"
    }
  },
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-162/",
    "title": "Networking",
    "category": "programming",
    "level": "intermediate",
    "description": "Linux networking concepts including network configuration, troubleshooting, and security.",
    "tags": ["linux", "networking", "protocols", "configuration", "security"],
    "price": 0,
    "duration": 150,
    "thumbnail_url": "https://example.com/thumbnails/networking.jpg",
    "is_published": true,
    "metadata": {
      "certification": "LPI Networking",
      "prerequisites": "System Administration or equivalent",
      "target_audience": "Network administrators"
    }
  }
]
```

### courses_with_lessons.json
```json
[
  {
    "url": "https://learning.lpi.org/en/learning-materials/010-160/",
    "title": "Linux Essentials",
    "category": "programming",
    "level": "beginner",
    "description": "Introduction to Linux fundamentals",
    "lessons": [
      {
        "title": "Introduction to Linux",
        "order": 1,
        "duration": 30,
        "content_preview": "Overview of Linux operating system and its history"
      },
      {
        "title": "Basic Commands",
        "order": 2,
        "duration": 45,
        "content_preview": "Essential Linux commands for file and directory management"
      },
      {
        "title": "File System Navigation",
        "order": 3,
        "duration": 40,
        "content_preview": "Understanding the Linux file system hierarchy"
      }
    ]
  }
]
```

## YAML File Examples

### courses.yaml
```yaml
courses:
  - url: https://learning.lpi.org/en/learning-materials/010-160/
    title: Linux Essentials
    category: programming
    level: beginner
    description: Introduction to Linux fundamentals
    tags:
      - linux
      - essentials
      - basics
    price: 0
    duration: 120
    
  - url: https://learning.lpi.org/en/learning-materials/010-161/
    title: System Administration
    category: programming
    level: intermediate
    description: Advanced Linux system administration
    tags:
      - linux
      - administration
      - system
    price: 0
    duration: 180

settings:
  batch_size: 5
  delay_between_batches: 2
  max_retries: 3
  screenshot_quality: high
  test_questions_per_lesson: 8
```

## Command Line Examples

### Single URL Processing
```bash
# Basic single URL
python agent.py --url "https://learning.lpi.org/en/learning-materials/010-160/"

# Single URL with custom settings
python agent.py --url "https://learning.lpi.org/en/learning-materials/010-160/" \
  --category programming \
  --level beginner \
  --title "Linux Essentials" \
  --description "Introduction to Linux fundamentals"
```

### Multiple URLs
```bash
# Multiple URLs as comma-separated list
python agent.py --urls "https://learning.lpi.org/en/learning-materials/010-160/,https://learning.lpi.org/en/learning-materials/010-161/"

# Multiple URLs with common settings
python agent.py --urls "url1,url2,url3" \
  --category programming \
  --level intermediate \
  --batch-size 3 \
  --delay 2
```

### File Processing
```bash
# Process text file
python agent.py --input urls.txt --format text

# Process CSV file
python agent.py --input courses.csv --format csv

# Process JSON file
python agent.py --input courses.json --format json

# Process YAML file
python agent.py --input courses.yaml --format yaml
```

### Advanced Processing
```bash
# Bulk processing with custom settings
python agent.py --input courses.json \
  --format json \
  --batch-size 5 \
  --delay 3 \
  --max-retries 5 \
  --output-dir ./output \
  --log-level DEBUG

# Resume failed processing
python agent.py --resume failed_urls.txt \
  --max-retries 3 \
  --delay 5

# Test mode (dry run)
python agent.py --input test_courses.json \
  --format json \
  --test-mode \
  --verbose
```

## Sample Course Data

### LPI Course URLs
```
# Linux Essentials (010-160)
https://learning.lpi.org/en/learning-materials/010-160/

# System Administration (010-161)
https://learning.lpi.org/en/learning-materials/010-161/

# Networking (010-162)
https://learning.lpi.org/en/learning-materials/010-162/

# Security (010-163)
https://learning.lpi.org/en/learning-materials/010-163/

# Web Services (010-164)
https://learning.lpi.org/en/learning-materials/010-164/
```

### Course Categories
- `programming` - Programming and development courses
- `system-administration` - System administration courses
- `networking` - Networking and infrastructure courses
- `security` - Security and cybersecurity courses
- `database` - Database administration courses
- `cloud` - Cloud computing and DevOps courses

### Course Levels
- `beginner` - Introductory courses for newcomers
- `intermediate` - Intermediate level courses
- `advanced` - Advanced and expert level courses
- `expert` - Expert level courses for professionals

## Testing Examples

### Test Single Course
```bash
# Test with minimal settings
python agent.py --url "https://learning.lpi.org/en/learning-materials/010-160/" \
  --test-mode \
  --verbose
```

### Test Bulk Processing
```bash
# Create test file with 2-3 URLs
echo "https://learning.lpi.org/en/learning-materials/010-160/" > test_urls.txt
echo "https://learning.lpi.org/en/learning-materials/010-161/" >> test_urls.txt

# Test processing
python agent.py --input test_urls.txt \
  --format text \
  --batch-size 2 \
  --delay 1 \
  --test-mode
```

### Test Different Formats
```bash
# Test CSV format
python agent.py --input test_courses.csv --format csv --test-mode

# Test JSON format
python agent.py --input test_courses.json --format json --test-mode

# Test YAML format
python agent.py --input test_courses.yaml --format yaml --test-mode
```

## Error Handling Examples

### Failed URLs File
```
https://learning.lpi.org/en/learning-materials/010-160/	Connection timeout
https://learning.lpi.org/en/learning-materials/010-161/	Authentication failed
https://learning.lpi.org/en/learning-materials/010-162/	Content parsing error
```

### Checkpoint File
```
https://learning.lpi.org/en/learning-materials/010-160/
https://learning.lpi.org/en/learning-materials/010-161/
https://learning.lpi.org/en/learning-materials/010-162/
```

### Processing Log
```
2024-01-15 10:30:15 - INFO - Starting bulk processing
2024-01-15 10:30:15 - INFO - Found 5 URLs to process
2024-01-15 10:30:16 - INFO - Processing URL: https://learning.lpi.org/en/learning-materials/010-160/
2024-01-15 10:30:20 - INFO - Successfully processed course: Linux Essentials
2024-01-15 10:30:22 - INFO - Processing URL: https://learning.lpi.org/en/learning-materials/010-161/
2024-01-15 10:30:25 - ERROR - Failed to process URL: Connection timeout
2024-01-15 10:30:27 - INFO - Processing URL: https://learning.lpi.org/en/learning-materials/010-162/
2024-01-15 10:30:31 - INFO - Successfully processed course: Networking
2024-01-15 10:30:31 - INFO - Processing completed. Success: 2, Failed: 1
``` 