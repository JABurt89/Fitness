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
      const workoutIds = updates.map(u => u.id);

      // Add detailed type checking
      console.log('Type validation for reorder operation:', {
        workoutIds,
        idTypes: workoutIds.map(id => ({
          value: id,
          type: typeof id,
          isInteger: Number.isInteger(id),
          stringified: String(id)
        }))
      });

      // First get all workout days to verify state
      const allWorkoutDays = await db.select().from(workoutDays);
      console.log('Database record types:', {
        sample: allWorkoutDays.slice(0, 2).map(w => ({
          id: w.id,
          idType: typeof w.id,
          isInteger: Number.isInteger(w.id),
          stringified: String(w.id)
        }))
      });

      // Verify existence using separate queries for debugging
      const existingWorkouts = await db
        .select()
        .from(workoutDays)
        .where(inArray(workoutDays.id, workoutIds));

      // Log the actual SQL query if possible
      console.log('SQL Debug:', {
        query: db.select()
          .from(workoutDays)
          .where(inArray(workoutDays.id, workoutIds)).toSQL(),
        params: workoutIds
      });

      console.log('Found workouts for reordering:', {
        found: existingWorkouts.map(w => ({
          id: w.id,
          name: w.dayName,
          displayOrder: w.displayOrder,
          idType: typeof w.id
        })),
        expectedIds: workoutIds,
        matchCount: existingWorkouts.length,
        expectedCount: updates.length
      });

      if (existingWorkouts.length !== updates.length) {
        const existingIds = new Set(existingWorkouts.map(w => w.id));
        const missingIds = workoutIds.filter(id => !existingIds.has(id));
        throw new Error(`Workout days not found: ${missingIds.join(', ')}`);
      }

      // Perform updates in a transaction
      await db.transaction(async (tx) => {
        for (const update of updates) {
          const result = await tx
            .update(workoutDays)
            .set({ displayOrder: update.displayOrder })
            .where(eq(workoutDays.id, update.id))
            .returning();

          console.log('Update result:', {
            update,
            result,
            success: result.length > 0
          });
        }
      });

      // Verify final state
      const finalState = await db.select().from(workoutDays);
      console.log('Final state after reorder:',
        finalState.map(w => ({
          id: w.id,
          name: w.dayName,
          displayOrder: w.displayOrder
        }))
      );
    } catch (error) {
      console.error('Error in reorderWorkoutDays:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
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