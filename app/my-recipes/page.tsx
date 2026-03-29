export default function MyRecipesPage() {
  const recipes: Array<{ id: string; title: string }> = []
  const view: "list" | "grid" = "grid"

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Мои рецепты</h1>
          <p className="mt-3 text-muted-foreground">
            Коллекция блюд, которые вы сохранили или создали.
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Добавить рецепт
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-background p-8 text-center">
          <h2 className="text-lg font-semibold">Пока нет рецептов</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Добавьте первый рецепт, чтобы собрать персональную коллекцию.
          </p>
        </div>
      ) : view === "list" ? (
        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-background">
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
              className="flex items-center justify-between px-4 py-3 transition hover:bg-muted"
            >
              <h2 className="text-sm font-medium">{recipe.title}</h2>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-background"
              >
                Открыть
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
              className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-40 bg-muted" />
              <div className="p-4">
                <h2 className="text-sm font-semibold">{recipe.title}</h2>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
