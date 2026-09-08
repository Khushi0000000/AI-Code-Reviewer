import { useEffect, useMemo, useState } from "react";

import {
  LayoutDashboard,
  Code2,
  GitPullRequest,
  FlaskConical,
  BookOpen,
  History,
  Settings,
  LogOut,
  Bell,
  Shield,
  Zap,
  Bug,
  Lightbulb,
  Brain,
  CheckCircle2,
  Play,
  Copy,
  Download,
  RefreshCw,
  GraduationCap,
  AlertTriangle,
  ChevronRight,
  LogIn,
  Eye,
  EyeOff,
  Trash2,
  LockKeyhole,
  BellRing,
  Palette,
  Mail,
  Database,
  Users,
  FolderPlus,
  UserPlus,
  Save,
} from "lucide-react";

import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "";


// ============================================================
// MAIN APP
// ============================================================

function App() {
  const [active, setActive] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);

  // PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  // ==========================================================
  // CODE REVIEW
  // ==========================================================

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Python");

  const [reviewCount, setReviewCount] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  // ==========================================================
  // TEST GENERATOR
  // ==========================================================

  const [testCode, setTestCode] = useState("");
  const [testLanguage, setTestLanguage] = useState("Python");

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // ==========================================================
  // HISTORY
  // ==========================================================

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ==========================================================
  // GITHUB
  // ==========================================================

  const [githubPR, setGithubPR] = useState(null);

  // ==========================================================
  // TEAM COLLABORATION
  // ==========================================================

  const [teamRefresh, setTeamRefresh] = useState(0);

  // ==========================================================
  // SETTINGS
  // ==========================================================

  const [settings, setSettings] = useState({
    reviewLevel: "Intermediate",
    theme: "Light",
    notifications: true,
    defaultLanguage: "Python",
    showSuggestions: true,
    showSecurityWarnings: true,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsTab, setSettingsTab] = useState("Profile");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("aiReviewerSettings");
      if (saved) setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch (error) {
      console.error("Settings load error:", error);
    }
  }, []);

  // Apply the selected theme to the whole application immediately.
  useEffect(() => {
    const theme = settings.theme || "Light";
    const root = document.documentElement;
    const body = document.body;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "Dark" || (theme === "System Default" && prefersDark);

    root.dataset.theme = isDark ? "dark" : "light";
    body.classList.toggle("dark-mode", isDark);

    return () => {
      body.classList.remove("dark-mode");
      delete root.dataset.theme;
    };
  }, [settings.theme]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSettingsSaved(false);
  };

  const saveSettings = () => {
    localStorage.setItem("aiReviewerSettings", JSON.stringify(settings));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const isStrongPassword = (password) => (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill all password fields.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setPasswordError("New password must be 8+ characters with uppercase, lowercase, number and special character.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to change password.");
      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      setPasswordError(error.message || "Unable to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // ==========================================================
  // MENU
  // ==========================================================

  const menu = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Code Review",
      icon: Code2,
    },
    {
      name: "GitHub PR",
      icon: GitPullRequest,
    },
    {
      name: "Test Generator",
      icon: FlaskConical,
    },
    {
      name: "Learning Mode",
      icon: BookOpen,
    },
    {
      name: "Review History",
      icon: History,
    },
    {
      name: "Team Workspace",
      icon: Users,
    },
  ];

  // ==========================================================
  // CHECK CURRENT LOGIN SESSION
  // ==========================================================

  const loadCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/me`, {
        credentials: "include",
      });
      const data = await readJsonResponse(response);

      if (response.ok && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // ==========================================================
  // LOAD REVIEW COUNT
  // ==========================================================

  const loadReviewCount = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/review-count`,
        { credentials: "include" }
      );

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || "Review count API failed"
        );
      }

      setReviewCount(
        Number(data.count || 0)
      );
    } catch (error) {
      console.error(
        "Review count error:",
        error
      );
    }
  };

  // ==========================================================
  // LOAD HISTORY
  // ==========================================================

  const loadHistory = async (showError = false) => {
    if (!user) {
      setHistory([]);
      return false;
    }

    setHistoryLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/reviews`,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      // Session expire hone par popup baar-baar mat dikhao.
      // User ko cleanly login screen par bhej do.
      if (response.status === 401 || response.status === 403) {
        setHistory([]);
        setUser(null);
        localStorage.removeItem("user");

        if (showError) {
          alert("Your login session has expired. Please login again.");
        }

        return false;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to load review history"
        );
      }

      setHistory(
        Array.isArray(data.reviews)
          ? data.reviews
          : []
      );

      return true;
    } catch (error) {
      console.error(
        "History error:",
        error
      );

      setHistory([]);

      if (showError) {
        alert(
          "Review history load nahi ho rahi.\n\n" +
            error.message
        );
      }

      return false;
    } finally {
      setHistoryLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadReviewCount();
    }
  }, [authLoading, user]);

  // ==========================================================
  // CODE REVIEW
  // ==========================================================

  const handleReview = async () => {
    if (!code.trim()) {
      alert(
        "Please paste your code first."
      );
      return;
    }

    setReviewLoading(true);
    setReviewResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/review`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            code: code,
            language: language,
          }),
        }
      );

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Code review failed"
        );
      }

      setReviewResult(data);

      await loadReviewCount();
      await loadHistory(false);
    } catch (error) {
      console.error(
        "Review error:",
        error
      );

      alert(
        "Backend se connection nahi ho raha.\n\n" +
          error.message
      );
    } finally {
      setReviewLoading(false);
    }
  };

  // ==========================================================
  // TEST GENERATOR
  // ==========================================================

  const handleGenerateTests = async () => {
    if (!testCode.trim()) {
      alert(
        "Please paste your code first."
      );
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/generate-tests`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            code: testCode,
            language: testLanguage,
          }),
        }
      );

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Test generation failed"
        );
      }

      setTestResult(data);
    } catch (error) {
      console.error(
        "Test Generator error:",
        error
      );

      alert(
        "Test Generator backend se connection nahi ho raha.\n\n" +
          error.message
      );
    } finally {
      setTestLoading(false);
    }
  };

  // ==========================================================
  // GET GENERATED TEST CODE
  // ==========================================================

  const getGeneratedTestCode = () => {
    if (!testResult) {
      return "";
    }

    if (typeof testResult === "string") {
      return testResult;
    }

    return (
      testResult.test_code ||
      testResult.generated_tests ||
      testResult.code ||
      ""
    );
  };

  // ==========================================================
  // COPY TEST CODE
  // ==========================================================

  const copyTestCode = async () => {
    const generated =
      getGeneratedTestCode();

    if (!generated) {
      alert(
        "No generated test code available."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        generated
      );

      alert(
        "Test code copied successfully!"
      );
    } catch (error) {
      console.error(
        "Copy error:",
        error
      );

      alert(
        "Unable to copy test code."
      );
    }
  };

  // ==========================================================
  // DOWNLOAD TEST CODE
  // ==========================================================

  const downloadTestCode = () => {
    const generated =
      getGeneratedTestCode();

    if (!generated) {
      alert(
        "No generated test code available."
      );
      return;
    }

    let extension = "txt";

    if (testLanguage === "Python") {
      extension = "py";
    } else if (
      testLanguage === "JavaScript"
    ) {
      extension = "test.js";
    } else if (
      testLanguage === "Java"
    ) {
      extension = "java";
    } else if (
      testLanguage === "C++"
    ) {
      extension = "cpp";
    } else if (
      testLanguage === "SQL"
    ) {
      extension = "sql";
    }

    const blob = new Blob(
      [generated],
      {
        type: "text/plain",
      }
    );

    const url =
      window.URL.createObjectURL(
        blob
      );

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `generated_tests.${extension}`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  // ==========================================================
  // MENU CLICK
  // ==========================================================

  const handleMenuClick = (name) => {
    setActive(name);

    if (name === "Review History") {
      loadHistory(true);
    }

    if (name === "Dashboard") {
      loadReviewCount();
    }
  };

  // ==========================================================
  // AUTH SUCCESS
  // ==========================================================

  const handleAuthSuccess = async (authenticatedUser) => {
    setUser(authenticatedUser);
    localStorage.setItem("user", JSON.stringify(authenticatedUser));
    setActive("Dashboard");
    setReviewResult(null);
    setGithubPR(null);

    await loadReviewCount();
    // Dashboard load hote hi Review History API call nahi karenge.
    // Isse authentication popup nahi aayega.
  };

  // ==========================================================
  // DELETE REVIEW
  // ==========================================================

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId) return;
    if (!window.confirm("Delete this review from your history?")) return;

    try {
      const response = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await readJsonResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to delete review.");
      }

      setHistory((current) => current.filter((item) => Number(item.id) !== Number(reviewId)));
      setReviewCount((current) => Math.max(0, Number(current || 0) - 1));
    } catch (error) {
      console.error("Delete review error:", error);
      alert(error.message || "Unable to delete review.");
    }
  };

  // ==========================================================
  // AUTH LOGOUT
  // ==========================================================

  const handleAuthLogout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setUser(null);
    setActive("Dashboard");
    setReviewCount(0);
    setHistory([]);
    setReviewResult(null);
    setGithubPR(null);
    localStorage.removeItem("user");
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;

    await handleAuthLogout();

    alert("You have been logged out.");
  };

  // ==========================================================
  // DASHBOARD DATA
  // ==========================================================

  const dashboardData = useMemo(() => {
    if (!history.length) {
      return {
        health: 78,
        security: 85,
        performance: 72,
      };
    }

    const healthValues =
      history
        .map((item) =>
          Number(item.score)
        )
        .filter(
          (value) =>
            !Number.isNaN(value)
        );

    const health =
      healthValues.length > 0
        ? healthValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          healthValues.length
        : 78;

    const securityIssues =
      history.reduce(
        (sum, item) =>
          sum +
          Number(
            item.security_issues || 0
          ),
        0
      );

    const performanceIssues =
      history.reduce(
        (sum, item) =>
          sum +
          Number(
            item.performance_issues ||
              0
          ),
        0
      );

    const security = Math.max(
      100 -
        Math.round(
          (securityIssues /
            history.length) *
            15
        ),
      0
    );

    const performance = Math.max(
      100 -
        Math.round(
          (performanceIssues /
            history.length) *
            10
        ),
      0
    );

    return {
      health: Math.min(
        100,
        Math.round(health)
      ),
      security,
      performance,
    };
  }, [history]);

  // ==========================================================
  // RETURN
  // ==========================================================

  // ==========================================================
  // AUTH SCREEN
  // ==========================================================

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return (
      <AuthPage
        apiUrl={API_URL}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className={`app ${settings.theme === "Dark" ? "dark-mode" : ""}`}>

      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <aside className="sidebar">

        <div className="logo">

          <div className="logo-icon">
            AI
          </div>

          <div>
            <h2>
              CodeReviewerAI
            </h2>

            <span>
              Powered by AI
            </span>
          </div>

        </div>

        <nav>

          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  active === item.name
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleMenuClick(
                    item.name
                  )
                }
              >
                <Icon size={18} />

                <span>
                  {item.name}
                </span>
              </button>
            );
          })}

        </nav>

        <div className="sidebar-bottom">

          <button
            className={`nav-item ${
              active === "Settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActive("Settings")
            }
          >
            <Settings size={18} />

            <span>
              Settings
            </span>
          </button>

          <button
            className="nav-item"
            onClick={handleLogout}
          >
            <LogOut size={18} />

            <span>
              Logout
            </span>
          </button>

        </div>

      </aside>


      {/* ====================================================
          MAIN
      ==================================================== */}

      <main className="main">

        {/* HEADER */}

        <header className="header">

          <div>
            <h1>
              AI Code Reviewer
            </h1>

            <p>
              Analyze, improve and learn
              from your code.
            </p>
          </div>

          <div className="profile">

            {installPrompt && (
              <button
                type="button"
                className="install-app-btn"
                onClick={handleInstallApp}
                title="Install CodeReviewerAI on this device"
              >
                Install App
              </button>
            )}

            <Bell
              className="notification"
              size={20}
            />

            <div className="avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "G"}
            </div>

            <span>
              {user?.name || "Guest"}
            </span>

          </div>

        </header>


        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {active === "Dashboard" && (
          <Dashboard
            reviewCount={reviewCount}
            dashboardData={
              dashboardData
            }
            onCodeReview={() =>
              setActive("Code Review")
            }
            onTestGenerator={() =>
              setActive(
                "Test Generator"
              )
            }
            onLearning={() =>
              setActive(
                "Learning Mode"
              )
            }
            onHistory={() =>
              handleMenuClick(
                "Review History"
              )
            }
          />
        )}


        {/* ==================================================
            CODE REVIEW
        ================================================== */}

        {active === "Code Review" && (

          <section className="review-section">

            <div className="section-heading">

              <div>
                <h2>
                  Code Review
                </h2>

                <p>
                  Paste your code below
                  and let AI analyze it.
                </p>
              </div>

              <select
                value={language}
                onChange={(e) => {
                  setLanguage(
                    e.target.value
                  );
                  setCode("");
                  setReviewResult(null);
                }}
              >
                <option value="Python">
                  Python
                </option>

                <option value="JavaScript">
                  JavaScript
                </option>

                <option value="Java">
                  Java
                </option>

                <option value="C++">
                  C++
                </option>

                <option value="SQL">
                  SQL
                </option>
              </select>

            </div>


            <div className="code-box">

              <div className="code-header">

                <span>
                  Your Code
                </span>

                <span>
                  {language}
                </span>

              </div>

              <textarea
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                  )
                }
                placeholder={`Paste your ${language} code here...

Example:

def calculate_sum(a, b):
    return a + b`}
              />

              <div className="code-footer">

                <span>
                  {code.length} characters
                </span>

                <button
                  onClick={
                    handleReview
                  }
                  disabled={
                    reviewLoading
                  }
                >
                  <Play size={16} />

                  {reviewLoading
                    ? "Reviewing..."
                    : "Review Code"}
                </button>

              </div>

            </div>


            <div className="code-review-info">

              <CheckCircle2 size={20} />

              <div>

                <strong>
                  AI Code Analysis
                </strong>

                <p>
                  The AI checks your
                  code for bugs,
                  security,
                  performance and
                  code quality.
                </p>

              </div>

            </div>


            {reviewResult && (
              <ReviewResult
                reviewResult={
                  reviewResult
                }
                language={language}
              />
            )}

          </section>
        )}


        {/* ==================================================
            GITHUB PR
        ================================================== */}

        {active === "GitHub PR" && (
          <GitHubPR
            result={githubPR}
            setResult={setGithubPR}
          />
        )}


        {/* ==================================================
            TEST GENERATOR
        ================================================== */}

        {active === "Test Generator" && (

          <section className="review-section">

            <div className="section-heading">

              <div>

                <h2>
                  Test Generator
                </h2>

                <p>
                  Generate realistic
                  test cases automatically
                  for your code.
                </p>

              </div>

              <select
                value={testLanguage}
                onChange={(e) => {
                  setTestLanguage(
                    e.target.value
                  );
                  setTestCode("");
                  setTestResult(null);
                }}
              >
                <option value="Python">
                  Python
                </option>

                <option value="JavaScript">
                  JavaScript
                </option>

                <option value="Java">
                  Java
                </option>

                <option value="C++">
                  C++
                </option>

                <option value="SQL">
                  SQL
                </option>
              </select>

            </div>


            <div className="code-box">

              <div className="code-header">

                <span>
                  Code
                </span>

                <span>
                  {testLanguage}
                </span>

              </div>

              <textarea
                value={testCode}
                onChange={(e) =>
                  setTestCode(
                    e.target.value
                  )
                }
                placeholder={`Paste your ${testLanguage} function here...

Example:

def add(a, b):
    return a + b`}
              />

              <div className="code-footer">

                <span>
                  {testCode.length}
                  {" "}characters
                </span>

                <button
                  onClick={
                    handleGenerateTests
                  }
                  disabled={
                    testLoading
                  }
                >
                  <FlaskConical
                    size={16}
                  />

                  {testLoading
                    ? "Generating..."
                    : "Generate Tests"}
                </button>

              </div>

            </div>


            {testResult && (
              <TestGeneratorResult
                result={testResult}
                language={
                  testLanguage
                }
                onCopy={
                  copyTestCode
                }
                onDownload={
                  downloadTestCode
                }
              />
            )}

          </section>
        )}


        {/* ==================================================
            LEARNING MODE
        ================================================== */}

        {active === "Learning Mode" && (
          <LearningMode
            reviewResult={reviewResult}
            code={code}
            language={language}
          />
        )}


        {/* ==================================================
            HISTORY
        ================================================== */}

        {active === "Review History" && (

          <section className="review-section">

            <div className="section-heading">

              <div>

                <h2>
                  Review History
                </h2>

                <p>
                  View your previous
                  AI code reviews.
                </p>

              </div>

              <button
                onClick={
                  loadHistory
                }
                disabled={
                  historyLoading
                }
              >
                <RefreshCw
                  size={16}
                />

                {historyLoading
                  ? "Loading..."
                  : "Refresh"}
              </button>

            </div>


            {historyLoading ? (

              <div className="history-list">

                <div className="history-item">

                  <RefreshCw
                    size={22}
                  />

                  <div>
                    <strong>
                      Loading review
                      history...
                    </strong>

                    <p>
                      Please wait.
                    </p>
                  </div>

                </div>

              </div>

            ) : history.length === 0 ? (

              <div className="history-list">

                <div className="history-item">

                  <History size={22} />

                  <div>

                    <strong>
                      No reviews yet
                    </strong>

                    <p>
                      Complete a code
                      review to see it
                      here.
                    </p>

                  </div>

                </div>

              </div>

            ) : (

              <div className="history-list">

                {history.map(
                  (item, index) => (

                    <HistoryItem
                      key={
                        item.id ||
                        index
                      }
                      title={`${item.language || "Code"} Code Review`}
                      score={`${Number(
                        item.score || 0
                      )}/100`}
                      result={
                        Number(
                          item.score || 0
                        ) >= 90
                          ? "Excellent"
                          : Number(
                              item.score ||
                                0
                            ) >= 75
                          ? "Good"
                          : Number(
                              item.score ||
                                0
                            ) >= 50
                          ? "Average"
                          : "Needs Improvement"
                      }
                      date={
                        item.created_at ||
                        item.date
                      }
                      reviewId={item.id}
                      onDelete={handleDeleteReview}
                    />

                  )
                )}

              </div>

            )}

          </section>
        )}


        {/* ==================================================
            SETTINGS
        ================================================== */}

        {active === "Team Workspace" && (
          <TeamWorkspace
            user={user}
            apiUrl={API_URL}
            darkMode={settings.theme === "Dark"}
            onRefresh={() => setTeamRefresh((value) => value + 1)}
            refreshKey={teamRefresh}
          />
        )}

        {active === "Settings" && (
          <section className="review-section settings-page">
            <div className="section-heading settings-heading">
              <div>
                <h2>Settings</h2>
                <p>Manage your account and application preferences.</p>
              </div>
              <button
                type="button"
                onClick={saveSettings}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", border: 0, borderRadius: 10, background: "#6d28d9", color: "white", fontWeight: 700, cursor: "pointer" }}
              >
                <Save size={17} />
                {settingsSaved ? "Saved ✓" : "Save Settings"}
              </button>
            </div>

            <div className="settings-sequence" style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 22, alignItems: "start" }}>
              <div className="settings-menu" style={{ borderRadius: 16, padding: 10 }}>
                {[
                  ["Profile", "👤", "Account information"],
                  ["AI Review Preferences", "🤖", "Review level & language"],
                  ["Appearance", "🎨", "Theme & display"],
                  ["Code Preferences", "💻", "Review information"],
                  ["Notifications", "🔔", "Alerts & updates"],
                  ["Security", "🔐", "Password & account security"],
                  ["Data & Privacy", "🗄️", "Your review data"],
                ].map(([key, icon, subtitle]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSettingsTab(key);
                      setPasswordError("");
                      setPasswordMessage("");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: 0,
                      borderRadius: 11,
                      padding: "12px 13px",
                      marginBottom: 5,
                      cursor: "pointer",
                      background: settingsTab === key ? "#f3e8ff" : "transparent",
                      color: settingsTab === key ? "#6d28d9" : "#334155",
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                    }}
                  >
                    <span style={{ fontSize: 20, width: 27 }}>{icon}</span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: 14 }}>{key}</strong>
                      <small style={{ display: "block", marginTop: 3, color: settingsTab === key ? "#7c3aed" : "#64748b", fontSize: 11 }}>{subtitle}</small>
                    </span>
                    <ChevronRight size={16} style={{ marginLeft: "auto", opacity: settingsTab === key ? 1 : .45 }} />
                  </button>
                ))}
              </div>

              <div className="settings-content" style={{ borderRadius: 16, padding: 26, minHeight: 430 }}>
                {settingsTab === "Profile" && (
                  <div>
                    <div className="settings-tab-title"><span>👤</span><div><h3>Profile</h3><p>View your account information.</p></div></div>
                    <div className="settings-form-grid">
                      <div><label>Username</label><input type="text" value={user?.name || "Guest"} readOnly /></div>
                      <div><label>Email</label><input type="email" value={user?.email || ""} readOnly /></div>
                    </div>
                    <div className="settings-info">Your profile information is linked to your logged-in account.</div>
                  </div>
                )}

                {settingsTab === "AI Review Preferences" && (
                  <div>
                    <div className="settings-tab-title"><span>🤖</span><div><h3>AI Review Preferences</h3><p>Control how AI reviews are presented.</p></div></div>
                    <div className="settings-form-grid">
                      <div><label>AI Review Level</label><select value={settings.reviewLevel} onChange={(e) => updateSetting("reviewLevel", e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
                      <div><label>Default Programming Language</label><select value={settings.defaultLanguage} onChange={(e) => updateSetting("defaultLanguage", e.target.value)}><option>Python</option><option>JavaScript</option><option>Java</option><option>C++</option><option>SQL</option></select></div>
                    </div>
                  </div>
                )}

                {settingsTab === "Appearance" && (
                  <div>
                    <div className="settings-tab-title"><span>🎨</span><div><h3>Appearance</h3><p>Choose how CodeReviewerAI looks.</p></div></div>
                    <div className="settings-form-grid single">
                      <div><label>Theme</label><select value={settings.theme} onChange={(e) => updateSetting("theme", e.target.value)}><option>Light</option><option>Dark</option><option>System Default</option></select></div>
                    </div>
                  </div>
                )}

                {settingsTab === "Code Preferences" && (
                  <div>
                    <div className="settings-tab-title"><span>💻</span><div><h3>Code Preferences</h3><p>Choose what information appears in your reviews.</p></div></div>
                    <label className="settings-toggle"><input type="checkbox" checked={settings.showSuggestions} onChange={(e) => updateSetting("showSuggestions", e.target.checked)} /><span>Show code improvement suggestions</span></label>
                    <label className="settings-toggle"><input type="checkbox" checked={settings.showSecurityWarnings} onChange={(e) => updateSetting("showSecurityWarnings", e.target.checked)} /><span>Show security warnings</span></label>
                  </div>
                )}

                {settingsTab === "Notifications" && (
                  <div>
                    <div className="settings-tab-title"><span>🔔</span><div><h3>Notifications</h3><p>Manage review and security alerts.</p></div></div>
                    <label className="settings-toggle"><input type="checkbox" checked={settings.notifications} onChange={(e) => updateSetting("notifications", e.target.checked)} /><span>Enable notifications</span></label>
                    <div className="settings-info">You can receive alerts when reviews finish, security issues are detected, or tests are generated.</div>
                  </div>
                )}

                {settingsTab === "Security" && (
                  <div>
                    <div className="settings-tab-title"><span>🔐</span><div><h3>Security</h3><p>Change your account password securely.</p></div></div>
                    <form onSubmit={handleChangePassword} className="password-form">
                      <div><label>Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" /></div>
                      <div><label>New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New strong password" /></div>
                      <div><label>Confirm New Password</label><input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" /></div>
                      <button type="submit" disabled={passwordLoading}>{passwordLoading ? "Changing..." : "Change Password"}</button>
                    </form>
                    <p className="password-rule">Password must contain at least 8 characters, uppercase, lowercase, number and special character.</p>
                    {passwordError && <p className="password-error">{passwordError}</p>}
                    {passwordMessage && <p className="password-success">{passwordMessage}</p>}
                  </div>
                )}

                {settingsTab === "Data & Privacy" && (
                  <div>
                    <div className="settings-tab-title"><span>🗄️</span><div><h3>Data & Privacy</h3><p>Understand how your review data is handled.</p></div></div>
                    <div className="privacy-card"><strong>Review History</strong><p>Your reviews are associated with your logged-in account and can be managed from the Review History section.</p></div>
                    <div className="privacy-card"><strong>Account Data</strong><p>Keep your account credentials private and use a strong password to protect your account.</p></div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      </main>

    </div>
  );
}



// ============================================================
// AUTH LOADING SCREEN
// ============================================================

function AuthLoadingScreen() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-loading-card">
        <div className="auth-logo">AI</div>
        <h1>CodeReviewerAI</h1>
        <p>Checking your login session...</p>
        <div className="auth-spinner" />
      </div>
    </div>
  );
}


// ============================================================
// LOGIN + SIGN UP
// ============================================================

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text || !text.trim()) {
    return { success: false, error: `Server returned an empty response (HTTP ${response.status}).` };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: `Server returned an invalid response (HTTP ${response.status}).` };
  }
}


function AuthPage({ apiUrl, onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const getUserFromSession = async () => {
    const response = await fetch(`${apiUrl}/api/me`, { credentials: "include" });
    const data = await readJsonResponse(response);
    return response.ok && data.success && data.user ? data.user : null;
  };

  const loginAfterSignup = async () => {
    const response = await fetch(`${apiUrl}/api/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Account created, but automatic login failed.");
    }
    return data.user || (await getUserFromSession());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");

const isStrongPassword = (password) => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

    if (mode === "signup") {
      const cleanName = name.trim();
      if (!cleanName) return setError("Please enter your full name.");
      if (!/^[A-Za-z ]+$/.test(cleanName)) {
        return setError("Username must contain letters only. Numbers are not allowed.");
      }
      if (!isStrongPassword(password)) {
        return setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      }
      if (password !== confirmPassword) return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      const isLogin = mode === "login";
      const response = await fetch(`${apiUrl}${isLogin ? "/api/login" : "/api/signup"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(isLogin
          ? { email: cleanEmail, password }
          : { name: name.trim(), email: cleanEmail, password }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || (isLogin ? "Login failed." : "Sign up failed."));
      }

      let authenticatedUser = data.user || null;
      if (!isLogin && !authenticatedUser) {
        authenticatedUser = await getUserFromSession();
        if (!authenticatedUser) authenticatedUser = await loginAfterSignup();
      }
      if (!authenticatedUser) authenticatedUser = await getUserFromSession();
      if (!authenticatedUser) throw new Error("Account created, but the login session could not be verified.");

      await onAuthSuccess(authenticatedUser);
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err.message || "Unable to complete authentication.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="auth2-page">
      <div className="auth2-shell">
        <section className="auth2-hero">
          <div className="auth2-brand">
            <div className="auth2-brand-icon">AI</div>
            <div>
              <h1>CodeReviewerAI</h1>
              <p>Better Code. Smarter Development.</p>
            </div>
          </div>

          <div className="auth2-kicker"><span>✦</span> AI-POWERED CODE REVIEW</div>
          <h2>AI-Powered<br /><span>Code Review</span></h2>
          <p className="auth2-copy">Instant AI analysis to detect bugs, security issues, performance bottlenecks and get smart suggestions.</p>

          <div className="auth2-visual">
            <div className="auth2-window-bar"><i></i><i></i><i></i><span>&lt;/&gt;</span></div>
            <div className="auth2-code-lines">
              <b></b><b></b><b></b><b></b><b></b><b></b><b></b>
            </div>
            <div className="auth2-check">✓</div>
          </div>

          <div className="auth2-features">
            <div className="auth2-feature"><div className="auth2-feature-icon"><Shield size={21}/></div><div><strong>Secure &amp; Reliable</strong><p>Your code is safe with us.<br/>We never store your code.</p></div></div>
            <div className="auth2-feature"><div className="auth2-feature-icon"><Zap size={21}/></div><div><strong>Instant Analysis</strong><p>Get real-time AI feedback<br/>in seconds.</p></div></div>
            <div className="auth2-feature"><div className="auth2-feature-icon"><GraduationCap size={21}/></div><div><strong>Learn While You Code</strong><p>Understand issues, learn best<br/>practices and improve every day.</p></div></div>
          </div>
        </section>

        <section className="auth2-form-panel">
          <div className="auth2-form-content">
            <div className="auth2-heading">
              <h2>{isLogin ? "Welcome back" : "Create Account 🎉"}</h2>
              <p>{isLogin ? "Login to continue reviewing your code." : "Start your smarter coding journey today"}</p>
            </div>

            <div className="auth2-tabs">
              <button type="button" className={isLogin ? "active" : ""} onClick={() => switchMode("login")}>Login</button>
              <button type="button" className={!isLogin ? "active" : ""} onClick={() => switchMode("signup")}>Sign Up</button>
            </div>

            {error && <div className="auth2-error"><AlertTriangle size={18}/><span>{error}</span></div>}

            <form onSubmit={handleSubmit} className="auth2-form">
              {!isLogin && <div className="auth2-field"><label>Full Name</label><div className="auth2-input"><UserPlus size={19}/><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" disabled={loading}/></div></div>}
              <div className="auth2-field"><label>Email Address</label><div className="auth2-input"><span className="auth2-input-symbol">✉</span><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email" disabled={loading}/></div></div>
              <div className="auth2-field"><label>Password</label><div className="auth2-input"><span className="auth2-input-symbol">♙</span><input type={showPassword ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder={isLogin ? "Enter your password" : "Minimum 8 characters"} autoComplete={isLogin ? "current-password" : "new-password"} disabled={loading}/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></div>
              {!isLogin && <div className="auth2-field"><label>Confirm Password</label><div className="auth2-input"><span className="auth2-input-symbol">♙</span><input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" disabled={loading}/><button type="button" onClick={()=>setShowConfirmPassword(v=>!v)}>{showConfirmPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></div>}

              <button type="submit" className="auth2-submit" disabled={loading}>
                {loading ? <><span className="auth2-spinner"></span>{isLogin ? "Logging in..." : "Creating account..."}</> : (isLogin ? "Login to CodeReviewerAI" : "Create Account")}
              </button>
            </form>

            <p className="auth2-note"><Shield size={15}/> Your account and code reviews are protected by<br/> secure authentication.</p>
          </div>
        </section>
      </div>
    </div>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

function TeamWorkspace({ user, apiUrl, darkMode, onRefresh, refreshKey }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [sharedCode, setSharedCode] = useState("");
  const [sharedLanguage, setSharedLanguage] = useState("Python");
  const [saveLoading, setSaveLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const request = async (url, options = {}) => {
    const response = await fetch(`${apiUrl}${url}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    let data = {};
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const loadTeams = async (keepSelection = true) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await request("/api/teams");
      const list = Array.isArray(data.teams) ? data.teams : [];
      setTeams(list);
      if (keepSelection && selectedTeam) {
        const stillThere = list.find((team) => team.id === selectedTeam.id);
        if (stillThere) return loadTeam(stillThere.id);
      }
      if (list.length && !selectedTeam) await loadTeam(list[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async (teamId) => {
    try {
      const data = await request(`/api/teams/${teamId}`);
      setSelectedTeam(data.team);
      setTeamDetails(data.team);
      setProjects(Array.isArray(data.projects) ? data.projects : []);
      if (data.projects?.length) {
        const current = selectedProject && data.projects.find((p) => p.id === selectedProject.id);
        await loadProject((current || data.projects[0]).id);
      } else {
        setSelectedProject(null);
        setSharedCode("");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const loadProject = async (projectId) => {
    try {
      const data = await request(`/api/projects/${projectId}`);
      setSelectedProject(data.project);
      setSharedCode(data.project.code || "");
      setSharedLanguage(data.project.language || "Python");
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (user) loadTeams(false);
  }, [user, refreshKey]);

  // Lightweight collaboration sync: every 3 seconds refreshes the selected project.
  // This lets team members see saved changes without requiring a separate server.
  useEffect(() => {
    if (!selectedProject) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await request(`/api/projects/${selectedProject.id}`);
        setSelectedProject(data.project);
        setSharedLanguage(data.project.language || "Python");
        setSharedCode((current) => current === data.project.code ? current : (data.project.code || ""));
      } catch (_) {}
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedProject?.id]);

  const createTeam = async (event) => {
    event.preventDefault();
    if (!teamName.trim()) return setError("Please enter a team name.");
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await request("/api/teams", { method: "POST", body: JSON.stringify({ name: teamName.trim() }) });
      setTeamName(""); setMessage("Team created successfully.");
      await loadTeams(false);
      await loadTeam(data.team.id);
      onRefresh?.();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const createProject = async (event) => {
    event.preventDefault();
    if (!selectedTeam) return setError("Create or select a team first.");
    if (!projectName.trim()) return setError("Please enter a project name.");
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await request(`/api/teams/${selectedTeam.id}/projects`, {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim(), language: sharedLanguage, code: sharedCode }),
      });
      setProjectName(""); setMessage("Shared project created.");
      await loadTeam(selectedTeam.id);
      await loadProject(data.project.id);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const inviteMember = async (event) => {
    event.preventDefault();
    if (!selectedTeam) return setError("Select a team first.");
    if (!inviteEmail.trim()) return setError("Enter a registered member email.");
    setBusy(true); setError(""); setMessage("");
    try {
      await request(`/api/teams/${selectedTeam.id}/members`, { method: "POST", body: JSON.stringify({ email: inviteEmail.trim() }) });
      setInviteEmail(""); setMessage("Member added to the team.");
      await loadTeam(selectedTeam.id);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const saveProject = async () => {
    if (!selectedProject) return;
    setSaveLoading(true); setError(""); setMessage("");
    try {
      const data = await request(`/api/projects/${selectedProject.id}`, {
        method: "PUT",
        body: JSON.stringify({ code: sharedCode, language: sharedLanguage }),
      });
      setSelectedProject(data.project);
      setMessage("Changes saved. Your team can now see them.");
    } catch (e) { setError(e.message); } finally { setSaveLoading(false); }
  };

  if (!user) {
    return <section className="team-workspace"><div className="team-empty"><Users size={42}/><h2>Team Workspace</h2><p>Please login to create or join a team.</p></div></section>;
  }

  return (
    <section className="team-workspace">
      <div className="team-heading">
        <div>
          <h2><Users size={27}/> Team Workspace</h2>
          <p>Work together on shared projects, invite teammates, and review the same code.</p>
        </div>
        <button className="team-refresh" onClick={() => loadTeams(true)}><RefreshCw size={17}/> Refresh</button>
      </div>

      {message && <div className="team-alert success">✓ {message}</div>}
      {error && <div className="team-alert error">⚠ {error}</div>}

      <div className="team-layout">
        <aside className="team-panel team-list-panel">
          <div className="team-panel-title"><strong>My Teams</strong><span>{teams.length}</span></div>
          {loading ? <p className="team-muted">Loading teams...</p> : teams.length === 0 ? <p className="team-muted">No team yet. Create one below.</p> : teams.map((team) => (
            <button key={team.id} className={`team-list-item ${selectedTeam?.id === team.id ? "selected" : ""}`} onClick={() => loadTeam(team.id)}>
              <span className="team-avatar"><Users size={17}/></span><span><strong>{team.name}</strong><small>{team.member_count} member{team.member_count === 1 ? "" : "s"}</small></span><ChevronRight size={16}/>
            </button>
          ))}
          <form className="team-create-form" onSubmit={createTeam}><input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="New team name"/><button disabled={busy}><Users size={16}/> Create Team</button></form>
        </aside>

        <div className="team-main-panel">
          {!selectedTeam ? (
            <div className="team-empty"><FolderPlus size={44}/><h3>Create your first team</h3><p>Once you create a team, your members can share projects and code.</p></div>
          ) : (
            <>
              <div className="team-card team-members-card">
                <div className="team-card-header"><div><h3>{selectedTeam.name}</h3><p>Shared workspace</p></div><span className="online-badge">● Team</span></div>
                <div className="team-members">
                  {(teamDetails?.members || []).map((member) => <div className="team-member" key={member.id}><span className="member-avatar">{member.name?.charAt(0)?.toUpperCase() || "U"}</span><span><strong>{member.name}</strong><small>{member.role} · {member.email}</small></span></div>)}
                </div>
                <form className="invite-form" onSubmit={inviteMember}><input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Registered member email"/><button disabled={busy}><UserPlus size={16}/> Add Member</button></form>
              </div>

              <div className="team-card">
                <div className="team-card-header"><div><h3>Shared Projects</h3><p>Select a project to work on together.</p></div></div>
                <div className="project-list">{projects.map((project) => <button key={project.id} className={`project-item ${selectedProject?.id === project.id ? "selected" : ""}`} onClick={() => loadProject(project.id)}><span>📁</span><span><strong>{project.name}</strong><small>{project.language} · Updated {new Date(project.updated_at).toLocaleString()}</small></span></button>)}</div>
                <form className="project-create-form" onSubmit={createProject}><input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="New shared project name"/><select value={sharedLanguage} onChange={(e) => setSharedLanguage(e.target.value)}><option>Python</option><option>JavaScript</option><option>Java</option><option>C++</option><option>SQL</option></select><button disabled={busy}><FolderPlus size={16}/> Create Project</button></form>
              </div>

              {selectedProject && <div className="team-card shared-editor-card">
                <div className="team-card-header"><div><h3>💻 {selectedProject.name}</h3><p>Shared code editor · changes sync every few seconds</p></div><span className="sync-badge">● Shared</span></div>
                <div className="shared-editor-toolbar"><select value={sharedLanguage} onChange={(e) => setSharedLanguage(e.target.value)}><option>Python</option><option>JavaScript</option><option>Java</option><option>C++</option><option>SQL</option></select><span>👥 {teamDetails?.members?.length || 1} team members</span><button onClick={saveProject} disabled={saveLoading}><Save size={16}/> {saveLoading ? "Saving..." : "Save Shared Code"}</button></div>
                <textarea className="shared-code-editor" value={sharedCode} onChange={(e) => setSharedCode(e.target.value)} placeholder="Write or paste shared project code here..." spellCheck="false" />
                <div className="shared-editor-footer">Changes are shared with team members after saving. Keep this page open while collaborating.</div>
              </div>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}


function Dashboard({
  reviewCount,
  dashboardData,
  onCodeReview,
  onTestGenerator,
  onLearning,
  onHistory,
}) {
  return (
    <>

      <section className="stats">

        <StatCard
          icon={
            <Brain size={22} />
          }
          title="Code Health"
          score={
            dashboardData.health
          }
          description={
            dashboardData.health >= 90
              ? "Excellent code quality"
              : dashboardData.health >= 75
              ? "Good code quality"
              : "Needs improvement"
          }
          progress={`${dashboardData.health}%`}
          color="success"
        />


        <StatCard
          icon={
            <Shield size={22} />
          }
          title="Security"
          score={
            dashboardData.security
          }
          description="Security analysis"
          progress={`${dashboardData.security}%`}
          color="success"
        />


        <StatCard
          icon={
            <Zap size={22} />
          }
          title="Performance"
          score={
            dashboardData.performance
          }
          description="Performance analysis"
          progress={`${dashboardData.performance}%`}
          color={
            dashboardData.performance >= 75
              ? "success"
              : "warning"
          }
        />


        <StatCard
          icon={
            <History size={22} />
          }
          title="Reviews"
          score={reviewCount}
          description="Total reviews"
          color="success"
          hideProgress
        />

      </section>


      <section className="review-section">

        <div className="section-heading">

          <div>

            <h2>
              Code Review
            </h2>

            <p>
              Start your AI-powered
              code review.
            </p>

          </div>

        </div>


        <div className="dashboard-review-card">

          <div className="dashboard-code-icon">
            <Code2 size={40} />
          </div>

          <div>

            <h2>
              Analyze Your Code
            </h2>

            <p>
              Paste your source code
              and get instant
              AI-powered analysis for
              bugs, security,
              performance and code
              quality.
            </p>

            <button
              className="primary-action"
              onClick={
                onCodeReview
              }
            >
              <Code2 size={18} />

              Start Code Review
            </button>

          </div>

        </div>

      </section>


      <section className="features">

        <div
          className="feature-card clickable"
          onClick={
            onTestGenerator
          }
        >
          <div className="feature-icon">
            🧪
          </div>

          <h3>
            Test Generator
          </h3>

          <p>
            Automatically generate
            realistic test cases.
          </p>

          <ChevronRight size={18} />
        </div>


        <div
          className="feature-card clickable"
          onClick={
            onLearning
          }
        >
          <div className="feature-icon">
            📚
          </div>

          <h3>
            Learning Mode
          </h3>

          <p>
            Understand why issues
            happen and how to fix them.
          </p>

          <ChevronRight size={18} />
        </div>


        <div
          className="feature-card clickable"
          onClick={
            onHistory
          }
        >
          <div className="feature-icon">
            📊
          </div>

          <h3>
            Review History
          </h3>

          <p>
            Track previous code reviews
            and performance.
          </p>

          <ChevronRight size={18} />
        </div>


        <div
          className="feature-card clickable smart-analyzer-card"
          onClick={onCodeReview}
          style={{
            position: "relative",
            cursor: "pointer",
          }}
        >

          <div className="feature-icon">
            🧠
          </div>

          <h3>
            Smart Analysis
          </h3>

          <p>
            Get intelligent suggestions
            to improve your code.
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCodeReview();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "12px",
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: "#7c3aed",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
            }}
          >
            <Brain size={18} />
            Smart Analyzer
          </button>

          <div style={{ marginTop: "12px" }}>
            <ChevronRight size={18} />
          </div>

        </div>

      </section>

    </>
  );
}


// ============================================================
// REVIEW RESULT
// ============================================================

function ReviewResult({
  reviewResult,
  language,
}) {
  const score = Number(
    reviewResult.score || 0
  );

  const bugs = Number(
    reviewResult.bugs ||
      reviewResult.bug_count ||
      0
  );

  const securityIssues =
    Number(
      reviewResult.security_issues ||
        0
    );

  const performanceIssues =
    Number(
      reviewResult.performance_issues ||
        0
    );

  const suggestions =
    Number(
      reviewResult.suggestions ||
        reviewResult.suggestion_count ||
        0
    );

  const issues = Array.isArray(
    reviewResult.issues
  )
    ? reviewResult.issues
    : [];

  return (
    <section className="review-result">

      <div className="result-header">

        <div>

          <h2>
            AI Review Result
          </h2>

          <p>
            Analysis completed for
            your {language} code.
          </p>

        </div>

        <div className="score">

          <strong>
            {score}
          </strong>

          <span>
            /100
          </span>

        </div>

      </div>


      <div className="result-stats">

        <ResultCard
          icon={
            <Bug size={22} />
          }
          number={bugs}
          title="Bugs"
        />

        <ResultCard
          icon={
            <Shield size={22} />
          }
          number={
            securityIssues
          }
          title="Security Issues"
        />

        <ResultCard
          icon={
            <Zap size={22} />
          }
          number={
            performanceIssues
          }
          title="Performance Issues"
        />

        <ResultCard
          icon={
            <Lightbulb size={22} />
          }
          number={suggestions}
          title="Suggestions"
        />

      </div>


      <div className="issues">

        {issues.length > 0 ? (

          issues.map(
            (issue, index) => {

              const severity =
                String(
                  issue.severity ||
                    "INFO"
                ).toUpperCase();

              return (
                <Issue
                  key={index}
                  type={
                    severity === "HIGH"
                      ? "high"
                      : severity ===
                        "MEDIUM"
                      ? "medium"
                      : severity ===
                        "LOW"
                      ? "good"
                      : "good"
                  }
                  level={severity}
                  title={
                    issue.title ||
                    "Code Issue"
                  }
                  description={
                    issue.description ||
                    "Review this section of code."
                  }
                />
              );
            }
          )

        ) : (

          <div className="issue good">

            <CheckCircle2
              size={24}
            />

            <div>

              <strong>
                Excellent Code!
              </strong>

              <p>
                No major issues were
                detected in your code.
              </p>

            </div>

          </div>

        )}

      </div>

    </section>
  );
}


// ============================================================
// TEST GENERATOR RESULT
// ============================================================

function TestGeneratorResult({
  result,
  language,
  onCopy,
  onDownload,
}) {
  const testCases =
    result?.tests ||
    result?.test_cases ||
    result?.cases ||
    [];

  const generatedCode =
    typeof result === "string"
      ? result
      : result?.test_code ||
        result?.generated_tests ||
        result?.code ||
        "";

  const testCount =
    Array.isArray(testCases)
      ? testCases.length
      : Number(
          result?.test_count ||
            result?.count ||
            0
        );

  return (
    <section className="review-result">

      <div className="result-header">

        <div>

          <h2>
            Generated Test Cases
          </h2>

          <p>
            Realistic test scenarios
            generated for your{" "}
            {language} code.
          </p>

        </div>

        <div className="test-count">

          <FlaskConical
            size={22}
          />

          <strong>
            {testCount}
          </strong>

          <span>
            Tests
          </span>

        </div>

      </div>


      {Array.isArray(
        testCases
      ) &&
        testCases.length > 0 && (

          <div className="generated-test-list">

            {testCases.map(
              (test, index) => (

                <div
                  className="generated-test-card"
                  key={index}
                >

                  <div className="generated-test-number">
                    {index + 1}
                  </div>

                  <div>

                    <strong>
                      {test.name ||
                        test.title ||
                        `Test Case ${
                          index + 1
                        }`}
                    </strong>

                    <p>
                      {test.description ||
                        "Tests the expected behavior of the code."}
                    </p>

                    {test.category && (
                      <span className="test-category">
                        {test.category}
                      </span>
                    )}

                  </div>

                </div>

              )
            )}

          </div>
        )}


      {generatedCode && (

        <div className="generated-code-section">

          <div className="generated-code-header">

            <div>

              <strong>
                Generated Test Code
              </strong>

              <span>
                {language}
              </span>

            </div>

            <div className="test-actions">

              <button
                onClick={onCopy}
              >
                <Copy size={16} />

                Copy
              </button>

              <button
                onClick={onDownload}
              >
                <Download size={16} />

                Download
              </button>

            </div>

          </div>


          <pre>
            {generatedCode}
          </pre>

        </div>

      )}

    </section>
  );
}


// ============================================================
// LEARNING MODE
// ============================================================

function LearningMode({
  reviewResult,
  code,
  language,
}) {
  const issues = Array.isArray(reviewResult?.issues)
    ? reviewResult.issues
    : [];

  const [selectedTopic, setSelectedTopic] =
    useState(null);

  const lineExplanations = getLineByLineExplanation(
    code,
    language
  );

  const skillSuggestions = getSkillSuggestions(
    issues,
    language
  );

  const openTopic = (topic) => {
    setSelectedTopic(topic);
  };

  const closeTopic = () => {
    setSelectedTopic(null);
  };

  return (
    <section className="learning-section">

      <div className="learning-header">

        <GraduationCap size={34} />

        <div>
          <h2>
            Learning Mode
          </h2>

          <p>
            Learn why coding issues happen and how
            to fix them.
          </p>
        </div>

      </div>

      {/* ==================================================
          DETECTED ISSUES
      ================================================== */}

      {issues.length === 0 ? (

        <div className="learning-empty">

          <Brain size={42} />

          <h3>
            Learn Through Code Review
          </h3>

          <p>
            Run a code review first. Learning Mode
            will explain detected issues and show you
            how to improve them.
          </p>

        </div>

      ) : (

        <div className="learning-issues">

          {issues.map((issue, index) => (
            <LearningCard
              key={index}
              issue={issue}
            />
          ))}

        </div>

      )}

      {/* ==================================================
          THREE INTERACTIVE LEARNING CARDS
      ================================================== */}

      <div className="learning-cards">

        <div
          className={`learning-card clickable ${
            selectedTopic === "code"
              ? "active"
              : ""
          }`}
          onClick={() => openTopic("code")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" ||
              e.key === " "
            ) {
              openTopic("code");
            }
          }}
        >
          <Brain size={28} />

          <h3>
            Understand Your Code
          </h3>

          <p>
            Learn what your code is doing and why
            each part matters.
          </p>

          <span className="learning-card-action">
            Click to learn →
          </span>
        </div>


        <div
          className={`learning-card clickable ${
            selectedTopic === "bugs"
              ? "active"
              : ""
          }`}
          onClick={() => openTopic("bugs")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" ||
              e.key === " "
            ) {
              openTopic("bugs");
            }
          }}
        >
          <Bug size={28} />

          <h3>
            Learn From Bugs
          </h3>

          <p>
            Understand why bugs happen and how to
            prevent them.
          </p>

          <span className="learning-card-action">
            Click to learn →
          </span>
        </div>


        <div
          className={`learning-card clickable ${
            selectedTopic === "skills"
              ? "active"
              : ""
          }`}
          onClick={() => openTopic("skills")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" ||
              e.key === " "
            ) {
              openTopic("skills");
            }
          }}
        >
          <Lightbulb size={28} />

          <h3>
            Improve Your Skills
          </h3>

          <p>
            Build better coding habits with practical
            suggestions.
          </p>

          <span className="learning-card-action">
            Click to learn →
          </span>
        </div>

      </div>


      {/* ==================================================
          SELECTED LEARNING TOPIC
      ================================================== */}

      {selectedTopic && (

        <div className="learning-detail">

          <div className="learning-detail-header">

            <div>

              {selectedTopic === "code" && (
                <>
                  <Brain size={24} />
                  <h2>
                    Understand Your Code
                  </h2>
                </>
              )}

              {selectedTopic === "bugs" && (
                <>
                  <Bug size={24} />
                  <h2>
                    Learn From Bugs
                  </h2>
                </>
              )}

              {selectedTopic === "skills" && (
                <>
                  <Lightbulb size={24} />
                  <h2>
                    Improve Your Skills
                  </h2>
                </>
              )}

            </div>

            <button
              type="button"
              onClick={closeTopic}
              className="learning-close-btn"
            >
              Close
            </button>

          </div>


          {/* ==================================================
              1. UNDERSTAND YOUR CODE
          ================================================== */}

          {selectedTopic === "code" && (

            <div className="learning-detail-content">

              <h3>
                Line-by-Line Explanation
              </h3>

              {!code?.trim() ? (

                <div className="learning-empty">
                  <Code2 size={34} />

                  <p>
                    First open Code Review and paste
                    your code. Then return to Learning
                    Mode to see the line-by-line
                    explanation.
                  </p>
                </div>

              ) : (

                <div className="code-explanation-list">

                  {lineExplanations.map(
                    (item, index) => (

                      <div
                        className="code-explanation-item"
                        key={index}
                      >

                        <div className="code-line-number">
                          {item.line}
                        </div>

                        <div className="code-line-content">

                          <code>
                            {item.code ||
                              "(empty line)"}
                          </code>

                          <p>
                            {item.explanation}
                          </p>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>
          )}


          {/* ==================================================
              2. LEARN FROM BUGS
          ================================================== */}

          {selectedTopic === "bugs" && (

            <div className="learning-detail-content">

              <h3>
                Detected Bugs, Reasons & Solutions
              </h3>

              {issues.length === 0 ? (

                <div className="learning-empty">
                  <CheckCircle2 size={34} />

                  <h3>
                    No detected issues
                  </h3>

                  <p>
                    Your latest code review did not
                    report any bugs or other issues.
                  </p>
                </div>

              ) : (

                <div className="learning-bug-list">

                  {issues.map(
                    (issue, index) => (

                      <BugLearningItem
                        key={index}
                        issue={issue}
                      />

                    )
                  )}

                </div>

              )}

            </div>
          )}


          {/* ==================================================
              3. IMPROVE YOUR SKILLS
          ================================================== */}

          {selectedTopic === "skills" && (

            <div className="learning-detail-content">

              <h3>
                Practical Coding Best Practices
              </h3>

              <div className="skill-list">

                {skillSuggestions.map(
                  (suggestion, index) => (

                    <div
                      className="skill-item"
                      key={index}
                    >

                      <CheckCircle2 size={20} />

                      <div>

                        <strong>
                          {suggestion.title}
                        </strong>

                        <p>
                          {suggestion.description}
                        </p>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>
          )}

        </div>
      )}

    </section>
  );
}


// ============================================================
// LINE-BY-LINE CODE EXPLANATION
// ============================================================

function getLineByLineExplanation(
  code,
  language
) {
  if (!code?.trim()) {
    return [];
  }

  const lines = code.split("\n");

  return lines.map((line, index) => ({
    line: index + 1,
    code: line,
    explanation: explainCodeLine(
      line,
      language
    ),
  }));
}


function explainCodeLine(
  line,
  language
) {
  const trimmed = line.trim();

  if (!trimmed) {
    return "This is a blank line. It improves readability by separating different parts of the code.";
  }

  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*")
  ) {
    return "This line is a comment. Comments help other developers understand the purpose of the code.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("def ")
  ) {
    return "This line defines a Python function. The function groups reusable logic so it can be called whenever needed.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("return ")
  ) {
    return "This line returns a value from the current function and sends the result back to the code that called the function.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("print(")
  ) {
    return "This line prints information to the console. It is useful for development and debugging; production applications often use a logging framework.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("if ")
  ) {
    return "This line starts a conditional block. The code inside the block runs only when the condition is true.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("elif ")
  ) {
    return "This line checks another condition when the previous if/elif condition was false.";
  }

  if (
    language === "Python" &&
    trimmed === "else:"
  ) {
    return "This line starts the fallback branch that runs when the previous conditions are false.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("for ")
  ) {
    return "This line starts a for loop. It repeats the following block for each item in the selected sequence or iterable.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("while ")
  ) {
    return "This line starts a while loop. The following block keeps running while its condition remains true.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("try:")
  ) {
    return "This line starts exception-handling code. Statements inside try are monitored for runtime exceptions.";
  }

  if (
    language === "Python" &&
    trimmed.startsWith("except")
  ) {
    return "This line handles an exception raised by the try block. Catching specific exception types usually makes error handling clearer.";
  }

  if (
    language === "JavaScript" &&
    (
      trimmed.startsWith("function ") ||
      trimmed.startsWith("const ") &&
      trimmed.includes("=>")
    )
  ) {
    return "This line defines reusable JavaScript logic. Functions make code easier to reuse, test and maintain.";
  }

  if (
    language === "JavaScript" &&
    trimmed.startsWith("return ")
  ) {
    return "This line returns a value from the JavaScript function.";
  }

  if (
    language === "JavaScript" &&
    (
      trimmed.startsWith("console.log(") ||
      trimmed.startsWith("console.error(")
    )
  ) {
    return "This line writes information to the browser or Node.js console. It is useful for debugging.";
  }

  if (
    language === "Java" &&
    (
      trimmed.includes("(") &&
      trimmed.includes(")") &&
      (
        trimmed.startsWith("public ") ||
        trimmed.startsWith("private ") ||
        trimmed.startsWith("protected ")
      )
    )
  ) {
    return "This line is likely declaring a Java method. Methods contain reusable behavior and can accept parameters and return values.";
  }

  if (
    language === "C++" &&
    trimmed.startsWith("return ")
  ) {
    return "This line returns a value from the current C++ function.";
  }

  if (
    language === "SQL" &&
    /^select\b/i.test(trimmed)
  ) {
    return "This line starts a SQL SELECT query, which is used to retrieve data from a database.";
  }

  if (
    language === "SQL" &&
    /^insert\b/i.test(trimmed)
  ) {
    return "This line starts an INSERT operation, which adds a new row to a database table.";
  }

  if (
    language === "SQL" &&
    /^update\b/i.test(trimmed)
  ) {
    return "This line starts an UPDATE operation, which changes existing database records.";
  }

  if (
    language === "SQL" &&
    /^delete\b/i.test(trimmed)
  ) {
    return "This line starts a DELETE operation, which removes records from a database table.";
  }

  if (trimmed.includes("=")) {
    return "This line assigns a value to a variable or expression. Assignments store data so it can be used later.";
  }

  if (
    trimmed.endsWith("{") ||
    trimmed.endsWith("}")
  ) {
    return "This line opens or closes a code block, helping define the scope of functions, conditions or loops.";
  }

  return "This line is part of the program's logic. Its exact role depends on the surrounding code and the operation being performed.";
}


// ============================================================
// BUG LEARNING ITEM
// ============================================================

function getBugLearningDetails(issue, language = "Python") {
  const title = String(issue?.title || "").toLowerCase();
  const message = String(issue?.message || issue?.description || "").toLowerCase();

  if (title.includes("eval") || message.includes("eval(")) {
    return {
      reason:
        "eval() user-controlled ya unknown input ko executable code mein convert kar sakta hai. Isse security vulnerability aur unexpected code execution ka risk hota hai.",
      solution:
        "eval() avoid karo. Agar input ko number ya data ke roop mein parse karna hai, safe parsing use karo, jaise int(), float(), json.loads(), ya application-specific validation."
    };
  }

  if (title.includes("exec") || message.includes("exec(")) {
    return {
      reason:
        "exec() string ko Python code ke roop mein execute karta hai. Untrusted input ke saath use karne par arbitrary code execution ka serious risk ho sakta hai.",
      solution:
        "exec() ko avoid karo. Fixed functions, safe parsers, ya validated data structures ka use karo."
    };
  }

  if (
    title.includes("password") ||
    title.includes("secret") ||
    title.includes("credential") ||
    message.includes("hardcoded password")
  ) {
    return {
      reason:
        "Password ya secret ko source code mein hardcode karne se code repository, logs, backups ya screenshots ke through secret expose ho sakta hai.",
      solution:
        "Secrets ko environment variables ya secure secret manager mein rakho. Example: os.getenv('APP_PASSWORD')."
    };
  }

  if (
    title.includes("print") ||
    title.includes("logging") ||
    title.includes("proper logging") ||
    message.includes("print(")
  ) {
    return {
      reason:
        "print() development aur debugging ke liye useful hai, lekin production applications mein proper logging se log levels, filtering, monitoring aur storage ko control kiya ja sakta hai.",
      solution:
        "Python ke logging module ka use karo. Example: import logging; logging.basicConfig(level=logging.INFO); logging.info('Calculation completed')."
    };
  }

  if (
    title.includes("bare except") ||
    title.includes("except:") ||
    message.includes("bare except")
  ) {
    return {
      reason:
        "Bare except har exception ko catch kar leta hai, including unexpected errors. Isse actual problem hide ho sakti hai aur debugging difficult ho jati hai.",
      solution:
        "Specific exception catch karo. Example: except ValueError: ... ya multiple known exceptions ko explicitly handle karo."
    };
  }

  if (
    title.includes("while true") ||
    title.includes("infinite loop") ||
    message.includes("while true")
  ) {
    return {
      reason:
        "while True bina proper exit condition ke infinite loop create kar sakta hai. Isse CPU/resources continuously consume ho sakte hain.",
      solution:
        "Loop ke liye clear exit condition rakho, break condition define karo, aur zarurat ho to timeout/retry limit use karo."
    };
  }

  return {
    reason:
      issue?.message ||
      issue?.description ||
      "Reviewer ne is code pattern ko improve karne ka suggestion diya hai.",
    solution:
      "Affected code ko review karo, safer/clearer pattern use karo, aur change ke baad code ko dobara test karo."
  };
}

function BugLearningItem({
  issue,
}) {
  const severity =
    String(
      issue?.severity || "INFO"
    ).toUpperCase();

  const title =
    String(
      issue?.title || "Code Issue"
    );

  const lowerTitle =
    title.toLowerCase();

  let reason =
    "This issue can reduce code quality, reliability or maintainability.";

  let solution =
    "Review the affected code and replace the risky pattern with a safer and clearer approach.";

  if (lowerTitle.includes("eval")) {
    reason =
      "eval() can execute a string as code. If the value is influenced by untrusted input, unexpected code may be executed.";

    solution =
      "Avoid eval(). Parse input explicitly and use a predefined set of allowed operations.";
  } else if (
    lowerTitle.includes("exec")
  ) {
    reason =
      "exec() can execute dynamically supplied code and can become a serious security risk when input is not trusted.";

    solution =
      "Avoid exec() for untrusted input. Use explicit functions or safe parsing instead.";
  } else if (
    lowerTitle.includes("password") ||
    lowerTitle.includes("secret") ||
    lowerTitle.includes("credential")
  ) {
    reason =
      "Hardcoded credentials can accidentally be committed to source control and exposed to other people.";

    solution =
      "Store secrets in environment variables or a secure secret manager and never commit real credentials.";
  } else if (
    lowerTitle.includes("print")
  ) {
    reason =
      "print() is simple for development, but production applications need structured logs and controllable log levels.";

    solution =
      "Use a logging framework such as Python's logging module for production code.";
  } else if (
    lowerTitle.includes("except")
  ) {
    reason =
      "A bare exception handler can hide unexpected errors and make debugging much harder.";

    solution =
      "Catch specific exceptions such as ValueError, TypeError or FileNotFoundError.";
  } else if (
    lowerTitle.includes("loop") ||
    lowerTitle.includes("infinite")
  ) {
    reason =
      "A loop without a reliable termination condition may keep running and consume system resources.";

    solution =
      "Add a clear exit condition or use a bounded iteration pattern.";
  } else if (
    lowerTitle.includes("sql") ||
    lowerTitle.includes("injection")
  ) {
    reason =
      "Building SQL with untrusted input can allow an attacker to change the meaning of a database query.";

    solution =
      "Use parameterized queries or an ORM instead of concatenating user input into SQL.";
  }

  return (
    <div className="learning-bug-item">

      <div className="learning-bug-heading">

        <AlertTriangle size={20} />

        <div>

          <strong>
            {title}
          </strong>

          <span>
            {severity}
          </span>

        </div>

      </div>

      <div className="learning-block">

        <strong>
          Why is this a problem?
        </strong>

        <p>
          {reason}
        </p>

      </div>

      <div className="learning-block">

        <strong>
          How to fix it?
        </strong>

        <p>
          {solution}
        </p>

      </div>

      <div className="learning-block">

        <strong>
          Reviewer's finding
        </strong>

        <p>
          {issue?.description ||
            "The code review detected a possible issue."}
        </p>

      </div>

    </div>
  );
}


// ============================================================
// SKILL SUGGESTIONS
// ============================================================

function getSkillSuggestions(
  issues,
  language
) {
  const suggestions = [
    {
      title: "Write small, reusable functions",
      description:
        "Keep each function focused on one responsibility. Smaller functions are easier to test, debug and maintain.",
    },
    {
      title: "Use meaningful names",
      description:
        "Choose variable and function names that clearly describe their purpose. This makes the code easier to understand.",
    },
    {
      title: "Handle errors explicitly",
      description:
        "Catch expected exceptions and provide useful error handling instead of silently ignoring failures.",
    },
    {
      title: "Avoid hardcoded secrets",
      description:
        "Keep passwords, API keys and credentials outside source code by using environment variables or a secure secret manager.",
    },
    {
      title: "Write tests for important behavior",
      description:
        "Test normal cases, edge cases and invalid input so changes are less likely to introduce regressions.",
    },
  ];

  if (language === "Python") {
    suggestions.push({
      title: "Follow Python conventions",
      description:
        "Use clear indentation, descriptive names, focused functions and the logging module when application logging is needed.",
    });
  }

  if (language === "JavaScript") {
    suggestions.push({
      title: "Keep JavaScript state predictable",
      description:
        "Use clear component responsibilities and avoid unnecessary state. Keep asynchronous API calls inside well-defined handlers or effects.",
    });
  }

  if (issues.length > 0) {
    suggestions.unshift({
      title: "Fix the issues found in your latest review",
      description:
        `Your latest review detected ${issues.length} issue${
          issues.length === 1 ? "" : "s"
        }. Start with the highest-severity issue and then review the remaining suggestions.`,
    });
  }

  return suggestions;
}


// ============================================================
// LEARNING CARD
// ============================================================

function LearningCard({
  issue,
}) {
  const severity =
    issue.severity || "INFO";

  let explanation =
    "This issue can affect the quality or reliability of your code.";

  let fix =
    "Review the highlighted code and use a safer or cleaner approach.";

  const title =
    String(
      issue.title || ""
    ).toLowerCase();

  if (
    title.includes("eval")
  ) {
    explanation =
      "eval() executes a string as Python code. If the string comes from an untrusted source, an attacker may execute unexpected code.";

    fix =
      "Avoid eval(). Validate input and use safer alternatives such as explicit parsing or a predefined set of allowed operations.";
  } else if (
    title.includes("password") ||
    title.includes("secret") ||
    title.includes("credential")
  ) {
    explanation =
      "Passwords and secrets should not be stored directly inside source code because source code can accidentally be shared or committed.";

    fix =
      "Use environment variables or a secure secret manager instead of hardcoding credentials.";
  } else if (
    title.includes("print")
  ) {
    explanation =
      "print() is useful during development but is not ideal for production applications because it provides limited control over log levels and destinations.";

    fix =
      "Use Python's logging module with appropriate log levels such as INFO, WARNING and ERROR.";
  } else if (
    title.includes("except")
  ) {
    explanation =
      "A bare except catches every exception, including unexpected errors, which can make debugging difficult.";

    fix =
      "Catch specific exceptions such as ValueError, TypeError or FileNotFoundError.";
  } else if (
    title.includes("loop")
  ) {
    explanation =
      "A loop without a clear termination condition can continue indefinitely and consume system resources.";

    fix =
      "Make sure the loop has a valid exit condition or use a controlled iteration pattern.";
  } else if (
    title.includes("sql") ||
    title.includes("injection")
  ) {
    explanation =
      "SQL injection can happen when user input is directly inserted into SQL queries.";

    fix =
      "Use parameterized queries or an ORM instead of constructing SQL queries with string concatenation.";
  }

  return (
    <div className="learning-issue-card">

      <div className="learning-issue-top">

        <AlertTriangle
          size={22}
        />

        <span>
          {severity}
        </span>

      </div>

      <h3>
        {issue.title ||
          "Code Issue"}
      </h3>


      <div className="learning-block">

        <strong>
          Why does this happen?
        </strong>

        <p>
          {explanation}
        </p>

      </div>


      <div className="learning-block">

        <strong>
          How can you fix it?
        </strong>

        <p>
          {fix}
        </p>

      </div>


      <div className="learning-block">

        <strong>
          Detected by AI
        </strong>

        <p>
          {issue.description ||
            "The AI detected a possible issue in your code."}
        </p>

      </div>

    </div>
  );
}



// ============================================================
// GITHUB PR
// ============================================================

function GitHubPR({
  result,
  setResult,
}) {
  const [url, setUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const analyzePR = async () => {
    if (!url.trim()) {
      alert(
        "Please enter GitHub Pull Request URL."
      );
      return;
    }

    if (
      !url.includes(
        "github.com"
      ) ||
      !url.includes("/pull/")
    ) {
      alert(
        "Please enter a valid GitHub Pull Request URL.\n\nExample:\nhttps://github.com/user/repository/pull/1"
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response =
        await fetch(
          `${API_URL}/api/github-pr`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              url: url.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "GitHub PR analysis failed"
        );
      }

      setResult(data);
    } catch (error) {
      console.error(
        "GitHub PR error:",
        error
      );

      alert(
        "GitHub PR analysis failed.\n\n" +
          error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="review-section">

      <div className="section-heading">

        <div>

          <h2>
            GitHub Pull Request Review
          </h2>

          <p>
            Review and analyze code
            changes from a GitHub
            Pull Request.
          </p>

        </div>

      </div>


      <div className="code-box">

        <div className="code-header">

          <span>
            GitHub Pull Request URL
          </span>

          <span>
            GitHub
          </span>

        </div>


        <textarea
          value={url}
          onChange={(e) =>
            setUrl(
              e.target.value
            )
          }
          placeholder="https://github.com/user/repository/pull/1"
          style={{
            height: "80px",
            background:
              "#ffffff",
            color: "#111827",
            fontFamily:
              "Arial, sans-serif",
          }}
        />


        <div className="code-footer">

          <span>
            Enter a valid GitHub PR URL
          </span>

          <button
            onClick={
              analyzePR
            }
            disabled={loading}
          >
            <GitPullRequest
              size={16}
            />

            {loading
              ? "Analyzing..."
              : "Analyze GitHub PR"}
          </button>

        </div>

      </div>


      {result && (

        <div className="github-result">

          <div className="github-result-header">

            <CheckCircle2
              size={24}
            />

            <div>

              <h2>
                Pull Request
                Analyzed
              </h2>

              <p>
                {result.repository ||
                  "GitHub Repository"}
                {" • "}
                PR #
                {result.pr_number ||
                  result.number ||
                  "N/A"}
              </p>

            </div>

          </div>


          <div className="github-stats">

            <GithubStat
              title="Files Changed"
              value={
                result.files_changed ||
                0
              }
            />

            <GithubStat
              title="Additions"
              value={
                result.additions ||
                0
              }
            />

            <GithubStat
              title="Deletions"
              value={
                result.deletions ||
                0
              }
            />

          </div>


          <div className="github-details">

            <p>
              <strong>
                Title:
              </strong>{" "}
              {result.title ||
                "N/A"}
            </p>

            <p>
              <strong>
                Author:
              </strong>{" "}
              {result.author ||
                result.user ||
                "N/A"}
            </p>

            <p>
              <strong>
                Status:
              </strong>{" "}
              {result.state ||
                "N/A"}
            </p>

            <p>
              <strong>
                Merged:
              </strong>{" "}
              {result.merged
                ? "Yes"
                : "No"}
            </p>

          </div>


          {result.url && (

            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="github-view-btn"
            >
              View on GitHub
            </a>

          )}

        </div>

      )}

    </section>
  );
}


// ============================================================
// GITHUB STAT
// ============================================================

function GithubStat({
  title,
  value,
}) {
  return (
    <div className="github-stat">

      <strong>
        {value}
      </strong>

      <span>
        {title}
      </span>

    </div>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon,
  title,
  score,
  description,
  progress,
  color,
  hideProgress,
}) {
  return (
    <div className="stat-card">

      <div className="stat-top">

        <span className="stat-title">

          {icon}

          {title}

        </span>

      </div>


      <h2 className={color}>

        {score}

        {title !== "Reviews" && (
          <span>
            /100
          </span>
        )}

      </h2>


      {!hideProgress && (

        <div className="progress">

          <div
            style={{
              width: progress,
            }}
          />

        </div>

      )}


      <p>
        {description}
      </p>

    </div>
  );
}


// ============================================================
// RESULT CARD
// ============================================================

function ResultCard({
  icon,
  number,
  title,
}) {
  return (
    <div className="result-card">

      <span>
        {icon}
      </span>

      <h3>
        {number}
      </h3>

      <p>
        {title}
      </p>

    </div>
  );
}


// ============================================================
// ISSUE
// ============================================================

function Issue({
  type,
  level,
  title,
  description,
}) {
  return (
    <div
      className={`issue ${type}`}
    >

      <div
        className={`issue-level ${type}`}
      >
        {level}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}


// ============================================================
// HISTORY ITEM
// ============================================================

function HistoryItem({
  title,
  score,
  result,
  date,
  reviewId,
  onDelete,
}) {
  return (
    <div className="history-item">
      <Code2 size={22} />

      <div className="history-item-main">
        <strong>{title}</strong>
        <p>Score: {score}</p>
        {date && <small>{formatDate(date)}</small>}
      </div>

      <span className="history-result">{result}</span>

      {onDelete && reviewId && (
        <button
          type="button"
          className="history-delete-btn"
          title="Delete review"
          aria-label="Delete review"
          onClick={() => onDelete(reviewId)}
        >
          <Trash2 size={17} />
        </button>
      )}
    </div>
  );
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(date) {
  try {
    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return String(date);
    }

    return parsed.toLocaleString();
  } catch {
    return String(date);
  }
}


// ============================================================
// EXPORT
// ============================================================

export default App;