import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "../components/layout/RootLayout";
import { AboutPage } from "../pages/AboutPage";
import { ClassesJobsPage } from "../pages/ClassesJobsPage";
import { CommunityPage } from "../pages/CommunityPage";
import { ContactPage } from "../pages/ContactPage";
import { GameHubPage } from "../pages/GameHubPage";
import { GameAchievementsPage } from "../pages/GameAchievementsPage";
import { HomePage } from "../pages/HomePage";
import { LivePage } from "../pages/LivePage";
import { MonstersPage } from "../pages/MonstersPage";
import { NewsPage } from "../pages/NewsPage";
import { ProfilePage } from "../pages/ProfilePage";
import { VideosPage } from "../pages/VideosPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "classes", element: <ClassesJobsPage /> },
      { path: "database", element: <Navigate replace to="/database/monster" /> },
      { path: "database/:section", element: <MonstersPage /> },
      { path: "monsters", element: <Navigate replace to="/database/monster" /> },
      { path: "news", element: <NewsPage /> },
      { path: "games", element: <GameHubPage /> },
      { path: "games/achievements", element: <GameAchievementsPage /> },
      { path: "videos", element: <VideosPage /> },
      { path: "live", element: <LivePage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "community", element: <CommunityPage /> },
      { path: "contact", element: <ContactPage /> }
    ]
  }
]);
