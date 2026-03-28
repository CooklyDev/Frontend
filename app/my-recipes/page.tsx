export default function MyRecipesPage() {
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

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-background p-8 text-center">
        <h2 className="text-lg font-semibold">Пока нет рецептов</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Добавьте первый рецепт, чтобы собрать персональную коллекцию.
        </p>
      </div>
    </section>
  )
}
