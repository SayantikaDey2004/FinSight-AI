import React from "react";

const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "#070c18" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>{children}</div>
    </div>
  );
};

export default AuthShell;
