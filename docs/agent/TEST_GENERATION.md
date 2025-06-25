# Test Generation Guidelines

This document provides comprehensive guidelines for generating tests and quizzes based on lesson content for TheMobileProf LMS.

## Test Structure

### Basic Test Information
- **Title**: Descriptive and specific to the lesson
- **Description**: Brief overview of what the test covers
- **Duration**: 15-30 minutes for most lessons
- **Passing Score**: 70% (configurable)
- **Question Count**: 5-10 questions per lesson
- **Question Types**: Mix of multiple choice, true/false, and scenario-based

## Question Types

### 1. Multiple Choice Questions
```json
{
  "type": "multiple_choice",
  "question": "What command is used to list files in Linux?",
  "options": [
    "ls",
    "dir", 
    "list",
    "show"
  ],
  "correct_answer": 0,
  "explanation": "The 'ls' command is used to list files and directories in Linux. 'dir' is a Windows command, while 'list' and 'show' are not valid Linux commands."
}
```

### 2. True/False Questions
```json
{
  "type": "true_false",
  "question": "Linux is an open-source operating system.",
  "correct_answer": true,
  "explanation": "Linux is indeed an open-source operating system based on the Linux kernel, which was created by Linus Torvalds in 1991."
}
```

### 3. Scenario-Based Questions
```json
{
  "type": "multiple_choice",
  "question": "You need to find all files with the .txt extension in the current directory. Which command should you use?",
  "options": [
    "ls *.txt",
    "find . -name '*.txt'",
    "grep .txt",
    "cat *.txt"
  ],
  "correct_answer": 1,
  "explanation": "The 'find . -name \"*.txt\"' command searches recursively from the current directory for all files ending with .txt. 'ls *.txt' only works if there are .txt files in the current directory."
}
```

## Question Generation Guidelines

### 1. Content Coverage
- **Core Concepts**: Test fundamental understanding
- **Practical Application**: Include real-world scenarios
- **Command Syntax**: Test proper command usage
- **Error Handling**: Include common mistakes and errors
- **Best Practices**: Test understanding of proper procedures

### 2. Difficulty Distribution
- **Easy (30%)**: Basic recall and recognition
- **Medium (50%)**: Application and understanding
- **Hard (20%)**: Analysis and synthesis

### 3. Question Quality Standards
- **Clarity**: Questions must be unambiguous
- **Accuracy**: All information must be factually correct
- **Relevance**: Questions should directly relate to lesson content
- **Balance**: Avoid bias toward any particular answer
- **Completeness**: Include all necessary context

## Content-Specific Question Examples

### Linux Fundamentals

#### File System Navigation
```json
{
  "type": "multiple_choice",
  "question": "What does the 'pwd' command display?",
  "options": [
    "The current working directory",
    "A list of files in the current directory",
    "The system's password file",
    "The process working directory"
  ],
  "correct_answer": 0,
  "explanation": "pwd stands for 'print working directory' and displays the full path of the current working directory."
}
```

#### File Operations
```json
{
  "type": "true_false",
  "question": "The 'rm' command can only delete files, not directories.",
  "correct_answer": false,
  "explanation": "The 'rm' command can delete both files and directories. Use 'rm -r' to delete directories recursively."
}
```

### System Administration

#### Process Management
```json
{
  "type": "multiple_choice",
  "question": "Which command shows real-time system processes?",
  "options": [
    "ps",
    "top",
    "htop",
    "All of the above"
  ],
  "correct_answer": 3,
  "explanation": "All three commands show processes. 'ps' shows a snapshot, while 'top' and 'htop' show real-time updates."
}
```

#### Package Management
```json
{
  "type": "scenario",
  "question": "You need to install a new software package on Ubuntu. The package is not available in the default repositories. What should you do first?",
  "options": [
    "Use 'apt install' with the package name",
    "Download and install the .deb file manually",
    "Add the appropriate PPA repository",
    "Use 'snap install' instead"
  ],
  "correct_answer": 2,
  "explanation": "Adding a PPA (Personal Package Archive) is the recommended approach for packages not in default repositories."
}
```

### Networking

#### Network Configuration
```json
{
  "type": "multiple_choice",
  "question": "Which command displays network interface information?",
  "options": [
    "netstat",
    "ifconfig",
    "ip addr",
    "All of the above"
  ],
  "correct_answer": 3,
  "explanation": "All three commands can display network interface information, though 'ifconfig' is deprecated in favor of 'ip' commands."
}
```

## Test Generation Process

### 1. Content Analysis
- Identify key concepts from the lesson
- Extract important commands and their syntax
- Note common mistakes and misconceptions
- Identify practical applications

### 2. Question Creation
- Create questions for each key concept
- Include practical scenarios
- Test both theoretical and practical knowledge
- Ensure questions are at appropriate difficulty levels

### 3. Answer Validation
- Verify all correct answers are accurate
- Ensure incorrect options are plausible
- Check that explanations are clear and helpful
- Test questions for ambiguity

### 4. Quality Review
- Review for clarity and accuracy
- Ensure proper difficulty distribution
- Check for cultural or regional bias
- Validate technical accuracy

## Question Templates

### Command Syntax Template
```json
{
  "type": "multiple_choice",
  "question": "What is the correct syntax for [command]?",
  "options": [
    "[correct_syntax]",
    "[incorrect_syntax_1]",
    "[incorrect_syntax_2]",
    "[incorrect_syntax_3]"
  ],
  "correct_answer": 0,
  "explanation": "[Detailed explanation of the correct syntax and why other options are wrong]"
}
```

### Concept Understanding Template
```json
{
  "type": "true_false",
  "question": "[Statement about concept]",
  "correct_answer": true/false,
  "explanation": "[Explanation of why the statement is true or false, including relevant details]"
}
```

### Practical Application Template
```json
{
  "type": "multiple_choice",
  "question": "In a real-world scenario where [situation], what would be the best approach?",
  "options": [
    "[best_approach]",
    "[acceptable_but_not_optimal]",
    "[incorrect_approach]",
    "[dangerous_approach]"
  ],
  "correct_answer": 0,
  "explanation": "[Explanation of why this is the best approach and the implications of other choices]"
}
```

## Test Upload Format

### Complete Test Structure
```json
{
  "course_id": 1,
  "lesson_id": 1,
  "title": "Lesson 1: Basic Linux Commands",
  "description": "Test your understanding of basic Linux file system commands including ls, pwd, cd, and file operations.",
  "duration": 20,
  "passing_score": 70,
  "is_published": true,
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What command lists files in a directory?",
      "options": ["ls", "dir", "list", "show"],
      "correct_answer": 0,
      "explanation": "The 'ls' command is the standard Linux command for listing files and directories."
    },
    {
      "type": "true_false",
      "question": "The 'cd' command can only navigate to existing directories.",
      "correct_answer": true,
      "explanation": "The 'cd' command requires the target directory to exist, otherwise it will return an error."
    }
  ]
}
```

## Quality Assurance Checklist

### Before Uploading Tests
- [ ] All questions are factually accurate
- [ ] Questions are clear and unambiguous
- [ ] Correct answers are properly marked
- [ ] Explanations are helpful and educational
- [ ] Difficulty levels are appropriate
- [ ] Questions cover the lesson content comprehensively
- [ ] No duplicate or very similar questions
- [ ] All options in multiple choice are plausible
- [ ] Test duration is reasonable
- [ ] Passing score is appropriate

### Content Validation
- [ ] Commands shown in questions work as described
- [ ] File paths and examples are realistic
- [ ] Error messages are accurate
- [ ] Explanations reference correct concepts
- [ ] No outdated information included

### Accessibility Considerations
- [ ] Questions are clear without visual aids
- [ ] Technical terms are explained when necessary
- [ ] No assumptions about user background
- [ ] Language is inclusive and professional

## Best Practices

1. **Variety**: Mix question types and difficulty levels
2. **Relevance**: Ensure all questions relate directly to lesson content
3. **Accuracy**: Double-check all technical information
4. **Clarity**: Write questions that are easy to understand
5. **Fairness**: Avoid trick questions or overly complex scenarios
6. **Educational Value**: Explanations should teach, not just state
7. **Consistency**: Use consistent terminology throughout
8. **Completeness**: Cover all major concepts from the lesson 