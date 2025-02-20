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
    return await db.query.exercises.findMany();
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    return await db.query.exercises.findFirst({
      where: eq(exercises.id, id)
    });
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
    return await db.query.workoutDays.findMany();
  }

  async getWorkoutDay(id: number): Promise<WorkoutDay | undefined> {
    return await db.query.workoutDays.findFirst({
      where: eq(workoutDays.id, id)
    });
  }

  async createWorkoutDay(workoutDay: InsertWorkoutDay): Promise<WorkoutDay> {
    // Get the current maximum display order
    const maxOrder = await db.query.workoutDays.findFirst({
      orderBy: (workoutDays, { desc }) => [desc(workoutDays.displayOrder)]
    });

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
      await db.transaction(async (tx) => {
        for (const update of updates) {
          await tx
            .update(workoutDays)
            .set({ displayOrder: update.displayOrder })
            .where(eq(workoutDays.id, update.id));
        }
      });
    } catch (error) {
      console.error('Error in reorderWorkoutDays:', error);
      throw error;
    }
  }

  // Workout log operations
  async getAllWorkoutLogs(): Promise<WorkoutLog[]> {
    return await db.query.workoutLogs.findMany();
  }

  async getWorkoutLogsByExercise(exerciseName: string): Promise<WorkoutLog[]> {
    return await db.query.workoutLogs.findMany({
      where: eq(workoutLogs.exercise, exerciseName)
    });
  }

  async createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const [created] = await db.insert(workoutLogs).values(workoutLog).returning();
    return created;
  }

  // Weight log operations
  async getAllWeightLogs(): Promise<WeightLog[]> {
    return await db.query.weightLog.findMany();
  }

  async createWeightLog(weightLogData: InsertWeightLog): Promise<WeightLog> {
    const [created] = await db.insert(weightLog).values(weightLogData).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();