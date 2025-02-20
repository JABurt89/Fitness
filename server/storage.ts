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
import { eq, inArray } from "drizzle-orm";

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
    // Get the current maximum display order
    const [maxOrder] = await db
      .select()
      .from(workoutDays)
      .orderBy(workoutDays.displayOrder)
      .limit(1);

    const nextOrder = (maxOrder?.displayOrder ?? -1) + 1;

    const [created] = await db.insert(workoutDays).values({
      ...workoutDay,
      exercises: workoutDay.exercises as string[],
      displayOrder: nextOrder,
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
      // First verify all workout days exist using IN clause
      const workoutIds = updates.map(u => u.id);
      console.log('Attempting to reorder workout days:', {
        workoutIds,
        updates,
        idTypes: workoutIds.map(id => ({ id, type: typeof id }))
      });

      // Get all workout days first to debug
      const allWorkoutDays = await db.select().from(workoutDays);
      console.log('All workout days in database:', allWorkoutDays);

      const existingWorkouts = await db
        .select()
        .from(workoutDays)
        .where(inArray(workoutDays.id, workoutIds));

      console.log('Found existing workouts:', existingWorkouts);

      if (existingWorkouts.length !== updates.length) {
        const existingIds = new Set(existingWorkouts.map(w => w.id));
        const missingIds = workoutIds.filter(id => !existingIds.has(id));
        console.log('Missing workout days:', {
          expected: workoutIds,
          found: Array.from(existingIds),
          missing: missingIds,
          idTypes: {
            workoutIds: workoutIds.map(id => typeof id),
            existingIds: Array.from(existingIds).map(id => typeof id)
          }
        });
        throw new Error(`Workout days not found: ${missingIds.join(', ')}`);
      }

      // Perform updates in a transaction
      await db.transaction(async (tx) => {
        for (const update of updates) {
          await tx
            .update(workoutDays)
            .set({ displayOrder: update.displayOrder })
            .where(eq(workoutDays.id, update.id));
        }
      });

      // Log the final state for verification
      const verifyWorkouts = await db.select().from(workoutDays);
      console.log('Workouts after reorder:', verifyWorkouts.map(w => ({
        id: w.id,
        name: w.dayName,
        displayOrder: w.displayOrder
      })));
    } catch (error) {
      console.error('Error in reorderWorkoutDays:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        updates
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