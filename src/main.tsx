import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Login from "./pages/Login";
import Clients from "./pages/Clients";
import ProtectedRoute from "./ProtectedRoute";
import Projects from "./pages/Projects";
import Signup from "./pages/Signup";
import LandingPage from "./pages/LandingPage";


const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> }, // 👈 public landing page
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
      { index: true, element: <Clients /> },
      { path: "projects", element: <Projects /> },
      // Add more protected pages here
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
   
  </React.StrictMode>
);
