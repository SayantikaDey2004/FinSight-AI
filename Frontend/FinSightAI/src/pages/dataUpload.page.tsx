import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "../lib/toast";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Brain, CheckCircle, CloudUpload, File, RefreshCw, Target, Upload } from "lucide-react";
import { clearAuthSession, getStoredAccessToken } from "../services/authApi";
import { uploadStatementFiles, fetchLatestStatementAnalysis } from "../services/statementApi";
import FinSightSidebar from "../components/ui/FinSightSidebar";

interface UploadItem {
  file: File;
  progress: number;
  status: "idle" | "uploading" | "done";
}

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/csv"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileBadge(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "file";
  if (ext === "pdf") return { label: "PDF", color: "#f87171" };
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return { label: ext.toUpperCase(), color: "#818cf8" };
  if (ext === "csv") return { label: "CSV", color: "#06d6a0" };
  return { label: "FILE", color: "#94a3b8" };
}

export default function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      clearAuthSession();
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const uploadedCount = useMemo(() => files.filter((item) => item.status === "done").length, [files]);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    setError("");
    const next = [...files];

    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_MIME.includes(file.type) && !file.name.toLowerCase().endsWith(".csv")) {
        setError(`"${file.name}" is not a supported format.`);
        continue;
      }
      if (file.size > 1_048_576) {
        setError(`"${file.name}" exceeds the 1 MB limit.`);
        continue;
      }
      if (next.some((item) => item.file.name === file.name)) {
        continue;
      }
      next.push({ file, progress: 0, status: "idle" });
    }

    setFiles(next);
    setDone(false);
  }

  async function runAnalysis() {
    if (!files.length) {
      setError("Please upload at least one file.");
      return;
    }


    setUploading(true);
    setError("");
    setDone(false);
    setToast("Processing started — this can take up to 60 seconds.");

    try {
      setFiles((previous) => previous.map((item) => ({ ...item, progress: 35, status: "uploading" })));

      const analysis = await uploadStatementFiles(files.map((item) => item.file));

      setFiles((previous) => previous.map((item) => ({ ...item, progress: 100, status: "done" })));

      setDone(true);
      setToast(analysis.transactions.length > 0 ? "File uploaded and analyzed successfully." : "File uploaded — processing continues in background.");

      // If backend returned no transactions yet, poll the latest analysis briefly
      if (!analysis.transactions || analysis.transactions.length === 0) {
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 2000;

        while (attempts < maxAttempts) {
          // eslint-disable-next-line no-await-in-loop
          const latest = await fetchLatestStatementAnalysis();
          if (latest && latest.transactions && latest.transactions.length > 0) {
            window.setTimeout(() => navigate("/transactions"), 300);
            return;
          }
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, pollInterval));
          attempts += 1;
        }

        // fallback: navigate anyway so user can see the pending state
        window.setTimeout(() => navigate("/transactions"), 700);
      } else {
        window.setTimeout(() => navigate("/transactions"), 700);
      }
    } catch (error) {
      if (error instanceof Error && /(401|403|Not authenticated|Invalid or expired token)/i.test(error.message)) {
        clearAuthSession();
        navigate("/login", { replace: true });
        return;
      }

      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
      setFiles((previous) => previous.map((item) => ({ ...item, progress: 0, status: "idle" })));
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFiles([]);
    setUploading(false);
    setDone(false);
    setError("");
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(14,165,233,0.16), transparent 32%), linear-gradient(180deg, #040814 0%, #070c18 38%, #050816 100%)", color: "#e2e8f0" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        input::placeholder { color: #64748b; }
      `}</style>
      <FinSightSidebar />

      <header style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(16px)", background: "rgba(4,8,20,0.72)", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>FinSightAI</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Upload documents</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 48px" }}>
        <section style={{ background: "linear-gradient(160deg, rgba(12,18,36,0.95), rgba(8,12,24,0.92))", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.26)", padding: 24, marginBottom: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 700 }}>Upload data</div>
              <h1 style={{ marginTop: 10, marginBottom: 6, fontSize: 34, letterSpacing: "-0.05em", lineHeight: 1.08 }}>Document <span style={{ color: "#38bdf8" }}>Upload</span></h1>
              <p style={{ color: "#94a3b8", maxWidth: 720 }}>Drop a statement file here, simulate processing, and open the transaction history page with the uploaded snapshot.</p>
            </div>
            <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
              <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(148,163,184,0.12)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 12, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>Supported</div>
                <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>PDF, JPG, PNG, WEBP, CSV</div>
              </div>
              <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(148,163,184,0.12)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 12, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>Uploaded files</div>
                <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>{uploadedCount}/{files.length || 0} processed</div>
              </div>
            </div>
          </div>
          <div
            onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => { event.preventDefault(); setDragOver(false); addFiles(event.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "rgba(56,189,248,0.7)" : "rgba(148,163,184,0.18)"}`,
              background: dragOver ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.03)",
              borderRadius: 22,
              padding: 32,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <div style={{ width: 68, height: 68, borderRadius: 22, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <CloudUpload size={28} color="#38bdf8" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Drop files here or click to upload</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 18 }}>The backend runs OCR on your uploaded files, converts the statement into JSON, and opens the history page after processing.</p>
            <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} style={{ padding: "12px 20px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #38bdf8, #6366f1)", color: "white", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Upload size={15} /> Choose File
            </button>
            <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.csv" onChange={(event) => addFiles(event.target.files)} style={{ display: "none" }} />
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", color: "#fca5a5" }}>
              {error}
            </div>
          )}
        </section>

        {files.length > 0 && (
          <section style={{ background: "rgba(8, 13, 28, 0.92)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: 24, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.24)", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7dd3fc", fontWeight: 800 }}>Files</div>
                <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>{files.length} file(s) ready for processing</div>
              </div>
              {!uploading && (
                <button onClick={reset} style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <RefreshCw size={14} /> Clear all
                </button>
              )}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {files.map((item, index) => {
                const badge = fileBadge(item.file.name);
                return (
                  <div key={item.file.name} style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.12)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 42, height: 42, borderRadius: 14, background: `${badge.color}18`, border: `1px solid ${badge.color}30`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <File size={18} color={badge.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.file.name}</div>
                            <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 13 }}>{formatBytes(item.file.size)}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            {item.status === "done" ? <CheckCircle size={18} color="#06d6a0" /> : <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#38bdf8", animation: "spin 1s linear infinite" }} />}
                          </div>
                        </div>
                        <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ width: `${item.progress}%`, height: "100%", background: item.status === "done" ? "linear-gradient(90deg, #06d6a0, #22d3ee)" : "linear-gradient(90deg, #38bdf8, #6366f1)", transition: "width 0.15s linear" }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10, color: "#94a3b8", fontSize: 12 }}>
                      <span>{badge.label}</span>
                      <span>{item.status === "done" ? "Processed" : item.status === "uploading" ? "Uploading..." : `Ready ${index + 1}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!done && (
              <button
                type="button"
                onClick={runAnalysis}
                disabled={uploading || files.length === 0}
                style={{
                  marginTop: 18,
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 16,
                  border: "none",
                  background: uploading || files.length === 0 ? "rgba(56,189,248,0.45)" : "linear-gradient(135deg, #38bdf8, #6366f1)",
                  color: "white",
                  fontWeight: 800,
                  cursor: uploading || files.length === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                {uploading ? "Processing..." : <><Brain size={16} /> Analyse with AI <ArrowRight size={14} /></>}
              </button>
            )}
          </section>
        )}

        {done && (
          <section style={{ background: "linear-gradient(135deg, rgba(6,214,160,0.08), rgba(59,130,246,0.06))", border: "1px solid rgba(6,214,160,0.22)", borderRadius: 24, padding: 24, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px", background: "rgba(6,214,160,0.12)", border: "2px solid #06d6a0", display: "grid", placeItems: "center" }}>
              <CheckCircle size={26} color="#06d6a0" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Analysis complete</h3>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>The backend saved the OCR result. You can open the transaction history page now or it will redirect automatically.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/transactions")} style={{ padding: "12px 20px", borderRadius: 999, border: "none", background: "linear-gradient(135deg, #38bdf8, #6366f1)", color: "white", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={15} /> View Report
              </button>
              <button onClick={reset} style={{ padding: "12px 20px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.14)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <RefreshCw size={15} /> Upload Another
              </button>
            </div>
          </section>
        )}

        {!files.length && !done && (
          <section style={{ background: "rgba(8, 13, 28, 0.92)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: 24, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.24)" }}>
            <div style={{ display: "grid", gap: 14 }}>
              {[
                { icon: Upload, title: "Upload a statement", text: "PDF, images, or CSV files from any bank." },
                { icon: Brain, title: "Extract transactions", text: "The backend stores the parsed JSON for your latest upload." },
                { icon: Target, title: "Open transaction history", text: "Review the saved entries on the next screen." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon size={16} color="#38bdf8" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{item.title}</div>
                      <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 13 }}>{item.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>
    {toast && <Toast message={toast} onClose={() => setToast(null)} />}
  </div>
  );
}
