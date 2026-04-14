import { useMemo, useState } from "react";
import { CTASection } from "../components/classes/CTASection";
import { CategoryNav } from "../components/classes/CategoryNav";
import { ClassDetailsPanel } from "../components/classes/ClassDetailsPanel";
import { ClassGrid } from "../components/classes/ClassGrid";
import { FilterBar } from "../components/classes/FilterBar";
import { PageHero } from "../components/classes/PageHero";
import { attachClassPreviewVideos } from "../data/classPreviewVideos";
import {
  classDifficulties,
  classJobs,
  classPlaystyles,
  type ClassDifficulty,
  type ClassJob,
  type ClassPlaystyle
} from "../data/classesJobs";
import { usePageMeta } from "../app/usePageMeta";
import { useI18n } from "../i18n/I18nProvider";

export function ClassesJobsPage() {
  const { t } = useI18n();
  usePageMeta(
    t("Classes & Jobs"),
    t("Browse MapleStory classes by faction, playstyle, and difficulty inside the SNAILSLAYER class directory.")
  );

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPlaystyle, setSelectedPlaystyle] = useState<"All" | ClassPlaystyle>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"All" | ClassDifficulty>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassJob | null>(null);
  const classesWithPreview = useMemo(() => attachClassPreviewVideos(classJobs), []);
  const getCategoryLabel = (item: ClassJob) => item.previewVideoFaction ?? item.category;

  const categoryCounts = useMemo(
    () => [
      { label: "All" as const, count: classJobs.length },
      ...Array.from(new Set(classesWithPreview.map(getCategoryLabel))).map((category) => ({
        label: category,
        count: classesWithPreview.filter((item) => getCategoryLabel(item) === category).length
      }))
    ],
    [classesWithPreview]
  );

  const filteredClasses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return classesWithPreview.filter((item) => {
      const matchesCategory = selectedCategory === "All" || getCategoryLabel(item) === selectedCategory;
      const matchesPlaystyle = selectedPlaystyle === "All" || item.playstyle === selectedPlaystyle;
      const matchesDifficulty = selectedDifficulty === "All" || item.difficulty === selectedDifficulty;
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesPlaystyle && matchesDifficulty && matchesSearch;
    });
  }, [classesWithPreview, searchQuery, selectedCategory, selectedPlaystyle, selectedDifficulty]);

  return (
    <div className="classes-page">
      <div className="page-shell">
        <PageHero
          title={t("Classes & Jobs")}
          subtitle={t("Discover each faction, compare playstyles, and find the class that fits your next main.")}
          total={classJobs.length}
        />

        <CategoryNav categories={categoryCounts} selected={selectedCategory} onSelect={setSelectedCategory} />

        <FilterBar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          playstyle={selectedPlaystyle}
          onPlaystyleChange={setSelectedPlaystyle}
          difficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          playstyles={classPlaystyles}
          difficulties={classDifficulties}
          selectedCategory={selectedCategory}
        />

        <section className="classes-results reveal-on-scroll">
          <div>
            <span>{t("Discovery")}</span>
            <h2>{filteredClasses.length} {t("classes ready to browse")}</h2>
          </div>
          <p>{t("Tap any job to open strengths, weaknesses, playstyle, and ratings.")}</p>
        </section>

        <ClassGrid items={filteredClasses} onSelect={setSelectedClass} />

        <CTASection />
      </div>

      <ClassDetailsPanel item={selectedClass} onClose={() => setSelectedClass(null)} />
    </div>
  );
}
