# URL Tracking System Guide

This guide explains how to use the URL tracking system to prevent duplicate scraping and manage scraping progress effectively.

## Overview

The URL tracking system allows the scraping agent to:
- **Track which URLs have been processed** to avoid duplicate work
- **Manage scraping queue** with different statuses (pending, in_progress, completed, failed, skipped)
- **Monitor scraping progress** with statistics and activity logs
- **Handle failures gracefully** with retry mechanisms
- **Resume interrupted scraping** from where it left off

## Database Schema

### Scraped_URLs Table
```sql
CREATE TABLE scraped_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  status scraping_status DEFAULT 'pending',
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  level VARCHAR(50),
  metadata JSON,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Status Values
- **`pending`**: URL is queued for processing but not yet started
- **`in_progress`**: URL is currently being processed by the agent
- **`completed`**: URL has been successfully processed and content uploaded
- **`failed`**: Processing failed (check error_message for details)
- **`skipped`**: URL was intentionally skipped (e.g., not relevant content)
- **`partial`**: URL was partially processed (some content extracted but not complete)

## API Endpoints

### 1. Add URLs to Queue

#### Single URL
```http
POST /api/scraping/urls
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "url": "https://learning.lpi.org/en/learning-materials/010-160/",
  "title": "Linux Essentials",
  "description": "Introduction to Linux fundamentals",
  "category": "programming",
  "level": "beginner",
  "metadata": {
    "source": "lpi",
    "certification": "LPI Linux Essentials"
  }
}
```

#### Multiple URLs
```http
POST /api/scraping/urls/bulk
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "urls": [
    {
      "url": "https://learning.lpi.org/en/learning-materials/010-160/",
      "title": "Linux Essentials",
      "category": "programming",
      "level": "beginner"
    },
    {
      "url": "https://learning.lpi.org/en/learning-materials/010-161/",
      "title": "System Administration",
      "category": "programming",
      "level": "intermediate"
    }
  ]
}
```

### 2. Get URLs for Processing

#### Get Pending URLs
```http
GET /api/scraping/urls/pending?limit=10
Authorization: Bearer <access_token>
```

#### Get All URLs with Filtering
```http
GET /api/scraping/urls?status=pending&category=programming&page=1&limit=20
Authorization: Bearer <access_token>
```

### 3. Update Processing Status

```http
PUT /api/scraping/urls/:id/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "in_progress",
  "title": "Linux Essentials",
  "description": "Introduction to Linux fundamentals",
  "category": "programming",
  "level": "beginner",
  "metadata": {
    "lessons_count": 15,
    "estimated_duration": "6 weeks"
  }
}
```

### 4. Monitor Progress

#### Get Statistics
```http
GET /api/scraping/stats
Authorization: Bearer <access_token>
```

#### Reset Failed URLs
```http
POST /api/scraping/urls/reset-failed
Authorization: Bearer <access_token>
```

## Agent Workflow

### 1. Initial Setup
```javascript
// Authenticate and get token
const token = await authenticate();

// Add URLs to queue
const urls = [
  "https://learning.lpi.org/en/learning-materials/010-160/",
  "https://learning.lpi.org/en/learning-materials/010-161/"
];

for (const url of urls) {
  await addUrlToQueue(token, url);
}
```

### 2. Processing Loop
```javascript
async function processQueue() {
  while (true) {
    // Get pending URLs
    const pendingUrls = await getPendingUrls(token, 5);
    
    if (pendingUrls.length === 0) {
      console.log('No pending URLs to process');
      break;
    }
    
    // Process each URL
    for (const urlData of pendingUrls) {
      try {
        // Update status to in_progress
        await updateUrlStatus(token, urlData.id, {
          status: 'in_progress'
        });
        
        // Process the URL
        const result = await processUrl(urlData.url);
        
        // Update status to completed
        await updateUrlStatus(token, urlData.id, {
          status: 'completed',
          title: result.title,
          description: result.description,
          category: result.category,
          level: result.level,
          metadata: result.metadata
        });
        
        console.log(`✅ Processed: ${urlData.url}`);
        
      } catch (error) {
        // Update status to failed
        await updateUrlStatus(token, urlData.id, {
          status: 'failed',
          error_message: error.message
        });
        
        console.error(`❌ Failed: ${urlData.url} - ${error.message}`);
      }
    }
    
    // Wait before next batch
    await sleep(2000);
  }
}
```

### 3. Error Handling
```javascript
async function handleFailedUrls() {
  // Get failed URLs
  const failedUrls = await getUrlsByStatus(token, 'failed');
  
  for (const urlData of failedUrls) {
    if (urlData.retry_count < 3) {
      // Reset to pending for retry
      await updateUrlStatus(token, urlData.id, {
        status: 'pending',
        error_message: null
      });
    } else {
      console.log(`Max retries reached for: ${urlData.url}`);
    }
  }
}
```

## Best Practices

### 1. Check Before Adding
```javascript
async function addUrlSafely(token, url) {
  // Check if URL already exists
  const existing = await checkUrlExists(token, url);
  
  if (existing) {
    console.log(`URL already exists: ${url} (status: ${existing.status})`);
    return existing;
  }
  
  // Add to queue
  return await addUrlToQueue(token, url);
}
```

### 2. Batch Processing
```javascript
async function processBatch(token, urls, batchSize = 5) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    // Process batch concurrently
    const promises = batch.map(url => processUrl(url));
    await Promise.allSettled(promises);
    
    // Wait between batches
    await sleep(2000);
  }
}
```

### 3. Progress Monitoring
```javascript
async function monitorProgress(token) {
  const stats = await getScrapingStats(token);
  
  console.log('📊 Scraping Progress:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Pending: ${stats.summary.pending}`);
  console.log(`  In Progress: ${stats.summary.in_progress}`);
  console.log(`  Completed: ${stats.summary.completed}`);
  console.log(`  Failed: ${stats.summary.failed}`);
  console.log(`  Success Rate: ${((stats.summary.completed / stats.total) * 100).toFixed(1)}%`);
}
```

### 4. Resume Capability
```javascript
async function resumeProcessing(token) {
  // Get URLs that were in progress (interrupted)
  const inProgressUrls = await getUrlsByStatus(token, 'in_progress');
  
  // Reset them to pending
  for (const urlData of inProgressUrls) {
    await updateUrlStatus(token, urlData.id, {
      status: 'pending',
      error_message: 'Resumed from interrupted processing'
    });
  }
  
  console.log(`Resumed ${inProgressUrls.length} interrupted URLs`);
}
```

## Integration with Existing Agent

### 1. Update Agent Prompt
The agent should now:
1. **Check URL tracking** before processing any URL
2. **Update status** throughout the processing workflow
3. **Handle failures** gracefully with proper error tracking
4. **Monitor progress** and provide statistics

### 2. Example Agent Integration
```javascript
class ScrapingAgent {
  constructor(token) {
    this.token = token;
  }
  
  async processUrl(url) {
    // Check if already processed
    const existing = await this.checkUrlExists(url);
    if (existing && existing.status === 'completed') {
      console.log(`Skipping already processed URL: ${url}`);
      return;
    }
    
    // Add to queue if not exists
    let urlData = existing;
    if (!existing) {
      urlData = await this.addUrlToQueue(url);
    }
    
    try {
      // Update status to in_progress
      await this.updateUrlStatus(urlData.id, { status: 'in_progress' });
      
      // Process the URL
      const result = await this.scrapeAndProcess(url);
      
      // Update status to completed
      await this.updateUrlStatus(urlData.id, {
        status: 'completed',
        title: result.title,
        description: result.description,
        category: result.category,
        level: result.level,
        metadata: result.metadata
      });
      
      console.log(`✅ Successfully processed: ${url}`);
      
    } catch (error) {
      // Update status to failed
      await this.updateUrlStatus(urlData.id, {
        status: 'failed',
        error_message: error.message
      });
      
      console.error(`❌ Failed to process: ${url} - ${error.message}`);
      throw error;
    }
  }
}
```

## Monitoring and Maintenance

### 1. Regular Cleanup
```javascript
// Clean up old completed URLs (optional)
async function cleanupOldUrls(token, daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  // Delete old completed URLs
  await deleteOldUrls(token, cutoffDate);
}
```

### 2. Performance Monitoring
```javascript
// Monitor processing speed
async function monitorPerformance(token) {
  const stats = await getScrapingStats(token);
  const recentActivity = await getRecentActivity(token, 24); // Last 24 hours
  
  const completedToday = recentActivity.filter(a => 
    a.status === 'completed' && 
    new Date(a.completed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;
  
  console.log(`URLs processed today: ${completedToday}`);
}
```

## Troubleshooting

### Common Issues

1. **Duplicate URLs**: Always check if URL exists before adding
2. **Stuck in_progress**: Reset interrupted URLs to pending
3. **High failure rate**: Check error messages and adjust scraping logic
4. **Memory issues**: Process in smaller batches

### Debug Commands
```javascript
// Get detailed info about a specific URL
const urlInfo = await getUrlDetails(token, urlId);

// Get all failed URLs with error messages
const failedUrls = await getUrlsByStatus(token, 'failed');

// Reset all failed URLs for retry
await resetFailedUrls(token);
```

This URL tracking system ensures efficient, reliable, and resumable scraping operations while preventing duplicate work and providing comprehensive monitoring capabilities. 