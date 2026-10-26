import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import RequireAuth from "@/components/RequireAuth";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import ExplorePage from "@/pages/ExplorePage";
import GameDetailPage from "@/pages/GameDetailPage";
import FavoritesPage from "@/pages/FavoritesPage";
import SpecsPage from "@/pages/SpecsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="games/:id" element={<GameDetailPage />} />
            <Route path="login" element={<AuthPage mode="login" />} />
            <Route path="register" element={<AuthPage mode="register" />} />
            <Route
              path="favorites"
              element={
                <RequireAuth>
                  <FavoritesPage />
                </RequireAuth>
              }
            />
            <Route
              path="specs"
              element={
                <RequireAuth>
                  <SpecsPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<p className="text-muted-foreground">ไม่พบหน้านี้</p>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}