# TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES
## Manila
### COMPUTER ENGINEERING DEPARTMENT

---

# Development of an Intelligent Academic Advising and Course Demand Forecasting System for the Department of Computer Engineering

**A Project Proposal Submitted to the Department of Computer Engineering**
*in Partial Fulfillment of the Requirements for the Course CPE 205B Software Design 2*
*for the Degree of Bachelor of Science in Computer Engineering*

---

**Dela Cruz, Charles Arvin P.**
**Diaz, Michael Angelo Z.**
**Morelos, Ramon Jr. Y.**
**Sales, John Vincent R.**
**Soriano, Dexter Aic M.**
**Soriano, Justine G.**

*January 2026*

---

## TABLE OF CONTENTS

1. [INTRODUCTION](#1-introduction)
   - 1.1 [Background of the Study](#11-background-of-the-study)
   - 1.2 [Problem Statement](#12-problem-statement)
     - 1.2.1 [Challenges in Manual Study Planning](#121-challenges-in-manual-study-planning)
     - 1.2.2 [Unreliability of Predicting Course Demand](#122-unreliability-of-predicting-course-demand)
     - 1.2.3 [Inefficiency in Curriculum and Equivalency Management](#123-inefficiency-in-curriculum-and-equivalency-management)
   - 1.3 [Project Objectives](#13-project-objectives)
     - 1.3.1 [General Objective](#131-general-objective)
     - 1.3.2 [Specific Objectives](#132-specific-objectives)
   - 1.4 [Scope and Limitations](#14-scope-and-limitations)
     - 1.4.1 [Scope of the Project](#141-scope-of-the-project)
     - 1.4.2 [Limitations of the Project](#142-limitations-of-the-project)
   - 1.5 [Expected Users / Stakeholders and their Requirements](#15-expected-users--stakeholders-and-their-requirements)
     - 1.5.1 [Student](#151-student)
     - 1.5.2 [Student Adviser](#152-student-adviser)
     - 1.5.3 [Super Admin](#153-super-admin)
     - 1.5.4 [Program Chair](#154-program-chair)
2. [REVIEW OF RELATED LITERATURE / SYSTEMS](#2-review-of-related-literature--systems)
   - 2.1 [Related Literature](#21-related-literature)
   - 2.2 [Related Systems](#22-related-systems)
   - 2.3 [Synthesis](#23-synthesis)
3. [SYSTEM ANALYSIS](#3-system-analysis)
   - 3.1 [Current System Description](#31-current-system-description)
     - 3.1.1 [Student Advising](#311-student-advising)
     - 3.1.2 [Course Offering Planning](#312-course-offering-planning)
   - 3.2 [Proposed System Description](#32-proposed-system-description)
     - 3.2.1 [System Core Components and Functionality](#321-system-core-components-and-functionality)
   - 3.3 [Requirements Specification](#33-requirements-specification)
     - 3.3.1 [Functional Requirements](#331-functional-requirements)
     - 3.3.2 [Non-Functional Requirements](#332-non-functional-requirements)
   - 3.4 [System Constraints](#34-system-constraints)
     - 3.4.1 [Hardware and Network Constraints](#341-hardware-and-network-constraints)
     - 3.4.2 [Software and Data Constraints](#342-software-and-data-constraints)
     - 3.4.3 [Policy and Operational Constraints](#343-policy-and-operational-constraints)
4. [SYSTEM DESIGN AND ARCHITECTURE](#4-system-design-and-architecture)
   - 4.1 [System Architecture](#41-system-architecture)
   - 4.2 [Functional Requirements](#42-functional-requirements)
     - 4.2.1 [System Foundations and Security](#421-system-foundations-and-security)
     - 4.2.2 [System Configuration (Curriculum Management)](#422-system-configuration-curriculum-management)
     - 4.2.3 [Student Data Management](#423-student-data-management)
     - 4.2.4 [Intelligent Advising and Planning](#424-intelligent-advising-and-planning)
     - 4.2.5 [Forecasting and Decision Support](#425-forecasting-and-decision-support)
   - 4.3 [Use Case Diagram](#43-use-case-diagram)
   - 4.4 [Overall System Flow and Data Model](#44-overall-system-flow-and-data-model)
     - 4.4.1 [Entity-Relationship Diagram](#441-entity-relationship-diagram)
     - 4.4.2 [Data Flow Diagrams](#442-data-flow-diagrams)

---

## 1. INTRODUCTION

This document presents the updated software design of the Student Advising and Course Demand Forecasting System based on the current implemented platform. The system is a role-based web application that supports academic advising operations for the Computer Engineering Department through curriculum governance, Student Academic Record (SAR) management, study plan generation and validation, and term-based forecasting.

The system currently serves four user roles: Super Admin (superadmin), Program Chair (admin), Student Adviser (adviser), and Student (student). The implemented design focuses on replacing fragmented manual workflows with a centralized digital process that enforces prerequisite logic, tracks versioned study plans, provides aggregate course demand analytics for planning, and separates global account control from program-scoped academic operations.

### Current Role Boundary

The Super Admin is the only global-permission account. Program Chair remains stored as the `admin` role internally, but all Program Chair access is limited to assigned programs through `UserProgramAssignment`.

Super Admin-only actions include program management, program assignment management, transfer ownership, editing user account details, activating/deactivating users, and viewing or managing Super Admin accounts. Program Chair users can still manage assigned-program workflows such as curriculum, terms, forecasting, adviser assignment, SAR/study-plan work, prerequisite overrides, and elective-track overrides where backend scope allows it.

---

### 1.1 Background of the Study

The Department of Computer Engineering handles advising scenarios that include regular students, irregular students, transferees, and curriculum-transition cases. Traditional advising practices rely on manual checklist validation, informal tracking sheets, and non-uniform decision records, which increase turnaround time and introduce inconsistencies when multiple stakeholders process the same student case.

To address these operational gaps, the department developed a standalone advising platform that consolidates curriculum data, student records, plan workflows, and demand analytics. The implemented system is designed around reproducible decision logic and controlled approvals rather than ad hoc document exchange.

The current implementation integrates:
- a secured authentication and role-based access layer,
- curriculum management with prerequisite/co-requisite/equivalency controls,
- SAR creation and adviser-led grade encoding,
- versioned study plan generation/regeneration/validation,
- academic term lifecycle management, and
- forecast dashboards for current, next-term, and comparative demand views.

---

### 1.2 Problem Statement

#### 1.2.1 Challenges in Manual Study Planning

Manual plan building for irregular students is slow and error-prone because prerequisite dependencies, curriculum slot placement, and failed-course carry-over must be checked simultaneously. Without a structured workflow, advisers may produce inconsistent recommendations across comparable student cases.

#### 1.2.2 Unreliability of Predicting Course Demand

When course demand decisions are based only on petitions or anecdotal adviser feedback, sectioning plans are less reliable. The department needs a term-contextual and plan-derived demand count that reflects validated student pathways rather than intent-only surveys.

#### 1.2.3 Inefficiency in Curriculum and Equivalency Management

Multiple curriculum versions require centralized maintenance of courses, mappings, and constraints. Without an integrated configuration module, prerequisite and equivalency rules are difficult to audit, and plan generation becomes dependent on non-uniform human interpretation.

---

### 1.3 Project Objectives

#### 1.3.1 General Objective

To provide a centralized, role-based advising platform that operationalizes curriculum governance, SAR workflows, versioned study planning, and forecast analytics for the Computer Engineering Department.

#### 1.3.2 Specific Objectives

The project specifically aims to:

- Implement secure, role-based authentication and protected access for Super Admin, Program Chair, Student Adviser, and Student users.
- Provide complete curriculum administration for courses, prerequisites, co-requisites, equivalencies, and elective tracks.
- Enable adviser-led SAR creation, profile synchronization, and academic record maintenance.
- Generate and manage versioned study plans (draft/active) with formal validation and revalidation controls.
- Support grade-driven study plan regeneration using prerequisite and per-semester unit-load constraints.
- Deliver term-aware demand forecasting (current, next, comparison, history) from active plans.
- Produce exportable SAR PDF reports that summarize academic profile, plan state, and analytics.

---

### 1.4 Scope and Limitations

#### 1.4.1 Scope of the Project

The implemented system includes the following production features:

- **Authentication and Account Security:** Email/password login, account verification, password reset, optional Google sign-in, and role-based route protection.
- **User Management:** Super Admin manages global account lifecycle controls, user detail edits, activation/deactivation, program assignments, and transfer ownership. Program Chair manages assigned-program academic operations and adviser assignment where scoped access allows it.
- **Curriculum Governance:** Super Admin can manage all curricula. Program Chair can create and activate curricula; manage curriculum-course placements; configure prerequisites, co-requisites, equivalencies, and elective tracks; and process curriculum CSV preview/apply workflows only within assigned program scope.
- **SAR Management:** Advisers and Program Chair can create and update Student Academic Records, including curriculum and elective track assignment.
- **Study Plan Lifecycle:** Advisers and Program Chair can generate initial draft plans, enter grades, trigger draft regeneration, and validate drafts into active plans.
- **Advising Analytics:** System computes academic KPIs (units, status summaries, graduation estimate indicators) for SAR views and reports.
- **Forecasting and Terms:** Super Admin can view all programs. Program Chair and advisers can view current/next/comparison/history demand views within assigned scope; Program Chair can create/activate/end terms within assigned program scope.
- **PDF Export:** Student, adviser, and admin can export SAR-focused PDF reports.

#### 1.4.2 Limitations of the Project

- The system is standalone and does not directly integrate with ARIS or registrar enrollment APIs.
- Historical grade ingestion is currently adviser-administered; student self-entry with proof-validation workflow is not part of the implemented process.
- Forecasting is aggregation-based and term-contextual; it is not an AI predictive model.
- Dynamic off-semester opening with automatic re-optimization of all affected plans is not implemented as a direct action flow.
- Course equivalency records are maintained centrally but are not yet automatically applied as a migration engine during plan regeneration.

---

### 1.5 Expected Users / Stakeholders and their Requirements

#### 1.5.1 Student

- Needs secure access to view their own academic record and active study plan.
- Needs clear visibility of course status outcomes and remaining requirements.
- Needs downloadable adviser-approved documentation through SAR PDF export.

#### 1.5.2 Student Adviser

- Needs end-to-end control of advising operations for assigned students: SAR creation, grade entry, plan generation, regeneration review, and validation.
- Needs prerequisite and compliance checks before finalizing a plan.
- Needs fast access to advisee analytics and plan-version context.

#### 1.5.3 Super Admin

- Needs global program and program-assignment administration.
- Needs account lifecycle controls, including editing user account details and activating/deactivating users.
- Needs ownership-transfer controls and visibility across all programs for release support and audit work.

#### 1.5.4 Program Chair

- Needs full curriculum governance controls and auditable academic rule configuration.
- Needs assigned-program adviser assignment and academic workflow control.
- Needs aggregate, term-aware demand views to support section and staffing decisions.

---

## 2. REVIEW OF RELATED LITERATURE / SYSTEMS

This chapter presents concise references used in framing the system domain and compares them with the implemented architecture and workflows of the platform.

---

### 2.1 Related Literature

**Using Curriculum Mapping as a Tool to Match Student Learning Outcomes and Social Studies Curricula** (Okojie, Bastas, and Miralay, 2022)  
*https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.850264/full*

This literature emphasizes the importance of machine-readable curriculum structures for institutional decision support. The implemented platform follows this direction by storing curriculum-course slots and dependency rules in structured relational tables that are consumed by plan-generation workflows.

**An intelligent expert system for academic advising utilizing fuzzy logic and semantic web technologies for smart cities education** (Iatrellis et al., 2022)  
*https://www.researchgate.net/publication/361249887_An_intelligent_expert_system_for_academic_advising_utilizing_fuzzy_logic_and_semantic_web_technologies_for_smart_cities_education*

This work highlights advanced advisory reasoning under uncertainty. The current system partially aligns through rule-driven validation and grade-based regeneration, but it does not yet implement fuzzy or probabilistic recommendation layers.

**An Intelligent Recommendation System for Automating Academic Advising Based on Curriculum Analysis and Performance Modeling** (Atalla et al., 2023)  
*https://www.mdpi.com/2227-7390/11/5/1098*

The paper demonstrates predictive advising opportunities. The implemented platform currently prioritizes deterministic academic-rule enforcement and versioned workflow control over machine learning recommendation models.

**A Comparative Study of Academic Advising System in Foundation Programs and the Development of a Web-Based Advising Interface for Malaysian Universities** (Jamaludin et al., 2025)  
*https://proceedings.tiikmpublishing.com/data/conferences/doi/icedu/10.17501-24246700.2025.11110.pdf*

This study reinforces web-based advising accessibility and process standardization. The implemented system aligns strongly in this area through role-partitioned interfaces and unified advising screens.

---

### 2.2 Related Systems

**Ateneo AIMS (Ateneo Integrated Student Information System)**  
*https://aisis.ateneo.edu/j_aisis/displayLogin.do*

AIMS demonstrates institutional-scale transaction management for records and enrollment. The current project differs by focusing specifically on advising lifecycle workflows and curriculum-rule governance in a standalone deployment.

**UP CRS (University of the Philippines – Computerized Registration System)**  
*https://crs.upd.edu.ph/*

UP CRS supports advising and pre-enlistment but is enrollment-centric. The implemented platform emphasizes validated study-plan versions and demand aggregation based on active plans rather than student self-enlistment intent.

**Mapúa Cardinal EDGE Advising System**  
*https://www.mapua.edu.ph/*

This system highlights digital planning support and curriculum transition handling. The current project similarly supports curriculum version management and equivalency records, while maintaining its own adviser-governed workflow for plan lifecycle operations.

---

### 2.3 Synthesis

Related studies and systems indicate that successful advising platforms require structured curriculum data, controlled user access, and automated workflow support. The implemented project addresses these needs by delivering a practical rule-based system that combines curriculum governance, SAR management, plan validation, and forecasting in one platform.

The platform intentionally favors deterministic and auditable advisory operations over experimental recommendation models. As implemented, it already resolves major operational pain points in consistency, visibility, and cross-role coordination, while leaving space for future enhancements in predictive intelligence and automated migration logic.

---

## 3. SYSTEM ANALYSIS

This chapter describes the implemented operational model and defines system requirements grounded on the current codebase behavior.

---

### 3.1 Current System Description

The system runs as a four-role web platform with protected APIs and UI routes. Advising operations are centered around Student Academic Records (SAR), where each SAR can own a versioned study plan container. Draft plans are generated/regenerated by adviser/admin actions and become operational only after validation. Super Admin access is global; Program Chair and Adviser access is program-scoped.

#### 3.1.1 Student Advising

- Advisers create and maintain SAR entries for advisees.
- Initial draft study plans are generated from curriculum slot definitions and selected elective tracks.
- Grade encoding updates course outcomes (passed/failed/dropped/incomplete) and can trigger a new regenerated draft.
- Validation enforces prerequisite, co-requisite, and elective-track checks before promoting a draft to active.

#### 3.1.2 Course Offering Planning

- Forecasting aggregates active study-plan versions by academic term context.
- The system provides current-semester demand, next-semester demand, comparative demand, and historical snapshots.
- Program Chair uses assigned-program aggregate views for sectioning and staffing decisions.

---

### 3.2 Proposed System Description

The system is implemented as a role-aware decision-support platform with modular services for security, curriculum control, advising workflows, and demand analytics.

#### 3.2.1 System Core Components and Functionality

**Authentication and Access Control Module:**
Handles login, token lifecycle, account verification/reset, optional Google OAuth, and route/API role enforcement.

**Curriculum Governance Module:**
Maintains curricula, course placements, prerequisites, co-requisites, equivalencies, elective tracks, and curriculum CSV import/export.

**SAR and Study Plan Module:**
Supports SAR creation and maintenance; creates versioned study plans (draft/active); processes grade-driven plan regeneration; and applies adviser/admin validation.

**Forecasting and Term Module:**
Manages academic terms and computes demand views from active plans across current, next, comparison, and historical perspectives.

**Reporting Module:**
Provides SAR PDF export with academic profile, analytics, and plan information.

---

### 3.3 Requirements Specification

#### 3.3.1 Functional Requirements

**For system foundations and access:**
- The system shall authenticate users through email/password and issue secure tokens.
- The system shall support account verification and password reset workflows.
- The system shall enforce role-based route and API access restrictions.
- The system shall optionally support Google OAuth sign-in.

**For curriculum administration:**
- The system shall allow Super Admin to manage curricula across all programs.
- The system shall allow Program Chair to create, update, and activate curricula within assigned programs.
- The system shall allow Program Chair to manage curriculum-course placements by year and semester within assigned programs.
- The system shall allow Program Chair to manage prerequisites, co-requisites, course equivalencies, and elective tracks within assigned programs.
- The system shall support curriculum CSV preview/apply import and curriculum CSV export.

**For SAR and planning workflows:**
- The system shall allow adviser/admin to create and update SAR records.
- The system shall generate initial draft study plans from curriculum and elective-track data.
- The system shall allow adviser/admin to encode grades and classify course outcomes.
- The system shall regenerate draft plans after grade updates using rule-based constraints.
- The system shall validate draft plans before activation.

**For forecasting and reporting:**
- The system shall maintain academic terms and current-term status.
- The system shall compute current, next, comparative, and historical demand views.
- The system shall generate SAR PDF exports accessible by authorized roles.

#### 3.3.2 Non-Functional Requirements

- **Security:** Enforce protected endpoints, token validation, and role checks for all sensitive operations.
- **Data Integrity:** Use transactional operations for critical workflows (validation, imports, version updates).
- **Maintainability:** Separate controllers, models, routes, and utility layers to support modular updates.
- **Performance:** Support advising and forecast queries over multi-student datasets with pagination and indexed relational tables.
- **Usability:** Provide role-specific pages and workflows to reduce cognitive load and avoid cross-role clutter.

---

### 3.4 System Constraints

#### 3.4.1 Hardware and Network Constraints

- The application is web-based and requires stable network connectivity.
- Production operation requires adequate server resources to process concurrent advising, validation, and forecast aggregation requests.

#### 3.4.2 Software and Data Constraints

- The system depends on local/managed database integrity and does not consume registrar APIs directly.
- Forecast outputs are only as accurate as the active study plan dataset and term configuration.
- Rule quality depends on curriculum/prerequisite/co-requisite/elective-track data completeness.

#### 3.4.3 Policy and Operational Constraints

- Access is strictly role-bounded; students only access their own records.
- Adviser workflows depend on proper adviser-student assignment in user management.
- Data privacy obligations apply to student records and exported reports.

---

## 4. SYSTEM DESIGN AND ARCHITECTURE

The platform uses a three-tier architecture where the frontend delivers role-aware interfaces, the backend enforces workflow logic and validations, and the relational data layer stores normalized academic entities and versioned plan states.

---

### 4.1 System Architecture

The system follows a three-tier architecture with the following layers:

**4.1.1 Presentation Layer (Client-Side)**
- Student Interface
- Adviser Interface
- Program Chair Interface
- Public auth entry pages (Login, Register, verification/reset flows)
- Communication: HTTPS / REST API

**4.1.2 Application Layer (Service Logic)**
- API Gateway and Auth middleware
- Curriculum and Rule Services
- SAR and Study Plan Services
- Validation Service
- Forecast and Term Services
- Export Service

**4.1.3 Data Layer (Storage)**
- Central Database
  - User and role data
  - Curriculum and dependency data
  - SAR, study plan, and grade data
  - Academic term and forecast snapshot data

---

### 4.2 Functional Requirements

#### 4.2.1 System Foundations and Security

---

##### UC-01: Authenticate User Session

| Field | Details |
|---|---|
| **Use Case Name** | Authenticate User Session |
| **ID** | UC-01 |
| **Actor** | Student, Student Adviser, Program Chair |
| **Priority** | High |
| **Description** | Authenticates a user, issues session tokens, and routes to role-specific pages. |
| **Trigger** | User submits login credentials. |
| **Type** | External |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Email, password | User | Auth token, role context, redirect path | Browser |

**Preconditions:**
1. User account exists and is active.
2. Backend authentication service is online.

**Normal Course:**
1. User opens login page.
2. User enters email and password.
3. System verifies credentials and account state.
4. System issues access/refresh tokens.
5. System returns role metadata.
6. Client redirects to role-specific dashboard.

**Alternative Courses:**
- **3a. Invalid credentials:** System returns login error and denies token issuance.
- **3b. Unverified account:** System prompts verification flow.

**Postconditions:**
1. Authenticated session is established.
2. Role-based access is active for subsequent requests.

---

##### UC-02: Register and Verify Account

| Field | Details |
|---|---|
| **Use Case Name** | Register and Verify Account |
| **ID** | UC-02 |
| **Actor** | Student, Student Adviser |
| **Priority** | High |
| **Description** | Registers a new account and completes verification before login activation. |
| **Trigger** | User submits registration form. |
| **Type** | External |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Name, email, password, role, verification code | User | Account creation result, verification status | Browser |

**Preconditions:**
1. Email is not yet registered.
2. Registration service is enabled.

**Normal Course:**
1. User opens registration page.
2. User submits required account data.
3. System creates pending account and sends verification code.
4. User enters verification code.
5. System confirms code validity.
6. Account becomes verified and ready for login.

**Alternative Courses:**
- **4a. Invalid/expired code:** System rejects verification and requests resend.

**Postconditions:**
1. Verified account is stored in database.
2. User can proceed with authentication.

---

##### UC-03: Enforce First-Login Credential Rotation

| Field | Details |
|---|---|
| **Use Case Name** | Enforce First-Login Credential Rotation |
| **ID** | UC-03 |
| **Actor** | Super Admin, Program Chair |
| **Priority** | Medium |
| **Description** | Requires seeded or flagged Super Admin and Program Chair accounts to change password and email before full access. |
| **Trigger** | Super Admin or Program Chair logs in with must-change flags enabled. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| New password, new email, verification code | Super Admin or Program Chair | Updated account credentials and access unlock | Browser |

**Preconditions:**
1. Account has `mustChangePassword` and/or `mustChangeEmail` enabled.

**Normal Course:**
1. System detects first-login flags after authentication.
2. System redirects user to change-password flow.
3. User sets a compliant new password.
4. System initiates email-change verification.
5. User submits email OTP code.
6. System updates credentials and clears first-login flags.

**Alternative Courses:**
- **3a. Weak password:** System rejects update and asks for a stronger password.
- **5a. OTP mismatch/expiry:** System rejects email change until valid OTP is provided.

**Postconditions:**
1. Admin credentials are rotated.
2. Full admin access is enabled.

---

##### UC-04: Manage User Accounts and Adviser Assignments

| Field | Details |
|---|---|
| **Use Case Name** | Manage User Accounts and Adviser Assignments |
| **ID** | UC-04 |
| **Actor** | Super Admin, Program Chair |
| **Priority** | High |
| **Description** | Separates Super Admin account lifecycle controls from Program Chair scoped adviser/student assignment operations. |
| **Trigger** | Super Admin or Program Chair opens user management operations. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| User profile fields, status toggles, adviser assignment | Super Admin or Program Chair | Updated user records and assignment mapping | Browser |

**Preconditions:**
1. Super Admin or Program Chair is authenticated.

**Normal Course:**
1. User opens user management page.
2. System applies role and program scope.
3. Super Admin may edit account details, status, and program assignments.
4. Program Chair may assign advisers only within assigned program scope where backend rules allow it.
5. System validates role compatibility and program scope.
6. System saves allowed updates and returns refreshed list.

**Alternative Courses:**
- **5a. Invalid role assignment:** System rejects assignment where target role is incompatible.
- **5b. Insufficient permission:** System rejects Super Admin-only account lifecycle actions attempted by Program Chair.

**Postconditions:**
1. Allowed user state, program assignment, or adviser mapping changes are updated.
2. Adviser-scoped student lists reflect changes.

---

#### 4.2.2 SYSTEM CONFIGURATION (CURRICULUM MANAGEMENT)

---

##### UC-05: Manage Curriculum and Course Placements

| Field | Details |
|---|---|
| **Use Case Name** | Manage Curriculum and Course Placements |
| **ID** | UC-05 |
| **Actor** | Program Chair |
| **Priority** | High |
| **Description** | Creates/updates curricula and assigns course offerings to specific year/semester slots. |
| **Trigger** | Program Chair modifies curriculum configuration. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Curriculum metadata, course-slot assignments | Program Chair | Updated curriculum structure | Browser |

**Preconditions:**
1. Program Chair is authenticated.
2. Course catalog entries exist or can be created.

**Normal Course:**
1. Program Chair opens curriculum management.
2. Program Chair creates/edits curriculum details.
3. Program Chair adds/removes curriculum-course rows.
4. Program Chair sets year level, semester, and elective flags per row.
5. System validates duplicate placement constraints.
6. System saves curriculum-course structure.

**Alternative Courses:**
- **5a. Duplicate mapping:** System rejects duplicate curriculum-course pair definitions.

**Postconditions:**
1. Curriculum structure is persisted and available for planning.

---

##### UC-06: Manage Prerequisites, Co-requisites, and Equivalencies

| Field | Details |
|---|---|
| **Use Case Name** | Manage Prerequisites, Co-requisites, and Equivalencies |
| **ID** | UC-06 |
| **Actor** | Program Chair |
| **Priority** | High |
| **Description** | Maintains dependency and equivalency rules that govern validation and curriculum mapping. |
| **Trigger** | Program Chair updates rule configuration. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Rule definitions (course-to-course links) | Program Chair | Updated rulesets | Browser |

**Preconditions:**
1. Curriculum and course records exist.

**Normal Course:**
1. Program Chair selects rule type (pre/co/equivalency).
2. Program Chair selects source and target courses.
3. System checks validity and duplication.
4. Program Chair confirms addition or removal.
5. System updates rule table.
6. System returns refreshed rule listing.

**Alternative Courses:**
- **3a. Duplicate rule:** System blocks redundant entries.
- **3b. Invalid pair:** System blocks incompatible links.

**Postconditions:**
1. Validation engine uses updated dependency data.

---

##### UC-07: Manage Elective Tracks

| Field | Details |
|---|---|
| **Use Case Name** | Manage Elective Tracks |
| **ID** | UC-07 |
| **Actor** | Program Chair |
| **Priority** | High |
| **Description** | Creates elective tracks and assigns elective courses with explicit year/semester placement. |
| **Trigger** | Program Chair updates elective options. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Track metadata, track-course placement rows | Program Chair | Updated elective track configuration | Browser |

**Preconditions:**
1. Curriculum exists.
2. Candidate courses exist.

**Normal Course:**
1. Program Chair creates/edits elective track.
2. Program Chair adds courses to selected track.
3. Program Chair sets year/semester slot per elective-track course.
4. System validates placement consistency.
5. Program Chair confirms track update.
6. System saves changes.

**Alternative Courses:**
- **4a. Invalid placement:** System rejects invalid or conflicting slot values.

**Postconditions:**
1. Elective track becomes selectable in SAR workflow.

---

##### UC-08: Import and Export Curriculum CSV

| Field | Details |
|---|---|
| **Use Case Name** | Import and Export Curriculum CSV |
| **ID** | UC-08 |
| **Actor** | Program Chair |
| **Priority** | Medium |
| **Description** | Supports curriculum CSV preview/apply import and curriculum CSV export for administrative maintenance. |
| **Trigger** | Program Chair initiates curriculum file operation. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Curriculum CSV file / export request | Program Chair | Preview report, apply result, CSV download | Browser |

**Preconditions:**
1. Program Chair is authenticated.

**Normal Course:**
1. Program Chair selects target curriculum.
2. Program Chair uploads CSV file for preview.
3. System parses and validates row-level data.
4. System returns preview report with errors/warnings.
5. Program Chair confirms apply.
6. System commits transactional import and returns summary.

**Alternative Courses:**
- **3a. Malformed headers/data:** System rejects preview and returns validation issues.

**Postconditions:**
1. Curriculum data is updated (apply) or exported (download).

---

#### 4.2.3 STUDENT DATA MANAGEMENT

---

##### UC-09: Create Student Academic Record (SAR)

| Field | Details |
|---|---|
| **Use Case Name** | Create Student Academic Record (SAR) |
| **ID** | UC-09 |
| **Actor** | Student Adviser, Program Chair |
| **Priority** | High |
| **Description** | Creates SAR entries using adviser/admin workflow with email-first autofill and curriculum assignment. |
| **Trigger** | Adviser/admin initiates SAR creation for a student. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Student identity fields, curriculum, year level, elective track (optional) | Adviser/Admin | Created SAR profile | Browser |

**Preconditions:**
1. Adviser/admin is authenticated.
2. Curriculum options are available.

**Normal Course:**
1. Adviser/admin opens SAR creation form.
2. User enters email/student ID for autofill.
3. System retrieves matching profile data when available.
4. User completes SAR fields.
5. System validates required SAR data.
6. System stores SAR and returns detail view.

**Alternative Courses:**
- **3a. No autofill match:** User proceeds with manual entry.

**Postconditions:**
1. SAR exists and can be used for planning workflows.

---

##### UC-10: Update SAR and Student Profile Linkages

| Field | Details |
|---|---|
| **Use Case Name** | Update SAR and Student Profile Linkages |
| **ID** | UC-10 |
| **Actor** | Student Adviser, Program Chair, Student |
| **Priority** | Medium |
| **Description** | Updates SAR/profile fields and synchronizes linked student identity data where applicable. |
| **Trigger** | Authorized user edits profile or SAR details. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Updated profile/SAR fields, profile image | Authorized user | Updated SAR/profile data | Browser |

**Preconditions:**
1. User has permission to update target record.

**Normal Course:**
1. User opens profile/SAR edit interface.
2. User modifies allowed fields.
3. System validates changes.
4. System updates SAR and/or linked user profile.
5. System refreshes computed analytics views.
6. System displays success state.

**Alternative Courses:**
- **3a. Permission violation:** System rejects unauthorized update.

**Postconditions:**
1. Updated student metadata is stored and reflected in advising views.

---

##### UC-11: Enter Grades and Course Outcomes

| Field | Details |
|---|---|
| **Use Case Name** | Enter Grades and Course Outcomes |
| **ID** | UC-11 |
| **Actor** | Student Adviser, Program Chair |
| **Priority** | High |
| **Description** | Encodes course grades and computes course status outcomes in study plan courses. |
| **Trigger** | Adviser/admin submits grade entry form for target courses. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Course grades/status values for selected plan courses | Adviser/Admin | Updated course outcomes | Browser |

**Preconditions:**
1. Target SAR and study plan version exist.

**Normal Course:**
1. Adviser/admin opens grade entry page.
2. Adviser/admin inputs grades for current-term courses.
3. System validates grade values.
4. System classifies outcomes (passed/failed/dropped/incomplete).
5. System updates study plan course records.
6. System returns updated plan state.

**Alternative Courses:**
- **3a. Invalid grade value:** System rejects submission and highlights row-level errors.

**Postconditions:**
1. Course outcomes are persisted for regeneration and analytics.

---

#### 4.2.4 INTELLIGENT ADVISING AND PLANNING

---

##### UC-12: Generate Initial Draft Study Plan

| Field | Details |
|---|---|
| **Use Case Name** | Generate Initial Draft Study Plan |
| **ID** | UC-12 |
| **Actor** | Student Adviser, Program Chair |
| **Priority** | High |
| **Description** | Generates the first draft study plan from curriculum-course slots and selected elective-track placements. |
| **Trigger** | Adviser/admin requests initial plan generation. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| SAR ID | Adviser/Admin | Draft study plan version with course rows | Browser |

**Preconditions:**
1. SAR has assigned curriculum.

**Normal Course:**
1. Adviser/admin opens SAR detail page.
2. User triggers initial plan generation.
3. System reads curriculum-course placements.
4. System merges applicable elective-track placements.
5. System creates draft StudyPlanVersion and StudyPlanCourse rows.
6. System returns draft plan view.

**Alternative Courses:**
- **3a. Missing curriculum mapping:** System halts generation and returns configuration error.

**Postconditions:**
1. Draft version exists and is ready for review.

---

##### UC-13: Regenerate Draft Study Plan After Grade Changes

| Field | Details |
|---|---|
| **Use Case Name** | Regenerate Draft Study Plan After Grade Changes |
| **ID** | UC-13 |
| **Actor** | Student Adviser, Program Chair |
| **Priority** | High |
| **Description** | Builds a new draft plan using existing outcomes, carrying forward remaining courses with prerequisite and unit-load constraints. |
| **Trigger** | Adviser/admin executes regeneration after grade updates. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| SAR ID and latest course outcomes | Adviser/Admin | New draft version (incremented version number) | Browser |

**Preconditions:**
1. Existing study plan and course outcomes are available.

**Normal Course:**
1. Adviser/admin confirms regeneration action.
2. System gathers passed/failed/pending course states.
3. System computes remaining required courses.
4. System repositions courses using dependency and load rules.
5. System creates new draft version.
6. System returns regeneration review page.

**Alternative Courses:**
- **4a. Constraint conflict:** System reports unresolved scheduling constraints for adviser review.

**Postconditions:**
1. Updated draft is available for validation.

---

##### UC-14: Review and Edit Draft Plan Courses

| Field | Details |
|---|---|
| **Use Case Name** | Review and Edit Draft Plan Courses |
| **ID** | UC-14 |
| **Actor** | Student Adviser, Program Chair |
| **Priority** | Medium |
| **Description** | Allows adviser/admin to review draft contents and update draft course rows prior to validation. |
| **Trigger** | Adviser/admin opens draft version review workflow. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Draft course edits (course/year/semester rows) | Adviser/Admin | Updated draft course list | Browser |

**Preconditions:**
1. Target study plan version status is draft.

**Normal Course:**
1. Adviser/admin opens draft plan view.
2. Adviser/admin edits applicable course rows.
3. System validates draft edit payload.
4. System overwrites draft row set.
5. System marks draft as needing validation.
6. System returns updated draft details.

**Alternative Courses:**
- **3a. Non-draft target:** System denies edits on active versions.

**Postconditions:**
1. Draft reflects reviewed adjustments.

---

##### UC-15: Validate Draft Plan to Active

| Field | Details |
|---|---|
| **Use Case Name** | Validate Draft Plan to Active |
| **ID** | UC-15 |
| **Actor** | Student Adviser, Program Chair |
| **Priority** | High |
| **Description** | Performs validation checks and promotes a draft study plan version to active status. |
| **Trigger** | Adviser/admin submits validation action for draft version. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Validation command for draft version | Adviser/Admin | Active plan status, validation metadata | Browser |

**Preconditions:**
1. Draft version exists.
2. Required curriculum constraints are configured.

**Normal Course:**
1. Adviser/admin initiates validate action.
2. System checks prerequisite compliance.
3. System checks co-requisite consistency.
4. System checks elective-track compatibility.
5. System updates draft to active with validator metadata.
6. System flags previous active version for revalidation if applicable.

**Alternative Courses:**
- **2a. Prerequisite violation:** System blocks activation and returns violation list.
- **4a. Elective mismatch:** System blocks activation until track alignment is corrected.

**Postconditions:**
1. Active version is available for student view and forecast aggregation.

---

##### UC-16: Select Elective Track and Sync Draft Plan

| Field | Details |
|---|---|
| **Use Case Name** | Select Elective Track and Sync Draft Plan |
| **ID** | UC-16 |
| **Actor** | Student Adviser, Program Chair |
| **Priority** | Medium |
| **Description** | Assigns/updates SAR elective track and synchronizes draft version course composition with selected track courses. |
| **Trigger** | Adviser/admin changes elective track assignment. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Elective track selection | Adviser/Admin | Updated SAR track and synchronized draft rows | Browser |

**Preconditions:**
1. SAR and curriculum are defined.
2. Elective tracks exist for curriculum.

**Normal Course:**
1. Adviser/admin selects elective track for SAR.
2. System saves track assignment.
3. System loads latest draft or active base version.
4. System merges selected-track courses and removes non-selected elective-track rows.
5. System updates/creates draft version as needed.
6. System returns updated draft and track state.

**Alternative Courses:**
- **3a. No available draft or active base:** System records track but defers draft sync until plan generation.

**Postconditions:**
1. Study plan draft reflects selected elective path.

---

#### 4.2.5 FORECASTING AND DECISION SUPPORT

---

##### UC-17: Manage Academic Terms

| Field | Details |
|---|---|
| **Use Case Name** | Manage Academic Terms |
| **ID** | UC-17 |
| **Actor** | Program Chair |
| **Priority** | High |
| **Description** | Creates terms, marks current term, and ends active term with closing metadata. |
| **Trigger** | Program Chair updates term lifecycle state. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| School year, semester, activate/end commands | Program Chair | Updated term records and current-term state | Browser |

**Preconditions:**
1. Program Chair is authenticated.

**Normal Course:**
1. Program Chair creates new academic term.
2. Program Chair activates selected term as current.
3. System updates global current-term pointer.
4. Program Chair initiates end-term action.
5. System records closure metadata and snapshots applicable forecast data.
6. System returns updated term list.

**Alternative Courses:**
- **2a. Invalid term overlap/state conflict:** System rejects activation request.

**Postconditions:**
1. Current-term context is updated for forecast and advising logic.

---

##### UC-18: Generate Demand Forecast Views

| Field | Details |
|---|---|
| **Use Case Name** | Generate Demand Forecast Views |
| **ID** | UC-18 |
| **Actor** | Program Chair, Student Adviser |
| **Priority** | High |
| **Description** | Aggregates active study plans to produce current, next, and comparative demand views with historical snapshots. |
| **Trigger** | Authorized user opens forecasting dashboard queries. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Forecast query type and filters | Adviser/Admin | Demand tables/charts for current/next/comparison/history | Browser |

**Preconditions:**
1. Active study plan versions exist.
2. Term context is available.

**Normal Course:**
1. User opens forecast dashboard.
2. System aggregates active plan rows for current term.
3. System computes next-term projection using progression logic.
4. System computes current-vs-next comparison.
5. System retrieves historical snapshots.
6. System renders chart and table outputs.

**Alternative Courses:**
- **2a. No active plan data:** System returns empty-state analytics.

**Postconditions:**
1. Users receive demand evidence for planning decisions.

---

##### UC-19: Export SAR PDF Report

| Field | Details |
|---|---|
| **Use Case Name** | Export SAR PDF Report |
| **ID** | UC-19 |
| **Actor** | Student, Student Adviser, Program Chair |
| **Priority** | Medium |
| **Description** | Generates a printable PDF report containing SAR profile, study plan details, and analytics summary. |
| **Trigger** | Authorized user clicks export action in SAR view. |
| **Type** | External |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| SAR ID and export request | Authorized user | PDF file download/stream | Browser |

**Preconditions:**
1. User has access rights to target SAR.

**Normal Course:**
1. User requests SAR export.
2. System loads SAR, plan, and analytics data.
3. System composes PDF sections and metadata.
4. System renders PDF file.
5. System streams file to client.
6. Client downloads report.

**Alternative Courses:**
- **2a. Missing SAR/plan access:** System returns authorization or not-found error.

**Postconditions:**
1. User receives generated report document.

---

##### UC-20: View Dashboard Summary Metrics

| Field | Details |
|---|---|
| **Use Case Name** | View Dashboard Summary Metrics |
| **ID** | UC-20 |
| **Actor** | Student, Student Adviser, Program Chair |
| **Priority** | Medium |
| **Description** | Presents role-specific summary metrics and quick status indicators on dashboard landing pages. |
| **Trigger** | Authenticated user opens dashboard. |
| **Type** | Internal |

**Inputs / Outputs:**

| Inputs | Source | Outputs | Destination |
|---|---|---|---|
| Dashboard summary query | Authenticated user | Role-filtered KPI summary | Browser |

**Preconditions:**
1. User session is authenticated.

**Normal Course:**
1. User opens dashboard route.
2. Client sends summary request.
3. System applies role-based data scope.
4. System computes summary metrics.
5. System returns summary payload.
6. Client renders dashboard cards/widgets.

**Alternative Courses:**
- **3a. Role mismatch:** System denies unauthorized data scope.

**Postconditions:**
1. User sees role-appropriate operational snapshot.

---

### 4.3 Use Case Diagram

**Figure: System Foundation Diagram (4.2.1)**

Actors involved: Student, Student Adviser, Program Chair, Super Admin

- UC-01: Authenticate User Session - Student, Student Adviser, Program Chair, Super Admin
- UC-02: Register and Verify Account — Student, Student Adviser
- UC-03: Enforce First-Login Credential Rotation - Program Chair, Super Admin
- UC-04: Manage User Accounts and Adviser Assignments - Super Admin, Program Chair

---

**Figure: System Configuration Diagram (4.2.2)**

Actors involved: Program Chair, Super Admin

- UC-05: Manage Curriculum and Course Placements
- UC-06: Manage Prerequisites, Co-requisites, and Equivalencies
- UC-07: Manage Elective Tracks
- UC-08: Import and Export Curriculum CSV

---

**Figure: Student Data Management Diagram (4.2.3)**

Actors involved: Student, Student Adviser, Program Chair, Super Admin

- UC-09: Create Student Academic Record (SAR) - Student Adviser, Program Chair, Super Admin
- UC-10: Update SAR and Student Profile Linkages - Student, Student Adviser, Program Chair, Super Admin
- UC-11: Enter Grades and Course Outcomes - Student Adviser, Program Chair, Super Admin

---

**Figure: Intelligent Advising Diagram (4.2.4)**

Actors involved: Student Adviser, Program Chair, Super Admin

- UC-12: Generate Initial Draft Study Plan
- UC-13: Regenerate Draft Study Plan After Grade Changes
- UC-14: Review and Edit Draft Plan Courses
- UC-15: Validate Draft Plan to Active
- UC-16: Select Elective Track and Sync Draft Plan

---

**Figure: Forecasting Diagram (4.2.5)**

Actors involved: Student, Student Adviser, Program Chair, Super Admin

- UC-17: Manage Academic Terms - Program Chair, Super Admin
- UC-18: Generate Demand Forecast Views - Program Chair, Student Adviser, Super Admin
- UC-19: Export SAR PDF Report - Student, Student Adviser, Program Chair, Super Admin
- UC-20: View Dashboard Summary Metrics - Student, Student Adviser, Program Chair, Super Admin

---

### 4.4 Overall System Flow and Data Model

The implemented system flow starts with identity and role validation, proceeds through adviser-driven SAR and planning workflows, and terminates into active-plan-backed forecasting and reporting. Study plan versions serve as the central operational artifact that connects advising decisions to demand analytics.

---

#### 4.4.1 Entity-Relationship Diagram

The data model is centered on normalized curriculum entities, SAR ownership, and versioned study plans.

**Database Entities and Attributes:**

**users**
- `id` : INT «PK»
- `role` : ENUM (superadmin/admin/adviser/student)
- `firstName` : VARCHAR
- `lastName` : VARCHAR
- `email` : VARCHAR
- `studentId` : VARCHAR
- `isActive` : BOOLEAN
- `adviserId` : INT «FK(users.id)»

**curriculums**
- `id` : INT «PK»
- `name` : VARCHAR
- `description` : TEXT
- `isActive` : BOOLEAN

**courses**
- `id` : INT «PK»
- `code` : VARCHAR
- `name` : VARCHAR
- `units` : INT

**curriculum_courses**
- `id` : INT «PK»
- `curriculumId` : INT «FK»
- `courseId` : INT «FK»
- `yearLevel` : INT
- `semester` : INT
- `isElective` : BOOLEAN

**prerequisites**
- `id` : INT «PK»
- `curriculumId` : INT «FK»
- `courseId` : INT «FK»
- `prerequisiteCourseId` : INT «FK»

**co_requisites**
- `id` : INT «PK»
- `curriculumId` : INT «FK»
- `courseId` : INT «FK»
- `coRequisiteCourseId` : INT «FK»

**course_equivalencies**
- `id` : INT «PK»
- `courseId` : INT «FK»
- `equivalentCourseId` : INT «FK»

**elective_tracks**
- `id` : INT «PK»
- `curriculumId` : INT «FK»
- `name` : VARCHAR
- `description` : TEXT

**elective_track_courses**
- `id` : INT «PK»
- `electiveTrackId` : INT «FK»
- `courseId` : INT «FK»
- `yearLevel` : INT
- `semester` : INT

**student_academic_records**
- `id` : INT «PK»
- `userId` : INT «FK(users.id)»
- `studentName` : VARCHAR
- `studentNumber` : VARCHAR
- `email` : VARCHAR
- `yearLevel` : INT
- `curriculumId` : INT «FK»
- `electiveTrackId` : INT «FK»
- `createdByAdviserId` : INT «FK(users.id)»

**study_plans**
- `id` : INT «PK»
- `studentAcademicRecordId` : INT «FK»

**study_plan_versions**
- `id` : INT «PK»
- `studyPlanId` : INT «FK»
- `versionNumber` : INT
- `status` : ENUM (draft/active/archived)
- `generatedByAdviserId` : INT «FK(users.id)»
- `validatedByAdviserId` : INT «FK(users.id)»
- `validatedAt` : DATETIME
- `needsRevalidation` : BOOLEAN

**study_plan_courses**
- `id` : INT «PK»
- `studyPlanVersionId` : INT «FK»
- `courseId` : INT «FK»
- `yearLevel` : INT
- `semester` : INT
- `grade` : DECIMAL
- `status` : ENUM (pending/passed/failed/dropped/incomplete/ongoing)

**academic_terms**
- `id` : INT «PK»
- `schoolYear` : VARCHAR
- `semester` : INT
- `isCurrent` : BOOLEAN
- `closedById` : INT «FK(users.id)»
- `closedAt` : DATETIME

**forecast_snapshots**
- `id` : INT «PK»
- `academicTermId` : INT «FK»
- `schoolYear` : VARCHAR
- `semester` : INT
- `snapshotData` : JSON
- `triggeredByUserId` : INT «FK(users.id)»

**Entity Relationships:**
- `users` (adviser) **handles** many `student_academic_records`
- `student_academic_records` **owns** one `study_plan`
- `study_plan` **contains** many `study_plan_versions`
- `study_plan_versions` **contains** many `study_plan_courses`
- `curriculums` **contains** many `curriculum_courses`
- `curriculums` **defines** many `prerequisites`, `co_requisites`, and `elective_tracks`
- `elective_tracks` **contains** many `elective_track_courses`
- `academic_terms` **relates to** many `forecast_snapshots`

---

#### 4.4.2 Data Flow Diagrams

**Figure: Level 0 – Context Diagram**

The Level 0 Context Diagram treats the platform as a single process and shows data exchange with four external role entities.

- **Student → System:** Login requests, profile updates, SAR view/export requests
- **System → Student:** Auth state, own SAR and active plan views, dashboard metrics, PDF export
- **Student Adviser → System:** SAR creation/updates, grade entries, plan generation/regeneration/validation requests
- **System → Student Adviser:** Advisee lists, validation checks, draft/active plan states, forecast views
- **Super Admin -> System:** Global account lifecycle actions, program management, program assignment changes, transfer ownership, all-program audit queries
- **System -> Super Admin:** Global governance confirmations, account status, assignment changes, audit outputs, dashboards
- **Program Chair -> System:** Assigned-program adviser assignment, curriculum rules, term operations, forecast queries
- **System -> Program Chair:** Scoped governance confirmations, term status, aggregate forecast outputs, dashboards

---

**Figure: Level 1 – System Sub-Processes**

The Level 1 DFD decomposes the system into major modules:

| Process | Description |
|---|---|
| **1.0 Authentication and Access** | Authenticates users and applies role-based authorization |
| **2.0 Curriculum Governance** | Manages curricula, dependencies, tracks, and curriculum CSV workflows |
| **3.0 SAR and Planning Workflow** | Creates SAR, generates/regenerates draft plans, validates active plans |
| **4.0 Term and Forecast Analytics** | Manages term lifecycle and computes demand views/snapshots |
| **5.0 Reporting** | Generates SAR PDF export artifacts |

---

**Figure: Level 2 – Advising and Validation Engine (Process 3.0)**

The Level 2 DFD details the advising core:

| Sub-Process | Description |
|---|---|
| **3.1 Build Initial Draft** | Loads curriculum + elective-track placement and writes first draft version |
| **3.2 Encode Outcomes** | Applies grade/status updates to plan-course rows |
| **3.3 Regenerate Draft** | Recomputes remaining course layout using dependency and unit-load rules |
| **3.4 Validate Draft** | Performs prerequisite/co-requisite/elective checks and promotes draft to active |
| **3.5 Publish to Consumers** | Exposes active plan to student views, forecasting, and export modules |

---

*End of Document*
