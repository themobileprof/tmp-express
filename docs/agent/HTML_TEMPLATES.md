# HTML Templates for Course Content Customization

This document provides templates and guidelines for transforming scraped LPI content into engaging, mobile-friendly HTML **fragments** suitable for WYSIWYG editors like TinyMCE. The agent should generate only the content blocks (not full HTML pages), as the HTML will be inserted into an existing page.

## General Guidelines
- **Do NOT generate full HTML pages** (no `<html>`, `<head>`, `<body>`, or `<style>` tags)
- Use only content blocks, sections, and inline elements
- Output should be similar to what a WYSIWYG editor (e.g., TinyMCE) would produce
- Use semantic HTML5 elements where possible
- Use inline styles sparingly; prefer class names for styling
- Ensure all images, screenshots, and media use relative or absolute URLs as required by the LMS
- All content must be mobile-friendly and accessible

## Example Content Blocks

### Introduction Section
```html
<div class="info-box">
  <h2>📚 What You'll Learn</h2>
  <p>In this lesson, you'll discover:</p>
  <ul>
    <li>Key concept 1</li>
    <li>Key concept 2</li>
    <li>Key concept 3</li>
  </ul>
  <p><strong>Estimated time:</strong> 15-20 minutes</p>
</div>
```

### Code Example with Screenshot
```html
<h3>🖥️ Command Example</h3>
<p>Let's see how to use the <code>ls</code> command to list files:</p>
<div class="code-block">
  <span class="command">$ ls -la</span><br>
  <span class="output">total 32<br>
drwxr-xr-x  5 user user 4096 Jan 15 10:30 .<br>
drwxr-xr-x 20 user user 4096 Jan 15 10:30 ..<br>
-rw-r--r--  1 user user  220 Jan 15 10:30 .bash_logout<br>
-rw-r--r--  1 user user 3771 Jan 15 10:30 .bashrc</span>
</div>
<img src="https://api.themobileprof.com/uploads/screenshots/ls_command_example.png" 
     alt="Terminal showing ls -la command output" 
     class="screenshot"
     width="480" height="800">
```

### Interactive Concept Box
```html
<div class="interactive-element" onclick="toggleDetails(this)">
  <h4>💡 Quick Tip</h4>
  <p><strong>Pro Tip:</strong> Always use the <code>-la</code> flags with <code>ls</code> to see hidden files and detailed information.</p>
  <div class="details" style="display: none;">
    <p>Hidden files in Linux start with a dot (.) and are often configuration files. The <code>-a</code> flag shows all files, including hidden ones.</p>
  </div>
</div>
```

### Warning/Important Note
```html
<div class="warning-box">
  <h4>⚠️ Important</h4>
  <p><strong>Be careful:</strong> Some commands can be destructive. Always double-check before running commands that modify or delete files.</p>
</div>
```

### Step-by-Step Instructions
```html
<h3>📋 Step-by-Step Guide</h3>
<div class="step">
  <h4>Step 1: Open Terminal</h4>
  <p>First, open your terminal application. On most Linux distributions, you can press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>.</p>
</div>
<div class="step">
  <h4>Step 2: Navigate to Directory</h4>
  <p>Use the <code>cd</code> command to navigate to your desired directory:</p>
  <div class="code-block">
    <span class="command">$ cd /home/user/documents</span>
  </div>
</div>
<div class="step">
  <h4>Step 3: List Files</h4>
  <p>Now list the files in the current directory:</p>
  <div class="code-block">
    <span class="command">$ ls</span>
  </div>
</div>
```

### Practice Exercise
```html
<div class="tip-box">
  <h4>🎯 Practice Exercise</h4>
  <p><strong>Try this:</strong> Navigate to your home directory and list all files, including hidden ones.</p>
  <div class="code-block">
    <span class="command">$ cd ~<br>$ ls -la</span>
  </div>
  <p><em>Hint: The <code>~</code> symbol represents your home directory.</em></p>
</div>
```

### Summary Section
```html
<div class="info-box">
  <h3>📝 Summary</h3>
  <p>In this lesson, you learned:</p>
  <ul>
    <li>How to use the <code>ls</code> command to list files</li>
    <li>The difference between regular and hidden files</li>
    <li>Common flags like <code>-a</code> and <code>-l</code></li>
  </ul>
  <p><strong>Next:</strong> In the next lesson, we'll explore file permissions and the <code>chmod</code> command.</p>
</div>
```

## Screenshot Integration Guidelines

- Use `<img>` tags with `src` pointing to the uploaded screenshot URL
- Always provide descriptive `alt` text
- Use the `class="screenshot"` for consistent styling
- For captions, use a `<div class="screenshot-container">` with a `<p class="screenshot-caption">` as shown in the examples
- **Always use 480x800 (portrait, mobile-optimized) images for screenshots and generated images.**

Example:
```html
<img src="https://api.themobileprof.com/uploads/screenshots/ls_command_example.png"
     alt="Terminal showing ls -la command output"
     class="screenshot"
     width="480" height="800">
```

## Content Enhancement Tips

- Use emojis for visual appeal (📚, 🖥️, 💡, ⚠️, 🎯, 📝)
- Use semantic headings (`<h2>`, `<h3>`, etc.) for structure
- Use lists (`<ul>`, `<ol>`) for steps and key points
- Use `<code>` for inline code and `<div class="code-block">` for code blocks
- Use `<strong>`, `<em>`, and `<kbd>` for emphasis and keyboard shortcuts
- Use `<div>`s with classes for info, warning, tip, and interactive boxes
- Avoid inline `<style>` or `<script>` unless absolutely necessary; rely on LMS or WYSIWYG editor's CSS/JS

## Accessibility

- All images must have `alt` text
- Use proper heading hierarchy
- Ensure color contrast is sufficient
- Avoid using color as the only means of conveying information

## Quality Checklist

Before finalizing content, ensure:

- [ ] All screenshots are properly linked and accessible
- [ ] Code examples are syntax-highlighted and accurate
- [ ] Content is mobile-responsive
- [ ] All links work correctly
- [ ] Images have proper alt text
- [ ] Content maintains factual accuracy
- [ ] Interactive elements function properly
- [ ] Text is readable on mobile devices
- [ ] Code blocks are properly formatted
- [ ] All sections have appropriate headings

---

**Note:**
> The agent should output only the content that would be pasted into a WYSIWYG editor (like TinyMCE), not a standalone HTML document. All examples above are meant to be HTML fragments, not full pages. 