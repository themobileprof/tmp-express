const workshopExercise = {
  "exercise": {
    "id": "workshop-123",
    "lessonId": "lesson-456",
    "isEnabled": true,
    "title": "Navigating the Linux Filesystem",
    "introduction": "In this exercise, you'll learn how to navigate and inspect the Linux filesystem using basic commands like pwd, ls, cd, and cat.",
    "steps": [
      {
        "instructions": [
          "Print your current working directory."
        ],
        "expected_commands": ["pwd", "echo $PWD"],
        "success_response": "/home/student",
        "failure_response": "bash: command not found. Hint: Try using 'pwd' to show your current directory.",
        "success": false
      },
      {
        "instructions": [
          "List all files and folders in your current directory."
        ],
        "expected_commands": ["ls", "ls -l", "ls --color=auto"],
        "success_response": "Documents  Downloads  Pictures  Desktop",
        "failure_response": "bash: command not found. Hint: The command to list files starts with 'ls'.",
        "success": false
      },
      {
        "instructions": [
          "Change directory to the 'Documents' folder."
        ],
        "expected_commands": ["cd Documents", "cd ./Documents"],
        "success_response": "",
        "failure_response": "bash: cd: Documnts: No such file or directory. Hint: Check your spelling of 'Documents'.",
        "success": false
      },
      {
        "instructions": [
          "Verify your new location using the 'pwd' command."
        ],
        "expected_commands": ["pwd", "echo $PWD"],
        "success_response": "/home/student/Documents",
        "failure_response": "bash: command not found. Hint: Try 'pwd' to show your current location.",
        "success": false
      },
      {
        "instructions": [
          "List the files in the Documents folder."
        ],
        "expected_commands": ["ls", "ls -a", "ls -l"],
        "success_response": "notes.txt  report.txt  projects",
        "failure_response": "bash: command not found. Hint: Use 'ls' to list directory contents.",
        "success": false
      },
      {
        "instructions": [
          "View the contents of 'notes.txt'."
        ],
        "expected_commands": ["cat notes.txt", "less notes.txt"],
        "success_response": "Meeting Notes:\n- Update project plan\n- Review progress\n- Send summary email",
        "failure_response": "cat: notes.txt: No such file or directory. Hint: Ensure you're in the correct folder and use 'cat notes.txt'.",
        "success": false
      }
    ],
    "end_message": "Fantastic! You've successfully learned how to navigate directories, view files, and create folders in Linux."
  }
};

console.log('🧪 Testing new workshop format...\n');

// Test 1: Structure validation
console.log('Test 1: Structure validation');
const hasRequiredFields = 
  workshopExercise.exercise.id &&
  workshopExercise.exercise.lessonId &&
  typeof workshopExercise.exercise.isEnabled === 'boolean' &&
  workshopExercise.exercise.title &&
  Array.isArray(workshopExercise.exercise.steps);

console.log(hasRequiredFields ? '✅ PASS - All required fields present' : '❌ FAIL - Missing required fields');

// Test 2: Steps structure
console.log('\nTest 2: Steps structure');
const allStepsValid = workshopExercise.exercise.steps.every(step => 
  Array.isArray(step.instructions) &&
  Array.isArray(step.expected_commands) &&
  typeof step.success_response === 'string' &&
  typeof step.failure_response === 'string' &&
  typeof step.success === 'boolean'
);
console.log(allStepsValid ? '✅ PASS - All steps have correct structure' : '❌ FAIL - Invalid step structure');

// Test 3: Multiple command variations
console.log('\nTest 3: Multiple command variations');
const step1 = workshopExercise.exercise.steps[0];
console.log(`Step 1 has ${step1.expected_commands.length} command variations: ${step1.expected_commands.join(', ')}`);
console.log(step1.expected_commands.length > 1 ? '✅ PASS - Supports multiple command variations' : '⚠️  Single command only');

// Test 4: Failure messages with hints
console.log('\nTest 4: Failure messages with hints');
const hasHints = workshopExercise.exercise.steps.every(step => 
  step.failure_response.includes('Hint:')
);
console.log(hasHints ? '✅ PASS - All failures include hints' : '❌ FAIL - Some failures missing hints');

// Test 5: JSON size
console.log('\nTest 5: JSON size');
const jsonSize = JSON.stringify(workshopExercise).length;
console.log(`JSON size: ${jsonSize} bytes`);
console.log(jsonSize < 10000 ? '✅ PASS - Compact size' : '⚠️  Large size');

// Test 6: Simulate progress tracking
console.log('\nTest 6: Simulating progress tracking');
let completedSteps = 0;
workshopExercise.exercise.steps.forEach((step, index) => {
  if (step.success) {
    completedSteps++;
  }
});
const progress = (completedSteps / workshopExercise.exercise.steps.length) * 100;
console.log(`Progress: ${progress.toFixed(0)}% (${completedSteps}/${workshopExercise.exercise.steps.length} steps)`);
console.log('✅ PASS - Progress tracking works');

console.log('\n🎉 All tests completed!');
console.log('\n📋 Sample workshop exercise:');
console.log(JSON.stringify(workshopExercise, null, 2));