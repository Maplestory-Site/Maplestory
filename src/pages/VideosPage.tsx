import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "../app/usePageMeta";
import { ClipEditorStudio } from "../components/content/ClipEditorStudio";
import { ContentFilterBar } from "../components/content/ContentFilterBar";
import { CtaBanner } from "../components/content/CtaBanner";
import { RecommendationPanel } from "../components/content/RecommendationPanel";
import { VideoCard } from "../components/content/VideoCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { mockWatchHistory } from "../features/profile/mockProfileData";
import { youtubeChannelUrl, youtubeLastSynced, youtubeVideos } from "../data/youtubeFeed";
import { buildRecommendationSections } from "../lib/aiExperience";
import { contentFilters, filterVideos, type ContentFilterKey, inferPrimaryCategory } from "../lib/contentDiscovery";

export function VideosPage() {
  usePageMeta("Videos", "Browse MapleStory guides, bossing videos, progression uploads, and featured channel releases.");
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const currentFilter = (searchParams.get("filter") || "all") as ContentFilterKey;
  const pageSize = 8;

  const safeFilter = contentFilters.some((filter) => filter.key === currentFilter) ? currentFilter : "all";
  const filteredVideos = useMemo(() => filterVideos(youtubeVideos, safeFilter), [safeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const filterCounts = useMemo(
    () =>
      youtubeVideos.reduce<Record<ContentFilterKey, number>>(
        (counts, item) => {
          counts.all += 1;
          counts[inferPrimaryCategory(item)] += 1;
          return counts;
        },
        { all: 0, boss: 0, guide: 0, funny: 0, progression: 0 }
      ),
    []
  );

  const visibleVideos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVideos.slice(start, start + pageSize).map((item) => ({
      ...item,
      featured: false
    }));
  }, [currentPage, filteredVideos]);

  const recommendationSections = useMemo(() => buildRecommendationSections(youtubeVideos, mockWatchHistory), []);
  const clipEditorMoments = useMemo(
    () => [
      {
        id: "moment-1",
        label: "Boss phase spike",
        note: "Big damage window and clean finish.",
        start: 38,
        end: 61
      },
      {
        id: "moment-2",
        label: "Route decision",
        note: "The account call that changed the run.",
        start: 74,
        end: 96
      },
      {
        id: "moment-3",
        label: "Funny recovery",
        note: "Close mistake turned into a clean save.",
        start: 118,
        end: 142
      }
    ],
    []
  );

  function updateSearch(nextPage: number, nextFilter: ContentFilterKey) {
    setSearchParams(
      nextFilter === "all"
        ? { page: String(nextPage) }
        : { page: String(nextPage), filter: nextFilter }
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToPage(nextPage: number) {
    updateSearch(nextPage, safeFilter);
  }

  function setFilter(nextFilter: ContentFilterKey) {
    updateSearch(1, nextFilter);
  }

  return (
    <>
      <section className="section section--page-start" data-reveal>
        <div className="container">
          <SectionHeader
            description={
              youtubeLastSynced
                ? `${filterCounts[safeFilter]} picks ready. Last refresh: ${new Date(youtubeLastSynced).toLocaleString("en-US")}`
                : "Start with the newest drop."
            }
            title={safeFilter === "all" ? "Latest uploads" : `${contentFilters.find((filter) => filter.key === safeFilter)?.label} picks`}
          />
          <ContentFilterBar activeFilter={safeFilter} counts={filterCounts} filters={contentFilters} onChange={setFilter} />
          <div className="video-grid">
            {visibleVideos.map((item) => (
              <VideoCard item={item} key={item.id} />
            ))}
          </div>
          {!visibleVideos.length ? (
            <div className="content-empty-state card">
              <strong>No videos in this lane yet.</strong>
              <p>Switch filters and keep moving through the latest uploads.</p>
            </div>
          ) : null}
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

      <section className="section section--tight" data-reveal>
        <div className="container">
          <ClipEditorStudio
            durationSeconds={180}
            moments={clipEditorMoments}
            sourceTitle={youtubeVideos[0]?.title || "Latest MapleStory upload"}
            thumbnail={youtubeVideos[0]?.thumbnail}
          />
        </div>
      </section>

      <section className="section section--tight" data-reveal>
        <div className="container">
          <RecommendationPanel sections={recommendationSections} />
        </div>
      </section>

      <CtaBanner
        description="Want every upload? Subscribe and stay close to the next drop."
        primaryCta={{ label: "See the Channel", href: youtubeChannelUrl }}
        secondaryCta={{ label: "Watch Live Now", href: "/live" }}
        title="Keep up"
      />
    </>
  );
}
