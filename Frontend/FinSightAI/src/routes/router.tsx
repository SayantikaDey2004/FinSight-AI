import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import SignUpPage from "../pages/signUp.page";
import ForgotPasswordPage from "../pages/forgotPassword.page";
import ResetPasswordPage from "../pages/resetPassword.page";
import LoginPage from "../pages/logIn.page";
import DashboardPage from "../pages/dashboard.page";
import LandingPage from "../pages/landing.page";

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
