export type TargetType = "recipe" | "collection"
export type ViewMode = "cards" | "list"

export type SocialSummary = {
  targetId: string
  targetType: "RECIPE" | "COLLECTION" | string
  ratingCount: number
  averageRating: number
  commentCount: number
  favoriteCount: number
  myRating: number | null
  favoriteByMe: boolean
}

export type Recipe = {
  id: string
  userId: string | null
  name: string
  description: string | null
  instructions: string
  calories: number | null
  proteins: number | null
  carbohydrates: number | null
  preparationTime: number | null
  cookTime: number | null
  complexity: number | null
  isPublic: boolean
  social: SocialSummary | null
}

export type Collection = {
  id: string
  userId: string | null
  name: string
  description: string | null
  recipes: Recipe[]
  social: SocialSummary | null
}

export type Comment = {
  id: string
  userId: string | null
  targetType: string
  targetId: string
  text: string
  createdAt: string | null
  updatedAt: string | null
}

export type RecipeDraft = {
  name: string
  description: string
  instructions: string
  calories: string
  proteins: string
  carbohydrates: string
  preparationTime: string
  cookTime: string
  complexity: string
  isPublic: boolean
}

export type CollectionDraft = {
  name: string
  description: string
}

export type AuthProfile = {
  sessionId: string
  userId: string
}
