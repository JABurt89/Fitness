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
      console.log('Storage reorder updates:', updates);

      // Get all workout days first
      const allWorkouts = await db.select().from(workoutDays);
      console.log('Current workouts:', allWorkouts);

      const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

      // Verify all workouts exist
      for (const update of updates) {
        if (!workoutMap.has(update.id)) {
          console.error(`Workout day not found:`, update);
          throw new Error(`Workout day with id ${update.id} not found`);
        }
      }

      // Update each workout's display order
      for (const update of updates) {
        console.log(`Updating workout ${update.id} to order ${update.displayOrder}`);
        await db
          .update(workoutDays)
          .set({ displayOrder: update.displayOrder })
          .where(eq(workoutDays.id, update.id));
      }

      const verifyWorkouts = await db.select().from(workoutDays);
      console.log('Workouts after update:', verifyWorkouts);
    } catch (error) {
      console.error('Error in reorderWorkoutDays:', error);
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