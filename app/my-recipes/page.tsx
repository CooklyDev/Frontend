"use client"

import { useEffect, useMemo, useState } from "react"

type Recipe = {
  id: string
  name: string
  description: string | null
  instructions: string | null
}

type Collection = {
  id: string
  name: string
  description: string | null
}

type RecipeDraft = {
  name: string
  description: string
  instructions: string
}

type CollectionDraft = {
  name: string
  description: string
}

type CollectionRecipe = {
  id: string
  name: string
}

function getListFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!payload || typeof payload !== "object") {
    return []
  }

  const withData = payload as { data?: unknown }
  return Array.isArray(withData.data) ? withData.data : []
}

function normalizeRecipes(payload: unknown): Recipe[] {
  return getListFromPayload(payload)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id ?? `recipe-${index}`),
      name: String(item.name ?? "Без названия"),
      description: typeof item.description === "string" ? item.description : null,
      instructions: typeof item.instructions === "string" ? item.instructions : null,
    }))
}

function normalizeCollections(payload: unknown): Collection[] {
  return getListFromPayload(payload)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id ?? `collection-${index}`),
      name: String(item.name ?? "Без названия"),
      description: typeof item.description === "string" ? item.description : null,
    }))
}

function getObjectFromPayload(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const maybeData = (payload as { data?: unknown }).data

    if (maybeData && typeof maybeData === "object" && !Array.isArray(maybeData)) {
      return maybeData as Record<string, unknown>
    }

    return payload as Record<string, unknown>
  }

  return null
}

function normalizeCollectionRecipes(
  payload: unknown,
  allRecipes: Recipe[]
): CollectionRecipe[] {
  const source = getObjectFromPayload(payload)

  if (!source) {
    return []
  }

  const recipesFromPayload = source.recipes
  if (Array.isArray(recipesFromPayload)) {
    return recipesFromPayload
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item, index) => ({
        id: String(item.id ?? item.recipeId ?? item.recipe_id ?? `collection-recipe-${index}`),
        name: String(item.name ?? item.title ?? "Без названия"),
      }))
  }

  const recipeIds = source.recipeIds
  if (Array.isArray(recipeIds)) {
    return recipeIds
      .filter((item): item is string => typeof item === "string")
      .map((id) => {
        const fromRecipes = allRecipes.find((recipe) => recipe.id === id)

        return {
          id,
          name: fromRecipes?.name ?? "Без названия",
        }
      })
  }

  return []
}

export default function MyRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedRecipeByCollection, setSelectedRecipeByCollection] = useState<
    Record<string, string>
  >({})
  const [recipesByCollection, setRecipesByCollection] = useState<
    Record<string, CollectionRecipe[]>
  >({})
  const [formMode, setFormMode] = useState<"recipe" | "collection">("recipe")
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [draft, setDraft] = useState<RecipeDraft>({
    name: "",
    description: "",
    instructions: "",
  })
  const [collectionDraft, setCollectionDraft] = useState<CollectionDraft>({
    name: "",
    description: "",
  })

  async function loadCardsData() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const sessionId = localStorage.getItem("session_id")
      const headers = {
        accept: "application/json",
        ...(sessionId ? { "X-Session-ID": sessionId } : {}),
      }

      const [recipesResponse, collectionsResponse] = await Promise.all([
        fetch("/api/content/recipes", { method: "GET", headers }),
        fetch("/api/content/collections", { method: "GET", headers }),
      ])

      const recipesPayload = (await recipesResponse.json().catch(() => null)) as unknown
      const collectionsPayload = (await collectionsResponse.json().catch(() => null)) as unknown

      if (!recipesResponse.ok || !collectionsResponse.ok) {
        setErrorMessage("Не удалось загрузить рецепты и коллекции")
        return
      }

      const normalizedRecipes = normalizeRecipes(recipesPayload)
      const normalizedCollections = normalizeCollections(collectionsPayload)

      const recipesByCollectionEntries = await Promise.all(
        normalizedCollections.map(async (collection) => {
          const response = await fetch(`/api/content/collections/${collection.id}`, {
            method: "GET",
            headers,
          })
          const payload = (await response.json().catch(() => null)) as unknown

          if (!response.ok) {
            return [collection.id, []] as const
          }

          return [
            collection.id,
            normalizeCollectionRecipes(payload, normalizedRecipes),
          ] as const
        })
      )

      setRecipes(normalizedRecipes)
      setCollections(normalizedCollections)
      setRecipesByCollection(Object.fromEntries(recipesByCollectionEntries))
    } catch {
      setErrorMessage("Не удалось загрузить рецепты и коллекции")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCardsData()
  }, [])

  function resetDraft() {
    setDraft({ name: "", description: "", instructions: "" })
    setEditingRecipeId(null)
  }

  function resetCollectionDraft() {
    setCollectionDraft({ name: "", description: "" })
    setEditingCollectionId(null)
  }

  function beginCreate() {
    setActionMessage(null)
    setFormMode("recipe")
    resetCollectionDraft()
    resetDraft()
  }

  function beginCreateCollection() {
    setActionMessage(null)
    setFormMode("collection")
    resetDraft()
    resetCollectionDraft()
  }

  function beginEdit(recipe: Recipe) {
    setActionMessage(null)
    setFormMode("recipe")
    setEditingCollectionId(null)
    setEditingRecipeId(recipe.id)
    setDraft({
      name: recipe.name,
      description: recipe.description ?? "",
      instructions: recipe.instructions ?? "",
    })
  }

  function beginEditCollection(collection: Collection) {
    setActionMessage(null)
    setFormMode("collection")
    setEditingRecipeId(null)
    setEditingCollectionId(collection.id)
    setCollectionDraft({
      name: collection.name,
      description: collection.description ?? "",
    })
  }

  async function saveRecipe() {
    if (!draft.name.trim()) {
      setActionMessage("Укажите название рецепта")
      return
    }

    if (!draft.instructions.trim()) {
      setActionMessage("Укажите инструкцию приготовления")
      return
    }

    setIsSaving(true)
    setActionMessage(null)

    try {
      const sessionId = localStorage.getItem("session_id")
      const headers = {
        accept: "application/json",
        "content-type": "application/json",
        ...(sessionId ? { "X-Session-ID": sessionId } : {}),
      }

      const isEdit = !!editingRecipeId
      const response = await fetch("/api/content/recipes", {
        method: isEdit ? "PUT" : "POST",
        headers,
        body: JSON.stringify(
          isEdit
            ? {
                id: editingRecipeId,
                name: draft.name.trim(),
                description: draft.description.trim() || null,
                instructions: draft.instructions.trim(),
              }
            : {
                name: draft.name.trim(),
                description: draft.description.trim() || null,
                instructions: draft.instructions.trim(),
              }
        ),
      })

      if (!response.ok) {
        setActionMessage("Не удалось сохранить рецепт")
        return
      }

      await loadCardsData()
      setActionMessage(isEdit ? "Рецепт обновлен" : "Рецепт создан")
      resetDraft()
    } catch {
      setActionMessage("Не удалось сохранить рецепт")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteRecipe(id: string) {
    setIsSaving(true)
    setActionMessage(null)

    try {
      const sessionId = localStorage.getItem("session_id")
      const response = await fetch("/api/content/recipes", {
        method: "DELETE",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(sessionId ? { "X-Session-ID": sessionId } : {}),
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        setActionMessage("Не удалось удалить рецепт")
        return
      }

      await loadCardsData()
      setActionMessage("Рецепт удален")
      if (editingRecipeId === id) {
        resetDraft()
      }
    } catch {
      setActionMessage("Не удалось удалить рецепт")
    } finally {
      setIsSaving(false)
    }
  }

  async function saveCollection() {
    if (!collectionDraft.name.trim()) {
      setActionMessage("Укажите название коллекции")
      return
    }

    setIsSaving(true)
    setActionMessage(null)

    try {
      const sessionId = localStorage.getItem("session_id")
      const headers = {
        accept: "application/json",
        "content-type": "application/json",
        ...(sessionId ? { "X-Session-ID": sessionId } : {}),
      }

      const isEdit = !!editingCollectionId
      const response = await fetch("/api/content/collections", {
        method: isEdit ? "PUT" : "POST",
        headers,
        body: JSON.stringify(
          isEdit
            ? {
                id: editingCollectionId,
                name: collectionDraft.name.trim(),
                description: collectionDraft.description.trim() || null,
              }
            : {
                name: collectionDraft.name.trim(),
                description: collectionDraft.description.trim() || null,
              }
        ),
      })

      if (!response.ok) {
        setActionMessage("Не удалось сохранить коллекцию")
        return
      }

      await loadCardsData()
      setActionMessage(isEdit ? "Коллекция обновлена" : "Коллекция создана")
      resetCollectionDraft()
    } catch {
      setActionMessage("Не удалось сохранить коллекцию")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCollection(id: string) {
    setIsSaving(true)
    setActionMessage(null)

    try {
      const sessionId = localStorage.getItem("session_id")
      const response = await fetch("/api/content/collections", {
        method: "DELETE",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(sessionId ? { "X-Session-ID": sessionId } : {}),
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        setActionMessage("Не удалось удалить коллекцию")
        return
      }

      await loadCardsData()
      setActionMessage("Коллекция удалена")
      if (editingCollectionId === id) {
        resetCollectionDraft()
      }
    } catch {
      setActionMessage("Не удалось удалить коллекцию")
    } finally {
      setIsSaving(false)
    }
  }

  async function addRecipeToCollection(collectionId: string) {
    const recipeId = selectedRecipeByCollection[collectionId]

    if (!recipeId) {
      setActionMessage("Выберите рецепт для добавления")
      return
    }

    setIsSaving(true)
    setActionMessage(null)

    try {
      const sessionId = localStorage.getItem("session_id")
      const response = await fetch(`/api/content/collections/${collectionId}/recipes`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(sessionId ? { "X-Session-ID": sessionId } : {}),
        },
        body: JSON.stringify({
          collectionId,
          recipeId,
        }),
      })

      if (!response.ok) {
        setActionMessage("Не удалось добавить рецепт в коллекцию")
        return
      }

      await loadCardsData()
      setActionMessage("Рецепт добавлен в коллекцию")
      setSelectedRecipeByCollection((prev) => ({
        ...prev,
        [collectionId]: "",
      }))
    } catch {
      setActionMessage("Не удалось добавить рецепт в коллекцию")
    } finally {
      setIsSaving(false)
    }
  }

  async function removeRecipeFromCollection(collectionId: string, recipeId: string) {
    setIsSaving(true)
    setActionMessage(null)

    try {
      const sessionId = localStorage.getItem("session_id")
      const response = await fetch(
        `/api/content/collections/${collectionId}/recipes/${recipeId}`,
        {
          method: "DELETE",
          headers: {
            accept: "application/json",
            ...(sessionId ? { "X-Session-ID": sessionId } : {}),
          },
        }
      )

      if (!response.ok) {
        setActionMessage("Не удалось удалить рецепт из коллекции")
        return
      }

      await loadCardsData()
      setActionMessage("Рецепт удален из коллекции")
    } catch {
      setActionMessage("Не удалось удалить рецепт из коллекции")
    } finally {
      setIsSaving(false)
    }
  }

  const hasData = useMemo(
    () => recipes.length > 0 || collections.length > 0,
    [collections.length, recipes.length]
  )

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Мои рецепты</h1>
          <p className="mt-3 text-muted-foreground">
            Ваши рецепты и коллекции из content service.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={beginCreate}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Добавить рецепт
          </button>
          <button
            type="button"
            onClick={beginCreateCollection}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Добавить коллекцию
          </button>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-background p-4">
        {formMode === "recipe" ? (
          <>
            <h2 className="text-lg font-semibold">
              {editingRecipeId ? "Редактирование рецепта" : "Новый рецепт"}
            </h2>
            <div className="mt-4 grid gap-3">
              <input
                type="text"
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Название"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
              />
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Описание"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
              />
              <textarea
                value={draft.instructions}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    instructions: event.target.value,
                  }))
                }
                placeholder="Инструкция приготовления"
                rows={5}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={saveRecipe}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Сохраняем..." : editingRecipeId ? "Сохранить" : "Создать"}
                </button>
                {editingRecipeId ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={resetDraft}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Отмена
                  </button>
                ) : null}
              </div>
              {actionMessage ? (
                <p className="text-sm text-muted-foreground">{actionMessage}</p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              {editingCollectionId ? "Редактирование коллекции" : "Новая коллекция"}
            </h2>
            <div className="mt-4 grid gap-3">
              <input
                type="text"
                value={collectionDraft.name}
                onChange={(event) =>
                  setCollectionDraft((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Название коллекции"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
              />
              <textarea
                value={collectionDraft.description}
                onChange={(event) =>
                  setCollectionDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Описание коллекции"
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={saveCollection}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Сохраняем..." : editingCollectionId ? "Сохранить" : "Создать"}
                </button>
                {editingCollectionId ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={resetCollectionDraft}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Отмена
                  </button>
                ) : null}
              </div>
              {actionMessage ? (
                <p className="text-sm text-muted-foreground">{actionMessage}</p>
              ) : null}
            </div>
          </>
        )}
      </section>

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-2xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          {errorMessage}
        </div>
      ) : !hasData ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-background p-8 text-center">
          <h2 className="text-lg font-semibold">Пока нет данных</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Добавьте первый рецепт или коллекцию, чтобы заполнить карточки.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-2xl font-semibold">Карточки рецептов</h2>
            {recipes.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-background p-6 text-center">
                <p className="text-sm text-muted-foreground">Рецептов пока нет.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <h3 className="text-base font-semibold">{recipe.name}</h3>
                    {recipe.description ? (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {recipe.description}
                      </p>
                    ) : null}
                    {recipe.instructions ? (
                      <p className="mt-3 line-clamp-4 text-sm">{recipe.instructions}</p>
                    ) : null}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => beginEdit(recipe)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => deleteRecipe(recipe.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Карточки коллекций</h2>
            {collections.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-background p-6 text-center">
                <p className="text-sm text-muted-foreground">Коллекций пока нет.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((collection) => (
                  <article
                    key={collection.id}
                    className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <h3 className="text-base font-semibold">{collection.name}</h3>
                    <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                      {collection.description ?? "Без описания"}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => beginEditCollection(collection)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => deleteCollection(collection.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                    {recipes.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {recipesByCollection[collection.id]?.length ? (
                          <div className="space-y-2 rounded-lg border border-border p-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Рецепты в коллекции
                            </p>
                            {recipesByCollection[collection.id].map((collectionRecipe) => (
                              <div
                                key={collectionRecipe.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <p className="truncate text-sm">{collectionRecipe.name}</p>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() =>
                                    removeRecipeFromCollection(
                                      collection.id,
                                      collectionRecipe.id
                                    )
                                  }
                                  className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Удалить
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">В коллекции пока нет рецептов.</p>
                        )}
                        <select
                          value={selectedRecipeByCollection[collection.id] ?? ""}
                          onChange={(event) =>
                            setSelectedRecipeByCollection((prev) => ({
                              ...prev,
                              [collection.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus-visible:ring-3"
                        >
                          <option value="">Выберите рецепт</option>
                          {recipes.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => addRecipeToCollection(collection.id)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Добавить в коллекцию
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Сначала создайте рецепт, затем его можно добавить в коллекцию.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
