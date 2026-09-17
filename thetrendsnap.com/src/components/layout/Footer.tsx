import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { Logo } from "@/components/ui/Logo";
import { NewsletterCard } from "@/components/ui/Newsletter";
import { useCategories, useTags } from "@/hooks/useContent";

const QUICK_LINKS = [
  { label: "Photo Gallery", to: "/gallery" },
  { label: "Videos", to: "/videos" },
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms of Use", to: "/terms" },
  { label: "Sitemap", to: "/sitemap" },
];

const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com", Icon: Facebook },
  { label: "X", href: "https://x.com", Icon: Twitter },
  { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
  { label: "LinkedIn", href: "https://linkedin.com", Icon: Linkedin },
];

export function Footer() {
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags(12);

  // With no tag collection the backend returns nothing — categories keep the
  // column populated instead of leaving a hole in the layout.
  const pills = tags.length
    ? tags.map((tag) => ({ key: tag._id, label: tag.name, to: `/tag/${tag.slug}` }))
    : categories.slice(0, 12).map((category) => ({
        key: category._id,
        label: category.name,
        to: `/category/${category.slug}`,
      }));

  return (
    <footer className="mt-14 border-t border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-[#080d19]">
      {/* Footer leaderboard: sits above the columns, collapses when unsold so
          the footer keeps its normal top spacing. */}
      <div className="container empty:hidden [&>*]:pt-8">
        <AdSlot position="footer" ratio="aspect-[970/140]" />
      </div>

      <div className="container py-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo size="lg" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              TheTrendSnap brings you the latest tech news, reviews, guides and trends that
              matter — clearly written, carefully checked, published daily.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400 dark:hover:text-brand-400"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <nav className="lg:col-span-2" aria-label="Quick links">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-900 dark:text-white">
              Quick Links
            </h2>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label="Categories">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-900 dark:text-white">
              Categories
            </h2>
            <ul className="mt-4 space-y-2.5">
              {categories.slice(0, 6).map((category) => (
                <li key={category._id}>
                  <Link
                    to={`/category/${category.slug}`}
                    className="clamp-1 text-sm text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4 space-y-8">
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-900 dark:text-white">
                Popular Topics
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {pills.map((pill) => (
                  <li key={pill.key}>
                    <Link
                      to={pill.to}
                      className="inline-block rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:text-brand-400"
                    >
                      {pill.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <NewsletterCard source="footer" variant="plain" />
          </div>
        </div>
      </div>

      <div className="border-t border-ink-200 dark:border-ink-800">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-500 sm:flex-row dark:text-ink-400">
          <p>© {new Date().getFullYear()} TheTrendSnap. All rights reserved.</p>
          <p>Made with ♥ for curious readers.</p>
        </div>
      </div>
    </footer>
  );
}
