//This is a React Router guard component — 
// it decides whether to let a user see a page or send them to the login page.


import { Navigate } from "react-router-dom";
import { isAuthed } from "./auth";
import { JSX } from "react";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}
