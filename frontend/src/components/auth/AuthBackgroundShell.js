import React from "react";

const AuthBackgroundShell = ({
  backgroundImage,
  topBarTop = "10.5%",
  contentClassName = "",
  contentStyle,
  children,
}) => {
  return (
    <div
      className={`min-vh-100 d-flex align-items-center justify-content-center position-relative ${contentClassName}`.trim()}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="position-absolute"
        style={{
          left: 0,
          top: topBarTop,
          width: "550px",
          height: "60px",
          backgroundColor: "#FFC107",
          zIndex: 2,
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
        }}
      />

      <div
        className="position-absolute"
        style={{
          right: 0,
          bottom: "10.5%",
          width: "1500px",
          height: "60px",
          backgroundColor: "#FFC107",
          zIndex: 1,
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
        }}
      />

      <div style={{ position: "relative", zIndex: 3, ...contentStyle }}>{children}</div>
    </div>
  );
};

export default AuthBackgroundShell;
