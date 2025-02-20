import {
  type Exercise,
  type WorkoutDay,
  type WorkoutLog,
  type WeightLog,
  type InsertExercise,
  type InsertWorkoutDay,
  type InsertWorkoutLog,
  type InsertWeightLog,
} from "@shared/schema";

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

  // Workout log operations
  getAllWorkoutLogs(): Promise<WorkoutLog[]>;
  getWorkoutLogsByExercise(exerciseName: string): Promise<WorkoutLog[]>;
  createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog>;

  // Weight log operations
  getAllWeightLogs(): Promise<WeightLog[]>;
  createWeightLog(weightLog: InsertWeightLog): Promise<WeightLog>;
}

export class MemStorage implements IStorage {
  private exercises: Map<number, Exercise>;
  private workoutDays: Map<number, WorkoutDay>;
  private workoutLogs: WorkoutLog[];
  private weightLogs: WeightLog[];
  private currentIds: { [key: string]: number };

  constructor() {
    this.exercises = new Map();
    this.workoutDays = new Map();
    this.workoutLogs = [];
    this.weightLogs = [];
    this.currentIds = {
      exercise: 1,
      workoutDay: 1,
      workoutLog: 1,
      weightLog: 1,
    };
  }

  // Exercise operations
  async getAllExercises(): Promise<Exercise[]> {
    return Array.from(this.exercises.values());
  }

  async getExercise(id: number): Promise<Exercise | undefined> {
    return this.exercises.get(id);
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const id = this.currentIds.exercise++;
    const newExercise = { ...exercise, id };
    this.exercises.set(id, newExercise);
    return newExercise;
  }

  async updateExercise(id: number, exercise: Partial<InsertExercise>): Promise<Exercise> {
    const existing = this.exercises.get(id);
    if (!existing) throw new Error("Exercise not found");
    const updated = { ...existing, ...exercise };
    this.exercises.set(id, updated);
    return updated;
  }

  async deleteExercise(id: number): Promise<void> {
    this.exercises.delete(id);
  }

  // Workout day operations
  async getAllWorkoutDays(): Promise<WorkoutDay[]> {
    return Array.from(this.workoutDays.values());
  }

  async getWorkoutDay(id: number): Promise<WorkoutDay | undefined> {
    return this.workoutDays.get(id);
  }

  async createWorkoutDay(workoutDay: InsertWorkoutDay): Promise<WorkoutDay> {
    const id = this.currentIds.workoutDay++;
    const newWorkoutDay = { ...workoutDay, id };
    this.workoutDays.set(id, newWorkoutDay);
    return newWorkoutDay;
  }

  async updateWorkoutDay(id: number, workoutDay: Partial<InsertWorkoutDay>): Promise<WorkoutDay> {
    const existing = this.workoutDays.get(id);
    if (!existing) throw new Error("Workout day not found");
    const updated = { ...existing, ...workoutDay };
    this.workoutDays.set(id, updated);
    return updated;
  }

  async deleteWorkoutDay(id: number): Promise<void> {
    this.workoutDays.delete(id);
  }

  // Workout log operations
  async getAllWorkoutLogs(): Promise<WorkoutLog[]> {
    return this.workoutLogs;
  }

  async getWorkoutLogsByExercise(exerciseName: string): Promise<WorkoutLog[]> {
    return this.workoutLogs.filter(log => log.exercise === exerciseName);
  }

  async createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const id = this.currentIds.workoutLog++;
    const newLog = { ...workoutLog, id };
    this.workoutLogs.push(newLog);
    return newLog;
  }

  // Weight log operations
  async getAllWeightLogs(): Promise<WeightLog[]> {
    return this.weightLogs;
  }

  async createWeightLog(weightLog: InsertWeightLog): Promise<WeightLog> {
    const id = this.currentIds.weightLog++;
    const newLog = { ...weightLog, id };
    this.weightLogs.push(newLog);
    return newLog;
  }
}

export const storage = new MemStorage();
