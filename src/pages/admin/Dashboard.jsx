import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/admin/dashboard.css";
import "../../styles/admin/professional.css";
import AddStudent from "../../components/admin/AddStudent"; 

export default function AdminDashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2035, 2)); // March 2035
  const [selectedDate, setSelectedDate] = useState(2);
  const [performanceFilter, setPerformanceFilter] = useState("semester");
  const [earningsFilter, setEarningsFilter] = useState("year");
  const [isLoading, setIsLoading] = useState(false);
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
        student_no: "",
        last_name: "",
        first_name: "",
        middle_name: "",
        birthdate: "",
        gender: "",
        address: "",
        contact_no: "",
        email: "",
        password: "",
        course: ""
  });
  const handleChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  });
};

const handleSubmit = (e) => {
  e.preventDefault();

  console.log("Student data:", formData); // for now

  // later you will send this to backend

  setShowAddStudent(false); // close modal after submit
};
  const navigate = useNavigate();


  // Calendar logic
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => null);

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  // Professional Stats with trends
  const stats = [
    { 
      label: "Total Revenue", 
      value: "₱875,432", 
      icon: "💰", 
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      change: "+23.5%",
      trend: "up",
      subtitle: "vs last month"
    },
    { 
      label: "Active Students", 
      value: "1,245", 
      icon: "👨‍🎓", 
      gradient: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
      change: "+12.3%",
      trend: "up",
      subtitle: "enrolled this term"
    },
    { 
      label: "Course Completion", 
      value: "94.2%", 
      icon: "📊", 
      gradient: "linear-gradient(135deg, #4299e1 0%, #3182ce 100%)",
      change: "+5.1%",
      trend: "up",
      subtitle: "success rate"
    },
    { 
      label: "Satisfaction Score", 
      value: "4.8", 
      icon: "⭐", 
      gradient: "linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)",
      change: "+0.3",
      trend: "up",
      subtitle: "out of 5.0"
    },
  ];

  // Revenue breakdown
  const revenueBreakdown = [
    { category: "Tuition Fees", amount: 625000, percentage: 71, color: "#667eea" },
    { category: "Registration", amount: 150000, percentage: 17, color: "#764ba2" },
    { category: "Other Fees", amount: 100432, percentage: 12, color: "#ff6b9d" },
  ];

  // Performance Data
  const performanceData = {
    semester: [
      { label: "Sem 1", grade7: 78, grade8: 82, grade9: 85 },
      { label: "Sem 2", grade7: 81, grade8: 84, grade9: 87 },
      { label: "Sem 3", grade7: 79, grade8: 83, grade9: 86 },
      { label: "Sem 4", grade7: 85, grade8: 88, grade9: 90 },
      { label: "Sem 5", grade7: 82, grade8: 86, grade9: 89 },
    ],
    year: [
      { label: "2033", grade7: 75, grade8: 78, grade9: 80 },
      { label: "2034", grade7: 80, grade8: 83, grade9: 85 },
      { label: "2035", grade7: 85, grade8: 88, grade9: 90 },
    ],
  };

  const currentPerformanceData = performanceData[performanceFilter];

  // Earnings over time
  const earningsData = {
    year: [
      { month: "Jan", value: 65000 },
      { month: "Feb", value: 68000 },
      { month: "Mar", value: 72000 },
      { month: "Apr", value: 70000 },
      { month: "May", value: 75000 },
      { month: "Jun", value: 78000 },
      { month: "Jul", value: 80000 },
      { month: "Aug", value: 82000 },
      { month: "Sep", value: 79000 },
      { month: "Oct", value: 81000 },
      { month: "Nov", value: 83000 },
      { month: "Dec", value: 85000 },
    ],
    quarter: [
      { month: "Q1", value: 205000 },
      { month: "Q2", value: 223000 },
      { month: "Q3", value: 241000 },
      { month: "Q4", value: 249000 },
    ],
  };

  const currentEarningsData = earningsData[earningsFilter];
  const maxEarnings = Math.max(...currentEarningsData.map(d => d.value));

  // Quick Actions
  const quickActions = [
    { label: "Generate Report", icon: "📄", color: "#667eea" },
    { label: "Add Student", icon: "👤", color: "#48bb78", path: "/add-student" },
    { label: "Send Notice", icon: "📢", color: "#f59e0b" },
    { label: "View Analytics", icon: "📊", color: "#3b82f6" },
  ];

  // Recent transactions
  const recentTransactions = [
    { id: 1, student: "Juan Dela Cruz", amount: 15000, type: "Tuition", status: "Completed", time: "2 hours ago" },
    { id: 2, student: "Maria Santos", amount: 12000, type: "Registration", status: "Pending", time: "5 hours ago" },
    { id: 3, student: "Pedro Lopez", amount: 18000, type: "Tuition", status: "Completed", time: "1 day ago" },
    { id: 4, student: "Ana Garcia", amount: 3000, type: "Lab Fee", status: "Completed", time: "2 days ago" },
  ];

  const todoItems = [
    { id: 1, text: "Review pending scholarship applications", checked: false, priority: "high" },
    { id: 2, text: "Approve next term's curriculum", checked: false, priority: "high" },
    { id: 3, text: "Schedule staff meeting", checked: true, priority: "medium" },
    { id: 4, text: "Update student records", checked: false, priority: "low" },
  ];

  return (
    <div className="dashboard professional-admin">
      {/* Header with greeting */}
      <div className="dashboard-header-pro">
        <div>
          <h1 className="dashboard-title">Analytics Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, Admin • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="header-actions-pro">
          <select className="date-range-picker">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
          <button className="btn-primary-pro">
            <span>📥</span> Export Data
          </button>
        </div>
      </div>

      {/* Stats Grid - Enhanced */}
      <div className="stats-grid-pro">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card-pro" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="stat-card-header">
              <div className="stat-icon-pro" style={{ background: stat.gradient }}>
                {stat.icon}
              </div>
              <span className={`stat-trend ${stat.trend}`}>
                {stat.trend === 'up' ? '↗' : '↘'} {stat.change}
              </span>
            </div>
            <div className="stat-card-body">
              <p className="stat-label-pro">{stat.label}</p>
              <h2 className="stat-value-pro">{stat.value}</h2>
              <p className="stat-subtitle">{stat.subtitle}</p>
            </div>
            <div className="stat-card-footer">
              <div className="mini-chart">
                {[40, 50, 45, 60, 55, 70, 65].map((h, i) => (
                  <div key={i} className="mini-bar" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

     {/* Quick Actions */}
      <div className="quick-actions-section">
        {quickActions.map((action, i) => (
          <button
            key={i}
            className="quick-action-btn"
            style={{ '--action-color': action.color }}
            onClick={() => {
              if (action.label === "Add Student") {
                setShowAddStudent(true);   // open modal
              } else if (action.path) {
                navigate(action.path);   // normal navigation
              }
            }}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
      {showAddStudent && (
        <AddStudent
          closeModal={() => setShowAddStudent(false)}
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          editId={editId}
        />
      )}
      {/* Main Content Grid */}
      <div className="content-grid-pro">
        {/* Left Column - Analytics */}
        <div className="analytics-column">
          {/* Revenue Overview */}
          <div className="chart-card-pro">
            <div className="chart-card-header-pro">
              <div>
                <h3 className="chart-title">Revenue Overview</h3>
                <p className="chart-subtitle">Monthly earnings trend</p>
              </div>
              <select 
                value={earningsFilter} 
                onChange={(e) => setEarningsFilter(e.target.value)}
                className="chart-filter-pro"
              >
                <option value="year">Monthly</option>
                <option value="quarter">Quarterly</option>
              </select>
            </div>
            <div className="chart-container-pro">
              <svg viewBox="0 0 800 200" className="line-chart-pro">
                <defs>
                  <linearGradient id="gradient-revenue" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 0.2 }} />
                    <stop offset="100%" style={{ stopColor: '#667eea', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y * 1.6}
                    x2="800"
                    y2={y * 1.6}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}
                
                {/* Area fill */}
                <polygon
                  points={`0,160 ${currentEarningsData.map((d, i) => `${(i / (currentEarningsData.length - 1)) * 780 + 10},${160 - (d.value / maxEarnings) * 140}`).join(' ')} 790,160`}
                  fill="url(#gradient-revenue)"
                />
                
                {/* Line */}
                <polyline
                  points={currentEarningsData.map((d, i) => `${(i / (currentEarningsData.length - 1)) * 780 + 10},${160 - (d.value / maxEarnings) * 140}`).join(' ')}
                  fill="none"
                  stroke="#667eea"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Data points */}
                {currentEarningsData.map((d, i) => (
                  <circle
                    key={i}
                    cx={(i / (currentEarningsData.length - 1)) * 780 + 10}
                    cy={160 - (d.value / maxEarnings) * 140}
                    r="4"
                    fill="#667eea"
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </svg>
              <div className="chart-labels">
                {currentEarningsData.map((d, i) => (
                  <span key={i}>{d.month}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="chart-card-pro">
            <div className="chart-card-header-pro">
              <div>
                <h3 className="chart-title">Student Performance</h3>
                <p className="chart-subtitle">Grade comparison over time</p>
              </div>
              <select 
                value={performanceFilter} 
                onChange={(e) => setPerformanceFilter(e.target.value)}
                className="chart-filter-pro"
              >
                <option value="semester">By Semester</option>
                <option value="year">By Year</option>
              </select>
            </div>
            <div className="chart-container-pro">
              <div className="bar-chart-pro">
                {currentPerformanceData.map((item, i) => (
                  <div key={i} className="chart-bar-group">
                    <div className="bars-wrapper">
                      <div 
                        className="bar-pro grade7-bar"
                        style={{ height: `${item.grade7}%` }}
                        title={`Grade 7: ${item.grade7}%`}
                      >
                        <span className="bar-value">{item.grade7}</span>
                      </div>
                      <div 
                        className="bar-pro grade8-bar"
                        style={{ height: `${item.grade8}%` }}
                        title={`Grade 8: ${item.grade8}%`}
                      >
                        <span className="bar-value">{item.grade8}</span>
                      </div>
                      <div 
                        className="bar-pro grade9-bar"
                        style={{ height: `${item.grade9}%` }}
                        title={`Grade 9: ${item.grade9}%`}
                      >
                        <span className="bar-value">{item.grade9}</span>
                      </div>
                    </div>
                    <p className="chart-bar-label">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-legend-pro">
              <div className="legend-item-pro">
                <span className="legend-dot grade7-dot"></span>
                <span>Grade 7</span>
              </div>
              <div className="legend-item-pro">
                <span className="legend-dot grade8-dot"></span>
                <span>Grade 8</span>
              </div>
              <div className="legend-item-pro">
                <span className="legend-dot grade9-dot"></span>
                <span>Grade 9</span>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="revenue-breakdown-card">
            <h3 className="chart-title">Revenue Breakdown</h3>
            <div className="breakdown-list">
              {revenueBreakdown.map((item, i) => (
                <div key={i} className="breakdown-item">
                  <div className="breakdown-info">
                    <span className="breakdown-category">{item.category}</span>
                    <span className="breakdown-amount">₱{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="breakdown-bar-container">
                    <div 
                      className="breakdown-bar"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    ></div>
                  </div>
                  <span className="breakdown-percentage">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="sidebar-column">
          {/* Calendar */}
          <div className="calendar-card-pro">
            <div className="calendar-header-pro">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="calendar-nav">‹</button>
              <h3 className="calendar-title">{monthName}</h3>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="calendar-nav">›</button>
            </div>
            <div className="calendar-grid-pro">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="calendar-day-pro empty"></div>
              ))}
              {daysArray.map((day) => (
                <div
                  key={day}
                  className={`calendar-day-pro ${selectedDate === day ? "selected" : ""} ${day <= 5 ? "has-event" : ""}`}
                  onClick={() => setSelectedDate(day)}
                >
                  {day}
                  {day <= 5 && <span className="event-indicator"></span>}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="transactions-card">
            <h3 className="card-title-pro">Recent Transactions</h3>
            <div className="transactions-list">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon">
                    <span>{transaction.type === 'Tuition' ? '🎓' : transaction.type === 'Registration' ? '📝' : '⚗️'}</span>
                  </div>
                  <div className="transaction-details">
                    <p className="transaction-student">{transaction.student}</p>
                    <p className="transaction-type">{transaction.type} • {transaction.time}</p>
                  </div>
                  <div className="transaction-amount">
                    <p className="amount">₱{transaction.amount.toLocaleString()}</p>
                    <span className={`status-badge ${transaction.status.toLowerCase()}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Todo List */}
          <div className="todo-card-pro">
            <h3 className="card-title-pro">Tasks</h3>
            <div className="todo-list-pro">
              {todoItems.map((item) => (
                <label key={item.id} className={`todo-item-pro priority-${item.priority}`}>
                  <input type="checkbox" defaultChecked={item.checked} />
                  <span className={item.checked ? "checked" : ""}>{item.text}</span>
                  <span className={`priority-badge ${item.priority}`}>{item.priority}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}