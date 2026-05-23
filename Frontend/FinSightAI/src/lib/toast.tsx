import { useEffect } from "react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed",
      bottom: 32,
      left: 0,
      right: 0,
      margin: "0 auto",
      zIndex: 9999,
      width: 340,
      maxWidth: "90vw",
      background: "linear-gradient(90deg,#06d6a0,#22d3ee)",
      color: "#fff",
      fontWeight: 700,
      fontSize: 16,
      borderRadius: 14,
      boxShadow: "0 4px 24px rgba(6,214,160,0.18)",
      padding: "16px 24px",
      textAlign: "center",
      pointerEvents: "none",
    }}>
      {message}
    </div>
  );
}
