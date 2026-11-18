import "./index.css";
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import App from "./App";
import ProtectedRoute from "./ProtectedRoute";

// Each app page is its own chunk, so the first load only pulls what it shows.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceView = lazy(() => import("./pages/InvoiceView"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicInvoice = lazy(() => import("./pages/PublicInvoice"));

// Standalone pages (outside the app shell) show a plain cream screen while their chunk loads.
const Page = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-dvh bg-cream" />}>{children}</Suspense>
);

const router = createBrowserRouter(
  [
    { path: "/", element: <Page><LandingPage /></Page> },
    { path: "/login", element: <Page><Login /></Page> },
    { path: "/signup", element: <Page><Signup /></Page> },
    // The client's view of a shared invoice: no login.
    {
      path: "/i/:token",
      element: <Page><PublicInvoice /></Page>,
    },
    {
      path: "/app",
      element: (
        <ProtectedRoute>
          <App />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        { path: "clients", element: <Clients /> },
        { path: "clients/:id", element: <ClientDetail /> },
        { path: "projects", element: <Projects /> },
        { path: "projects/:id", element: <ProjectDetail /> },
        { path: "invoices", element: <Invoices /> },
        { path: "invoices/:id", element: <InvoiceView /> },
        { path: "settings", element: <Settings /> },
      ],
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  // Follows Vite's `base`: "/" on Render, "/freelancer-crm-ui/" on GitHub Pages.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" }
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
