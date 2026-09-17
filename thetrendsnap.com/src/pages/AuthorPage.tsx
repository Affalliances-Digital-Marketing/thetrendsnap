import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArticleFeed } from "@/components/ArticleFeed";
import { useSeo } from "@/hooks/useSeo";
import { initialsOf } from "@/lib/utils";

export default function AuthorPage() {
  const { name = "" } = useParams<{ name: string }>();
  const author = decodeURIComponent(name);

  useSeo({
    title: author,
    description: `Articles written by ${author} for TheTrendSnap.`,
  });

  return (
    <>
      <PageHeader
        eyebrow="Author"
        title={author}
        description={`Every story published by ${author}.`}
        breadcrumbs={[{ label: author }]}
      >
        <span className="mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
          {initialsOf(author)}
        </span>
      </PageHeader>

      <div className="container py-8">
        <ArticleFeed
          query={{ author }}
          emptyTitle="No articles yet"
          emptyMessage={`${author} hasn't published anything we can show right now.`}
        />
      </div>
    </>
  );
}
