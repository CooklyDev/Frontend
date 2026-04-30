import type {
  AuthProfile,
  Collection,
  CollectionDraft,
  Comment,
  Recipe,
  RecipeDraft,
  SocialSummary,
  TargetType,
} from "@/lib/cookly/types"

const SESSION_STORAGE_KEY = "session_id"

export const emptyRecipeDraft: RecipeDraft = {
  name: "",
  description: "",
  instructions: "",
  calories: "",
  proteins: "",
  carbohydrates: "",
  preparationTime: "",
  cookTime: "",
  complexity: "",
  isPublic: false,
}

export const emptyCollectionDraft: CollectionDraft = {
  name: "",
  description: "",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function unwrapData(payload: unknown): unknown {
  if (isRecord(payload) && "data" in payload) {
    return payload.data
  }

  return payload
}

function listFromPayload(payload: unknown): unknown[] {
  const data = unwrapData(payload)

  if (Array.isArray(data)) {
    return data
  }

  if (isRecord(data)) {
    if (Array.isArray(data.items)) {
      return data.items
    }

    if (Array.isArray(data.content)) {
      return data.content
    }

    if (Array.isArray(data.recipes)) {
      return data.recipes
    }
  }

  return []
}

function objectFromPayload(payload: unknown): Record<string, unknown> | null {
  const data = unwrapData(payload)
  return isRecord(data) ? data : null
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function boolOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

export function normalizeSocialSummary(payload: unknown): SocialSummary | null {
  const source = objectFromPayload(payload)

  if (!source) {
    return null
  }

  return {
    targetId: String(source.targetId ?? source.target_id ?? ""),
    targetType: String(source.targetType ?? source.target_type ?? ""),
    ratingCount: numberOrNull(source.ratingCount ?? source.rating_count) ?? 0,
    averageRating: numberOrNull(source.averageRating ?? source.average_rating) ?? 0,
    commentCount: numberOrNull(source.commentCount ?? source.comment_count) ?? 0,
    favoriteCount: numberOrNull(source.favoriteCount ?? source.favorite_count) ?? 0,
    myRating: numberOrNull(source.myRating ?? source.my_rating),
    favoriteByMe: boolOrDefault(source.favoriteByMe ?? source.favorite_by_me, false),
  }
}

export function normalizeRecipe(payload: unknown, fallbackId = "recipe"): Recipe {
  const source = isRecord(payload) ? payload : {}

  return {
    id: String(source.id ?? fallbackId),
    userId: textOrNull(source.userId ?? source.user_id),
    name: String(source.name ?? source.title ?? "Без названия"),
    description: textOrNull(source.description),
    instructions: textOrEmpty(source.instructions),
    calories: numberOrNull(source.calories),
    proteins: numberOrNull(source.proteins),
    carbohydrates: numberOrNull(source.carbohydrates),
    preparationTime: numberOrNull(source.preparationTime ?? source.preparation_time),
    cookTime: numberOrNull(source.cookTime ?? source.cook_time),
    complexity: numberOrNull(source.complexity),
    isPublic: boolOrDefault(source.isPublic ?? source.is_public, false),
    social: normalizeSocialSummary(source.social),
  }
}

export function normalizeRecipes(payload: unknown): Recipe[] {
  return listFromPayload(payload).map((item, index) =>
    normalizeRecipe(item, `recipe-${index}`)
  )
}

export function normalizeCollection(payload: unknown, fallbackId = "collection"): Collection {
  const source = isRecord(payload) ? payload : {}
  const recipes = Array.isArray(source.recipes)
    ? source.recipes.map((item, index) => normalizeRecipe(item, `${fallbackId}-recipe-${index}`))
    : []

  return {
    id: String(source.id ?? fallbackId),
    userId: textOrNull(source.userId ?? source.user_id),
    name: String(source.name ?? source.title ?? "Без названия"),
    description: textOrNull(source.description),
    recipes,
    social: normalizeSocialSummary(source.social),
  }
}

export function normalizeCollections(payload: unknown): Collection[] {
  return listFromPayload(payload).map((item, index) =>
    normalizeCollection(item, `collection-${index}`)
  )
}

function normalizeComment(payload: unknown, fallbackId = "comment"): Comment {
  const source = isRecord(payload) ? payload : {}

  return {
    id: String(source.id ?? fallbackId),
    userId: textOrNull(source.userId ?? source.user_id),
    targetType: String(source.targetType ?? source.target_type ?? ""),
    targetId: String(source.targetId ?? source.target_id ?? ""),
    text: textOrEmpty(source.text),
    createdAt: textOrNull(source.createdAt ?? source.created_at),
    updatedAt: textOrNull(source.updatedAt ?? source.updated_at),
  }
}

export function normalizeComments(payload: unknown): Comment[] {
  return listFromPayload(payload).map((item, index) =>
    normalizeComment(item, `comment-${index}`)
  )
}

function draftNumber(value: string): number | null {
  if (value.trim() === "") {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function recipeToDraft(recipe?: Recipe | null): RecipeDraft {
  if (!recipe) {
    return { ...emptyRecipeDraft }
  }

  return {
    name: recipe.name,
    description: recipe.description ?? "",
    instructions: recipe.instructions,
    calories: recipe.calories?.toString() ?? "",
    proteins: recipe.proteins?.toString() ?? "",
    carbohydrates: recipe.carbohydrates?.toString() ?? "",
    preparationTime: recipe.preparationTime?.toString() ?? "",
    cookTime: recipe.cookTime?.toString() ?? "",
    complexity: recipe.complexity?.toString() ?? "",
    isPublic: recipe.isPublic,
  }
}

export function collectionToDraft(collection?: Collection | null): CollectionDraft {
  if (!collection) {
    return { ...emptyCollectionDraft }
  }

  return {
    name: collection.name,
    description: collection.description ?? "",
  }
}

export function buildRecipePayload(draft: RecipeDraft, id?: string) {
  return {
    ...(id ? { id } : {}),
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    instructions: draft.instructions.trim(),
    calories: draftNumber(draft.calories),
    proteins: draftNumber(draft.proteins),
    carbohydrates: draftNumber(draft.carbohydrates),
    preparationTime: draftNumber(draft.preparationTime),
    cookTime: draftNumber(draft.cookTime),
    complexity: draftNumber(draft.complexity),
    isPublic: draft.isPublic,
  }
}

export function buildCollectionPayload(draft: CollectionDraft, id?: string) {
  return {
    ...(id ? { id } : {}),
    name: draft.name.trim(),
    description: draft.description.trim() || null,
  }
}

async function parseJson(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function apiErrorMessage(payload: unknown, fallback: string) {
  if (isRecord(payload)) {
    const error = payload.error

    if (isRecord(error) && typeof error.message === "string") {
      return error.message
    }

    if (typeof payload.message === "string") {
      return payload.message
    }
  }

  return fallback
}

async function requestJson<T>(url: string, init?: RequestInit, fallback = "Запрос не выполнен") {
  const response = await fetch(url, init)
  const payload = await parseJson(response)

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, fallback))
  }

  return payload as T
}

async function requestOptionalJson<T>(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, init)
    const payload = await parseJson(response)

    if (!response.ok) {
      return null
    }

    return payload as T
  } catch {
    return null
  }
}

export function getSessionId() {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(SESSION_STORAGE_KEY)
}

export function setSessionId(sessionId: string) {
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  window.dispatchEvent(new Event("session-changed"))
}

export function clearSessionId() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  window.dispatchEvent(new Event("session-changed"))
}

export function sessionHeaders(json = false) {
  const headers = new Headers({ accept: "application/json" })
  const sessionId = getSessionId()

  if (json) {
    headers.set("content-type", "application/json")
  }

  if (sessionId) {
    headers.set("X-Session-ID", sessionId)
  }

  return headers
}

export async function resolveProfile() {
  const sessionId = getSessionId()

  if (!sessionId) {
    return null
  }

  const payload = await requestOptionalJson<unknown>("/api/auth/profile", {
    method: "GET",
    headers: sessionHeaders(),
  })
  const source = objectFromPayload(payload)

  if (!source) {
    return null
  }

  const sessionFromPayload = source.SessionID ?? source.sessionId ?? source.session_id
  const userFromPayload = source.UserID ?? source.userId ?? source.user_id

  if (!sessionFromPayload || !userFromPayload) {
    return null
  }

  return {
    sessionId: String(sessionFromPayload),
    userId: String(userFromPayload),
  } satisfies AuthProfile
}

export async function login(email: string, password: string) {
  const payload = await requestJson<unknown>(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password }).toString(),
    },
    "Не удалось войти"
  )
  const source = isRecord(payload) ? payload : null
  const sessionId = unwrapData(payload)

  if (!source?.success || typeof sessionId !== "string") {
    throw new Error(apiErrorMessage(payload, "Не удалось войти"))
  }

  setSessionId(sessionId)
  return sessionId
}

export async function register(username: string, email: string, password: string) {
  const payload = await requestJson<unknown>(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, email, password }).toString(),
    },
    "Не удалось зарегистрироваться"
  )
  const source = isRecord(payload) ? payload : null
  const sessionId = unwrapData(payload)

  if (!source?.success || typeof sessionId !== "string") {
    throw new Error(apiErrorMessage(payload, "Не удалось зарегистрироваться"))
  }

  setSessionId(sessionId)
  return sessionId
}

export async function logout() {
  const sessionId = getSessionId()

  try {
    if (sessionId) {
      await requestOptionalJson<unknown>("/api/auth/logout", {
        method: "POST",
        headers: sessionHeaders(),
      })
    }
  } finally {
    clearSessionId()
  }
}

export async function fetchRecipes(userId?: string | null) {
  const url = new URL("/api/content/recipes", window.location.origin)

  if (userId) {
    url.searchParams.set("userId", userId)
  }

  const payload = await requestJson<unknown>(url.pathname + url.search, {
    method: "GET",
    headers: sessionHeaders(),
  })

  return normalizeRecipes(payload)
}

export async function fetchRecipe(id: string) {
  const payload = await requestJson<unknown>(`/api/content/recipes/${id}`, {
    method: "GET",
    headers: sessionHeaders(),
  })

  return normalizeRecipe(unwrapData(payload), id)
}

export async function fetchCollections() {
  const payload = await requestJson<unknown>("/api/content/collections", {
    method: "GET",
    headers: sessionHeaders(),
  })

  return normalizeCollections(payload)
}

export async function fetchCollection(id: string) {
  const payload = await requestJson<unknown>(`/api/content/collections/${id}`, {
    method: "GET",
    headers: sessionHeaders(),
  })

  return normalizeCollection(unwrapData(payload), id)
}

export async function saveRecipe(draft: RecipeDraft, id?: string) {
  await requestJson<unknown>(
    "/api/content/recipes",
    {
      method: id ? "PUT" : "POST",
      headers: sessionHeaders(true),
      body: JSON.stringify(buildRecipePayload(draft, id)),
    },
    "Не удалось сохранить рецепт"
  )
}

export async function deleteRecipe(id: string) {
  await requestJson<unknown>(
    "/api/content/recipes",
    {
      method: "DELETE",
      headers: sessionHeaders(true),
      body: JSON.stringify({ id }),
    },
    "Не удалось удалить рецепт"
  )
}

export async function saveCollection(draft: CollectionDraft, id?: string) {
  await requestJson<unknown>(
    "/api/content/collections",
    {
      method: id ? "PUT" : "POST",
      headers: sessionHeaders(true),
      body: JSON.stringify(buildCollectionPayload(draft, id)),
    },
    "Не удалось сохранить коллекцию"
  )
}

export async function deleteCollection(id: string) {
  await requestJson<unknown>(
    "/api/content/collections",
    {
      method: "DELETE",
      headers: sessionHeaders(true),
      body: JSON.stringify({ id }),
    },
    "Не удалось удалить коллекцию"
  )
}

export async function addRecipeToCollection(collectionId: string, recipeId: string) {
  await requestJson<unknown>(
    `/api/content/collections/${collectionId}/recipes`,
    {
      method: "POST",
      headers: sessionHeaders(true),
      body: JSON.stringify({ collectionId, recipeId }),
    },
    "Не удалось добавить рецепт в коллекцию"
  )
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string) {
  await requestJson<unknown>(
    `/api/content/collections/${collectionId}/recipes/${recipeId}`,
    {
      method: "DELETE",
      headers: sessionHeaders(),
    },
    "Не удалось удалить рецепт из коллекции"
  )
}

function socialBase(type: TargetType, id: string) {
  return type === "recipe"
    ? `/api/social/recipes/${id}`
    : `/api/social/collections/${id}`
}

export async function fetchSocialSummary(type: TargetType, id: string) {
  const payload = await requestOptionalJson<unknown>(`${socialBase(type, id)}/social`, {
    method: "GET",
    headers: sessionHeaders(),
  })

  return normalizeSocialSummary(payload)
}

export async function setFavorite(type: TargetType, id: string, favorite: boolean) {
  const payload = await requestJson<unknown>(
    `${socialBase(type, id)}/favorites/me`,
    {
      method: favorite ? "PUT" : "DELETE",
      headers: sessionHeaders(),
    },
    "Не удалось изменить избранное"
  )

  return payload
}

export async function setRating(type: TargetType, id: string, value: number | null) {
  const payload = await requestJson<unknown>(
    `${socialBase(type, id)}/ratings/me`,
    {
      method: value ? "PUT" : "DELETE",
      headers: value ? sessionHeaders(true) : sessionHeaders(),
      body: value ? JSON.stringify({ value }) : undefined,
    },
    "Не удалось изменить рейтинг"
  )

  return payload
}

export async function fetchComments(type: TargetType, id: string) {
  const payload = await requestOptionalJson<unknown>(`${socialBase(type, id)}/comments`, {
    method: "GET",
    headers: sessionHeaders(),
  })

  return normalizeComments(payload)
}

export async function createComment(type: TargetType, id: string, text: string) {
  const payload = await requestJson<unknown>(
    `${socialBase(type, id)}/comments`,
    {
      method: "POST",
      headers: sessionHeaders(true),
      body: JSON.stringify({ text }),
    },
    "Не удалось добавить комментарий"
  )

  return normalizeComment(unwrapData(payload), "comment")
}

export async function updateComment(commentId: string, text: string) {
  const payload = await requestJson<unknown>(
    `/api/social/comments/${commentId}`,
    {
      method: "PUT",
      headers: sessionHeaders(true),
      body: JSON.stringify({ text }),
    },
    "Не удалось обновить комментарий"
  )

  return normalizeComment(unwrapData(payload), commentId)
}

export async function deleteComment(commentId: string) {
  await requestJson<unknown>(
    `/api/social/comments/${commentId}`,
    {
      method: "DELETE",
      headers: sessionHeaders(),
    },
    "Не удалось удалить комментарий"
  )
}

export function popularityScore(summary: SocialSummary | null) {
  if (!summary) {
    return 0
  }

  return (
    summary.favoriteCount * 4 +
    summary.commentCount * 2 +
    summary.ratingCount +
    summary.averageRating
  )
}
