// app.js
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { table } = require('table');
const asciichart = require('asciichart');
const regression = require('regression');

// --- Single File Path for All Data ---
const dataPath = path.join(__dirname, 'workoutData.json');

// --- Ensure Data File Exists ---
function ensureDataFile() {
  const defaultData = {
    exercises: [],
    workoutDays: [],
    workoutLogs: [],
    weightLog: []
  };
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
}
ensureDataFile();

// --- Data Cache ---
let dataCache = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// --- Utility Functions ---
function saveJSON() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(dataCache, null, 2));
  } catch (err) {
    console.error(chalk.red(`Error saving data: ${err}`));
  }
}

async function pause() {
  await inquirer.prompt({ type: 'input', name: 'pause', message: chalk.cyan('Press Enter to continue...') });
}

// --- Edit Exercises Functions ---
async function editExercises() {
  console.clear();
  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: chalk.blue.bold('=== Edit Exercises ==='),
    choices: ['Add New Exercise', 'Edit Existing Exercise', 'Delete Exercise', 'Back']
  });
  if (action === 'Add New Exercise') await addNewExercise();
  else if (action === 'Edit Existing Exercise') await chooseExerciseToEdit();
  else if (action === 'Delete Exercise') await deleteExercise();
}

async function addNewExercise() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'name', message: chalk.cyan('Enter the name of the new exercise (e.g., Bench Press):') },
    { type: 'input', name: 'bodyPart', message: chalk.cyan('Enter the body part (e.g., Chest):') },
    { type: 'input', name: 'setsRange', message: chalk.cyan('Enter the min-max sets range (e.g., 3-5):') },
    { type: 'input', name: 'repsRange', message: chalk.cyan('Enter the min-max reps range (e.g., 5-10):') },
    { type: 'input', name: 'weightIncrement', message: chalk.cyan('Enter the weight increment (e.g., 2.5):') }
  ]);
  const [minSets, maxSets] = answers.setsRange.split('-').map(Number);
  const [minReps, maxReps] = answers.repsRange.split('-').map(Number);
  const weightIncrement = parseFloat(answers.weightIncrement);
  if (isNaN(minSets) || isNaN(maxSets) || minSets > maxSets || minSets < 1) {
    console.log(chalk.red('Invalid sets range. Min must be <= max and both must be positive integers.'));
    await pause();
    return;
  }
  if (isNaN(minReps) || isNaN(maxReps) || minReps > maxReps || minReps < 1) {
    console.log(chalk.red('Invalid reps range. Min must be <= max and both must be positive integers.'));
    await pause();
    return;
  }
  if (isNaN(weightIncrement) || weightIncrement <= 0) {
    console.log(chalk.red('Weight increment must be a positive number.'));
    await pause();
    return;
  }
  const newExercise = { name: answers.name, bodyPart: answers.bodyPart, setsRange: [minSets, maxSets], repsRange: [minReps, maxReps], weightIncrement };
  dataCache.exercises.push(newExercise);
  dataCache.exercises.sort((a, b) => a.name.localeCompare(b.name));
  saveJSON();
  console.log(chalk.green(`"${answers.name}" added successfully.`));
  await pause();
}

async function chooseExerciseToEdit() {
  if (dataCache.exercises.length === 0) {
    console.log(chalk.red('No exercises found.'));
    await pause();
    return;
  }
  const { selectedExercise } = await inquirer.prompt({
    type: 'list',
    name: 'selectedExercise',
    message: chalk.blue.bold('Select an exercise to edit:'),
    choices: dataCache.exercises.map(ex => ex.name).concat(['Cancel'])
  });
  if (selectedExercise === 'Cancel') return;
  const exercise = dataCache.exercises.find(ex => ex.name === selectedExercise);
  await editExistingExercise(exercise);
  saveJSON();
  await pause();
}

async function editExistingExercise(exercise) {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'bodyPart', message: chalk.cyan(`Enter new body part (current: ${exercise.bodyPart}):`), default: exercise.bodyPart },
    { type: 'input', name: 'setsRange', message: chalk.cyan(`Enter new sets range (current: ${exercise.setsRange.join('-')}):`), default: exercise.setsRange.join('-') },
    { type: 'input', name: 'repsRange', message: chalk.cyan(`Enter new reps range (current: ${exercise.repsRange.join('-')}):`), default: exercise.repsRange.join('-') }
  ]);
  const [minSets, maxSets] = answers.setsRange.split('-').map(Number);
  const [minReps, maxReps] = answers.repsRange.split('-').map(Number);
  if (isNaN(minSets) || isNaN(maxSets) || minSets > maxSets || minSets < 1) {
    console.log(chalk.red('Invalid sets range.'));
    await pause();
    return;
  }
  if (isNaN(minReps) || isNaN(maxReps) || minReps > maxReps || minReps < 1) {
    console.log(chalk.red('Invalid reps range.'));
    await pause();
    return;
  }
  const { confirm } = await inquirer.prompt({ type: 'confirm', name: 'confirm', message: chalk.cyan(`Update "${exercise.name}"?`) });
  if (!confirm) {
    console.log(chalk.yellow('Update canceled.'));
    return;
  }
  exercise.bodyPart = answers.bodyPart;
  exercise.setsRange = [minSets, maxSets];
  exercise.repsRange = [minReps, maxReps];
  console.log(chalk.green(`"${exercise.name}" updated.`));
}

async function deleteExercise() {
  if (dataCache.exercises.length === 0) {
    console.log(chalk.red('No exercises to delete.'));
    await pause();
    return;
  }
  const { exName } = await inquirer.prompt({
    type: 'list',
    name: 'exName',
    message: chalk.blue.bold('Select an exercise to delete:'),
    choices: dataCache.exercises.map(ex => ex.name).concat(['Cancel'])
  });
  if (exName === 'Cancel') return;
  const { confirm } = await inquirer.prompt({ type: 'confirm', name: 'confirm', message: chalk.red(`Delete "${exName}"? This cannot be undone.`) });
  if (confirm) {
    dataCache.exercises = dataCache.exercises.filter(ex => ex.name !== exName);
    saveJSON();
    console.log(chalk.green(`"${exName}" deleted.`));
  } else {
    console.log(chalk.yellow('Deletion canceled.'));
  }
  await pause();
}

// --- Edit Workout Days Functions ---
async function editWorkoutDays() {
  console.clear();
  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: chalk.blue.bold('=== Edit Workout Days ==='),
    choices: ['Add New Workout Day', 'Edit Existing Workout Day', 'Delete Workout Day', 'Back']
  });
  if (action === 'Add New Workout Day') await addNewWorkoutDay();
  else if (action === 'Edit Existing Workout Day') await chooseWorkoutDayToEdit();
  else if (action === 'Delete Workout Day') await deleteWorkoutDay();
}

async function addNewWorkoutDay() {
  const { dayName } = await inquirer.prompt({ type: 'input', name: 'dayName', message: chalk.cyan('Enter the name of the new workout day (e.g., Push Day):') });
  const exerciseChoices = dataCache.exercises.map(ex => ex.name);
  if (exerciseChoices.length === 0) {
    console.log(chalk.red('No exercises available. Please add exercises first.'));
    await pause();
    return;
  }
  const { selectedExercises } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedExercises',
    message: chalk.cyan('Select exercises for this day:'),
    choices: exerciseChoices
  });
  if (selectedExercises.length === 0) {
    console.log(chalk.yellow('No exercises selected. Workout day not added.'));
    await pause();
    return;
  }
  const newDay = { dayName, exercises: selectedExercises };
  dataCache.workoutDays.push(newDay);
  dataCache.workoutDays.sort((a, b) => a.dayName.localeCompare(b.dayName));
  saveJSON();
  console.log(chalk.green(`"${dayName}" added successfully.`));
  await pause();
}

async function chooseWorkoutDayToEdit() {
  if (dataCache.workoutDays.length === 0) {
    console.log(chalk.red('No workout days found.'));
    await pause();
    return;
  }
  const { selectedDay } = await inquirer.prompt({
    type: 'list',
    name: 'selectedDay',
    message: chalk.blue.bold('Select a workout day to edit:'),
    choices: dataCache.workoutDays.map(day => day.dayName).concat(['Cancel'])
  });
  if (selectedDay === 'Cancel') return;
  const day = dataCache.workoutDays.find(d => d.dayName === selectedDay);
  await editExistingWorkoutDay(day);
  saveJSON();
  await pause();
}

async function editExistingWorkoutDay(day) {
  const { dayName } = await inquirer.prompt({ type: 'input', name: 'dayName', message: chalk.cyan(`Enter new name (current: ${day.dayName}):`), default: day.dayName });
  const exerciseChoices = dataCache.exercises.map(ex => ex.name);
  const { selectedExercises } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedExercises',
    message: chalk.cyan('Select exercises for this day:'),
    choices: exerciseChoices,
    default: day.exercises
  });
  if (selectedExercises.length === 0) {
    console.log(chalk.yellow('No exercises selected. Workout day not updated.'));
    await pause();
    return;
  }
  const { confirm } = await inquirer.prompt({ type: 'confirm', name: 'confirm', message: chalk.cyan(`Update "${day.dayName}"?`) });
  if (!confirm) {
    console.log(chalk.yellow('Update canceled.'));
    return;
  }
  day.dayName = dayName;
  day.exercises = selectedExercises;
  console.log(chalk.green('Workout day updated.'));
}

async function deleteWorkoutDay() {
  if (dataCache.workoutDays.length === 0) {
    console.log(chalk.red('No workout days to delete.'));
    await pause();
    return;
  }
  const { dayName } = await inquirer.prompt({
    type: 'list',
    name: 'dayName',
    message: chalk.blue.bold('Select a workout day to delete:'),
    choices: dataCache.workoutDays.map(day => day.dayName).concat(['Cancel'])
  });
  if (dayName === 'Cancel') return;
  const { confirm } = await inquirer.prompt({ type: 'confirm', name: 'confirm', message: chalk.red(`Delete "${dayName}"? This cannot be undone.`) });
  if (confirm) {
    dataCache.workoutDays = dataCache.workoutDays.filter(day => day.dayName !== dayName);
    saveJSON();
    console.log(chalk.green(`"${dayName}" deleted.`));
  } else {
    console.log(chalk.yellow('Deletion canceled.'));
  }
  await pause();
}

// --- Future Workout Functions ---
async function futureWorkout() {
  console.clear();
  if (dataCache.exercises.length === 0) {
    console.log(chalk.red('No exercises found. Please add exercises first.'));
    await pause();
    return;
  }
  const grouped = groupExercises(dataCache.exercises);
  const bodyParts = Object.keys(grouped);
  const { selectedBP } = await inquirer.prompt({
    type: 'list',
    name: 'selectedBP',
    message: chalk.blue.bold('Select a body part:'),
    choices: bodyParts.concat(['Cancel'])
  });
  if (selectedBP === 'Cancel') return;
  const exercisesList = grouped[selectedBP];
  const { selectedExercise } = await inquirer.prompt({
    type: 'list',
    name: 'selectedExercise',
    message: chalk.blue.bold('Select an exercise:'),
    choices: exercisesList.map(ex => ex.name).concat(['Cancel'])
  });
  if (selectedExercise === 'Cancel') return;
  const exercise = exercisesList.find(ex => ex.name === selectedExercise);
  const { calcMethod } = await inquirer.prompt({
    type: 'list',
    name: 'calcMethod',
    message: chalk.blue.bold(`Calculate workout for "${exercise.name}"`),
    choices: ['Automatic (based on previous data)', 'Custom parameters', 'Cancel']
  });
  if (calcMethod === 'Cancel') return;
  if (calcMethod === 'Automatic (based on previous data)') {
    await generateAutomaticWorkout(exercise);
  } else {
    await askCustomParameters(exercise);
  }
  await pause();
}

async function generateAutomaticWorkout(exercise) {
  const logs = dataCache.workoutLogs.filter(log => log.exercise === exercise.name);
  if (logs.length === 0) {
    console.log(chalk.red('No previous data found for this exercise.'));
    return;
  }
  const recentLogs = logs.slice(-5);
  let currentOneRM;
  if (recentLogs.length < 2) {
    currentOneRM = recentLogs[0].calculatedOneRM;
  } else {
    const data = recentLogs.map((log, i) => [i, log.calculatedOneRM]);
    const result = regression.linear(data);
    const nextIndex = recentLogs.length;
    currentOneRM = result.predict(nextIndex)[1];
    const slope = result.equation[0];
    if (slope > 0) console.log(chalk.cyan('Your 1RM is trending upwards. Keep up the good work!'));
    else if (slope < 0) console.log(chalk.yellow('Your 1RM is trending downwards. Consider adjusting your training.'));
    else console.log(chalk.cyan('Your 1RM is stable.'));
  }
  const lastLog = logs[logs.length - 1];
  await generateWorkoutTable(exercise, lastLog.weight, currentOneRM);
}

async function askCustomParameters(exercise) {
  const { currentOneRM } = await inquirer.prompt({ type: 'input', name: 'currentOneRM', message: chalk.cyan('Enter your current 1RM (kg):') });
  const current = parseFloat(currentOneRM);
  if (isNaN(current)) {
    console.log(chalk.red('Invalid input.'));
    return;
  }
  const { desiredWeight } = await inquirer.prompt({ type: 'input', name: 'desiredWeight', message: chalk.cyan('Enter your desired weight to lift (kg):') });
  const desired = parseFloat(desiredWeight);
  if (isNaN(desired)) {
    console.log(chalk.red('Invalid input.'));
    return;
  }
  await generateWorkoutTable(exercise, desired, current);
}

async function generateWorkoutTable(exercise, baseWeight, currentOneRM) {
  const increment = exercise.weightIncrement || 2.5;
  const startWeight = baseWeight * 0.7;
  const endWeight = baseWeight * 1.3;
  let results = [];
  for (let weight = startWeight; weight <= endWeight; weight += increment) {
    for (let sets = exercise.setsRange[0]; sets <= exercise.setsRange[1]; sets++) {
      for (let reps = exercise.repsRange[0]; reps <= exercise.repsRange[1]; reps++) {
        const increaseFactor = 1 + (sets - 1) * 0.025;
        const estimatedOneRM = weight * (1 + 0.025 * reps) * increaseFactor;
        if (estimatedOneRM > currentOneRM && estimatedOneRM < currentOneRM * 1.1) {
          results.push({ sets, reps, weight, estimatedOneRM });
        }
      }
    }
  }
  if (results.length === 0) {
    console.log(chalk.red("No workout suggestions found."));
    return;
  }
  results.sort((a, b) => a.estimatedOneRM - b.estimatedOneRM);
  const limited = results.slice(0, 5);
  const data = limited.map((r, i) => [i + 1, r.sets, r.reps, r.weight.toFixed(2), r.estimatedOneRM.toFixed(2)]);
  data.unshift(['#', 'Sets', 'Reps', 'Weight', 'Estimated 1RM']);
  console.log(table(data));
  const { selection } = await inquirer.prompt({ type: 'input', name: 'selection', message: chalk.cyan('Select a combination by entering the row number:') });
  const selIndex = parseInt(selection, 10) - 1;
  if (isNaN(selIndex) || selIndex < 0 || selIndex >= limited.length) {
    console.log(chalk.red('Invalid selection.'));
    return;
  }
  const selectedWorkout = limited[selIndex];
  console.log(chalk.green(`Selected workout for ${exercise.name}: Sets: ${selectedWorkout.sets}, Reps: ${selectedWorkout.reps}, Weight: ${selectedWorkout.weight.toFixed(2)} kg, Estimated 1RM: ${selectedWorkout.estimatedOneRM.toFixed(2)} kg`));
}

// --- Log Workout Day Functions ---
async function logWorkoutDay() {
  console.clear();
  if (dataCache.workoutDays.length === 0) {
    console.log(chalk.red('No workout days found. Please add workout days first.'));
    await pause();
    return;
  }
  const { selectedDay } = await inquirer.prompt({
    type: 'list',
    name: 'selectedDay',
    message: chalk.blue.bold('Select a workout day:'),
    choices: dataCache.workoutDays.map(day => day.dayName).concat(['Cancel'])
  });
  if (selectedDay === 'Cancel') return;
  const day = dataCache.workoutDays.find(d => d.dayName === selectedDay);
  let finalPlan = [];
  for (const exName of day.exercises) {
    const exercise = dataCache.exercises.find(ex => ex.name === exName);
    if (exercise) {
      const logEntry = await logSingleExercise(exercise);
      if (logEntry) finalPlan.push(logEntry);
    }
  }
  if (finalPlan.length > 0) {
    displayFinalWorkoutPlan(finalPlan);
  } else {
    console.log(chalk.yellow("No workouts logged."));
  }
  await pause();
}

async function logSingleExercise(exercise) {
  const { weightUsed } = await inquirer.prompt({ type: 'input', name: 'weightUsed', message: chalk.cyan(`Enter the weight used for ${exercise.name} (or 0 to skip):`) });
  const weightVal = parseFloat(weightUsed);
  if (weightVal === 0) return null;
  if (isNaN(weightVal)) {
    console.log(chalk.red('Invalid weight input.'));
    return await logSingleExercise(exercise);
  }
  const { targetReps } = await inquirer.prompt({ type: 'input', name: 'targetReps', message: chalk.cyan('Target reps per set:') });
  const repsVal = parseInt(targetReps, 10);
  if (isNaN(repsVal) || repsVal < 1) {
    console.log(chalk.red('Invalid reps input. Must be a positive integer.'));
    return await logSingleExercise(exercise);
  }
  const { completedSets } = await inquirer.prompt({ type: 'input', name: 'completedSets', message: chalk.cyan('Number of completed sets:') });
  const setsVal = parseInt(completedSets, 10);
  if (isNaN(setsVal) || setsVal < 1) {
    console.log(chalk.red('Invalid sets input. Must be a positive integer.'));
    return await logSingleExercise(exercise);
  }
  const { failed } = await inquirer.prompt({ type: 'confirm', name: 'failed', message: chalk.cyan('Did you fail on an additional set?') });
  let failedRep = 0;
  if (failed) {
    const { repFail } = await inquirer.prompt({ type: 'input', name: 'repFail', message: chalk.cyan('At what rep did you fail on the last set?') });
    failedRep = parseInt(repFail, 10);
    if (isNaN(failedRep) || failedRep < 1) {
      console.log(chalk.red('Invalid rep input.'));
      return await logSingleExercise(exercise);
    }
  }
  const estimatedOneRM = calculateOneRM(weightVal, repsVal, setsVal, failedRep);
  const logEntry = createLogEntry(exercise.name, weightVal, repsVal, setsVal, failedRep, estimatedOneRM);
  appendToLogFile(logEntry);
  console.log(chalk.green(`Workout logged for ${exercise.name}.`));
  return logEntry;
}

function calculateOneRM(weightUsed, targetReps, completedSets, failedRep = 0) {
  const C = weightUsed * (1 + 0.025 * targetReps) * (1 + 0.025 * (completedSets - 1));
  if (failedRep > 0) {
    const F = weightUsed * (1 + 0.025 * targetReps) * (1 + 0.025 * completedSets);
    return C + ((failedRep / targetReps) * (F - C));
  }
  return C;
}

function createLogEntry(exerciseName, weightUsed, targetReps, completedSets, failedRep, estimatedOneRM) {
  return {
    date: new Date().toISOString().slice(0, 10),
    exercise: exerciseName,
    completedSets,
    failedRep,
    targetReps,
    weight: weightUsed,
    calculatedOneRM: Number(estimatedOneRM.toFixed(2))
  };
}

function appendToLogFile(entry) {
  dataCache.workoutLogs.push(entry);
  dataCache.workoutLogs.sort((a, b) => a.exercise.localeCompare(b.exercise));
  saveJSON();
}

function displayFinalWorkoutPlan(plan) {
  const headers = [chalk.yellow('Exercise'), chalk.yellow('Sets'), chalk.yellow('Reps'), chalk.yellow('Weight'), chalk.yellow('Estimated 1RM')];
  const rows = plan.map(entry => [entry.exercise, entry.completedSets, entry.targetReps, entry.weight.toFixed(2), entry.calculatedOneRM.toFixed(2)]);
  rows.unshift(headers);
  console.log(table(rows));
}

// --- Single Exercise Operations (Log Completed Workout) ---
async function logCompletedWorkout() {
  console.clear();
  if (dataCache.exercises.length === 0) {
    console.log(chalk.red('No exercises found. Please add exercises first.'));
    await pause();
    return;
  }
  const grouped = groupExercises(dataCache.exercises);
  const bodyParts = Object.keys(grouped);
  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
    message: chalk.blue.bold('Select a body part or Full Exercise List:'),
    choices: bodyParts.concat(['Full Exercise List', 'Cancel'])
  });
  if (choice === 'Cancel') return;
  let selectedExercise;
  if (choice === 'Full Exercise List') {
    const { exName } = await inquirer.prompt({
      type: 'list',
      name: 'exName',
      message: chalk.blue.bold('Select an exercise:'),
      choices: dataCache.exercises.map(ex => ex.name).concat(['Cancel'])
    });
    if (exName === 'Cancel') return;
    selectedExercise = dataCache.exercises.find(ex => ex.name === exName);
  } else {
    const { exName } = await inquirer.prompt({
      type: 'list',
      name: 'exName',
      message: chalk.blue.bold(`Select an exercise for ${choice}:`),
      choices: grouped[choice].map(ex => ex.name).concat(['Cancel'])
    });
    if (exName === 'Cancel') return;
    selectedExercise = grouped[choice].find(ex => ex.name === exName);
  }
  if (!selectedExercise) {
    console.log(chalk.red('Invalid selection.'));
    return;
  }
  await proceedWithWorkoutDetails(selectedExercise.name);
}

async function proceedWithWorkoutDetails(exerciseName) {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'weightUsed', message: chalk.cyan('Enter the weight used (in kg):') },
    { type: 'input', name: 'targetReps', message: chalk.cyan('Target reps per set:') },
    { type: 'input', name: 'completedSets', message: chalk.cyan('Number of completed sets:') },
    { type: 'confirm', name: 'failed', message: chalk.cyan('Did you fail on an additional set?') }
  ]);
  let failedRep = 0;
  if (answers.failed) {
    const { repFail } = await inquirer.prompt({ type: 'input', name: 'repFail', message: chalk.cyan('At what rep did you fail?') });
    failedRep = parseInt(repFail, 10);
    if (isNaN(failedRep) || failedRep < 1) {
      console.log(chalk.red('Invalid rep input.'));
      return await proceedWithWorkoutDetails(exerciseName);
    }
  }
  const weightUsed = parseFloat(answers.weightUsed);
  const targetReps = parseInt(answers.targetReps, 10);
  const completedSets = parseInt(answers.completedSets, 10);
  if (isNaN(weightUsed) || isNaN(targetReps) || isNaN(completedSets) || targetReps < 1 || completedSets < 1) {
    console.log(chalk.red('Invalid input(s).'));
    return await proceedWithWorkoutDetails(exerciseName);
  }
  const estimatedOneRM = calculateOneRM(weightUsed, targetReps, completedSets, failedRep);
  const entry = createLogEntry(exerciseName, weightUsed, targetReps, completedSets, failedRep, estimatedOneRM);
  appendToLogFile(entry);
  console.log(chalk.green('Workout logged successfully.'));
  await pause();
}

// --- View Workout Log Functions ---
async function viewWorkoutLog() {
  console.clear();
  if (dataCache.exercises.length === 0) {
    console.log(chalk.red('No exercises found.'));
    await pause();
    return;
  }
  const grouped = groupExercises(dataCache.exercises);
  const bodyParts = Object.keys(grouped);
  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
    message: chalk.blue.bold('Select a body part or Full Log:'),
    choices: bodyParts.concat(['Full Log', 'Cancel'])
  });
  if (choice === 'Cancel') return;
  if (choice === 'Full Log') {
    await displayFullLog();
  } else {
    await displayLogForBodyPart(choice, grouped);
  }
  await pause();
}

async function displayLogForBodyPart(bodyPart, grouped) {
  const { exName } = await inquirer.prompt({
    type: 'list',
    name: 'exName',
    message: chalk.blue.bold(`Select an exercise for ${bodyPart}:`),
    choices: grouped[bodyPart].map(ex => ex.name).concat(['Cancel'])
  });
  if (exName === 'Cancel') return;
  await displayLogForExercise(exName);
}

async function displayLogForExercise(exerciseName) {
  const filtered = dataCache.workoutLogs.filter(log => log.exercise === exerciseName);
  if (filtered.length === 0) {
    console.log(chalk.red(`No logs found for ${exerciseName}.`));
    return;
  }
  displayLogs(filtered);
}

async function displayFullLog() {
  if (dataCache.workoutLogs.length === 0) {
    console.log(chalk.red('No workout logs found.'));
    return;
  }
  displayLogs(dataCache.workoutLogs);
}

function displayLogs(logs) {
  const headers = [chalk.yellow('Date'), chalk.yellow('Exercise'), chalk.yellow('Sets'), chalk.yellow('Reps'), chalk.yellow('Weight (kg)'), chalk.yellow('Calculated 1RM (kg)')];
  const rows = logs.map(log => {
    const setsDisplay = log.failedRep > 0 ? `${log.completedSets} (failed on rep ${log.failedRep})` : log.completedSets;
    return [log.date, log.exercise, setsDisplay, log.targetReps, log.weight, log.calculatedOneRM];
  });
  rows.unshift(headers);
  console.log(table(rows));
}

// --- Weight Tracking Functions ---
async function logWeight() {
  const { weight } = await inquirer.prompt({ type: 'input', name: 'weight', message: chalk.cyan('Enter your weight in kg:') });
  const weightVal = parseFloat(weight);
  if (isNaN(weightVal) || weightVal <= 0) {
    console.log(chalk.red('Invalid weight. Must be a positive number.'));
    return;
  }
  dataCache.weightLog.push({ date: new Date().toISOString().slice(0, 10), weight: weightVal });
  saveJSON();
  console.log(chalk.green('Weight logged successfully.'));
  await pause();
}

function trackWeight() {
  if (dataCache.weightLog.length < 2) {
    console.log(chalk.red('Not enough data for graph. Please log at least two weight entries.'));
    return;
  }
  dataCache.weightLog.sort((a, b) => new Date(a.date) - new Date(b.date));
  const weights = dataCache.weightLog.map(entry => entry.weight);
  console.log(chalk.blue('Weight over time:'));
  console.log(asciichart.plot(weights, { height: 10 }));
}

// --- Help Function ---
async function showHelp() {
  console.clear();
  console.log(chalk.blue.bold('=== Help ==='));
  console.log(chalk.cyan('This app helps you track your workouts, log exercises, and plan future progress.'));
  console.log(chalk.cyan('- Use "Edit Exercises" to add, edit, or delete exercises.'));
  console.log(chalk.cyan('- Use "Edit Workout Days" to manage your workout routines.'));
  console.log(chalk.cyan('- Use "Future Workout Calculation" to plan your next workout based on past performance.'));
  console.log(chalk.cyan('- Use "Log Completed Workout" to record your exercises.'));
  console.log(chalk.cyan('- Use "View Workout Log" to see your progress.'));
  console.log(chalk.cyan('- Use "Track Weight" to log and view your body weight over time.'));
  await pause();
}

// --- Main Menu and Submenus ---
async function mainMenu() {
  let exit = false;
  while (!exit) {
    console.clear();
    const { choice } = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: chalk.blue.bold('==== Workout Tracker ====\nSelect an option:'),
      choices: [
        'Single Exercise Operations',
        'Workout Day Operations',
        'View Workout Log',
        'Edit Exercises / Workout Days',
        'Track Weight',
        'Future Workout Calculation',
        'Help',
        'Exit'
      ]
    });
    switch (choice) {
      case 'Single Exercise Operations':
        await singleExerciseOperations();
        break;
      case 'Workout Day Operations':
        await workoutDayOperations();
        break;
      case 'View Workout Log':
        await viewWorkoutLog();
        break;
      case 'Edit Exercises / Workout Days':
        await editMenu();
        break;
      case 'Track Weight':
        await weightMenu();
        break;
      case 'Future Workout Calculation':
        await futureWorkout();
        break;
      case 'Help':
        await showHelp();
        break;
      case 'Exit':
        exit = true;
        break;
    }
  }
  console.log(chalk.blue('Goodbye!'));
}

async function singleExerciseOperations() {
  console.clear();
  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: chalk.blue.bold('=== Single Exercise Operations ==='),
    choices: ['Calculate Future Workout (Single Exercise)', 'Log Completed Workout (Single Exercise)', 'Back']
  });
  if (action === 'Calculate Future Workout (Single Exercise)') await futureWorkout();
  else if (action === 'Log Completed Workout (Single Exercise)') await logCompletedWorkout();
}

async function workoutDayOperations() {
  console.clear();
  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: chalk.blue.bold('=== Workout Day Operations ==='),
    choices: ['Log Workout Day', 'Back']
  });
  if (action === 'Log Workout Day') await logWorkoutDay();
}

async function editMenu() {
  console.clear();
  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: chalk.blue.bold('=== Edit Menu ==='),
    choices: ['Edit Exercises', 'Edit Workout Days', 'Back']
  });
  if (action === 'Edit Exercises') await editExercises();
  else if (action === 'Edit Workout Days') await editWorkoutDays();
}

async function weightMenu() {
  console.clear();
  const { action } = await inquirer.prompt({
    type: 'list',
    name: 'action',
    message: chalk.blue.bold('=== Weight Tracking ==='),
    choices: ['Log Weight', 'Track Weight', 'Back']
  });
  if (action === 'Log Weight') await logWeight();
  else if (action === 'Track Weight') {
    trackWeight();
    await pause();
  }
}

// --- Utility Function for Grouping Exercises ---
function groupExercises(exercises) {
  return exercises.reduce((groups, exercise) => {
    const part = exercise.bodyPart || 'Other';
    groups[part] = groups[part] || [];
    groups[part].push(exercise);
    return groups;
  }, {});
}

// --- Start the Application ---
mainMenu();

// --- Unit Tests (Uncomment to run) ---
// function testCalculateOneRM() {
//   const result = calculateOneRM(100, 5, 3, 0);
//   console.assert(Math.abs(result - 125) < 0.01, 'Test failed: calculateOneRM');
//   console.log('Test passed: calculateOneRM');
// }
// testCalculateOneRM();