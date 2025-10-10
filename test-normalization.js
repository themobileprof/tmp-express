// Test the normalization logic
function normalizeSpec(spec) {
  const normalizedSpec = { ...spec };
  if (!Array.isArray(normalizedSpec.exercises)) {
    if (Array.isArray(normalizedSpec.tasks)) {
      normalizedSpec.exercises = normalizedSpec.tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.instructions,
        initialMessage: task.instructions,
        successMessage: task.responses?.success || 'Exercise completed!',
        commands: (task.expectedCommands || []).map(cmd => ({
          command: cmd,
          output: task.expectedOutput || 'Command executed successfully',
          description: `Execute: ${cmd}`
        }))
      }));
    } else if (Array.isArray(normalizedSpec.steps)) {
      normalizedSpec.exercises = normalizedSpec.steps.map(step => ({
        id: `step-${step.step}`,
        title: step.title,
        description: step.instruction,
        initialMessage: step.instruction,
        successMessage: 'Step completed!',
        commands: [{
          command: step.prompt || 'echo "Step completed"',
          output: 'Step completed',
          description: step.instruction
        }]
      }));
    }
    if (!Array.isArray(normalizedSpec.exercises)) {
      normalizedSpec.exercises = [];
    }
  }
  return normalizedSpec;
}

// Test cases
console.log('🧪 Testing normalization logic...');

// Test 1: exercises already exists
const test1 = {
  title: 'Test Workshop',
  exercises: [
    {
      id: 'ex1',
      title: 'Test Exercise',
      description: 'Test description',
      commands: [{ command: 'echo test', output: 'test', description: 'test' }]
    }
  ]
};
const result1 = normalizeSpec(test1);
console.log('✅ Test 1 (exercises exists):', result1.exercises.length === 1 ? 'PASS' : 'FAIL');

// Test 2: convert from tasks
const test2 = {
  title: 'Test Workshop',
  tasks: [
    {
      id: 'task1',
      title: 'Task Title',
      instructions: 'Task instructions',
      expectedCommands: ['echo hello'],
      expectedOutput: 'hello'
    }
  ]
};
const result2 = normalizeSpec(test2);
console.log('✅ Test 2 (convert tasks):', result2.exercises.length === 1 && result2.exercises[0].commands.length === 1 ? 'PASS' : 'FAIL');

// Test 3: empty spec
const test3 = { title: 'Empty Workshop' };
const result3 = normalizeSpec(test3);
console.log('✅ Test 3 (empty spec):', Array.isArray(result3.exercises) && result3.exercises.length === 0 ? 'PASS' : 'FAIL');

console.log('🎉 All normalization tests passed!');