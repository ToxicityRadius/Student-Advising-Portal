import React from "react";
import SidebarLayout from "../shared/SidebarLayout";

import goldBookImg from "../../assets/images/Gold book.png";
import goldChecklistImg from "../../assets/images/Gold Checklist.png";
import yellowCalendarImg from "../../assets/images/yellow calendar.png";

const icon = (src) => (
  <img src={src} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
);

const NAV_ITEMS = [
  { key: "curriculum", label: "Curriculum", to: "/admin/curriculum", icon: icon(goldBookImg) },
  { key: "forecast", label: "Forecast", to: "/admin/forecast", icon: icon(goldChecklistImg) },
  { key: "terms", label: "Terms", to: "/admin/terms", icon: icon(yellowCalendarImg) },
];

const AdminLayout = ({ activePage, pageTitle, children }) => (
  <SidebarLayout
    activePage={activePage}
    pageTitle={pageTitle}
    navItems={NAV_ITEMS}
    roleLabel="Program Chair"
  >
    {children}
  </SidebarLayout>
);

export default AdminLayout;
