import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(32).required(),

  JWT_EXPIRES_IN: Joi.string().default('1d'),

  SMTP_HOST: Joi.string().hostname().default('localhost'),

  SMTP_PORT: Joi.number().port().default(1025),

  SMTP_SECURE: Joi.boolean().default(false),

  MAIL_FROM: Joi.string().email().default('no-reply@nexora.local'),

  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  INVITATION_EXPIRES_IN_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(720)
    .default(72),
});
