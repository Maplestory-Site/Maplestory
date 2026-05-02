import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "../components/layout/RootLayout";

const AboutPage = lazy(() => import("../pages/AboutPage").then((module) => ({ default: module.AboutPage })));
const ClassesJobsPage = lazy(() => import("../pages/ClassesJobsPage").then((module) => ({ default: module.ClassesJobsPage })));
const CommunityPage = lazy(() => import("../pages/CommunityPage").then((module) => ({ default: module.CommunityPage })));
const ContactPage = lazy(() => import("../pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const GameHubPage = lazy(() => import("../pages/GameHubPage").then((module) => ({ default: module.GameHubPage })));
const GameAchievementsPage = lazy(() => import("../pages/GameAchievementsPage").then((module) => ({ default: module.GameAchievementsPage })));
const HomePage = lazy(() => import("../pages/HomePage").then((module) => ({ default: module.HomePage })));
const LibraryPage = lazy(() => import("../pages/LibraryPage").then((module) => ({ default: module.LibraryPage })));
const LivePage = lazy(() => import("../pages/LivePage").then((module) => ({ default: module.LivePage })));
const MonstersPage = lazy(() => import("../pages/MonstersPage").then((module) => ({ default: module.MonstersPage })));
const NewsArticlePage = lazy(() => import("../pages/NewsArticlePage").then((module) => ({ default: module.NewsArticlePage })));
const NewsPage = lazy(() => import("../pages/NewsPage").then((module) => ({ default: module.NewsPage })));
const ProfilePage = lazy(() => import("../pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const VideosPage = lazy(() => import("../pages/VideosPage").then((module) => ({ default: module.VideosPage })));

function routeElement(Page: ComponentType) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Page />
    </Suspense>
  );
}

function RouteLoadingFallback() {
  return (
    <div role="status" aria-label="Loading page" style={{ padding: "1.5rem 0", textAlign: "center", opacity: 0.72 }}>
      Loading...
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: routeElement(HomePage) },
      { path: "classes", element: routeElement(ClassesJobsPage) },
      { path: "database", element: <Navigate replace to="/database/monster" /> },
      { path: "database/simulator", element: <Navigate replace to="/database/monster" /> },
      { path: "database/:section", element: routeElement(MonstersPage) },
      { path: "monsters", element: <Navigate replace to="/database/monster" /> },
      { path: "news", element: routeElement(NewsPage) },
      { path: "news/:newsId", element: routeElement(NewsArticlePage) },
      { path: "library", element: routeElement(LibraryPage) },
      { path: "library/classes/:classId", element: routeElement(LibraryPage) },
      { path: "library/:guideId", element: routeElement(LibraryPage) },
      { path: "games", element: routeElement(GameHubPage) },
      { path: "games/achievements", element: routeElement(GameAchievementsPage) },
      { path: "videos", element: routeElement(VideosPage) },
      { path: "live", element: routeElement(LivePage) },
      { path: "profile", element: routeElement(ProfilePage) },
      { path: "about", element: routeElement(AboutPage) },
      { path: "community", element: routeElement(CommunityPage) },
      { path: "contact", element: routeElement(ContactPage) }
    ]
  }
]);
