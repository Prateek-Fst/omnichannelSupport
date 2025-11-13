import { Injectable } from "@nestjs/common"
import Redis from "ioredis"
import type { EnvService } from "../../config/env.service"
import { logger } from "../logger"

@Injectable()
export class RedisService {
  private redis: Redis

  constructor(private envService: EnvService) {
    this.redis = new Redis({
      host: envService.getString("REDIS_HOST", "localhost"),
      port: envService.getNumber("REDIS_PORT", 6379),
      password: envService.getString("REDIS_PASSWORD"),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })

    this.redis.on("connect", () => {
      logger.info("Redis connected")
    })

    this.redis.on("error", (err) => {
      logger.error("Redis error: " + err.message)
    })
  }

  get client() {
    return this.redis
  }

  async get(key: string) {
    return this.redis.get(key)
  }

  async set(key: string, value: string, ex?: number) {
    if (ex) {
      return this.redis.setex(key, ex, value)
    }
    return this.redis.set(key, value)
  }

  async del(key: string) {
    return this.redis.del(key)
  }

  async incr(key: string) {
    return this.redis.incr(key)
  }

  async decr(key: string) {
    return this.redis.decr(key)
  }

  async expire(key: string, seconds: number) {
    return this.redis.expire(key, seconds)
  }
}
