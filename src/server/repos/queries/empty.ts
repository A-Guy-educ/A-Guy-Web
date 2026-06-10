export interface PaginatedResult<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

export function emptyPaginated<T>(limit = 12, page = 1): PaginatedResult<T> {
  return {
    docs: [],
    totalDocs: 0,
    limit,
    totalPages: 0,
    page,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  }
}
