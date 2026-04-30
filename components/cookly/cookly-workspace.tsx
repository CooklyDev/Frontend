"use client"

import {
  addRecipeToCollection,
  collectionToDraft,
  createComment,
  deleteCollection as deleteCollectionRequest,
  deleteRecipe as deleteRecipeRequest,
  fetchCollection,
  fetchCollections,
  fetchComments,
  fetchRecipe,
  fetchRecipes,
  fetchSocialSummary,
  getSessionId,
  popularityScore,
  recipeToDraft,
  removeRecipeFromCollection,
  saveCollection as saveCollectionRequest,
  saveRecipe as saveRecipeRequest,
  setFavorite,
  setRating,
} from "@/lib/cookly/api"
import type {
  Collection,
  CollectionDraft,
  Comment,
  Recipe,
  RecipeDraft,
  TargetType,
  ViewMode,
} from "@/lib/cookly/types"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  ChefHat,
  Clock,
  Flame,
  Grid2X2,
  Heart,
  List,
  Loader2,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"

type WorkspaceVariant = "main" | "home"

type EditorState =
  | { type: "recipe"; recipe: Recipe | null }
  | { type: "collection"; collection: Collection | null }
  | null

type SelectedEntity =
  | { type: "recipe"; recipe: Recipe }
  | { type: "collection"; collection: Collection }
  | null

const viewModeKey = "cookly_view_mode"

function readStoredViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "cards"
  }

  return localStorage.getItem(viewModeKey) === "list" ? "list" : "cards"
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) {
    return "-"
  }

  return `${value}${suffix}`
}

function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU")
}

function recipeMatches(recipe: Recipe, query: string) {
  if (!query) {
    return true
  }

  const haystack = [recipe.name, recipe.description, recipe.instructions]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU")

  return haystack.includes(query)
}

function collectionMatches(collection: Collection, query: string) {
  if (!query) {
    return true
  }

  const haystack = [
    collection.name,
    collection.description,
    ...collection.recipes.map((recipe) => recipe.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU")

  return haystack.includes(query)
}

function metricItems(recipe: Recipe) {
  return [
    { label: "ккал", value: formatNumber(recipe.calories), icon: Flame },
    { label: "готовка", value: formatNumber(recipe.cookTime, " мин"), icon: Clock },
    { label: "сложность", value: formatNumber(recipe.complexity, "/10"), icon: Sparkles },
  ]
}

async function hydrateRecipe(recipe: Recipe) {
  const social = await fetchSocialSummary("recipe", recipe.id)
  return { ...recipe, social: social ?? recipe.social }
}

async function hydrateCollection(collection: Collection) {
  const social = await fetchSocialSummary("collection", collection.id)
  return { ...collection, social: social ?? collection.social }
}

function requireSessionMessage() {
  return "Нужно войти в аккаунт через настройки."
}

export function CooklyWorkspace({ variant }: { variant: WorkspaceVariant }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [query, setQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(null)
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null)

  const isHome = variant === "home"

  const loadData = useCallback(async () => {
    const sessionAvailable = !!getSessionId()
    setHasSession(sessionAvailable)
    setErrorMessage(null)
    setIsLoading(true)

    if (isHome && !sessionAvailable) {
      setRecipes([])
      setCollections([])
      setIsLoading(false)
      return
    }

    try {
      const [nextRecipes, nextCollections] = await Promise.all([
        fetchRecipes(),
        fetchCollections(),
      ])
      const detailedCollections = await Promise.all(
        nextCollections.map((collection) =>
          fetchCollection(collection.id).catch(() => collection)
        )
      )
      const [recipesWithSocial, collectionsWithSocial] = await Promise.all([
        Promise.all(nextRecipes.map(hydrateRecipe)),
        Promise.all(detailedCollections.map(hydrateCollection)),
      ])

      setRecipes(recipesWithSocial)
      setCollections(collectionsWithSocial)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось загрузить данные"
      )
    } finally {
      setIsLoading(false)
    }
  }, [isHome])

  useEffect(() => {
    setViewMode(readStoredViewMode())

    if (variant === "main") {
      const searchParams = new URLSearchParams(window.location.search)
      setQuery(searchParams.get("q") ?? "")
    }
  }, [variant])

  useEffect(() => {
    loadData()

    function handleSessionChange() {
      loadData()
    }

    function handleSettingsChange(event: Event) {
      const detail = (event as CustomEvent<{ viewMode?: ViewMode }>).detail

      if (detail?.viewMode) {
        setViewMode(detail.viewMode)
      }
    }

    window.addEventListener("session-changed", handleSessionChange)
    window.addEventListener("cookly-settings-changed", handleSettingsChange)

    return () => {
      window.removeEventListener("session-changed", handleSessionChange)
      window.removeEventListener("cookly-settings-changed", handleSettingsChange)
    }
  }, [loadData])

  const normalizedQuery = normalizeSearch(query)
  const filteredRecipes = useMemo(
    () => recipes.filter((recipe) => recipeMatches(recipe, normalizedQuery)),
    [normalizedQuery, recipes]
  )
  const filteredCollections = useMemo(
    () => collections.filter((collection) => collectionMatches(collection, normalizedQuery)),
    [collections, normalizedQuery]
  )
  const popularRecipes = useMemo(
    () =>
      [...filteredRecipes]
        .sort((left, right) => popularityScore(right.social) - popularityScore(left.social))
        .slice(0, isHome ? filteredRecipes.length : 6),
    [filteredRecipes, isHome]
  )
  const popularCollections = useMemo(
    () =>
      [...filteredCollections]
        .sort((left, right) => popularityScore(right.social) - popularityScore(left.social))
        .slice(0, isHome ? filteredCollections.length : 6),
    [filteredCollections, isHome]
  )

  function changeViewMode(nextMode: ViewMode) {
    setViewMode(nextMode)
    localStorage.setItem(viewModeKey, nextMode)
    window.dispatchEvent(new CustomEvent("cookly-settings-changed", { detail: { viewMode: nextMode } }))
  }

  function openSettings(mode: "settings" | "login" | "register" = "settings") {
    window.dispatchEvent(new CustomEvent("open-cookly-settings", { detail: { mode } }))
  }

  async function handleSaveRecipe(draft: RecipeDraft, id?: string) {
    if (!getSessionId()) {
      throw new Error(requireSessionMessage())
    }

    setIsSaving(true)
    try {
      await saveRecipeRequest(draft, id)
      await loadData()
      setActionMessage(id ? "Рецепт обновлен" : "Рецепт создан")
      setEditor(null)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteRecipe(id: string) {
    if (!getSessionId()) {
      setActionMessage(requireSessionMessage())
      return
    }

    setIsSaving(true)
    try {
      await deleteRecipeRequest(id)
      await loadData()
      setSelectedEntity(null)
      setActionMessage("Рецепт удален")
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Не удалось удалить рецепт")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveCollection(draft: CollectionDraft, id?: string) {
    if (!getSessionId()) {
      throw new Error(requireSessionMessage())
    }

    setIsSaving(true)
    try {
      await saveCollectionRequest(draft, id)
      await loadData()
      setActionMessage(id ? "Коллекция обновлена" : "Коллекция создана")
      setEditor(null)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCollection(id: string) {
    if (!getSessionId()) {
      setActionMessage(requireSessionMessage())
      return
    }

    setIsSaving(true)
    try {
      await deleteCollectionRequest(id)
      await loadData()
      setSelectedEntity(null)
      setActionMessage("Коллекция удалена")
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Не удалось удалить коллекцию")
    } finally {
      setIsSaving(false)
    }
  }

  const totalItems = recipes.length + collections.length

  return (
    <section className="relative overflow-hidden px-4 py-8 text-stone-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10rem] top-[-12rem] h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 right-[-12rem] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="rounded-[2.5rem] border border-white/10 bg-stone-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-amber-300/80">
                {isHome ? "Home" : "Main"}
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-50 md:text-6xl">
                {isHome ? "Ваши рецепты и коллекции" : "Готовьте, сохраняйте, собирайте"}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-400 md:text-base">
                {isHome
                  ? "Создавайте рецепты, объединяйте их в коллекции и управляйте публичностью."
                  : "Главная витрина с поиском, популярными рецептами и коллекциями Cookly."}
              </p>
            </div>

            <div className="space-y-3 rounded-[2rem] border border-white/10 bg-black/25 p-4">
              <label className="relative block" htmlFor={`${variant}-search`}>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
                <input
                  id={`${variant}-search`}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Найти рецепт или коллекцию"
                  className="w-full rounded-2xl border border-white/10 bg-stone-950/80 py-3 pl-11 pr-4 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <ViewModeToggle value={viewMode} onChange={changeViewMode} />
                <div className="text-right text-xs text-stone-500">
                  <p>{totalItems} объектов</p>
                  <p>{filteredRecipes.length} рецептов</p>
                </div>
              </div>

              {isHome ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditor({ type: "recipe", recipe: null })}
                    className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300"
                  >
                    Новый рецепт
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditor({ type: "collection", collection: null })}
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-100 transition hover:bg-white/10"
                  >
                    Новая коллекция
                  </button>
                </div>
              ) : (
                <Link
                  href="/my-recipes"
                  className="flex items-center justify-center rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-100 transition hover:bg-white/10"
                >
                  Перейти в Home
                </Link>
              )}
            </div>
          </div>
        </div>

        {actionMessage ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        {isHome && !hasSession ? (
          <AuthRequiredCard onLogin={() => openSettings("login")} onRegister={() => openSettings("register")} />
        ) : isLoading ? (
          <LoadingGrid />
        ) : errorMessage ? (
          <ErrorCard message={errorMessage} onRetry={loadData} />
        ) : (
          <div className="mt-8 space-y-10">
            {isHome ? (
              <>
                <EntitySection
                  title="Recipes"
                  subtitle="Список ваших рецептов с быстрым редактированием."
                  emptyText="Рецептов пока нет. Создайте первый рецепт."
                >
                  <RecipeList
                    recipes={popularRecipes}
                    viewMode={viewMode}
                    owner
                    onView={(recipe) => setSelectedEntity({ type: "recipe", recipe })}
                    onEdit={(recipe) => setEditor({ type: "recipe", recipe })}
                    onDelete={handleDeleteRecipe}
                    disabled={isSaving}
                  />
                </EntitySection>
                <EntitySection
                  title="Collections"
                  subtitle="Коллекции для группировки рецептов."
                  emptyText="Коллекций пока нет. Создайте коллекцию и добавьте рецепты."
                >
                  <CollectionList
                    collections={popularCollections}
                    viewMode={viewMode}
                    owner
                    onView={(collection) => setSelectedEntity({ type: "collection", collection })}
                    onEdit={(collection) => setEditor({ type: "collection", collection })}
                    onDelete={handleDeleteCollection}
                    disabled={isSaving}
                  />
                </EntitySection>
              </>
            ) : (
              <>
                <EntitySection
                  title="Explore collections"
                  subtitle="Коллекции как входная точка в подборки автора."
                  emptyText="Коллекции не найдены."
                >
                  <CollectionList
                    collections={filteredCollections}
                    viewMode={viewMode}
                    onView={(collection) => setSelectedEntity({ type: "collection", collection })}
                  />
                </EntitySection>
                <EntitySection
                  title="Popular recipes"
                  subtitle="Сортировка учитывает избранное, комментарии и рейтинг social service."
                  emptyText="Рецепты не найдены."
                >
                  <RecipeList
                    recipes={popularRecipes}
                    viewMode={viewMode}
                    onView={(recipe) => setSelectedEntity({ type: "recipe", recipe })}
                  />
                </EntitySection>
                <EntitySection
                  title="Popular collections"
                  subtitle="Подборки с самой активной обратной связью."
                  emptyText="Популярные коллекции не найдены."
                >
                  <CollectionList
                    collections={popularCollections}
                    viewMode={viewMode}
                    onView={(collection) => setSelectedEntity({ type: "collection", collection })}
                  />
                </EntitySection>
              </>
            )}
          </div>
        )}
      </div>

      {editor?.type === "recipe" ? (
        <RecipeEditorModal
          recipe={editor.recipe}
          isSaving={isSaving}
          onClose={() => setEditor(null)}
          onSave={handleSaveRecipe}
        />
      ) : null}

      {editor?.type === "collection" ? (
        <CollectionEditorModal
          collection={editor.collection}
          isSaving={isSaving}
          onClose={() => setEditor(null)}
          onSave={handleSaveCollection}
        />
      ) : null}

      {selectedEntity?.type === "recipe" ? (
        <RecipeViewModal
          recipe={selectedEntity.recipe}
          owner={isHome}
          disabled={isSaving}
          onClose={() => setSelectedEntity(null)}
          onChanged={loadData}
          onEdit={(recipe) => {
            setSelectedEntity(null)
            setEditor({ type: "recipe", recipe })
          }}
          onDelete={handleDeleteRecipe}
        />
      ) : null}

      {selectedEntity?.type === "collection" ? (
        <CollectionViewModal
          collection={selectedEntity.collection}
          owner={isHome}
          availableRecipes={recipes}
          disabled={isSaving}
          onClose={() => setSelectedEntity(null)}
          onChanged={loadData}
          onEdit={(collection) => {
            setSelectedEntity(null)
            setEditor({ type: "collection", collection })
          }}
          onDelete={handleDeleteCollection}
        />
      ) : null}
    </section>
  )
}

function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="flex rounded-2xl border border-white/10 bg-black/30 p-1">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition",
          value === "cards" ? "bg-emerald-400 text-stone-950" : "text-stone-400 hover:bg-white/10 hover:text-stone-100"
        )}
      >
        <Grid2X2 className="size-4" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition",
          value === "list" ? "bg-emerald-400 text-stone-950" : "text-stone-400 hover:bg-white/10 hover:text-stone-100"
        )}
      >
        <List className="size-4" />
        List
      </button>
    </div>
  )
}

function AuthRequiredCard({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-amber-400/30 bg-amber-500/10 p-8 text-stone-100">
      <h2 className="text-2xl font-semibold">Home доступен после входа</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
        Content service привязан к `X-Session-ID`. Войдите или зарегистрируйтесь, чтобы видеть свои рецепты, создавать коллекции и редактировать данные.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onLogin} className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300">
          Войти
        </button>
        <button type="button" onClick={onRegister} className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-white/10">
          Зарегистрироваться
        </button>
      </div>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
      ))}
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-red-50">
      <h2 className="text-xl font-semibold">Не удалось загрузить данные</h2>
      <p className="mt-2 text-sm text-red-100/80">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-2xl border border-red-200/30 px-4 py-2 text-sm font-medium transition hover:bg-red-500/10">
        Повторить
      </button>
    </div>
  )
}

function EntitySection({ title, subtitle, emptyText, children }: { title: string; subtitle: string; emptyText: string; children: ReactNode }) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : false

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-50">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        </div>
      </div>
      {isEmpty ? <EmptyState text={emptyText} /> : children}
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-stone-500">
      {text}
    </div>
  )
}

function RecipeList({
  recipes,
  viewMode,
  owner = false,
  disabled = false,
  onView,
  onEdit,
  onDelete,
}: {
  recipes: Recipe[]
  viewMode: ViewMode
  owner?: boolean
  disabled?: boolean
  onView: (recipe: Recipe) => void
  onEdit?: (recipe: Recipe) => void
  onDelete?: (id: string) => void
}) {
  if (recipes.length === 0) {
    return <EmptyState text="Рецепты не найдены." />
  }

  return (
    <div className={viewMode === "cards" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          mode={viewMode}
          owner={owner}
          disabled={disabled}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function CollectionList({
  collections,
  viewMode,
  owner = false,
  disabled = false,
  onView,
  onEdit,
  onDelete,
}: {
  collections: Collection[]
  viewMode: ViewMode
  owner?: boolean
  disabled?: boolean
  onView: (collection: Collection) => void
  onEdit?: (collection: Collection) => void
  onDelete?: (id: string) => void
}) {
  if (collections.length === 0) {
    return <EmptyState text="Коллекции не найдены." />
  }

  return (
    <div className={viewMode === "cards" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          mode={viewMode}
          owner={owner}
          disabled={disabled}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function RecipeCard({
  recipe,
  mode,
  owner,
  disabled,
  onView,
  onEdit,
  onDelete,
}: {
  recipe: Recipe
  mode: ViewMode
  owner: boolean
  disabled: boolean
  onView: (recipe: Recipe) => void
  onEdit?: (recipe: Recipe) => void
  onDelete?: (id: string) => void
}) {
  if (mode === "list") {
    return (
      <article onClick={() => onView(recipe)} className="group flex w-full cursor-pointer items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-amber-400/50 hover:bg-white/[0.07]">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-stone-950">
          <ChefHat className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-stone-50">{recipe.name}</h3>
            <VisibilityPill isPublic={recipe.isPublic} />
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-stone-500">{recipe.description ?? (recipe.instructions || "Без описания")}</p>
        </div>
        <SocialStrip summary={recipe.social} />
        {owner ? <OwnerActions disabled={disabled} onEdit={() => onEdit?.(recipe)} onDelete={() => onDelete?.(recipe.id)} /> : null}
      </article>
    )
  }

  return (
    <article onClick={() => onView(recipe)} className="group cursor-pointer overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-400/50 hover:bg-white/[0.07]">
      <div className="relative h-36 overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(251,191,36,0.55),transparent_30%),linear-gradient(135deg,rgba(16,185,129,0.28),rgba(12,12,10,0.4))]">
        <div className="absolute inset-x-5 bottom-4 flex items-end justify-between">
          <div className="rounded-2xl border border-white/20 bg-black/35 px-3 py-2 text-xs text-stone-200 backdrop-blur">
            Recipe #{shortId(recipe.id)}
          </div>
          <VisibilityPill isPublic={recipe.isPublic} />
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-semibold tracking-tight text-stone-50">{recipe.name}</h3>
        <p className="mt-2 line-clamp-3 min-h-16 text-sm leading-6 text-stone-400">{recipe.description ?? (recipe.instructions || "Без описания")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {metricItems(recipe).map((item) => {
            const Icon = item.icon

            return (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <Icon className="mb-2 size-4 text-amber-300" />
                <p className="text-sm font-semibold text-stone-100">{item.value}</p>
                <p className="text-[0.68rem] uppercase tracking-wider text-stone-500">{item.label}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <SocialStrip summary={recipe.social} />
          {owner ? <OwnerActions disabled={disabled} onEdit={() => onEdit?.(recipe)} onDelete={() => onDelete?.(recipe.id)} /> : null}
        </div>
      </div>
    </article>
  )
}

function CollectionCard({
  collection,
  mode,
  owner,
  disabled,
  onView,
  onEdit,
  onDelete,
}: {
  collection: Collection
  mode: ViewMode
  owner: boolean
  disabled: boolean
  onView: (collection: Collection) => void
  onEdit?: (collection: Collection) => void
  onDelete?: (id: string) => void
}) {
  const recipeNames = collection.recipes.map((recipe) => recipe.name).slice(0, 3)

  if (mode === "list") {
    return (
      <article onClick={() => onView(collection)} className="group flex w-full cursor-pointer items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-400/50 hover:bg-white/[0.07]">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-stone-950">
          <BookOpen className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-stone-50">{collection.name}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-stone-500">{collection.description ?? `${collection.recipes.length} рецептов`}</p>
        </div>
        <SocialStrip summary={collection.social} />
        {owner ? <OwnerActions disabled={disabled} onEdit={() => onEdit?.(collection)} onDelete={() => onDelete?.(collection.id)} /> : null}
      </article>
    )
  }

  return (
    <article onClick={() => onView(collection)} className="group cursor-pointer overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-white/[0.07]">
      <div className="relative h-36 overflow-hidden bg-[radial-gradient(circle_at_80%_20%,rgba(52,211,153,0.5),transparent_32%),linear-gradient(135deg,rgba(251,191,36,0.18),rgba(12,12,10,0.4))]">
        <div className="absolute left-5 top-5 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="size-5 rounded-md border border-white/35 bg-white/10" />
          ))}
        </div>
        <div className="absolute inset-x-5 bottom-4 flex items-end justify-between">
          <div className="rounded-2xl border border-white/20 bg-black/35 px-3 py-2 text-xs text-stone-200 backdrop-blur">
            {collection.recipes.length} recipes
          </div>
          <div className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-stone-950">Collection</div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-semibold tracking-tight text-stone-50">{collection.name}</h3>
        <p className="mt-2 line-clamp-3 min-h-16 text-sm leading-6 text-stone-400">{collection.description ?? "Без описания"}</p>
        <div className="mt-4 space-y-2">
          {(recipeNames.length ? recipeNames : ["Рецепты пока не добавлены"]).map((name) => (
            <div key={name} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300">
              {name}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <SocialStrip summary={collection.social} />
          {owner ? <OwnerActions disabled={disabled} onEdit={() => onEdit?.(collection)} onDelete={() => onDelete?.(collection.id)} /> : null}
        </div>
      </div>
    </article>
  )
}

function VisibilityPill({ isPublic }: { isPublic: boolean }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", isPublic ? "bg-emerald-400 text-stone-950" : "bg-stone-800 text-stone-300")}>
      {isPublic ? "Public" : "Private"}
    </span>
  )
}

function SocialStrip({ summary }: { summary: Recipe["social"] }) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-xs text-stone-400">
      <span className="inline-flex items-center gap-1"><Star className="size-3.5 text-amber-300" />{summary?.averageRating?.toFixed(1) ?? "0.0"}</span>
      <span className="inline-flex items-center gap-1"><Heart className={cn("size-3.5", summary?.favoriteByMe ? "fill-red-400 text-red-400" : "text-red-300")} />{summary?.favoriteCount ?? 0}</span>
      <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5 text-emerald-300" />{summary?.commentCount ?? 0}</span>
    </div>
  )
}

function OwnerActions({ disabled, onEdit, onDelete }: { disabled: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
      <button type="button" disabled={disabled} onClick={onEdit} className="rounded-xl border border-white/10 p-2 text-stone-300 transition hover:border-amber-400 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
        <PenLine className="size-4" />
      </button>
      <button type="button" disabled={disabled} onClick={onDelete} className="rounded-xl border border-white/10 p-2 text-stone-300 transition hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50">
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function ModalShell({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8">
      <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <section className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(145deg,rgba(30,30,27,0.98),rgba(10,11,10,0.98))] text-stone-100 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/15 p-2 text-stone-300 transition hover:border-amber-400 hover:text-amber-300">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-6rem)] overflow-y-auto p-5 md:p-6">{children}</div>
      </section>
    </div>
  )
}

function RecipeEditorModal({ recipe, isSaving, onClose, onSave }: { recipe: Recipe | null; isSaving: boolean; onClose: () => void; onSave: (draft: RecipeDraft, id?: string) => Promise<void> }) {
  const [draft, setDraft] = useState<RecipeDraft>(() => recipeToDraft(recipe))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!draft.name.trim()) {
      setErrorMessage("Укажите название рецепта")
      return
    }

    if (!draft.instructions.trim()) {
      setErrorMessage("Укажите инструкцию приготовления")
      return
    }

    const complexity = draft.complexity.trim() ? Number(draft.complexity) : null
    if (complexity !== null && (complexity < 1 || complexity > 10)) {
      setErrorMessage("Сложность должна быть от 1 до 10")
      return
    }

    try {
      await onSave(draft, recipe?.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить рецепт")
    }
  }

  return (
    <ModalShell title={recipe ? "Редактирование рецепта" : "Новый рецепт"} eyebrow="Recipe window" onClose={onClose}>
      <form className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <TextField label="Название" value={draft.name} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} required />
          <TextArea label="Короткое описание" value={draft.description} onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))} rows={4} />
          <TextArea label="Инструкция приготовления" value={draft.instructions} onChange={(value) => setDraft((prev) => ({ ...prev, instructions: value }))} rows={9} required />
        </div>
        <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Калории" type="number" value={draft.calories} onChange={(value) => setDraft((prev) => ({ ...prev, calories: value }))} />
            <TextField label="Белки" type="number" value={draft.proteins} onChange={(value) => setDraft((prev) => ({ ...prev, proteins: value }))} />
            <TextField label="Углеводы" type="number" value={draft.carbohydrates} onChange={(value) => setDraft((prev) => ({ ...prev, carbohydrates: value }))} />
            <TextField label="Сложность" type="number" min="1" max="10" value={draft.complexity} onChange={(value) => setDraft((prev) => ({ ...prev, complexity: value }))} />
            <TextField label="Подготовка, мин" type="number" value={draft.preparationTime} onChange={(value) => setDraft((prev) => ({ ...prev, preparationTime: value }))} />
            <TextField label="Готовка, мин" type="number" value={draft.cookTime} onChange={(value) => setDraft((prev) => ({ ...prev, cookTime: value }))} />
          </div>
          <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
            Сделать публичным
            <input type="checkbox" checked={draft.isPublic} onChange={(event) => setDraft((prev) => ({ ...prev, isPublic: event.target.checked }))} className="size-5 accent-amber-400" />
          </label>
          {errorMessage ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</p> : null}
          <button type="submit" disabled={isSaving} className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? "Сохранение..." : recipe ? "Сохранить изменения" : "Создать рецепт"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function CollectionEditorModal({ collection, isSaving, onClose, onSave }: { collection: Collection | null; isSaving: boolean; onClose: () => void; onSave: (draft: CollectionDraft, id?: string) => Promise<void> }) {
  const [draft, setDraft] = useState<CollectionDraft>(() => collectionToDraft(collection))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!draft.name.trim()) {
      setErrorMessage("Укажите название коллекции")
      return
    }

    try {
      await onSave(draft, collection?.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить коллекцию")
    }
  }

  return (
    <ModalShell title={collection ? "Редактирование коллекции" : "Новая коллекция"} eyebrow="Collection window" onClose={onClose}>
      <form className="mx-auto max-w-2xl space-y-4" onSubmit={handleSubmit}>
        <TextField label="Название коллекции" value={draft.name} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} required />
        <TextArea label="Описание" value={draft.description} onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))} rows={8} />
        {errorMessage ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</p> : null}
        <button type="submit" disabled={isSaving} className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
          {isSaving ? "Сохранение..." : collection ? "Сохранить изменения" : "Создать коллекцию"}
        </button>
      </form>
    </ModalShell>
  )
}

function TextField({ label, value, onChange, type = "text", required = false, min, max }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; max?: string }) {
  return (
    <label className="block text-sm font-medium text-stone-200">
      {label}
      <input type={type} min={min} max={max} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20" />
    </label>
  )
}

function TextArea({ label, value, onChange, rows, required = false }: { label: string; value: string; onChange: (value: string) => void; rows: number; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-stone-200">
      {label}
      <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20" />
    </label>
  )
}

function RecipeViewModal({ recipe, owner, disabled, onClose, onChanged, onEdit, onDelete }: { recipe: Recipe; owner: boolean; disabled: boolean; onClose: () => void; onChanged: () => Promise<void>; onEdit: (recipe: Recipe) => void; onDelete: (id: string) => Promise<void> }) {
  const [current, setCurrent] = useState(recipe)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [detail, social, nextComments] = await Promise.all([
      fetchRecipe(recipe.id).catch(() => recipe),
      fetchSocialSummary("recipe", recipe.id),
      fetchComments("recipe", recipe.id),
    ])
    setCurrent({ ...detail, social: social ?? detail.social ?? recipe.social })
    setComments(nextComments)
  }, [recipe])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleFavorite() {
    if (!getSessionId()) {
      setMessage(requireSessionMessage())
      return
    }

    setIsBusy(true)
    try {
      await setFavorite("recipe", current.id, !current.social?.favoriteByMe)
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось изменить избранное")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRating(value: number) {
    if (!getSessionId()) {
      setMessage(requireSessionMessage())
      return
    }

    setIsBusy(true)
    try {
      await setRating("recipe", current.id, current.social?.myRating === value ? null : value)
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось изменить рейтинг")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!commentText.trim()) {
      return
    }

    if (!getSessionId()) {
      setMessage(requireSessionMessage())
      return
    }

    setIsBusy(true)
    try {
      await createComment("recipe", current.id, commentText.trim())
      setCommentText("")
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить комментарий")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <ModalShell title={current.name} eyebrow="Recipe view" onClose={onClose}>
      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <div>
          <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.35),transparent_36%),rgba(255,255,255,0.04)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <VisibilityPill isPublic={current.isPublic} />
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">ID {shortId(current.id)}</span>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-300">{current.description ?? "Описание не заполнено."}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              {metricItems(current).map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <Icon className="mb-2 size-4 text-amber-300" />
                    <p className="text-lg font-semibold">{item.value}</p>
                    <p className="text-xs text-stone-500">{item.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <h3 className="text-xl font-semibold">Инструкция</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-300">{current.instructions || "Инструкция не заполнена."}</p>
          </div>
        </div>

        <aside className="space-y-4">
          <SocialPanel targetType="recipe" summary={current.social} disabled={isBusy} onFavorite={handleFavorite} onRating={handleRating} />
          {owner ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={disabled} onClick={() => onEdit(current)} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-60">Изменить</button>
              <button type="button" disabled={disabled} onClick={() => onDelete(current.id)} className="rounded-2xl border border-red-400/40 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60">Удалить</button>
            </div>
          ) : null}
          <CommentsPanel comments={comments} value={commentText} message={message} disabled={isBusy} onChange={setCommentText} onSubmit={handleComment} />
        </aside>
      </div>
    </ModalShell>
  )
}

function CollectionViewModal({ collection, owner, availableRecipes, disabled, onClose, onChanged, onEdit, onDelete }: { collection: Collection; owner: boolean; availableRecipes: Recipe[]; disabled: boolean; onClose: () => void; onChanged: () => Promise<void>; onEdit: (collection: Collection) => void; onDelete: (id: string) => Promise<void> }) {
  const [current, setCurrent] = useState(collection)
  const [comments, setComments] = useState<Comment[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState("")
  const [commentText, setCommentText] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [detail, social, nextComments] = await Promise.all([
      fetchCollection(collection.id).catch(() => collection),
      fetchSocialSummary("collection", collection.id),
      fetchComments("collection", collection.id),
    ])
    setCurrent({ ...detail, social: social ?? detail.social ?? collection.social })
    setComments(nextComments)
  }, [collection])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleFavorite() {
    if (!getSessionId()) {
      setMessage(requireSessionMessage())
      return
    }

    setIsBusy(true)
    try {
      await setFavorite("collection", current.id, !current.social?.favoriteByMe)
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось изменить избранное")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRating(value: number) {
    if (!getSessionId()) {
      setMessage(requireSessionMessage())
      return
    }

    setIsBusy(true)
    try {
      await setRating("collection", current.id, current.social?.myRating === value ? null : value)
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось изменить рейтинг")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!commentText.trim()) {
      return
    }

    if (!getSessionId()) {
      setMessage(requireSessionMessage())
      return
    }

    setIsBusy(true)
    try {
      await createComment("collection", current.id, commentText.trim())
      setCommentText("")
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить комментарий")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleAddRecipe() {
    if (!selectedRecipeId) {
      setMessage("Выберите рецепт")
      return
    }

    setIsBusy(true)
    try {
      await addRecipeToCollection(current.id, selectedRecipeId)
      setSelectedRecipeId("")
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить рецепт")
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRemoveRecipe(recipeId: string) {
    setIsBusy(true)
    try {
      await removeRecipeFromCollection(current.id, recipeId)
      await reload()
      await onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить рецепт")
    } finally {
      setIsBusy(false)
    }
  }

  const recipesOutsideCollection = availableRecipes.filter(
    (recipe) => !current.recipes.some((item) => item.id === recipe.id)
  )

  return (
    <ModalShell title={current.name} eyebrow="Collection view" onClose={onClose}>
      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_80%_20%,rgba(52,211,153,0.35),transparent_36%),rgba(255,255,255,0.04)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-stone-950">Collection</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">ID {shortId(current.id)}</span>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-300">{current.description ?? "Описание не заполнено."}</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Рецепты коллекции</h3>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">{current.recipes.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {current.recipes.length ? current.recipes.map((recipe) => (
                <div key={recipe.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div>
                    <p className="font-medium text-stone-100">{recipe.name}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-stone-500">{recipe.description ?? recipe.instructions}</p>
                  </div>
                  {owner ? (
                    <button type="button" disabled={isBusy} onClick={() => handleRemoveRecipe(recipe.id)} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs text-red-200 transition hover:bg-red-500/10 disabled:opacity-60">
                      Убрать
                    </button>
                  ) : null}
                </div>
              )) : <EmptyState text="В коллекции пока нет рецептов." />}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <SocialPanel targetType="collection" summary={current.social} disabled={isBusy} onFavorite={handleFavorite} onRating={handleRating} />
          {owner ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={disabled} onClick={() => onEdit(current)} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-60">Изменить</button>
                <button type="button" disabled={disabled} onClick={() => onDelete(current.id)} className="rounded-2xl border border-red-400/40 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60">Удалить</button>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-semibold">Добавить рецепт</h3>
                <select value={selectedRecipeId} onChange={(event) => setSelectedRecipeId(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none focus:border-emerald-400 focus:ring-3 focus:ring-emerald-400/20">
                  <option value="">Выберите рецепт</option>
                  {recipesOutsideCollection.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                  ))}
                </select>
                <button type="button" disabled={isBusy || !selectedRecipeId} onClick={handleAddRecipe} className="mt-3 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
                  Добавить
                </button>
              </div>
            </>
          ) : null}
          <CommentsPanel comments={comments} value={commentText} message={message} disabled={isBusy} onChange={setCommentText} onSubmit={handleComment} />
        </aside>
      </div>
    </ModalShell>
  )
}

function SocialPanel({ targetType, summary, disabled, onFavorite, onRating }: { targetType: TargetType; summary: Recipe["social"]; disabled: boolean; onFavorite: () => void; onRating: (value: number) => void }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-black/20 p-3"><p className="text-lg font-semibold">{summary?.averageRating?.toFixed(1) ?? "0.0"}</p><p className="text-xs text-stone-500">rating</p></div>
        <div className="rounded-2xl bg-black/20 p-3"><p className="text-lg font-semibold">{summary?.favoriteCount ?? 0}</p><p className="text-xs text-stone-500">likes</p></div>
        <div className="rounded-2xl bg-black/20 p-3"><p className="text-lg font-semibold">{summary?.commentCount ?? 0}</p><p className="text-xs text-stone-500">comments</p></div>
      </div>
      <button type="button" disabled={disabled} onClick={onFavorite} className={cn("mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60", summary?.favoriteByMe ? "border-red-400/50 bg-red-500/10 text-red-100" : "border-white/15 text-stone-100 hover:bg-white/10")}>
        <Heart className={cn("size-4", summary?.favoriteByMe ? "fill-red-400 text-red-400" : "text-red-300")} />
        {summary?.favoriteByMe ? `Убрать ${targetType === "recipe" ? "рецепт" : "коллекцию"}` : "В избранное"}
      </button>
      <div className="mt-3 flex justify-center gap-1 rounded-2xl border border-white/10 bg-black/20 p-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" disabled={disabled} onClick={() => onRating(value)} className="rounded-xl p-1 transition hover:bg-white/10 disabled:opacity-60">
            <Star className={cn("size-5", (summary?.myRating ?? 0) >= value ? "fill-amber-300 text-amber-300" : "text-stone-600")} />
          </button>
        ))}
      </div>
    </div>
  )
}

function CommentsPanel({ comments, value, message, disabled, onChange, onSubmit }: { comments: Comment[]; value: string; message: string | null; disabled: boolean; onChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="size-4 text-emerald-300" />Комментарии</h3>
      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
        {comments.length ? comments.map((comment) => (
          <div key={comment.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm leading-5 text-stone-300">{comment.text}</p>
            <p className="mt-2 text-[0.68rem] uppercase tracking-wider text-stone-600">{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : shortId(comment.id)}</p>
          </div>
        )) : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-stone-500">Комментариев пока нет.</p>}
      </div>
      <form className="mt-3 space-y-2" onSubmit={onSubmit}>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} placeholder="Написать комментарий" className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-emerald-400 focus:ring-3 focus:ring-emerald-400/20" />
        {message ? <p className="text-xs text-amber-200">{message}</p> : null}
        <button type="submit" disabled={disabled || !value.trim()} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
          {disabled ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Добавить комментарий"}
        </button>
      </form>
    </div>
  )
}
