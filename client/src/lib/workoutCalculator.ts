/**
 * Calculates the estimated one-rep max (1RM) based on workout performance
 */
export function calculateOneRM(
  weight: number,
  targetReps: number,
  completedSets: number,
  failedRep: number = 0
): number {
  const C = weight * (1 + 0.025 * targetReps) * (1 + 0.025 * (completedSets - 1));
  if (failedRep > 0) {
    const F = weight * (1 + 0.025 * targetReps) * (1 + 0.025 * completedSets);
    return C + ((failedRep / targetReps) * (F - C));
  }
  return C;
}

export interface WorkoutSuggestion {
  sets: number;
  reps: number;
  weight: number;
  estimatedOneRM: number;
}

const STARTING_WEIGHTS = {
  "Barbell": 20,
  "EZ Bar": 12,
  "Dumbbell": 2.5,
  "Smith Machine": 15,
  "Custom": 0
} as const;

/**
 * Generates workout suggestions based on current 1RM and exercise parameters
 */
export function generateWorkoutSuggestions(
  currentOneRM: number,
  exercise: {
    setsRange: [number, number];
    repsRange: [number, number];
    weightIncrement: number;
    startingWeightType: keyof typeof STARTING_WEIGHTS;
    customStartingWeight?: number;
  }
): WorkoutSuggestion[] {
  console.log('Starting calculation with increment:', exercise.weightIncrement);

  // Determine minimum weight based on equipment type
  const minWeight = exercise.startingWeightType === "Custom" 
    ? exercise.customStartingWeight || 0
    : STARTING_WEIGHTS[exercise.startingWeightType];

  const startWeight = Math.max(currentOneRM * 0.7, minWeight);  // Start at 70% of 1RM or minimum weight
  const endWeight = currentOneRM * 1.3;    // Go up to 130% of 1RM
  const results: WorkoutSuggestion[] = [];

  console.log('Calculation parameters:', {
    currentOneRM,
    minWeight,
    startWeight,
    endWeight,
    setsRange: exercise.setsRange,
    repsRange: exercise.repsRange,
    weightIncrement: exercise.weightIncrement
  });

  // Generate all possible combinations
  for (
    let weight = startWeight;
    weight <= endWeight;
    weight += exercise.weightIncrement
  ) {
    for (
      let sets = exercise.setsRange[0];
      sets <= exercise.setsRange[1];
      sets++
    ) {
      for (
        let reps = exercise.repsRange[0];
        reps <= exercise.repsRange[1];
        reps++
      ) {
        const increaseFactor = 1 + (sets - 1) * 0.025;
        const estimatedOneRM = weight * (1 + 0.025 * reps) * increaseFactor;

        // Only include suggestions that lead to progressive overload
        // but are not too aggressive (within 110% of current 1RM)
        if (
          estimatedOneRM > currentOneRM &&
          estimatedOneRM < currentOneRM * 1.1
        ) {
          const roundedWeight = Math.round(weight / exercise.weightIncrement) * exercise.weightIncrement;
          if (roundedWeight >= minWeight) {
            results.push({
              sets,
              reps,
              weight: roundedWeight,
              estimatedOneRM,
            });
          }
        }
      }
    }
  }

  console.log('Generated suggestions count:', results.length);

  // Sort by estimated 1RM and return all valid suggestions
  return results.sort((a, b) => a.estimatedOneRM - b.estimatedOneRM);
}

/**
 * Calculates the linear regression trend of recent 1RMs
 */
export function calculateOneRMTrend(recentLogs: { calculatedOneRM: number }[]): {
  trend: "up" | "down" | "stable";
  nextOneRM: number;
} {
  if (recentLogs.length < 2) {
    return {
      trend: "stable",
      nextOneRM: recentLogs[0]?.calculatedOneRM || 0,
    };
  }

  // Calculate linear regression
  const data = recentLogs.map((log, i) => [i, log.calculatedOneRM]);
  const n = data.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  data.forEach(([x, y]) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next value
  const nextOneRM = slope * n + intercept;

  return {
    trend: slope > 0 ? "up" : slope < 0 ? "down" : "stable",
    nextOneRM,
  };
}