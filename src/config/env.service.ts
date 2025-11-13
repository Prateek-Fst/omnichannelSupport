import { Injectable } from "@nestjs/common"

@Injectable()
export class EnvService {
  get(key: string): string | number {
    const value = process.env[key]

    if (value === undefined) {
      throw new Error(`Environment variable ${key} is not defined`)
    }

    if (key.includes("PORT") || key.includes("_SIZE")) {
      return Number.parseInt(value, 10)
    }

    return value
  }

  getString(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || ""
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key]
    return value ? Number.parseInt(value, 10) : defaultValue || 0
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key]
    if (value === undefined) return defaultValue || false
    return value === "true"
  }
}
