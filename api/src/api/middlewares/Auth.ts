import { NextFunction, Request, Response } from 'express'
import { verify } from 'jsonwebtoken'
import { Logger, TelegramClient } from 'telegram'
import { LogLevel } from 'telegram/extensions/Logger'
import { StringSession } from 'telegram/sessions'
import { prisma } from '../../model'
import { Redis } from '../../service/Cache'
import { API_JWT_SECRET, CONNECTION_RETRIES, TG_CREDS } from '../../utils/Constant'
import logger from '../../utils/Logger'

export async function Auth(req: Request, _: Response, next: NextFunction): Promise<any> {
  const authkey = (req.headers.authorization || req.cookies.authorization)?.replace(/^Bearer\ /gi, '')
  if (!authkey) {
    logger.warn('Auth middleware: No auth key provided', { path: req.path, ip: req.ip })
    throw { status: 401, body: { error: 'Auth key is required' } }
  }

  let data: { session: string }
  try {
    data = verify(authkey, API_JWT_SECRET) as { session: string }
    logger.debug('Auth middleware: Token verified', { path: req.path })
  } catch (error) {
    logger.warn('Auth middleware: Invalid token', { path: req.path, error: error.message })
    throw { status: 401, body: { error: 'Access token is invalid' } }
  }

  try {
    const session = new StringSession(data.session)
    req.tg = new TelegramClient(session, TG_CREDS.apiId, TG_CREDS.apiHash, {
      connectionRetries: CONNECTION_RETRIES,
      useWSS: false,
      ...process.env.ENV === 'production' ? { baseLogger: new Logger(LogLevel.NONE) } : {}
    })
    logger.debug('Auth middleware: Telegram client created', { path: req.path })
  } catch (error) {
    logger.error('Auth middleware: Failed to create Telegram client', { path: req.path, error: error.message })
    throw { status: 401, body: { error: 'Invalid key' } }
  }

  try {
    await req.tg.connect()
    logger.debug('Auth middleware: Telegram client connected', { path: req.path })
  } catch (error) {
    logger.error('Auth middleware: Failed to connect Telegram client', { path: req.path, error: error.message })
    throw { status: 500, body: { error: 'Failed to connect to Telegram' } }
  }
  req.authKey = authkey

  const [userAuth, user] = await Redis.connect().getFromCacheFirst(`auth:${authkey}`, async () => {
    let userAuth: any
    try {
      userAuth = await req.tg.getMe()
    } catch (error) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await req.tg.connect()
        userAuth = await req.tg.getMe()
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await req.tg.connect()
        userAuth = await req.tg.getMe()
      }
    }

    const user = await prisma.users.findFirst({ where: { tg_id: userAuth['id'].toString() } })
    if (!user) {
      throw { status: 401, body: { error: 'User not found' } }
    }
    return [userAuth, user]
  }, 54000)

  req.user = user
  req.userAuth = userAuth

  return next()
}

export async function AuthMaybe(req: Request, _: Response, next: NextFunction): Promise<any> {
  const authkey = (req.headers.authorization || req.cookies.authorization)?.replace(/^Bearer\ /gi, '')
  if (authkey) {
    let data: { session: string }
    try {
      data = verify(authkey, API_JWT_SECRET) as { session: string }
    } catch (error) {
      // throw { status: 401, body: { error: 'Access token is invalid' } }
      return next()
    }

    try {
      const session = new StringSession(data.session)
      req.tg = new TelegramClient(session, TG_CREDS.apiId, TG_CREDS.apiHash, {
        connectionRetries: CONNECTION_RETRIES,
        useWSS: false,
        ...process.env.ENV === 'production' ? { baseLogger: new Logger(LogLevel.NONE) } : {}
      })
    } catch (error) {
      // throw { status: 401, body: { error: 'Invalid key' } }
      return next()
    }
    await req.tg.connect()
    req.authKey = authkey

    const [userAuth, user] = await Redis.connect().getFromCacheFirst(`auth:${authkey}`, async () => {
      let userAuth: any = null
      try {
        userAuth = await req.tg.getMe()
      } catch (error) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          await req.tg.connect()
          userAuth = await req.tg.getMe()
        } catch (error) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          await req.tg.connect()
          userAuth = await req.tg.getMe()
        }
      }

      const user = await prisma.users.findFirst({ where: { tg_id: userAuth['id'].toString() } })
      if (!user) {
        // throw { status: 401, body: { error: 'User not found' } }
        return [userAuth, null]
      }
      return [userAuth, user]
    }, 54000)

    req.user = user
    req.userAuth = userAuth
  }

  return next()
}