# Termux Screenshot Generation Guidelines

This document provides detailed guidelines for creating Termux-style terminal screenshots that will be used in course content.

## Termux Visual Style

### Color Scheme
- **Background**: Dark gray/black (#1a1a1a or #000000)
- **Text**: Light green (#4CAF50) for commands and output
- **Prompt**: Green (#4CAF50) with `$` symbol
- **Error messages**: Red (#f44336)
- **Directory names**: Blue (#2196F3)
- **File names**: White (#ffffff)
- **Special characters**: Yellow (#FFC107)

### Font Requirements
- **Font Family**: Monospace (Courier New, Monaco, or similar)
- **Font Size**: 14-16px for readability
- **Line Height**: 1.4 for proper spacing
- **Font Weight**: Normal for regular text, Bold for commands

## Screenshot Types

### 1. Basic Command Examples
```
$ ls -la
total 32
drwxr-xr-x  5 user user 4096 Jan 15 10:30 .
drwxr-xr-x 20 user user 4096 Jan 15 10:30 ..
-rw-r--r--  1 user user  220 Jan 15 10:30 .bash_logout
-rw-r--r--  1 user user 3771 Jan 15 10:30 .bashrc
-rw-r--r--  1 user user  807 Jan 15 10:30 .profile
drwxr-xr-x  2 user user 4096 Jan 15 10:30 Documents
drwxr-xr-x  2 user user 4096 Jan 15 10:30 Downloads
```

### 2. Multi-Step Commands
```
$ pwd
/home/user
$ cd Documents
$ ls
file1.txt  file2.txt  project/
$ cd project
$ pwd
/home/user/Documents/project
```

### 3. Command with Error
```
$ rm nonexistent_file.txt
rm: cannot remove 'nonexistent_file.txt': No such file or directory
$ ls -la
total 8
drwxr-xr-x 2 user user 4096 Jan 15 10:30 .
drwxr-xr-x 5 user user 4096 Jan 15 10:30 ..
```

### 4. File Operations
```
$ touch newfile.txt
$ echo "Hello World" > newfile.txt
$ cat newfile.txt
Hello World
$ chmod +x newfile.txt
$ ls -la newfile.txt
-rwxr-xr-x 1 user user 12 Jan 15 10:30 newfile.txt
```

### 5. System Information
```
$ uname -a
Linux ubuntu 5.4.0-42-generic #46-Ubuntu SMP Fri Jul 10 00:24:02 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
$ whoami
user
$ hostname
ubuntu
```

## Screenshot Creation Guidelines

### 1. Terminal Window Setup
- **Width**: 480px (portrait, mobile-optimized)
- **Height**: 800px (portrait, mobile-optimized)
- **Padding**: 20px around content
- **Border**: Optional thin border (#333333)
- **Rounded corners**: 8px radius

> **Note:**
> Always prefer 480x800 (portrait) images for screenshots and generated images. This format is mobile-optimized, reduces cost, and improves user experience on mobile devices.

### 2. Content Layout
- **Left margin**: 20px for command prompt
- **Line spacing**: 1.4x line height
- **Command prompt**: Always start with `$` in green
- **Output**: Indent with 2-4 spaces from prompt
- **File paths**: Use realistic paths like `/home/user/` or `/var/log/`

### 3. Realistic Scenarios
- Use realistic file names and directories
- Include timestamps when relevant
- Show appropriate file permissions
- Use realistic user names (avoid "root" unless necessary)
- Include realistic file sizes

### 4. Error Handling Examples
- Show common error messages
- Demonstrate proper error recovery
- Include "command not found" scenarios
- Show permission denied errors

## Tools for Screenshot Generation

### 1. Terminal Emulator Setup
```bash
# Configure terminal colors
export PS1='\[\033[01;32m\]$\[\033[00m\] '
export TERM=xterm-256color

# Set background and text colors
echo -e "\033[40;32m"  # Black background, green text
```

### 2. Screenshot Tools
- **Linux**: `gnome-screenshot`, `scrot`, or `flameshot`
- **macOS**: `screencapture` or built-in screenshot tools
- **Windows**: `Snipping Tool` or `PrtScn`
- **Online**: Use terminal simulation websites

### 3. Post-Processing
- **Resize**: Maintain aspect ratio, optimize for web
- **Format**: PNG for quality, JPEG for smaller size
- **Compression**: Balance quality and file size
- **Naming**: Use descriptive names like `ls_command_example.png`

## Screenshot Templates

### Template 1: Basic Command
```
$ [command]
[output with proper formatting]
```

### Template 2: Multi-Command Sequence
```
$ [command1]
[output1]
$ [command2]
[output2]
$ [command3]
[output3]
```

### Template 3: Error and Recovery
```
$ [command_with_error]
[error_message]
$ [correct_command]
[successful_output]
```

### Template 4: File System Navigation
```
$ pwd
[current_directory]
$ ls -la
[directory_listing]
$ cd [directory]
$ pwd
[new_directory]
```

## Content-Specific Screenshots

### Linux Fundamentals
- File system navigation (`cd`, `ls`, `pwd`)
- File operations (`touch`, `cp`, `mv`, `rm`)
- File permissions (`chmod`, `chown`)
- Text processing (`cat`, `grep`, `sed`, `awk`)

### System Administration
- Process management (`ps`, `top`, `kill`)
- System information (`uname`, `whoami`, `hostname`)
- Package management (`apt`, `yum`, `dnf`)
- Service management (`systemctl`, `service`)

### Networking
- Network configuration (`ip`, `ifconfig`, `netstat`)
- Connectivity testing (`ping`, `traceroute`, `nslookup`)
- SSH connections (`ssh`, `scp`)
- Firewall management (`iptables`, `ufw`)

## Quality Standards

### Technical Requirements
- **Resolution**: Minimum 800x400px
- **Format**: PNG preferred, JPEG acceptable
- **File Size**: Under 500KB for web optimization
- **Color Accuracy**: Maintain Termux color scheme
- **Readability**: Text must be clear and legible

### Content Requirements
- **Accuracy**: Commands must work as shown
- **Realism**: Use realistic file names and paths
- **Completeness**: Show full command and output
- **Context**: Screenshots should match lesson content
- **Progression**: Show logical command sequences

### Accessibility
- **Alt Text**: Provide descriptive alt text
- **Contrast**: Ensure sufficient color contrast
- **Size**: Make text readable on mobile devices
- **Captions**: Include explanatory captions when needed

## File Naming Convention

Use descriptive, consistent naming:
```
[command]_[context]_[lesson_number].png

Examples:
ls_command_basic_01.png
file_permissions_chmod_02.png
network_ping_test_03.png
error_handling_rm_04.png
```

## Integration with HTML

### Basic Integration
```html
<img src="https://api.themobileprof.com/uploads/screenshots/ls_command_example.png" 
     alt="Terminal showing ls -la command output" 
     class="screenshot"
     width="480" height="800">
```

### With Caption
```html
<div class="screenshot-container">
    <img src="https://api.themobileprof.com/uploads/screenshots/ls_command_example.png" 
         alt="Terminal showing ls -la command output" 
         class="screenshot"
         width="480" height="800">
    <p class="screenshot-caption">
        <em>Figure 1: Using ls -la to list all files including hidden ones</em>
    </p>
</div>
```

### Responsive Image
```html
<img src="https://api.themobileprof.com/uploads/screenshots/ls_command_example.png" 
     alt="Terminal showing ls -la command output" 
     class="screenshot"
     width="480" height="800"
     loading="lazy">
```

## Best Practices

1. **Consistency**: Use same terminal style across all screenshots
2. **Clarity**: Ensure commands and output are clearly visible
3. **Relevance**: Screenshots should directly relate to lesson content
4. **Progression**: Show logical progression from simple to complex
5. **Realism**: Use realistic scenarios and file names
6. **Accessibility**: Provide proper alt text and captions
7. **Optimization**: Balance quality and file size
8. **Organization**: Use consistent naming and organization 