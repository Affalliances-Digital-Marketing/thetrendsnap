import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArticleFeed } from "@/components/ArticleFeed";
import { useSeo } from "@/hooks/useSeo";

export default function TagPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const label = slug.replace(/-/g, " ");

  useSeo({
    title: `#${label}`,
    description: `Articles tagged ${label} on TheTrendSnap.`,
  });

  return (
    <>
      <PageHeader
        eyebrow="Topic"
        title={`#${label}`}
        description={`Everything we've published about ${label}.`}
        breadcrumbs={[{ label: `#${label}` }]}
      />
      <div className="container py-8">
        <ArticleFeed
          query={{ tag: slug }}
          emptyTitle="No articles with this tag"
          emptyMessage="Try another topic or browse the latest stories."
        />
      </div>
    </>
  );
}
