import React from "react";
import SidebarLayout from "../shared/SidebarLayout";

import goldUserImg from "../../assets/images/Gold User.png";

const icon = (src) => (
  <img src={src} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
);

const NAV_ITEMS = [
  { key: "students", label: "Students", to: "/adviser/students", icon: icon(goldUserImg) },
];

const AdviserLayout = ({ activePage, pageTitle, children }) => (
  <SidebarLayout
    activePage={activePage}
    pageTitle={pageTitle}
    navItems={NAV_ITEMS}
    roleLabel="Adviser"
  >
    {children}
  </SidebarLayout>
);

export default AdviserLayout;
