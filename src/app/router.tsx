import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "../components/layout/RootLayout";
import { AboutPage } from "../pages/AboutPage";
import { CommunityPage } from "../pages/CommunityPage";
import { ContactPage } from "../pages/ContactPage";
import { HomePage } from "../pages/HomePage";
import { LivePage } from "../pages/LivePage";
import { VideosPage } from "../pages/VideosPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "videos", element: <VideosPage /> },
      { path: "live", element: <LivePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "community", element: <CommunityPage /> },
      { path: "contact", element: <ContactPage /> }
    ]
  }
]);
