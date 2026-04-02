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

export default function Page() {
    const [recipes, setRecipes] = useState<Recipe[]>([])
    const [collections, setCollections] = useState<Collection[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        let isActive = true

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
                    if (isActive) {
                        setErrorMessage("Не удалось загрузить карточки рецептов и коллекций")
                    }
                    return
                }

                if (isActive) {
                    setRecipes(normalizeRecipes(recipesPayload))
                    setCollections(normalizeCollections(collectionsPayload))
        }
            } catch {
                if (isActive) {
                    setErrorMessage("Не удалось загрузить карточки рецептов и коллекций")
                }
            } finally {
                if (isActive) {
                    setIsLoading(false)
                }
            }
        }

        loadCardsData()

        return () => {
            isActive = false
        }
    }, [])

    const subtitle = useMemo(() => {
        if (isLoading) {
            return "Загружаем рецепты и коллекции..."
        }

        if (errorMessage) {
            return "Попробуйте обновить страницу чуть позже."
        }

        if (!recipes.length && !collections.length) {
            return "Пока нет данных для отображения."
        }

        return `Рецептов: ${recipes.length}, коллекций: ${collections.length}`
    }, [collections.length, errorMessage, isLoading, recipes.length])

    return (
        <section className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="text-3xl font-semibold">Контент</h1>
            <p className="mt-3 text-muted-foreground">{subtitle}</p>

            {isLoading ? (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-56 animate-pulse rounded-2xl border border-border bg-muted"
                        />
                    ))}
                </div>
            ) : errorMessage ? (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                    {errorMessage}
                </div>
            ) : (
                <div className="mt-8 space-y-10">
                    <section>
                        <h2 className="text-2xl font-semibold">Рецепты</h2>
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
                                            <p className="mt-3 line-clamp-4 text-sm">
                                                {recipe.instructions}
                                            </p>
                                        ) : null}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold">Коллекции</h2>
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