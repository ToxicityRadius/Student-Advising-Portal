import React from "react";
import SidebarLayout from "../shared/SidebarLayout";
import { useAuth } from "../../context/AuthContext";

import goldUserImg from "../../assets/images/Gold User.png";
import goldBookImg from "../../assets/images/Gold book.png";
import goldChecklistImg from "../../assets/images/Gold Checklist.png";
import yellowCalendarImg from "../../assets/images/yellow calendar.png";

const icon = (src) => (
  <img src={src} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
);

const NAV_ITEMS = [
  { key: "students", label: "Students", to: "/adviser/students", icon: icon(goldUserImg) },
];

const ADMIN_NAV_ITEMS = [
  { key: "students", label: "Students", to: "/adviser/students", icon: icon(goldUserImg) },
  { key: "curriculum", label: "Curriculum", to: "/admin/curriculum", icon: icon(goldBookImg) },
  { key: "forecast", label: "Forecast", to: "/admin/forecast", icon: icon(goldChecklistImg) },
  { key: "terms", label: "Terms", to: "/admin/terms", icon: icon(yellowCalendarImg) },
];

const AdviserLayout = ({ activePage, pageTitle, children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <SidebarLayout
      activePage={activePage}
      pageTitle={pageTitle}
      navItems={isAdmin ? ADMIN_NAV_ITEMS : NAV_ITEMS}
      roleLabel={isAdmin ? "Program Chair" : "Adviser"}
    >
      {children}
    </SidebarLayout>
  );
};

export default AdviserLayout;
