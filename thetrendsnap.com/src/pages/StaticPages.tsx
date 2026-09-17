import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewsletterCard } from "@/components/ui/Newsletter";
import { useCategories } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

export function AboutPage() {
  useSeo({
    title: "About Us",
    description: "Who we are and how TheTrendSnap covers the stories that matter.",
  });

  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="About TheTrendSnap"
        description="Independent coverage of the news, products and ideas shaping what comes next."
        breadcrumbs={[{ label: "About" }]}
      />

      <div className="container grid gap-8 py-10 lg:grid-cols-12">
        <div className="article-body lg:col-span-8">
          <p>
            TheTrendSnap is a daily publication for people who want to stay ahead without
            drowning in noise. We cover breaking news, hands-on reviews, practical guides and
            the long-running trends behind them — written plainly, checked carefully.
          </p>

          <h2>What we publish</h2>
          <ul>
            <li><strong>News</strong> — what happened, why it matters, and what changes next.</li>
            <li><strong>Reviews</strong> — real usage over spec sheets, with clear verdicts.</li>
            <li><strong>Guides</strong> — step-by-step help you can actually follow.</li>
            <li><strong>Trends</strong> — the patterns connecting individual stories.</li>
          </ul>

          <h2>How we work</h2>
          <p>
            Every article names its author and its sources. Corrections are made openly and
            marked with an update date. Sponsored placements are always labelled as
            advertising and never influence editorial coverage.
          </p>

          <h2>Get in touch</h2>
          <p>
            Story tips, corrections and partnership enquiries are all welcome — reach us
            through the <Link to="/contact">contact page</Link>.
          </p>
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <NewsletterCard source="about" />
          <div className="card p-5">
            <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
              By the numbers
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Published daily", "7 days a week"],
                ["Focus areas", "News · Reviews · Guides"],
                ["Reader newsletter", "25,000+ subscribers"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500 dark:text-ink-400">{label}</dt>
                  <dd className="font-bold text-ink-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Privacy                                                             */
/* ------------------------------------------------------------------ */

export function PrivacyPage() {
  useSeo({
    title: "Privacy Policy",
    description: "How TheTrendSnap collects, uses and protects your data.",
  });

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="Last updated: the date of your most recent visit to this page."
        breadcrumbs={[{ label: "Privacy Policy" }]}
      />

      <div className="container py-10">
        <div className="article-body max-w-3xl">
          <h2>What we collect</h2>
          <p>
            We collect the email address you submit to our newsletter, anything you send us
            through the contact form, and anonymous usage data such as page views.
          </p>

          <h2>How we use it</h2>
          <ul>
            <li>To send the newsletter you asked for.</li>
            <li>To reply to messages you send us.</li>
            <li>To understand which articles readers find useful.</li>
          </ul>

          <h2>Local storage</h2>
          <p>
            Your theme preference and reading list are stored in your own browser. They never
            leave your device and are not linked to any account.
          </p>

          <h2>Advertising</h2>
          <p>
            Banner placements are served from our own ad system. Where a third-party ad network
            is used, its own privacy policy applies to the data it collects.
          </p>

          <h2>Your choices</h2>
          <p>
            You can unsubscribe from the newsletter at any time, and you can ask us to delete
            any message or subscription record by writing to us via the{" "}
            <Link to="/contact">contact page</Link>.
          </p>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Terms                                                               */
/* ------------------------------------------------------------------ */

export function TermsPage() {
  useSeo({
    title: "Terms of Use",
    description: "The terms that apply when you use TheTrendSnap.",
  });

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Use"
        description="The ground rules for using this site."
        breadcrumbs={[{ label: "Terms of Use" }]}
      />

      <div className="container py-10">
        <div className="article-body max-w-3xl">
          <h2>Using this site</h2>
          <p>
            You may read, link to and share our articles. Republishing full articles without
            permission is not allowed.
          </p>

          <h2>Accuracy</h2>
          <p>
            We work hard to be accurate and correct mistakes quickly, but articles are provided
            without warranty. Always verify critical details independently.
          </p>

          <h2>External links</h2>
          <p>
            Some links are affiliate or sponsored links, and are marked as such. We are not
            responsible for the content of external sites.
          </p>

          <h2>Changes</h2>
          <p>
            These terms may be updated as the site evolves. Continued use means you accept the
            current version.
          </p>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sitemap (human readable)                                            */
/* ------------------------------------------------------------------ */

export function SitemapPage() {
  const { data: categories = [] } = useCategories({ withCounts: true });

  useSeo({
    title: "Sitemap",
    description: "Every section of TheTrendSnap in one place.",
  });

  const sections = [
    {
      title: "Main",
      links: [
        { label: "Home", to: "/" },
        { label: "Latest Articles", to: "/latest" },
        { label: "Trending Now", to: "/trending" },
        { label: "Most Popular", to: "/popular" },
        { label: "Photo Gallery", to: "/gallery" },
        { label: "Videos", to: "/videos" },
        { label: "Reading List", to: "/bookmarks" },
      ],
    },
    {
      title: "Categories",
      links: categories.map((category) => ({
        label: category.name,
        to: `/category/${category.slug}`,
      })),
    },
    {
      title: "Company",
      links: [
        { label: "About Us", to: "/about" },
        { label: "Contact Us", to: "/contact" },
        { label: "Newsletter", to: "/newsletter" },
        { label: "Privacy Policy", to: "/privacy-policy" },
        { label: "Terms of Use", to: "/terms" },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Navigate"
        title="Sitemap"
        description="Every page on TheTrendSnap, one click away."
        breadcrumbs={[{ label: "Sitemap" }]}
      />

      <div className="container grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <nav key={section.title} className="card p-5" aria-label={section.title}>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-900 dark:text-white">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-600 transition-colors hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Newsletter                                                          */
/* ------------------------------------------------------------------ */

export function NewsletterPage() {
  useSeo({
    title: "Newsletter",
    description: "Get the best of TheTrendSnap in your inbox.",
  });

  return (
    <>
      <PageHeader
        eyebrow="Free"
        title="The TheTrendSnap Newsletter"
        description="One email, every weekday: the stories worth your time, summarised in two minutes."
        breadcrumbs={[{ label: "Newsletter" }]}
      />

      <div className="container grid gap-8 py-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <NewsletterCard source="newsletter-page" />
        </div>
        <div className="article-body lg:col-span-5">
          <h2>What you get</h2>
          <ul>
            <li>The day's biggest story, explained in plain language.</li>
            <li>Three reads worth your time, hand-picked by our editors.</li>
            <li>A short "what to watch" note for the days ahead.</li>
          </ul>
          <p>No spam. Unsubscribe with one click, any time.</p>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 404                                                                 */
/* ------------------------------------------------------------------ */

export function NotFoundPage() {
  useSeo({ title: "Page not found", robots: "noindex, follow" });

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-7xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-900 dark:text-white">
        This page went off the record
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">
        The link may be broken or the story may have moved. Try the homepage or search
        for what you were after.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          Back home
        </Link>
        <Link
          to="/latest"
          className="inline-flex h-11 items-center rounded-xl border border-ink-200 px-5 text-sm font-bold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-200"
        >
          Browse latest
        </Link>
      </div>
    </div>
  );
}
