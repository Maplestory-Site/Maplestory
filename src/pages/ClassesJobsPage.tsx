import { useMemo, useState } from "react";
import { CTASection } from "../components/classes/CTASection";
import { CategoryNav } from "../components/classes/CategoryNav";
import { ClassDetailsPanel } from "../components/classes/ClassDetailsPanel";
import { ClassGrid } from "../components/classes/ClassGrid";
import { FilterBar } from "../components/classes/FilterBar";
import { PageHero } from "../components/classes/PageHero";
import {
  classCategories,
  classDifficulties,
  classJobs,
  classPlaystyles,
  type ClassCategory,
  type ClassDifficulty,
  type ClassJob,
  type ClassPlaystyle
} from "../data/classesJobs";
import { usePageMeta } from "../app/usePageMeta";

export function ClassesJobsPage() {
  usePageMeta(
    "Classes & Jobs",
    "Browse MapleStory classes by faction, playstyle, and difficulty inside the SNAILSLAYER class directory."
  );

  const [selectedCategory, setSelectedCategory] = useState<"All" | ClassCategory>("All");
  const [selectedPlaystyle, setSelectedPlaystyle] = useState<"All" | ClassPlaystyle>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"All" | ClassDifficulty>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassJob | null>(null);

  const categoryCounts = useMemo(
    () => [
      { label: "All" as const, count: classJobs.length },
      ...classCategories.map((category) => ({
        label: category,
        count: classJobs.filter((item) => item.category === category).length
      }))
    ],
    []
  );

  const filteredClasses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return classJobs.filter((item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesPlaystyle = selectedPlaystyle === "All" || item.playstyle === selectedPlaystyle;
      const matchesDifficulty = selectedDifficulty === "All" || item.difficulty === selectedDifficulty;
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesPlaystyle && matchesDifficulty && matchesSearch;
    });
  }, [searchQuery, selectedCategory, selectedPlaystyle, selectedDifficulty]);

  return (
    <div className="classes-page">
      <div className="page-shell">
        <PageHero
          title="Classes & Jobs"
          subtitle="Discover each faction, compare playstyles, and find the class that fits your next main."
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
            <span>Discovery</span>
            <h2>{filteredClasses.length} classes ready to browse</h2>
          </div>
          <p>Tap any job to open strengths, weaknesses, playstyle, and ratings.</p>
        </section>

        <ClassGrid items={filteredClasses} onSelect={setSelectedClass} />

        <CTASection />
      </div>

      <ClassDetailsPanel item={selectedClass} onClose={() => setSelectedClass(null)} />
    </div>
  );
}
