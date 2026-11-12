import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import App from "./App";
import ProtectedRoute from "./ProtectedRoute";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import InvoiceView from "./pages/InvoiceView";
import Invoices from "./pages/Invoices";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import Signup from "./pages/Signup";

const router = createBrowserRouter(
  [
    { path: "/", element: <LandingPage /> },
    { path: "/login", element: <Login /> },
    { path: "/signup", element: <Signup /> },
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
        { path: "projects", element: <Projects /> },
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
