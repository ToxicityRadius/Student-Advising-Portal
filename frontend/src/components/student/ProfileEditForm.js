import React from "react";

const YELLOW = "#FFC107";

const programOptions = ["BSCpE", "BSCS", "BSIT", "BSCE", "BSEE", "BSME"];
const sexOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];
const studentTypeOptions = ["regular", "irregular", "transferee", "ladderized"];

const ProfileEditForm = ({
  user,
  formData,
  fieldErrors,
  curricula,
  saving,
  email,
  preview,
  isProfileLockedForCurrentTerm,
  currentProfileTermLabel,
  handleChange,
  handleSubmit,
  handleFileChange,
  handleRemovePhoto,
  setEditMode,
  setError,
  setSuccess,
  getInitials,
}) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 16,
      padding: "32px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 28,
      }}
    >
      <h3
        style={{
          fontWeight: 800,
          fontSize: "1.2rem",
          color: "#111",
          margin: 0,
        }}
      >
        Edit Profile
      </h3>
      <button
        onClick={() => {
          setEditMode(false);
          setError("");
          setSuccess("");
        }}
        style={{
          background: "none",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "8px 18px",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.88rem",
          color: "#555",
        }}
      >
        Cancel
      </button>
    </div>

    {user?.role === "student" && isProfileLockedForCurrentTerm && (
      <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#856404", fontSize: "0.9rem" }}>
        Profile details are locked for {currentProfileTermLabel}. Only profile picture updates are available until the next term.
      </div>
    )}

    <form onSubmit={handleSubmit}>
      {/* ── Identity ── */}
      <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Identity</p>
      <fieldset disabled={user?.role === "student" && isProfileLockedForCurrentTerm} style={{ border: 0, padding: 0, margin: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[{ name: "first_name", label: "First Name", required: true }, { name: "middle_name", label: "Middle Name" }, { name: "last_name", label: "Last Name", required: true }, { name: "suffix", label: "Suffix", placeholder: "e.g. Jr, III" }, { name: "preferred_name", label: "Preferred Name", placeholder: "What you prefer to be called" }, { name: "contact_number", label: "Mobile Number", required: true, placeholder: "+63 9XX XXX XXXX" }].map(({ name, label, required, placeholder }) => (
          <div key={name}>
            <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {label}{required && <span style={{ color: "#e53935" }}> *</span>}
            </label>
            <input
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required={required}
              placeholder={placeholder || ""}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors[name] ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }}
            />
            {fieldErrors[name] && <p style={{ color: "#e53935", fontSize: "0.78rem", margin: "4px 0 0" }}>{fieldErrors[name]}</p>}
          </div>
        ))}
      </div>

      {/* ── Academic Identity (students only) ── */}
      {user?.role === "student" && (
        <>
          <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Academic Identity</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Student Number</label>
              <input value={formData.student_id} readOnly disabled style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#f5f5f5" }} />
              <p style={{ color: "#aaa", fontSize: "0.75rem", margin: "4px 0 0" }}>Managed via Student ID settings.</p>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Program <span style={{ color: "#e53935" }}>*</span></label>
              <select name="program" value={formData.program} onChange={handleChange} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.program ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                <option value="">Select Program</option>
                {programOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Year Level <span style={{ color: "#e53935" }}>*</span></label>
              <select name="year_level" value={formData.year_level} onChange={handleChange} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.year_level ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                <option value="">Select Year Level</option>
                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Curriculum <span style={{ color: "#e53935" }}>*</span></label>
              <select name="curriculum_id" value={formData.curriculum_id} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.curriculum_id ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                <option value="">Select Curriculum</option>
                {curricula.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Student Type <span style={{ color: "#e53935" }}>*</span></label>
              <select name="student_type" value={formData.student_type} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.student_type ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
                <option value="">Select Type</option>
                {studentTypeOptions.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      {/* ── Contact ── */}
      <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Contact</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Primary Email</label>
          <input value={email} readOnly disabled style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#f5f5f5" }} />
          <p style={{ color: "#aaa", fontSize: "0.75rem", margin: "4px 0 0" }}>Change via account settings.</p>
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Alternate Email</label>
          <input type="email" name="alternate_email" value={formData.alternate_email} onChange={handleChange} placeholder="personal or backup email"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.alternate_email ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* ── Demographics ── */}
      <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Demographics</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Sex <span style={{ color: "#e53935" }}>*</span></label>
          <select name="sex" value={formData.sex} onChange={handleChange} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.sex ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", background: "#fff" }}>
            <option value="">Select</option>
            {sexOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Citizenship <span style={{ color: "#e53935" }}>*</span></label>
          <input name="citizenship" value={formData.citizenship} onChange={handleChange} required placeholder="e.g. Filipino"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.citizenship ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* ── Location ── */}
      <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Location</p>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Current Address <span style={{ color: "#e53935" }}>*</span></label>
        <textarea name="address" value={formData.address} onChange={handleChange} required rows={2} placeholder="House/Unit No., Street, Barangay, City, Province"
          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.address ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
      </div>

      {/* ── Emergency Contact ── */}
      <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Emergency Contact</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Name <span style={{ color: "#e53935" }}>*</span></label>
          <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} required
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.emergency_contact_name ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Relationship</label>
          <input name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange} placeholder="e.g. Parent, Sibling"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 700, fontSize: "0.75rem", color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Contact Number <span style={{ color: "#e53935" }}>*</span></label>
          <input name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleChange} required
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${fieldErrors.emergency_contact_number ? "#e53935" : "#e0e0e0"}`, borderRadius: 8, fontSize: "0.92rem", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
      </fieldset>

      {/* ── Profile Picture ── */}
      <p style={{ fontWeight: 700, fontSize: "0.72rem", color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Profile Photo</p>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: YELLOW, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, fontSize: "1.4rem", fontWeight: 900, color: "#222" }}>
          {preview ? <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(`${formData.first_name} ${formData.last_name}`)}
        </div>
        <div style={{ flex: 1 }}>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: "0.88rem" }} />
          <p style={{ color: "#aaa", fontSize: "0.75rem", margin: "4px 0 0" }}>JPEG, PNG, or WEBP. Max 2 MB.</p>
        </div>
        <button type="button" onClick={handleRemovePhoto} disabled={!preview && !formData.profile_picture}
          style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", color: "#777" }}>
          Remove
        </button>
      </div>

      <button type="submit" disabled={saving}
        style={{ background: YELLOW, color: "#222", fontWeight: 800, fontSize: "0.95rem", padding: "12px 32px", borderRadius: 8, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving..." : user?.role === "student" && isProfileLockedForCurrentTerm ? "Update Profile Picture" : "Save Changes"}
      </button>
    </form>
  </div>
);

export default ProfileEditForm;
