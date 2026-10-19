import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiBox,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiDroplet,
  FiDollarSign,
  FiGitBranch,
  FiGrid,
  FiHome,
  FiLogOut,
  FiPackage,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { getUser, logout } from "../config/auth";
import "./AdminShell.css";

const navigationItems = [
  { label: "Dashboard", to: "/admin/dashboard", icon: FiHome, matches: ["/admin/dashboard"] },
  {
    label: "Products",
    to: "/admin/stock/manage",
    icon: FiPackage,
    matches: ["/admin/stock/manage", "/admin/stock/manage/"],
  },
  {
    label: "Attendance",
    to: "/admin/attendance",
    icon: FiCalendar,
    matches: ["/admin/attendance", "/admin/attendance/"],
  },
  {
    label: "Stock",
    to: "/admin/stock",
    icon: FiBox,
    matches: ["/admin/stock", "/admin/stock/types", "/admin/stock/type/"],
  },
  {
    label: "Factory Flow",
    to: "/admin/factory-flow",
    icon: FiGitBranch,
    matches: [
      "/admin/factory-flow",
      "/admin/stock/process-goods",
      "/admin/stock/process-goods/",
      "/admin/stock/manufacturing",
      "/admin/stock/manufacturing/",
    ],
  },
  {
    label: "Payout",
    to: "/admin/payout",
    icon: FiDollarSign,
    matches: ["/admin/payout", "/admin/payout/", "/admin/salary-slip", "/admin/salary-slip/"],
  },
  {
    label: "Washers",
    to: "/admin/washers",
    icon: FiDroplet,
    matches: ["/admin/washers", "/admin/washers/"],
  },
  {
    label: "Suppliers",
    to: "/admin/suppliers",
    icon: FiTruck,
    matches: ["/admin/suppliers", "/admin/suppliers/"],
  },
  {
    label: "Customers",
    to: "/admin/customers",
    icon: FiUsers,
    matches: ["/admin/customers", "/admin/customers/"],
  },
  {
    label: "Employees",
    to: "/admin/employees",
    icon: FiUsers,
    matches: ["/admin/employees", "/admin/employees/"],
  },
];

const mobileMoreItems = navigationItems.filter(({ label }) =>
  ["Products", "Factory Flow", "Payout", "Washers", "Suppliers", "Customers", "Employees"].includes(
    label
  )
);

const isCurrentRoute = (pathname, matches) =>
  matches.some((match) => (match.endsWith("/") ? pathname.startsWith(match) : pathname === match));

const getAccountLabel = (user) => {
  if (user?.role === "admin") return "Admin";
  return user?.businessName || user?.name || "Account";
};

const Brand = ({ compact = false }) => (
  <div className={`admin-brand ${compact ? "admin-brand-compact" : ""}`}>
    <strong>NCH</strong>
    {!compact && <span>NEW CALCUTTA HANDLOOM</span>}
  </div>
);

const AdminShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const accountLabel = useMemo(() => getAccountLabel(getUser()), []);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  const closeMoreSheet = () => setMoreOpen(false);
  const handleLogout = () => {
    logout();
    closeMoreSheet();
    navigate("/login");
  };

  const renderLink = (item, className, onNavigate, isCollapsed = false) => {
    const Icon = item.icon;
    const active = isCurrentRoute(location.pathname, item.matches);

    return (
      <Link
        key={item.label}
        to={item.to}
        className={`${className} ${active ? "is-active" : ""}`}
        aria-current={active ? "page" : undefined}
        title={isCollapsed ? item.label : undefined}
        onClick={onNavigate}
      >
        <Icon aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const homeItem = navigationItems[0];
  const attendanceItem = navigationItems[2];
  const stockItem = navigationItems[3];
  const moreActive = mobileMoreItems.some((item) =>
    isCurrentRoute(location.pathname, item.matches)
  );

  return (
    <div className={`admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-top">
          <Brand compact={collapsed} />
          <button
            type="button"
            className="admin-sidebar-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <FiChevronRight aria-hidden="true" />
            ) : (
              <FiChevronLeft aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {navigationItems.map((item) =>
            renderLink(item, "admin-sidebar-link", closeMoreSheet, collapsed)
          )}
        </nav>

        <button
          type="button"
          className="admin-sidebar-logout"
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
        >
          <FiLogOut aria-hidden="true" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="admin-shell-workspace">
        <header className="admin-desktop-topbar">
          <span>Admin workspace</span>
          <strong>{accountLabel}</strong>
        </header>

        <header className="admin-mobile-header">
          <Brand />
          <strong title={accountLabel}>{accountLabel}</strong>
        </header>

        <main className="admin-shell-main">{children}</main>
        <footer className="admin-shell-footer">
          &copy; {new Date().getFullYear()} New Calcutta Handloom.
        </footer>
      </div>

      <nav className="admin-mobile-bottom-nav" aria-label="Mobile admin navigation">
        {renderLink(homeItem, "admin-mobile-nav-link", closeMoreSheet)}
        {renderLink(attendanceItem, "admin-mobile-nav-link", closeMoreSheet)}
        {renderLink(stockItem, "admin-mobile-nav-link", closeMoreSheet)}
        <button
          type="button"
          className={`admin-mobile-nav-link ${moreActive || moreOpen ? "is-active" : ""}`}
          aria-expanded={moreOpen}
          aria-controls="admin-mobile-more-sheet"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <FiGrid aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="admin-more-sheet-layer" role="presentation" onMouseDown={closeMoreSheet}>
          <section
            id="admin-mobile-more-sheet"
            className="admin-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-more-sheet-handle" aria-hidden="true" />
            <div className="admin-more-sheet-title">More</div>
            <nav>
              {mobileMoreItems.map((item) =>
                renderLink(item, "admin-more-sheet-link", closeMoreSheet)
              )}
            </nav>
            <button type="button" className="admin-more-sheet-logout" onClick={handleLogout}>
              <FiLogOut aria-hidden="true" />
              <span>Logout</span>
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminShell;
