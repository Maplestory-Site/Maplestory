import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "../app/usePageMeta";
import { CtaBanner } from "../components/content/CtaBanner";
import { VideoCard } from "../components/content/VideoCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { youtubeChannelUrl, youtubeLastSynced, youtubeVideos } from "../data/youtubeFeed";

export function VideosPage() {
  usePageMeta("Videos", "Browse MapleStory guides, bossing videos, progression uploads, and featured channel releases.");
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = 8;

  const totalPages = Math.max(1, Math.ceil(youtubeVideos.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visibleVideos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return youtubeVideos.slice(start, start + pageSize).map((item) => ({
      ...item,
      featured: false
    }));
  }, [currentPage]);

  function goToPage(nextPage: number) {
    setSearchParams({ page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <section className="section section--page-start">
        <div className="container">
          <SectionHeader
            description={youtubeLastSynced ? `Auto-synced from YouTube. Last refresh: ${new Date(youtubeLastSynced).toLocaleString("en-US")}` : "Start with the latest upload, then keep moving through the archive."}
            title="Latest channel uploads"
          />
          <div className="video-grid">
            {visibleVideos.map((item) => (
              <VideoCard item={item} key={item.id} />
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="pagination">
              <button className="pagination__nav" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} type="button">
                Prev
              </button>
              <div className="pagination__pages">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    className={`pagination__page ${pageNumber === currentPage ? "is-active" : ""}`}
                    key={pageNumber}
                    onClick={() => goToPage(pageNumber)}
                    type="button"
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
              <button className="pagination__nav" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)} type="button">
                Next
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <CtaBanner
        description="If the videos help, subscribe and stay on top of every new upload."
        primaryCta={{ label: "Subscribe", href: youtubeChannelUrl }}
        secondaryCta={{ label: "Watch Live", href: "/live" }}
        title="Keep up with every release"
      />
    </>
  );
}
