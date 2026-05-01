import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nProvider";
import { LibraryPage } from "../LibraryPage";

function renderLibraryRoute(path: string) {
  return renderToString(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/classes/:classId" element={<LibraryPage />} />
          <Route path="/library/:guideId" element={<LibraryPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("LibraryPage", () => {
  it("renders the Maple Library page shell", () => {
    const html = renderLibraryRoute("/library");

    expect(html).toContain("Maple Library");
    expect(html).toContain("Search guides");
    expect(html).toContain("Featured guides");
    expect(html).toContain("Class Library");
    expect(html).toContain("All Actives");
  });

  it("renders guide detail content from the route", () => {
    const html = renderLibraryRoute("/library/progression-overview");

    expect(html).toContain("Progression Roadmap");
    expect(html).toContain("Quick Summary");
    expect(html).toContain("Related Guides");
    expect(html).toContain("Content / General");
  });

  it("renders the class detail route with Bishop skill sections", () => {
    const html = renderLibraryRoute("/library/classes/bishop");

    expect(html).toContain("Bishop");
    expect(html).toContain("Class Properties");
    expect(html).toContain("Active Buffs");
    expect(html).toContain("Holy Symbol");
    expect(html).toContain("Benediction");
  });
});
