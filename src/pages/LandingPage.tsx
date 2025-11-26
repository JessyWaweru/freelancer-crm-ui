import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const LandingPage: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-4 overflow-hidden">

      {/* ✅ Logo */}
      <img
        src={logo}
        alt="Freelancer CRM Logo"
        className="absolute top-4 right-4 w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-28 object-contain drop-shadow-lg"
      />

      {/* ✅ Card container for central content */}
      <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full mx-auto">
        <CardContent className="flex flex-col items-center justify-center space-y-6">
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            Welcome to <span className="text-white">Freelancer CRM</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-100">
            Manage your clients, projects, and workflow all in one place.
          </p>

          <Separator className="bg-white/30 my-4 w-3/4" />

          {/* ✅ Buttons using Shadcn Button component */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto justify-center">
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                className="w-full sm:w-40 bg-white text-indigo-700 hover:bg-gray-200 transition font-semibold"
              >
                Log In
              </Button>
            </Link>

            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-40 border-white text-indigo-700 hover:bg-white hover:text-indigo-700 transition font-semibold"
              >
                Sign Up
              </Button>
            </Link>
          </div>

        </CardContent>
      </Card>

      {/* ✅ Optional footer text */}
      <p className="absolute bottom-6 text-xs text-white/80">
        © {new Date().getFullYear()} Freelancer CRM. All rights reserved.
      </p>
    </div>
  );
};

export default LandingPage;
