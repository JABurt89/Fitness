import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exerciseSchema, workoutDaySchema, weightLogSchema } from "@shared/schema";
import { z } from "zod";
import { logger } from "./logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add route path logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/workout-days')) {
      logger.info('Route matching debug:', {
        path: req.path,
        method: req.method,
        params: req.params,
        originalUrl: req.originalUrl,
        routePath: req.route?.path
      });
    }
    next();
  });

  // Move reorder route before :id route to prevent path collision
  app.patch("/api/workout-days/reorder", async (req, res) => {
    logger.info('Reorder request received:', {
      path: req.path,
      body: req.body,
      workouts: req.body.workouts,
      types: req.body.workouts?.map((w: any) => ({
        id: w.id,
        idType: typeof w.id,
        displayOrder: w.displayOrder,
        displayOrderType: typeof w.displayOrder
      }))
    });

    const reorderSchema = z.object({
      workouts: z.array(z.object({
        id: z.number(),
        displayOrder: z.number()
      }))
    });

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = reorderSchema.safeParse(req.body);
    if (!result.success) {
      logger.error('Reorder validation error:', result.error);
      res.status(400).json({ error: result.error });
      return;
    }

    try {
      await storage.reorderWorkoutDays(req.user.id, result.data.workouts);
      const updatedWorkouts = await storage.getAllWorkoutDays(req.user.id);

      logger.info('Reorder successful:', {
        updates: result.data.workouts,
        currentState: updatedWorkouts.map(w => ({
          id: w.id,
          name: w.dayName,
          displayOrder: w.displayOrder
        }))
      });

      res.json(updatedWorkouts);
    } catch (error) {
      logger.error('Reorder error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        requestBody: req.body
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: "Failed to reorder workout days",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Exercise routes
  app.get("/api/exercises", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    logger.info(`GET /api/exercises`);
    const exercises = await storage.getAllExercises(req.user.id);
    res.json(exercises);
  });

  // Exercise creation endpoint
  app.post("/api/exercises", async (req, res) => {
    logger.info('Exercise creation request received:', {
      body: req.body,
      user: req.user,
      headers: req.headers
    });

    if (!req.user) {
      logger.warn('Unauthorized exercise creation attempt');
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      logger.info('Validating exercise data:', req.body);
      const result = exerciseSchema.safeParse(req.body);

      if (!result.success) {
        logger.error('Exercise validation failed:', {
          errors: result.error.errors,
          receivedData: req.body
        });
        res.status(400).json({ error: result.error });
        return;
      }

      logger.info('Creating exercise:', {
        userId: req.user.id,
        exerciseData: result.data
      });

      const exercise = await storage.createExercise(req.user.id, result.data);

      logger.info('Exercise created successfully:', exercise);
      res.json(exercise);
    } catch (error) {
      logger.error('Error creating exercise:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });

      res.status(500).json({
        error: "Failed to create exercise",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/exercises/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    logger.info(`PATCH /api/exercises/${id}`, {payload: req.body});
    const result = exerciseSchema.partial().safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    try {
      const exercise = await storage.updateExercise(req.user.id, id, result.data);
      res.json(exercise);
    } catch (error) {
      res.status(404).json({ error: "Exercise not found" });
    }
  });

  app.delete("/api/exercises/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    logger.info(`DELETE /api/exercises/${id}`);
    await storage.deleteExercise(req.user.id, id);
    res.status(204).send();
  });

  // Workout day routes
  app.get("/api/workout-days", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    logger.info(`GET /api/workout-days`);
    const workoutDays = await storage.getAllWorkoutDays(req.user.id);
    res.json(workoutDays);
  });

  app.post("/api/workout-days", async (req, res) => {
    logger.info('Workout day creation request received:', {
      body: req.body,
      user: req.user?.id,
      timestamp: new Date().toISOString()
    });

    if (!req.user) {
      logger.warn('Unauthorized workout day creation attempt');
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      logger.info('Validating workout day data:', req.body);
      const result = workoutDaySchema.safeParse(req.body);

      if (!result.success) {
        logger.error('Workout day validation failed:', {
          errors: result.error.errors,
          receivedData: req.body
        });
        return res.status(400).json({ 
          error: "Validation failed",
          details: result.error.errors 
        });
      }

      if (!result.data.exercises || result.data.exercises.length === 0) {
        logger.error('No exercises selected for workout day');
        return res.status(400).json({ 
          error: "Validation failed",
          details: "At least one exercise must be selected" 
        });
      }

      logger.info('Creating workout day:', {
        userId: req.user.id,
        data: result.data
      });

      const workoutDay = await storage.createWorkoutDay(req.user.id, result.data);

      logger.info('Workout day created successfully:', {
        id: workoutDay.id,
        exercises: workoutDay.exercises
      });

      res.json(workoutDay);
    } catch (error) {
      logger.error('Error creating workout day:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body
      });

      res.status(500).json({
        error: "Failed to create workout day",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/workout-days/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    logger.info(`PATCH /api/workout-days/${id}`, {payload: req.body});
    const result = workoutDaySchema.partial().safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    try {
      const workoutDay = await storage.updateWorkoutDay(req.user.id, id, result.data);
      res.json(workoutDay);
    } catch (error) {
      res.status(404).json({ error: "Workout day not found" });
    }
  });

  app.delete("/api/workout-days/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    logger.info(`DELETE /api/workout-days/${id}`);
    await storage.deleteWorkoutDay(req.user.id, id);
    res.status(204).send();
  });

  // Workout log routes
  app.get("/api/workout-logs", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    logger.info(`GET /api/workout-logs`, {query: req.query});
    const { exercise } = req.query;
    if (exercise && typeof exercise === 'string') {
      const logs = await storage.getWorkoutLogsByExercise(req.user.id, exercise);
      res.json(logs);
    } else {
      const logs = await storage.getAllWorkoutLogs(req.user.id);
      res.json(logs);
    }
  });

  app.post("/api/workout-logs", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    logger.info(`POST /api/workout-logs - Request:`, {
      body: req.body,
    });

    try {
      // Parse numeric strings to numbers
      const data = {
        exercise: req.body.exercise,
        completedSets: Number(req.body.completedSets),
        targetReps: Number(req.body.targetReps),
        weight: Number(req.body.weight),
        failedRep: Number(req.body.failedRep),
        calculatedOneRM: Number(req.body.calculatedOneRM),
        date: req.body.date ? new Date(req.body.date) : new Date(),
      };

      logger.info('Processed workout log data:', data);

      // Create the workout log
      const log = await storage.createWorkoutLog(req.user.id, data);

      logger.info('Successfully created workout log:', log);
      res.json(log);
    } catch (error) {
      logger.error('Error creating workout log:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        requestBody: req.body,
      });
      res.status(500).json({ 
        error: "Failed to create workout log",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add delete workout log route
  app.delete("/api/workout-logs/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    logger.info(`DELETE /api/workout-logs/${id}`);
    try {
      await storage.deleteWorkoutLog(req.user.id, id);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting workout log:', error);
      res.status(500).json({ error: "Failed to delete workout log" });
    }
  });

  // Weight log routes
  app.get("/api/weight-logs", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    logger.info(`GET /api/weight-logs`);
    const logs = await storage.getAllWeightLogs(req.user.id);
    res.json(logs);
  });

  app.post("/api/weight-logs", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    logger.info(`POST /api/weight-logs`, {payload: req.body});
    const result = weightLogSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const log = await storage.createWeightLog(req.user.id, result.data);
    res.json(log);
  });

  const httpServer = createServer(app);
  return httpServer;
}