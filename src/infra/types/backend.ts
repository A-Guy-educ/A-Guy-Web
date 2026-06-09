export type Payload = any
export type PayloadRequest = any
export type User = any
export type Where = any
export type MongooseAdapter = any

export type DuplicationLevel = 'none' | 'light' | 'medium' | 'deep' | string
export type DuplicationSubject = 'algebra' | 'geometry' | 'calculus' | 'mixed' | 'other'

export const ContentSchema = {
  parse: (value: unknown): any => value,
  safeParse: (value: unknown): any => ({ success: true, data: value }),
}

export function parseSSEData(data: string): any[] {
  try {
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

export async function logActivity(..._args: any[]) {
  return null
}

export async function convertLatexBlockOnExercise(..._args: any[]): Promise<any> {
  return null
}

export async function getPayload(..._args: any[]): Promise<any> {
  return {
    auth: async (..._authArgs: any[]) => ({ user: null }),
    login: async (..._loginArgs: any[]) => null,
    db: { collections: { users: { findOne: async () => null, updateOne: async () => null } } },
    collections: {},
  }
}
