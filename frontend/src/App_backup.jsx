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
} from "lucide-react";

import "./App.css";

const API_URL = "http://127.0.0.1:5000";


// ============================================================
// MAIN APP
// ============================================================

function App() {
  const [active, setActive] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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
  ];

  // ==========================================================
  // CHECK CURRENT LOGIN SESSION
  // ==========================================================

  const loadCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/me`, {
        credentials: "include",
      });
      const data = await response.json();

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

      const data = await response.json();

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

  const loadHistory = async () => {
    setHistoryLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/reviews`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load review history"
        );
      }

      setHistory(
        Array.isArray(data.reviews)
          ? data.reviews
          : []
      );
    } catch (error) {
      console.error(
        "History error:",
        error
      );

      alert(
        "Review history backend se load nahi ho rahi.\n\n" +
          error.message
      );
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

          body: JSON.stringify({
            code: code,
            language: language,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Code review failed"
        );
      }

      setReviewResult(data);

      await loadReviewCount();
      await loadHistory();
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

          body: JSON.stringify({
            code: testCode,
            language: testLanguage,
          }),
        }
      );

      const data = await response.json();

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
      loadHistory();
    }

    if (name === "Dashboard") {
      loadReviewCount();
      loadHistory();
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;

    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout API error:", error);
    }

    setUser(null);
    setHistory([]);
    setReviewResult(null);
    setGithubPR(null);
    setActive("Dashboard");

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

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

  return (
    <div className="app">

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

        {active === "Settings" && (

          <section className="review-section">

            <div className="section-heading">

              <div>

                <h2>
                  Settings
                </h2>

                <p>
                  Manage your AI Code
                  Reviewer preferences.
                </p>

              </div>

            </div>


            <div className="settings-box">

              <label>
                Username
              </label>

              <input
                type="text"
                value={user?.name || "Guest"}
                readOnly
              />

              <label>
                AI Review Level
              </label>

              <select
                defaultValue="Intermediate"
              >
                <option value="Beginner">
                  Beginner
                </option>

                <option value="Intermediate">
                  Intermediate
                </option>

                <option value="Advanced">
                  Advanced
                </option>
              </select>

            </div>

          </section>
        )}

      </main>

    </div>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

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


        <div className="feature-card">

          <div className="feature-icon">
            ⚙️
          </div>

          <h3>
            Smart Analysis
          </h3>

          <p>
            Get intelligent suggestions
            to improve your code.
          </p>

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
}) {
  return (
    <div className="history-item">

      <Code2 size={22} />

      <div>

        <strong>
          {title}
        </strong>

        <p>
          Score: {score}
        </p>

        {date && (

          <small>
            {formatDate(date)}
          </small>

        )}

      </div>

      <span>
        {result}
      </span>

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