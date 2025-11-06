import 'source-map-support/register'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import axios from 'axios'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { cURL } from 'curly-express'
import express, {
  json,
  NextFunction,
  raw,
  Request,
  Response,
  static as serveStatic,
  urlencoded
} from 'express'
import listEndpoints from 'express-list-endpoints'
import morgan from 'morgan'
import path from 'path'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import helmet from 'helmet'
import { serializeError } from 'serialize-error'
import serverless from 'serverless-http'
import { API } from './api'
import { Redis } from './service/Cache'
import { markdownSafe } from './utils/StringParser'
import logger from './utils/Logger'

const isProduction = process.env.ENV === 'production'

// Extend BigInt prototype for JSON serialization
Object.defineProperty(BigInt.prototype, 'toJSON', {
  value: function (): string {
    return this.toString()
  },
  writable: true,
  enumerable: false,
  configurable: true
})

const curl = cURL({ attach: true })

const app = express()

// Initialize Redis connection
try {
  Redis.connect()
  logger.info('Redis connection initialized')
} catch (error: any) {
  logger.warn('Redis connection failed, using in-memory cache', { error: error?.message || String(error) })
}

// Verify database connection and tables exist (async check)
import { prisma } from './model'
;(async () => {
  try {
    await prisma.$connect()
    logger.info('Database connection verified')
    // Try to access users table to verify migrations ran
    await prisma.$queryRaw`SELECT 1 FROM users LIMIT 1`.catch(async (_error: any) => {
      logger.error('⚠️ CRITICAL: Database tables do not exist! Migrations may not have run.')
      logger.error('⚠️ This should have been handled by entrypoint.sh or start script.')
      logger.error('⚠️ Please check Railway logs for migration errors.')
      logger.error('⚠️ Manual fix: cd api && npx prisma migrate deploy')
    })
  } catch (error: any) {
    logger.error('Database connection failed', { error: error?.message || String(error) })
    logger.error('⚠️ CRITICAL: Cannot connect to database. Please check DATABASE_URL')
  }
})()

app.set('trust proxy', 1)

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: [
        '\'self\'',
        '\'unsafe-inline\'', // Required for React and inline scripts
        '\'unsafe-eval\'', // Required for React development/build
        'https:', // Allow external scripts
      ],
      styleSrc: [
        '\'self\'',
        '\'unsafe-inline\'', // Required for inline styles and React
        'https:', // Allow external stylesheets
      ],
      imgSrc: [
        '\'self\'',
        'data:', // Allow data URIs for images
        'blob:', // Allow blob URIs
        'https:', // Allow external images
      ],
      fontSrc: [
        '\'self\'',
        'data:', // Allow data URIs for fonts
        'https:', // Allow external fonts
      ],
      connectSrc: [
        '\'self\'',
        'https:', // Allow API calls to external domains
        'wss:', // Allow WebSocket connections
        'ws:', // Allow WebSocket connections
      ],
      mediaSrc: [
        '\'self\'',
        'blob:', // Allow blob URIs for media
        'https:', // Allow external media
      ],
      objectSrc: ['\'none\''],
      upgradeInsecureRequests: isProduction ? [] : null, // Only in production
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow file downloads from different origins
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}))

// Compression middleware for better performance
app.use(compression({
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false
    }
    // Use compression for all other requests
    return compression.filter(req, res)
  },
  level: 6 // Balance between compression ratio and CPU usage
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/ping' || req.path === '/api/health'
  }
})

app.use('/api', limiter)

// CORS configuration - allow specific origins in production, all in development
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : isProduction
    ? [process.env.RAILWAY_PUBLIC_DOMAIN || process.env.PUBLIC_URL || '*']
    : [/.*/]

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed || origin.endsWith(allowed)
      }
      return allowed.test(origin)
    })

    if (isAllowed || !isProduction) {
      callback(null, true)
    } else {
      logger.warn(`CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  }
}))
app.use(json({ limit: '100mb' }))
app.use(urlencoded({ extended: true, limit: '100mb' }))
app.use(raw({ limit: '100mb' }))
app.use(cookieParser())
// Always use morgan in production, but with different format
app.use(morgan(isProduction ? 'combined' : 'dev', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}))
app.use(curl)

// Request logging middleware
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    body: req.method !== 'GET' ? (req.body ? Object.keys(req.body) : []) : undefined
  })
  next()
})

app.get('/ping', (_, res) => {
  logger.debug('Health check: /ping')
  res.send({ pong: true, timestamp: new Date().toISOString() })
})

app.get('/api/health', (_, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: !!process.env.DATABASE_URL,
    redis: !!process.env.REDIS_URL,
    telegram: !!process.env.TG_API_ID && !!process.env.TG_API_HASH
  }
  logger.debug('Health check: /api/health', health)
  res.send(health)
})
app.get('/security.txt', (_, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.send('Contact: security@teledriveapp.com\nPreferred-Languages: en, id')
})
app.use('/api', API)

// error handler
app.use(async (err: { status?: number, body?: Record<string, any> }, req: Request, res: Response, __: NextFunction) => {
  const status = err.status || 500
  const errorMessage = err.body?.error || (err as any).message || 'Unknown error'

  logger.error(`Error ${status}: ${errorMessage}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    error: serializeError(err),
    stack: (err as any).stack
  })
  if ((err.status || 500) >= 500) {
    if (process.env.TG_BOT_TOKEN && (process.env.TG_BOT_ERROR_REPORT_ID || process.env.TG_BOT_OWNER_ID)) {
      try {
        await axios.post(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
          chat_id: process.env.TG_BOT_ERROR_REPORT_ID || process.env.TG_BOT_OWNER_ID,
          parse_mode: 'Markdown',
          text: `🔥 *${markdownSafe(err.body.error  || (err as any).message || 'Unknown error')}*\n\n\`[${err.status || 500}] ${markdownSafe(req.protocol + '://' + req.get('host') + req.originalUrl)}\`\n\n\`\`\`\n${JSON.stringify(serializeError(err), null, 2)}\n\`\`\`\n\n\`\`\`\n${req['_curl']}\n\`\`\``
        })
      } catch (error) {
        logger.error('Failed to send error report to Telegram', { error: serializeError(error) })
        // ignore
      }
    }
  }
  return res.status(err.status || 500).send(err.body || { error: 'Something error', details: serializeError(err) })
})

// serve web
app.use(serveStatic(path.join(__dirname, '..', '..', 'web', 'build')))
app.use((req: Request, res: Response) => {
  try {
    if (req.headers['accept'] !== 'application/json') {
      return res.sendFile(path.join(__dirname, '..', '..','web', 'build', 'index.html'))
    }
    return res.status(404).send({ error: 'Not found' })
  } catch (error) {
    return res.send({ empty: true })
  }
})

const port = process.env.PORT || 4000

// Add startup logging before server starts
logger.info('='.repeat(50))
logger.info('🚀 Starting TeleDrive API Server')
logger.info('='.repeat(50))
logger.info(`Environment: ${process.env.ENV || 'development'}`)
logger.info(`Port: ${port}`)
logger.info(`Node Version: ${process.version}`)
logger.info(`Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Not configured'}`)
logger.info(`Redis: ${process.env.REDIS_URL ? '✅ Configured' : '⚠️ Using in-memory'}`)
logger.info(`Telegram API: ${process.env.TG_API_ID ? '✅ Configured' : '❌ Not configured'}`)
logger.info(`Public URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || process.env.PUBLIC_URL || 'Not set'}`)
logger.info('='.repeat(50))

app.listen(port, () => {
  logger.info(`✅ Server successfully started on port ${port}`)
  logger.info(`📡 API available at: http://localhost:${port}/api`)
  logger.info(`🔍 Health check: http://localhost:${port}/ping`)
})

// Log all registered endpoints
if (!isProduction) {
  const endpoints = listEndpoints(app)
  logger.debug('Registered endpoints:', endpoints)
}

module.exports = app
module.exports.handler = serverless(app)