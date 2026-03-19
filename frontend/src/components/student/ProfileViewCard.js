import React from "react";
import studentYellowImg from "../../assets/images/student yellow.png";

const YELLOW = "#FFC107";

const InfoField = ({ label, value }) => (
  <div>
    <div
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "#bbb",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 5,
      }}
    >
      {label}
    </div>
    <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "#111" }}>
      {value || "—"}
    </div>
  </div>
);

const ProfileViewCard = ({
  preview,
  initials,
  fullName,
  suffix,
  studentId,
  email,
  alternateEmail,
  contactNumber,
  sex,
  citizenship,
  preferredName,
  address,
  emergencyContactName,
  emergencyContactRelationship,
  emergencyContactNumber,
  setEditMode,
}) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 16,
      padding: "28px 32px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      marginBottom: 24,
    }}
  >
    {/* Card header */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 28,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={studentYellowImg}
          alt=""
          style={{ width: 28, height: 28, objectFit: "contain" }}
        />
        <h3
          style={{
            fontWeight: 800,
            fontSize: "1.2rem",
            color: "#111",
            margin: 0,
          }}
        >
          Personal Information
        </h3>
      </div>
      <button
        onClick={() => setEditMode(true)}
        style={{
          background: YELLOW,
          color: "#222",
          fontWeight: 800,
          fontSize: "0.8rem",
          padding: "9px 20px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          letterSpacing: 0.5,
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#e0a800")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = YELLOW)
        }
      >
        EDIT PROFILE
      </button>
    </div>

    <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
      {/* Avatar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: YELLOW,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.2rem",
            fontWeight: 900,
            color: "#222",
            overflow: "hidden",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            initials
          )}
        </div>
      </div>

      {/* Info grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "22px 48px",
        }}
      >
        <InfoField label="Full Name" value={suffix ? `${fullName}, ${suffix}` : fullName} />
        <InfoField label="Student ID" value={studentId} />
        <InfoField label="Email Address" value={email} />
        <InfoField label="Alternate Email" value={alternateEmail} />
        <InfoField label="Phone Number" value={contactNumber} />
        <InfoField label="Sex" value={sex ? sex : null} />
        <InfoField label="Citizenship" value={citizenship} />
        {preferredName && <InfoField label="Preferred Name" value={preferredName} />}
      </div>
    </div>
    {(address || emergencyContactName) && (
      <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 24, paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 48px" }}>
        {address && <InfoField label="Address" value={address} />}
        {emergencyContactName && <InfoField label="Emergency Contact" value={emergencyContactName + (emergencyContactRelationship ? ` (${emergencyContactRelationship})` : "")} />}
        {emergencyContactNumber && <InfoField label="Emergency Number" value={emergencyContactNumber} />}
      </div>
    )}
  </div>
);

export default ProfileViewCard;
