import React from "react";

const AuthPopupOverlay = ({
  title,
  message,
  icon = "⚠️",
  iconStyle,
  borderColor,
  onClose,
}) => {
  return (
    <div className="error-popup-overlay">
      <div className="error-popup" style={borderColor ? { borderColor } : undefined}>
        <div className="error-popup-content">
          <span className="error-icon" style={iconStyle}>{icon}</span>
          {title ? <h3 style={borderColor ? { color: borderColor, marginBottom: "10px" } : undefined}>{title}</h3> : null}
          {message ? <p>{message}</p> : null}
        </div>
        {onClose ? (
          <button className="error-close-btn" onClick={onClose}>×</button>
        ) : null}
      </div>
    </div>
  );
};

export default AuthPopupOverlay;
