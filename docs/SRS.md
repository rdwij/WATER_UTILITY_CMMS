# Software Requirements Specification (SRS)
## Water & Wastewater Utility Asset Management and CMMS Platform

| Field | Detail |
|---|---|
| Document Type | Software Requirements Specification |
| Domain | Water & Wastewater Utility — Asset Management / CMMS |
| Standard Alignment | ISO 55000:2014 (Asset Management — Overview, Principles and Terminology) family, including ISO 55001 (Requirements) and ISO 55002 (Guidelines) |
| Version | 2.0 (Revised) |
| Status | Draft for Review |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Alignment with ISO 55000 Asset Management Principles](#4-alignment-with-iso-55000-asset-management-principles)
5. [Stakeholders](#5-stakeholders)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Asset Lifecycle Mapping (ISO 55000 View)](#8-asset-lifecycle-mapping-iso-55000-view)
9. [Limitations](#9-limitations)
10. [Assumptions](#10-assumptions)
11. [Glossary](#11-glossary)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for a web-based **Computerized Maintenance Management System (CMMS) and Asset Management Platform** for water and wastewater utility operations. The platform is designed to support the organization's asset management activities in a manner consistent with the principles of **ISO 55000 — Asset Management**, enabling coordinated, risk-informed, and value-driven management of physical assets across their lifecycle.

### 1.2 Scope
The system covers asset acquisition, registration, maintenance (preventive, predictive, and corrective), work order management, spare parts and stock control, condition monitoring, financial tracking (depreciation and valuation), auditing, disposal, and analytical reporting — spanning corporate, regional, and site organizational levels.

### 1.3 Intended Audience
Executive management, asset managers, operations and maintenance staff, finance and audit teams, IT/system administrators, and other stakeholders identified in Section 5.

---

## 2. Problem Statement

Water and wastewater utility operations involve the acquisition, geolocation (GIS), maintenance, testing, and financial tracking of a large and diverse asset base. Without an integrated system, these activities become fragmented across paper logs, spreadsheets, informal communication, and disconnected dashboards, resulting in the following problems:

- **Asset information management** — Asset data is difficult to acquire, locate, update, and relate to maintenance history, making it hard to retrieve a complete, reliable picture of any given asset.
- **Work order control** — Work orders are created, approved, assigned, and closed without consistent tracking or auditability.
- **Preventive maintenance gaps** — Scheduled maintenance is missed when preventive tasks are not linked to assets and work orders.
- **Asset aging** — Assets approaching or exceeding their expected service life cannot be readily identified due to a lack of lifecycle tracking.
- **Incomplete maintenance records** — Maintenance and condition-upgrade activities are not consistently logged with associated cost, parts, labor, condition photographs, and procedure/maintenance manuals.
- **Spare parts visibility** — Spare parts and stock usage are not visible during maintenance execution, and stock is not clearly associated with the relevant assets.
- **Condition and performance monitoring** — Asset condition, health monitoring, and operational measurements lack a structured process for entry, review, and reporting.
- **Reporting limitations** — Managers require summarized dashboards, charts, exports, PDFs, and calendar views rather than raw records alone.
- **Administrative control** — User roles, departments, employees, events, files, and profile settings require centralized administrative management.
- **Financial management** — Asset financing, depreciation, and current-value tracking are difficult to evaluate and report on.
- **Auditing** — Comprehensive asset auditing is difficult to perform, with no consistent way to monitor audit completion or outcomes.
- **Downtime and loss tracking** — There is no structured way to calculate asset downtime or associated production loss.
- **Disposal management** — Asset disposal lacks a clear, controlled process.
- **Risk-based condition scoring** — There is no consolidated view of an asset's current condition with a risk-scoring mechanism, making it difficult to identify at-risk or unhealthy assets.

---

## 3. Proposed Solution

The proposed application is a **web-based, centralized CMMS and asset operations platform** for water and wastewater utilities. It integrates asset acquisition, maintenance management, operational records, cost tracking, financial depreciation and valuation, analytics and reporting, auditing, and disposal into a single system.

Key elements of the solution include:

- A secure, authenticated web interface for administrators, operators, and maintenance staff, with access scoped at **corporate, regional, and site levels**.
- Asset registration covering categories, classifications, locations, GIS data, specification files, maintenance schedules and strategies, measurement information, acquisition details, and disposal records.
- Work order workflows supporting creation, approval, personnel assignment, parts (internal and external), meters, file attachments, notes, status tracking, and calendar views.
- Scheduled and corrective maintenance, testing, and upgrade workflows linked directly to asset schedules and work orders.
- Automated notifications (SMS, email, or WhatsApp) to assigned personnel when a work order or maintenance action is created or updated.
- Stock and spare parts management for maintenance materials and issuance.
- Role-based decision support for asset admins, managers, operators, finance, and audit teams to evaluate asset condition and inform purchasing or disposal decisions.
- Performance monitoring and reporting tools for asset owners and users at all organizational levels.
- Analytics dashboards, charts, exports, and PDF reports to support management review.

---

## 4. Alignment with ISO 55000 Asset Management Principles

ISO 55000 defines asset management as the coordinated activity of an organization to realize value from its assets. The platform is designed to support the four ISO 55000 fundamentals:

| ISO 55000 Fundamental | How the System Supports It |
|---|---|
| **Value** | Assets are managed to deliver value to the organization and stakeholders through availability, reliability, financial performance (depreciation/valuation), and risk-informed decision-making (Sections 6.7, 6.8, 6.9). |
| **Alignment** | Asset management objectives are translated into organizational plans through corporate, regional, and site-level structures, dashboards, and KPIs (Section 6.3). |
| **Leadership** | Role-based access control (RBAC) and a multi-tier approval workflow (request → recommendation → approval) ensure accountability for asset decisions such as deletion and disposal (Section 6.1). |
| **Assurance** | Auditing, condition scoring, reporting, and data integrity controls provide confidence that assets will perform as required (Section 6.8, NFR-03). |

The system is further structured to support core ISO 55001 asset management system elements, including an **asset register**, **asset lifecycle management**, **risk-based decision-making**, **performance and condition monitoring**, and **continual improvement** through analytics and audit feedback loops.

---

## 5. Stakeholders

| Stakeholder | Role | Description |
|---|---|---|
| Executive Management | Asset Owner / Leadership | Defines organizational objectives, approves asset management policy, provides resources, and ensures asset management supports business strategy. Sets asset management policy, funding, and risk appetite. Primary interests: portfolio-level visibility, cost of maintenance, regulatory exposure, and KPIs. |
| Asset Manager | Asset Management Lead | Develops and manages the asset management strategy, plans, lifecycle decisions, and overall asset performance. Owns the asset management plan and decides priorities, preventive strategies, and resource allocation. Primary interests: asset register, condition, scheduled vs. corrective work, and cost trends. |
| Operations Team | Asset Operator | Operates assets safely and efficiently while meeting operational performance targets. |
| Maintenance Team | Asset Maintainer | Performs preventive, predictive, and corrective maintenance to maximize asset reliability and availability. |
| Finance Department | Financial Management | Manages asset budgets, lifecycle costs, depreciation, investment planning, and financial reporting. |
| Risk Management Team | Risk Management | Identifies, evaluates, and controls risks related to assets and business operations. |
| Engineering / Technical Team | Technical Support | Designs, upgrades, improves, and provides technical expertise throughout the asset lifecycle. |
| Procurement / Supply Chain | Acquisition | Purchases assets, selects suppliers, and manages contracts while considering lifecycle value. |
| Quality & Compliance Team | Compliance | Ensures compliance with legal, regulatory, environmental, and ISO requirements. |
| Health, Safety & Environment (HSE) | Safety Management | Ensures assets are operated and maintained safely while minimizing environmental impacts. |
| IT / Data Management | Information Management / System Administrator | Operates, secures, and backs up the platform. Interests: user lifecycle, role integrity, profile settings, and platform health. Maintains asset information, asset registers, CMMS/EAM data, and data quality for informed decision-making. |
| Employees | Asset Users | Use assets according to procedures, report issues, and contribute to continual improvement. |
| Suppliers & Contractors | External Service Providers | Supply equipment, maintenance services, spare parts, and technical expertise under agreed contracts. |
| Customers | Service Recipients | Receive products/services produced by the organization's assets and provide feedback on performance. |
| Regulators / Government | Regulatory Oversight | Ensure the organization complies with laws, regulations, safety, and environmental requirements. |
| Investors / Owners / Shareholders | Governance | Expect assets to deliver long-term value, profitability, and sustainable performance. |
| Local Community | External Stakeholder | May be affected by the organization's asset operations through environmental, social, or economic impacts. |

---

## 6. Functional Requirements

### 6.1 User Management

| ID | Requirement |
|---|---|
| FR-01 | The system shall support user authentication. |
| FR-02 | The system shall allow authorized administrators to create, view, edit, and manage users. |
| FR-03 | The system shall support user profile display, profile editing, password updates, and profile settings management. |
| FR-04 | The system shall implement Role-Based Access Control (RBAC). |
| FR-05 | The system shall manage employee records, including creation, listing, viewing, editing, updating, and deletion. |
| FR-06 | The system shall manage administrative files, including file listing and viewing workflows. |
| FR-07 | The system shall support event and fast-event calendar operations, including load, create, update, and delete actions. |
| FR-08 | The system shall support asset deletion through a controlled workflow: request → recommendation → approval, with final approval requiring sign-off from a corporate-level finance and audit user. |
| FR-09 | The system shall apply the same controlled request–recommendation–approval workflow (as FR-08) to asset disposal. |

### 6.2 Asset Acquisition

| ID | Requirement |
|---|---|
| FR-10 | Each asset shall have a unique identification number specific to water or wastewater utility assets. |
| FR-11 | Each asset shall be displayed in the GIS, associated with its asset classification and asset category. |
| FR-12 | Each asset shall be displayed in the GIS as a point, linestring, or polygon, according to its asset type. |
| FR-13 | Each asset shall have a generated QR code to support identification and search via a mobile application. |

### 6.3 Asset Management

| ID | Requirement |
|---|---|
| FR-14 | The system shall allow users to create, list, view, edit, and update assets. |
| FR-15 | The system shall allow users to create, list, view, edit, and update asset categories, asset classifications, and asset locations. |
| FR-16 | The system shall allow users to create, list, view, edit, and update schedules, tasks, task groups, and files attached to assets. |
| FR-17 | The system shall allow users to create, list, view, edit, and update maintenance schedules attached to assets. |
| FR-18 | The system shall provide asset list and map-based views where supported by the asset controller. |
| FR-19 | The system shall support measurement parameters and meter-related asset information. |
| FR-20 | The system shall generate analytical views and reports covering performance, cost, and KPIs by asset category, at corporate, regional, and site levels. |

### 6.4 Work Orders and Maintenance

| ID | Requirement |
|---|---|
| FR-21 | The system shall allow users to create, list, view, edit, delete, approve, and submit work orders. |
| FR-22 | The system shall support conversion of scheduled maintenance records into work orders. |
| FR-23 | The system shall allow parts, external parts, personnel, files, tasks, meters, and notes to be associated with work orders. |
| FR-24 | The system shall provide work-order search and calendar event views. |
| FR-25 | The system shall track work-order status logs where supported by the data model. |
| FR-26 | The system shall support scheduled maintenance creation, editing, rescheduling, user reassignment, task association, and corrective maintenance views. |
| FR-27 | The system shall provide maintenance dashboards showing work orders, breakdowns, asset age summaries, and related maintenance status information. |

### 6.5 Stock and Materials

| ID | Requirement |
|---|---|
| FR-28 | The system shall allow stock records and stock codes to be created, updated, listed, and retrieved. |
| FR-29 | The system shall support stock reference, work-order reference, stock-code reference, category reference, and balance views. |
| FR-30 | The system shall support stock issue workflows linked to maintenance activity. |

### 6.6 Analytics, Charts, Exports, and Reports

| ID | Requirement |
|---|---|
| FR-31 | The system shall support analytical views, charts, and exports (PDF, CSV, XLS) covering engineering, risk, asset health, and cost data. |

### 6.7 Asset Finance

| ID | Requirement |
|---|---|
| FR-32 | The system shall support financial analysis, charts, and exports (PDF, CSV, XLS) covering asset financing, including depreciation, initial value, and current balance, at corporate, regional, and site levels. |

### 6.8 Asset Audit

| ID | Requirement |
|---|---|
| FR-33 | The system shall support audit workflows, including analysis, charts, and exports (PDF, CSV, XLS) covering engineering, risk, asset health, and financial data (depreciation, initial value, current balance), at corporate, regional, and site levels. |

### 6.9 Asset Disposal

| ID | Requirement |
|---|---|
| FR-34 | The system shall support asset disposal workflows at corporate, regional, and site levels. |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | The system shall protect authenticated workflows using Laravel authentication and middleware. |
| NFR-02 | Authorization | Administrative and restricted functions shall require appropriate permissions or middleware checks. |
| NFR-03 | Data Integrity | Create and update workflows shall use validation request classes where available. |
| NFR-04 | Maintainability | New code shall follow existing Laravel module organization and PSR-4 namespace conventions. |
| NFR-05 | Usability | Feature screens shall remain grouped by operational area (assets, work orders, operations, lab, energy) so users can locate functions quickly. |
| NFR-06 | Performance | Dashboard and telemetry endpoints shall avoid unnecessary expensive queries and use cached data where the existing design relies on caching. |
| NFR-07 | Reliability | Scheduled commands and telemetry readers shall fail safely and avoid corrupting stored energy or MQTT-derived data. |
| NFR-08 | Compatibility | The system shall remain compatible with PHP 8.1, Laravel 10, Vue 3, Laravel Mix 6, and PHPUnit 10, as declared in project configuration. |
| NFR-09 | Testability | Feature logic shall be testable through Laravel feature tests and unit tests. |
| NFR-10 | Reporting Accuracy | PDF, export, chart, and dashboard data shall remain consistent with underlying operational, asset, work-order, lab, and energy records. |
| NFR-11 | Configuration Safety | Environment-specific values shall be stored in environment configuration files rather than hard-coded in source code. |
| NFR-12 | Communication | The system shall provide an in-application chat/communication feature to replace informal manual communication and connect stakeholders directly within the platform. |

---

## 8. Asset Lifecycle Mapping (ISO 55000 View)

ISO 55000 frames asset management around the full asset lifecycle. The table below maps the system's functional areas to that lifecycle to demonstrate coverage:

| Lifecycle Stage | Description | Supporting Functional Areas |
|---|---|---|
| **Plan** | Define asset needs, strategy, and acquisition plans | Asset Acquisition (6.2), Asset Management (6.3) |
| **Acquire** | Register and onboard new assets | FR-10 to FR-13, Asset Management (6.3) |
| **Operate** | Use assets to deliver services | Operations, Measurement & Meters (FR-19) |
| **Maintain** | Preventive, predictive, and corrective maintenance | Work Orders and Maintenance (6.4), Stock and Materials (6.5) |
| **Monitor & Evaluate** | Track condition, performance, and risk | Analytics and Reports (6.6), Asset Audit (6.8) |
| **Finance & Value** | Track depreciation, valuation, and cost | Asset Finance (6.7) |
| **Renew/Dispose** | Retire or dispose of assets at end of life | Asset Disposal (6.9), FR-08, FR-09 |

---

## 9. Limitations

| ID | Limitation |
|---|---|
| LIM-01 | The repository README is still the default Laravel boilerplate and does not describe the product. |
| LIM-02 | The visible test suite contains only example tests, so current automated coverage appears limited. |
| LIM-03 | Routes use a mixture of legacy string-controller syntax and newer class-array syntax. |
| LIM-04 | Several Blade files appear to be dated backups or saved variants, which may make view ownership unclear. |
| LIM-05 | Some telemetry behavior depends on external MQTT, cache, scheduler, and InfluxDB configuration that is not fully documented in this repository. |
| LIM-06 | The API surface is limited; most functionality is routed through web routes and Blade views. |
| LIM-07 | Some business rules must be inferred from controllers and views because there is no separate product requirements document in the repository. |
| LIM-08 | Reporting correctness depends on database records and live operational data that are not included in the repository. |
| LIM-09 | Role and permission behavior is present in code, but a complete role matrix is not documented. |

---

## 10. Assumptions

| ID | Assumption |
|---|---|
| ASM-01 | The system is intended for a water utility or water-treatment operational environment. |
| ASM-02 | Main users include corporate, regional, and site-level administrators, maintenance staff, and operations staff. |
| ASM-03 | Work orders and maintenance schedules are treated as important operational records. |
| ASM-04 | MQTT and InfluxDB integrations are intended for near-real-time or periodic telemetry display and logging. |
| ASM-05 | PDF reports, exports, charts, and dashboards are intended for operational review and management reporting. |
| ASM-06 | Functional behavior described in this document is based on available code structure and route/controller/view names, not on a separate, formally approved stakeholder requirements document. |

---

## 11. Glossary

| Term | Definition |
|---|---|
| CMMS | Computerized Maintenance Management System |
| GIS | Geographic Information System |
| RBAC | Role-Based Access Control |
| KPI | Key Performance Indicator |
| MQTT | Message Queuing Telemetry Transport (lightweight telemetry protocol) |
| ISO 55000 | International standard providing an overview, principles, and terminology for asset management |
| SAMP | Strategic Asset Management Plan (an ISO 55001 concept referenced for organizational alignment) |
| Asset Lifecycle | The full span of an asset's existence, from planning/acquisition through operation, maintenance, and disposal |

---

*End of Document*