import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import SignUpPage from "../pages/signUp.page";
import ForgotPasswordPage from "../pages/forgotPassword.page";
import ResetPasswordPage from "../pages/resetPassword.page";
import LoginPage from "../pages/logIn.page";

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/signup" replace />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
