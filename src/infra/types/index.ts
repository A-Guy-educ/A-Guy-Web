/**
 * Centralized type exports for the web app.
 */

export type {
  Category,
  Chapter,
  Config,
  ContextExtraction,
  Conversation,
  Course,
  Exercise,
  ExerciseAsset,
  Form,
  FormSubmission,
  GuestSession,
  Lesson,
  Media,
  MemoryItem,
  Page,
  Post,
  PricingPlan,
  Product,
  ProductItem,
  Prompt,
  Redirect,
  Search,
  Tenant,
  Transaction,
  User,
  UserSetting,
} from '@/infra/types/content'

export type { ContentBlock, ContentData as ExerciseContent } from '@/infra/types/exercise'

export type Access = unknown
export type AccessFunction = unknown
export type CollectionConfig = unknown
export type Field = unknown
export type GlobalConfig = unknown
export type RequestWithUser = Request & { user?: unknown }
