/**
 * Calculates the estimated one-rep max (1RM) based on workout performance
 * Formula for completed sets: 1RM = W × [1 + 0.025 × R] × [1 + 0.025 × (S - 1)]
 * For incomplete set with F reps (F < R):
 * C = W × [1 + 0.025 × R] × [1 + 0.025 × (S - 1)]
 * F_full = W × [1 + 0.025 × R] × [1 + 0.025 × S]
 * 1RM = C + (F/R) × (F_full - C)
 */
export function calculateOneRM(
  weight: number,
  targetReps: number,
  completedSets: number,
  failedRep: number = 0
): number {
  // Base calculation for completed sets
  const C = weight * (1 + 0.025 * targetReps) * (1 + 0.025 * (completedSets - 1));

  // If there was a failed set, calculate the interpolated 1RM
  if (failedRep > 0) {
    const F_full = weight * (1 + 0.025 * targetReps) * (1 + 0.025 * completedSets);
    // Interpolate between C and F_full based on how many reps were completed
    return Number((C + ((failedRep / targetReps) * (F_full - C))).toFixed(2));
  }

  // Round to 2 decimal places
  return Number(C.toFixed(2));
}

export interface WorkoutSuggestion {
  sets: number;
  reps: number;
  weight: number;
  estimatedOneRM: number;
}

/**
 * Generates workout suggestions based on current 1RM and exercise parameters
 * Orders suggestions from smallest increase in 1RM to largest
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
  // Determine minimum weight based on equipment type
  const minWeight = exercise.startingWeightType === "Custom"
    ? exercise.customStartingWeight || 0
    : STARTING_WEIGHTS[exercise.startingWeightType];

  const startWeight = Math.max(currentOneRM * 0.7, minWeight);  // Start at 70% of 1RM or minimum weight
  const endWeight = currentOneRM * 1.3;    // Go up to 130% of 1RM
  const results: WorkoutSuggestion[] = [];

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
        const roundedWeight = Math.round(weight / exercise.weightIncrement) * exercise.weightIncrement;
        if (roundedWeight < minWeight) continue;

        const estimatedOneRM = calculateOneRM(roundedWeight, reps, sets);

        // Only include suggestions that give a slightly higher 1RM (at least 0.1kg increase)
        // but not too aggressive (within 105% of current 1RM)
        if (
          estimatedOneRM > currentOneRM + 0.1 &&
          estimatedOneRM <= currentOneRM * 1.05
        ) {
          results.push({
            sets,
            reps,
            weight: Number(roundedWeight.toFixed(2)),
            estimatedOneRM: Number(estimatedOneRM.toFixed(2)),
          });
        }
      }
    }
  }

  // Sort by how close the estimated 1RM is to the current 1RM
  return results
    .sort((a, b) => a.estimatedOneRM - b.estimatedOneRM)
    .slice(0, 10);
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
  const nextOneRM = Number((slope * n + intercept).toFixed(2));

  return {
    trend: slope > 0 ? "up" : slope < 0 ? "down" : "stable",
    nextOneRM,
  };
}

const STARTING_WEIGHTS = {
  "Barbell": 20,
  "EZ Bar": 12,
  "Dumbbell": 2.5,
  "Smith Machine": 15,
  "Custom": 0
} as const;