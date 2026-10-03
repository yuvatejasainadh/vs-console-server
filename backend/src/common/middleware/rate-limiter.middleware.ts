import rateLimit from 'express-rate-limit';
import { sendError } from '../response';
import { AuthenticatedRequest } from '../types';
import { config } from '../../config/env';

export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.appEnv === 'test',
  handler: (req, res) => {
    sendError(
      req as AuthenticatedRequest,
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many requests, please try again later.'
    );
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.appEnv === 'test',
  handler: (req, res) => {
    sendError(
      req as AuthenticatedRequest,
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many login attempts. Please try again later.'
    );
  },
});

export const privilegedApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.appEnv === 'test',
  handler: (req, res) => {
    sendError(
      req as AuthenticatedRequest,
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many requests to privileged API endpoints.'
    );
  },
});
