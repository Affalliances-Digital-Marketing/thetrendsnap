import { Link } from "react-router-dom";
import type { Article, Category } from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/Bits";
import { articleImage, imageUrl } from "@/lib/utils";

/**
 * "Explore by Category" — the cover falls back to the newest article image in
 * that category, so cards still look designed when no category art is set.
 */
export function CategoryGrid({
  categories,
  articles,
  loading,
}: {
  categories: Category[];
  articles: Article[];
  loading?: boolean;
}) {
  const coverFor = (category: Category, index: number): string => {
    const own = imageUrl(category.image) || imageUrl(category.coverImage) || imageUrl(category.banner);
    if (own) return own;

    const match = articles.find((article) => {
      const cat = typeof article.category === "string" ? null : article.category;
      return cat?._id === category._id;
    });

    return articleImage(match || articles[index % Math.max(1, articles.length)] || ({} as Article));
  };

  if (loading) {
    return (
      <section>
        <Skeleton className="mb-4 h-7 w-52" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-[212px] w-[164px] shrink-0 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!categories.length) return null;

  // Two passes of the list keep the right-to-left loop seamless.
  const track = [...categories, ...categories];

  return (
    <section aria-labelledby="explore-categories">
      <SectionHeader
        title="Explore by Category"
        subtitle="Jump straight into the topics you follow."
        action="All categories"
        actionHref="/categories"
      />

      {/* The strip drifts on its own, stops under the pointer or a focused
          card so a name can actually be read, and becomes a plain scrollable
          row for anyone who asks for reduced motion. */}
      <div className="group/marquee relative overflow-hidden rounded-2xl motion-reduce:overflow-x-auto">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent dark:from-[#0b1120]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent dark:from-[#0b1120]"
        />

        <ul className="flex w-max animate-marquee-slow items-stretch gap-3 py-1 [animation-play-state:running] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none">
          {track.map((category, index) => (
            <li key={`${category._id}-${index}`} aria-hidden={index >= categories.length}>
              <Link
                to={`/category/${category.slug}`}
                tabIndex={index >= categories.length ? -1 : undefined}
                className="group flex h-full w-[150px] flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:w-[164px] dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-500/40"
              >
                <div className="relative">
                  {/* square frame, image fills it, nothing cropped away oddly */}
                  <SmartImage
                    src={coverFor(category, index)}
                    alt=""
                    ratio="aspect-square"
                    rounded="rounded-none"
                    fit="contain"
                    width={360}
                    backdropClassName="opacity-70 blur-2xl"
                    imgClassName="transition-transform duration-500 group-hover:scale-[1.06]"
                  />

                  {typeof category.articleCount === "number" && category.articleCount > 0 && (
                    <span className="absolute right-2 top-2 chip bg-ink-900/80 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                      {category.articleCount}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-center gap-0.5 px-3 py-2.5">
                  <span className="text-xs font-bold tracking-wide text-brand-600 dark:text-brand-400">
                    Category
                  </span>
                  <span className="clamp-2 font-display text-[13px] font-bold leading-snug text-ink-900 dark:text-white">
                    {category.name}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
