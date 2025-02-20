import {
  type Exercise,
  type WorkoutDay,
  type WorkoutLog,
  type WeightLog,
  type InsertExercise,
  type InsertWorkoutDay,
  type InsertWorkoutLog,
  type InsertWeightLog,
  exercises,
  workoutDays,
  workoutLogs,
  weightLog,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Exercise operations
  getAllExercises(): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise>;
  deleteExercise(id: number): Promise<void>;

  // Workout day operations
  getAllWorkoutDays(): Promise<WorkoutDay[]>;
  getWorkoutDay(id: number): Promise<WorkoutDay | undefined>;
  createWorkoutDay(workoutDay: InsertWorkoutDay): Promise<WorkoutDay>;
  updateWorkoutDay(id: number, workoutDay: Partial<InsertWorkoutDay>): Promise<WorkoutDay>;
  deleteWorkoutDay(id: number): Promise<void>;
  reorderWorkoutDays(updates: { id: number; displayOrder: number }[]): Promise<void>;

  // Workout log operations
  getAllWorkoutLogs(): Promise<WorkoutLog[]>;
  getWorkoutLogsByExercise(exerciseName: string): Promise<WorkoutLog[]>;
  createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog>;

  // Weight log operations
  getAllWeightLogs(): Promise<WeightLog[]>;
  createWeightLog(weightLogData: InsertWeightLog): Promise<WeightLog>;
}

export class DatabaseStorage implements IStorage {
  // Exercise operations
  async getAllExercises(): Promise<Exercise[]> {
    return await db.select().from(exercises);
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [created] = await db.insert(exercises).values(exercise).returning();
    return created;
  }

  async updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const [updated] = await db
      .update(exercises)
      .set(exercise)
      .where(eq(exercises.id, id))
      .returning();
    if (!updated) throw new Error("Exercise not found");
    return updated;
  }

  async deleteExercise(id: number): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  // Workout day operations
  async getAllWorkoutDays(): Promise<WorkoutDay[]> {
    return await db.select().from(workoutDays);
  }

  async getWorkoutDay(id: number): Promise<WorkoutDay | undefined> {
    const [workoutDay] = await db.select().from(workoutDays).where(eq(workoutDays.id, id));
    return workoutDay;
  }

  async createWorkoutDay(workoutDay: InsertWorkoutDay): Promise<WorkoutDay> {
    const [created] = await db.insert(workoutDays).values({
      ...workoutDay,
      exercises: workoutDay.exercises as string[],
    }).returning();
    return created;
  }

  async updateWorkoutDay(id: number, workoutDay: Partial<InsertWorkoutDay>): Promise<WorkoutDay> {
    const [updated] = await db
      .update(workoutDays)
      .set({
        ...workoutDay,
        exercises: workoutDay.exercises as string[] | undefined,
      })
      .where(eq(workoutDays.id, id))
      .returning();
    if (!updated) throw new Error("Workout day not found");
    return updated;
  }

  async deleteWorkoutDay(id: number): Promise<void> {
    await db.delete(workoutDays).where(eq(workoutDays.id, id));
  }

  async reorderWorkoutDays(updates: { id: number; displayOrder: number }[]): Promise<void> {
    try {
      // Get all workout days and ensure we have them in memory
      const allWorkouts = await db.select().from(workoutDays);

      // Create a map of existing workout IDs
      const existingIds = new Set(allWorkouts.map(w => w.id));

      // Check if all workout IDs in the updates exist
      const missingIds = updates
        .map(u => u.id)
        .filter(id => !existingIds.has(id));

      if (missingIds.length > 0) {
        const error = new Error(`Workout days not found: ${missingIds.join(', ')}`);
        console.error('Missing workout days:', {
          missingIds,
          existingIds: Array.from(existingIds),
          updates
        });
        throw error;
      }

      // Begin transaction
      const transaction = db.transaction(async (tx) => {
        // Perform all updates in sequence
        for (const update of updates) {
          await tx
            .update(workoutDays)
            .set({ displayOrder: update.displayOrder })
            .where(eq(workoutDays.id, update.id));
        }
      });

      await transaction;

      // Verify the updates
      const verifyWorkouts = await db.select().from(workoutDays);
      console.log('Workouts after reorder:', verifyWorkouts.map(w => ({
        id: w.id,
        name: w.dayName,
        displayOrder: w.displayOrder
      })));
    } catch (error) {
      console.error('Error in reorderWorkoutDays:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Workout log operations
  async getAllWorkoutLogs(): Promise<WorkoutLog[]> {
    return await db.select().from(workoutLogs);
  }

  async getWorkoutLogsByExercise(exerciseName: string): Promise<WorkoutLog[]> {
    return await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.exercise, exerciseName));
  }

  async createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const [created] = await db.insert(workoutLogs).values(workoutLog).returning();
    return created;
  }

  // Weight log operations
  async getAllWeightLogs(): Promise<WeightLog[]> {
    return await db.select().from(weightLog);
  }

  async createWeightLog(weightLogData: InsertWeightLog): Promise<WeightLog> {
    const [created] = await db.insert(weightLog).values(weightLogData).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();