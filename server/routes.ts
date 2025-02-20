import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exerciseSchema, workoutDaySchema, workoutLogSchema, weightLogSchema } from "@shared/schema";
import { z } from "zod";
import {logger} from './logger'; // Added logger import

export async function registerRoutes(app: Express): Promise<Server> {
  // Exercise routes
  app.get("/api/exercises", async (req, res) => {
    logger.info(`GET /api/exercises`); // Added log
    const exercises = await storage.getAllExercises();
    res.json(exercises);
  });

  app.post("/api/exercises", async (req, res) => {
    logger.info(`POST /api/exercises`, {payload: req.body}); // Added log
    const result = exerciseSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const exercise = await storage.createExercise(result.data);
    res.json(exercise);
  });

  app.patch("/api/exercises/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    logger.info(`PATCH /api/exercises/${id}`, {payload: req.body}); // Added log
    const result = exerciseSchema.partial().safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    try {
      const exercise = await storage.updateExercise(id, result.data);
      res.json(exercise);
    } catch (error) {
      res.status(404).json({ error: "Exercise not found" });
    }
  });

  app.delete("/api/exercises/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    logger.info(`DELETE /api/exercises/${id}`); // Added log
    await storage.deleteExercise(id);
    res.status(204).send();
  });

  // Workout day routes
  app.get("/api/workout-days", async (req, res) => {
    logger.info(`GET /api/workout-days`); // Added log
    const workoutDays = await storage.getAllWorkoutDays();
    res.json(workoutDays);
  });

  app.post("/api/workout-days", async (req, res) => {
    logger.info(`POST /api/workout-days`, {payload: req.body}); // Added log
    const result = workoutDaySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const workoutDay = await storage.createWorkoutDay(result.data);
    res.json(workoutDay);
  });

  app.patch("/api/workout-days/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    logger.info(`PATCH /api/workout-days/${id}`, {payload: req.body}); // Added log
    const result = workoutDaySchema.partial().safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    try {
      const workoutDay = await storage.updateWorkoutDay(id, result.data);
      res.json(workoutDay);
    } catch (error) {
      res.status(404).json({ error: "Workout day not found" });
    }
  });

  app.patch("/api/workout-days/reorder", async (req, res) => {
    logger.info(`PATCH /api/workout-days/reorder`, {payload: req.body}); // Added log
    console.log('Reorder request:', {
      body: req.body,
      workouts: req.body.workouts
    });

    const reorderSchema = z.object({
      workouts: z.array(z.object({
        id: z.number(),
        displayOrder: z.number()
      }))
    });

    const result = reorderSchema.safeParse(req.body);
    if (!result.success) {
      console.error('Reorder validation error:', result.error);
      res.status(400).json({ error: result.error });
      return;
    }

    try {
      await storage.reorderWorkoutDays(result.data.workouts);
      const updatedWorkouts = await storage.getAllWorkoutDays();

      console.log('Reorder successful:', {
        updates: result.data.workouts,
        currentState: updatedWorkouts.map(w => ({
          id: w.id,
          name: w.dayName,
          displayOrder: w.displayOrder
        }))
      });

      res.json(updatedWorkouts);
    } catch (error) {
      console.error('Reorder error:', {
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

  app.delete("/api/workout-days/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    logger.info(`DELETE /api/workout-days/${id}`); // Added log
    await storage.deleteWorkoutDay(id);
    res.status(204).send();
  });

  // Workout log routes
  app.get("/api/workout-logs", async (req, res) => {
    logger.info(`GET /api/workout-logs`, {query: req.query}); // Added log
    const { exercise } = req.query;
    if (exercise && typeof exercise === 'string') {
      const logs = await storage.getWorkoutLogsByExercise(exercise);
      res.json(logs);
    } else {
      const logs = await storage.getAllWorkoutLogs();
      res.json(logs);
    }
  });

  app.post("/api/workout-logs", async (req, res) => {
    logger.info(`POST /api/workout-logs`, {payload: req.body}); // Added log
    const result = workoutLogSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const log = await storage.createWorkoutLog(result.data);
    res.json(log);
  });

  // Weight log routes
  app.get("/api/weight-logs", async (req, res) => {
    logger.info(`GET /api/weight-logs`); // Added log
    const logs = await storage.getAllWeightLogs();
    res.json(logs);
  });

  app.post("/api/weight-logs", async (req, res) => {
    logger.info(`POST /api/weight-logs`, {payload: req.body}); // Added log
    const result = weightLogSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const log = await storage.createWeightLog(result.data);
    res.json(log);
  });

  const httpServer = createServer(app);
  return httpServer;
}