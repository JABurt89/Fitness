import {
  type Exercise,
  type WorkoutDay,
  type WorkoutLog,
  type WeightLog,
  type InsertExercise,
  type InsertWorkoutDay,
  type InsertWorkoutLog,
  type InsertWeightLog,
  type User,
  type InsertUser,
  exercises,
  workoutDays,
  workoutLogs,
  weightLog,
  users,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;

  // Exercise operations - now scoped to user
  getAllExercises(userId: number): Promise<Exercise[]>;
  getExercise(userId: number, id: number): Promise<Exercise | undefined>;
  createExercise(userId: number, exercise: Omit<InsertExercise, "userId">): Promise<Exercise>;
  updateExercise(userId: number, id: number, exercise: Partial<InsertExercise>): Promise<Exercise>;
  deleteExercise(userId: number, id: number): Promise<void>;

  // Workout day operations - now scoped to user
  getAllWorkoutDays(userId: number): Promise<WorkoutDay[]>;
  getWorkoutDay(userId: number, id: number): Promise<WorkoutDay | undefined>;
  createWorkoutDay(userId: number, workoutDay: Omit<InsertWorkoutDay, "userId">): Promise<WorkoutDay>;
  updateWorkoutDay(userId: number, id: number, workoutDay: Partial<InsertWorkoutDay>): Promise<WorkoutDay>;
  deleteWorkoutDay(userId: number, id: number): Promise<void>;
  reorderWorkoutDays(userId: number, updates: { id: number; displayOrder: number }[]): Promise<void>;

  // Workout log operations - now scoped to user
  getAllWorkoutLogs(userId: number): Promise<WorkoutLog[]>;
  getWorkoutLogsByExercise(userId: number, exerciseName: string): Promise<WorkoutLog[]>;
  createWorkoutLog(userId: number, workoutLog: Omit<InsertWorkoutLog, "userId">): Promise<WorkoutLog>;
  deleteWorkoutLog(userId: number, id: number): Promise<void>;

  // Weight log operations - now scoped to user
  getAllWeightLogs(userId: number): Promise<WeightLog[]>;
  createWeightLog(userId: number, weightLogData: Omit<InsertWeightLog, "userId">): Promise<WeightLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Exercise operations
  async getAllExercises(userId: number): Promise<Exercise[]> {
    return await db.select().from(exercises).where(eq(exercises.userId, userId));
  }

  async getExercise(userId: number, id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises)
      .where(and(eq(exercises.id, id), eq(exercises.userId, userId)));
    return exercise;
  }

  async createExercise(userId: number, exercise: Omit<InsertExercise, "userId">): Promise<Exercise> {
    const [created] = await db.insert(exercises)
      .values({ ...exercise, userId })
      .returning();
    return created;
  }

  async updateExercise(userId: number, id: number, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const [updated] = await db.update(exercises)
      .set(exercise)
      .where(and(eq(exercises.id, id), eq(exercises.userId, userId)))
      .returning();
    if (!updated) throw new Error("Exercise not found");
    return updated;
  }

  async deleteExercise(userId: number, id: number): Promise<void> {
    await db.delete(exercises)
      .where(and(eq(exercises.id, id), eq(exercises.userId, userId)));
  }

  // Workout day operations
  async getAllWorkoutDays(userId: number): Promise<WorkoutDay[]> {
    return await db.select().from(workoutDays)
      .where(eq(workoutDays.userId, userId));
  }

  async getWorkoutDay(userId: number, id: number): Promise<WorkoutDay | undefined> {
    const [workoutDay] = await db.select().from(workoutDays)
      .where(and(eq(workoutDays.id, id), eq(workoutDays.userId, userId)));
    return workoutDay;
  }

  async createWorkoutDay(userId: number, workoutDay: Omit<InsertWorkoutDay, "userId">): Promise<WorkoutDay> {
    const [maxOrder] = await db.select({ displayOrder: workoutDays.displayOrder })
      .from(workoutDays)
      .where(eq(workoutDays.userId, userId))
      .orderBy(workoutDays.displayOrder)
      .limit(1);

    const nextOrder = (maxOrder?.displayOrder ?? -1) + 1;

    const [created] = await db.insert(workoutDays)
      .values({
        ...workoutDay,
        userId,
        exercises: workoutDay.exercises as string[],
        displayOrder: nextOrder,
      })
      .returning();

    return created;
  }

  async updateWorkoutDay(userId: number, id: number, workoutDay: Partial<InsertWorkoutDay>): Promise<WorkoutDay> {
    const [updated] = await db.update(workoutDays)
      .set({
        ...workoutDay,
        exercises: workoutDay.exercises as string[] | undefined,
      })
      .where(and(eq(workoutDays.id, id), eq(workoutDays.userId, userId)))
      .returning();
    if (!updated) throw new Error("Workout day not found");
    return updated;
  }

  async deleteWorkoutDay(userId: number, id: number): Promise<void> {
    await db.delete(workoutDays)
      .where(and(eq(workoutDays.id, id), eq(workoutDays.userId, userId)));
  }

  async reorderWorkoutDays(userId: number, updates: { id: number; displayOrder: number }[]): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        for (const update of updates) {
          await tx.update(workoutDays)
            .set({ displayOrder: update.displayOrder })
            .where(and(eq(workoutDays.id, update.id), eq(workoutDays.userId, userId)));
        }
      });
    } catch (error) {
      console.error('Error in reorderWorkoutDays:', error);
      throw error;
    }
  }

  // Workout log operations
  async getAllWorkoutLogs(userId: number): Promise<WorkoutLog[]> {
    return await db.select().from(workoutLogs)
      .where(eq(workoutLogs.userId, userId));
  }

  async getWorkoutLogsByExercise(userId: number, exerciseName: string): Promise<WorkoutLog[]> {
    return await db.select().from(workoutLogs)
      .where(and(eq(workoutLogs.exercise, exerciseName), eq(workoutLogs.userId, userId)));
  }

  async createWorkoutLog(userId: number, workoutLog: Omit<InsertWorkoutLog, "userId">): Promise<WorkoutLog> {
    logger.info('Creating workout log with data:', { ...workoutLog, userId });

    try {
      const [created] = await db.insert(workoutLogs)
        .values({
          ...workoutLog,
          userId,
          weight: workoutLog.weight.toString(),
          calculatedOneRM: workoutLog.calculatedOneRM.toString(),
          date: workoutLog.date || new Date()
        })
        .returning();

      logger.info('Successfully created workout log:', created);
      return created;
    } catch (error) {
      logger.error('Error creating workout log:', error);
      throw error;
    }
  }

  async deleteWorkoutLog(userId: number, id: number): Promise<void> {
    await db.delete(workoutLogs)
      .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
  }

  // Weight log operations
  async getAllWeightLogs(userId: number): Promise<WeightLog[]> {
    return await db.select().from(weightLog)
      .where(eq(weightLog.userId, userId));
  }

  async createWeightLog(userId: number, weightLogData: Omit<InsertWeightLog, "userId">): Promise<WeightLog> {
    const [created] = await db.insert(weightLog)
      .values({ ...weightLogData, userId })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();