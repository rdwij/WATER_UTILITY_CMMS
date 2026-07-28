# AI Agent Prompt: Analyze and Design Asset Location Hierarchy

You are a senior Laravel Solution Architect and Database Architect with expertise in enterprise asset management systems, hierarchical database design, and the **kalnoy/nestedset** Laravel package.

Your task is to **analyze the existing database schema** before making any implementation changes.

## Objective

Analyze the current **`asset_locations`** table and all related tables to determine whether the existing structure supports a hierarchical organizational model. Based on your analysis, design an optimized database schema using the **`kalnoy/nestedset`** package.

Do **not** begin implementation immediately. First, perform a complete analysis and provide recommendations.

## Business Requirements

### 1. Asset Location Hierarchy

The organization follows the hierarchy below:

* RSC (Regional Support Center)

  * Manager Region

    * Site / Station

The hierarchy is identified using existing **RSC codes**.

* Codes ending with **`000`** represent the highest regional level (RSC).
* Each RSC contains one or more **Manager Regions**.
* Each Manager Region contains one or more **Sites/Stations**.

The solution must support unlimited hierarchy levels using the Nested Set model.

---

### 2. User and Employee Assignment

Analyze how users and employees should be linked to the organizational hierarchy.

Requirements:

* Every employee belongs to one user account.
* Every user/employee must be assigned to a single Site/Station.
* Every Site/Station must belong to a Manager Region.
* Every Manager Region must belong to an RSC.
* Every Site/Station must also be associated with a Cost Center.

Determine whether additional junction tables or foreign keys are required.

---

### 3. User Access Hierarchy

The authorization model must follow the organizational hierarchy.

#### RSC User

A user assigned at the RSC level can access:

* all Manager Regions
* all Sites
* all Stations
* all Employees
* all Assets
* all data belonging to that RSC

#### Manager Region User

A user assigned to a Manager Region can access only:

* their Manager Region
* Sites under that Manager Region
* Employees within those Sites
* Assets within those Sites

#### Site/Station User

A Site user can access only:

* their assigned Site/Station
* Employees assigned to that Site
* Assets belonging to that Site

---

### 4. Cost Center Integration

Analyze how Cost Centers should be integrated.

Determine:

* whether Cost Centers should be linked to Sites
* whether Cost Centers require a separate hierarchy
* foreign key relationships
* normalization improvements

---

### 5. Existing Schema Analysis

Review all related tables, including but not limited to:

* asset_locations
* users
* employees
* cost_centers
* stations
* assets
* departments
* any location-related tables

Identify:

* missing relationships
* redundant columns
* normalization issues
* performance concerns
* indexing opportunities
* foreign key improvements

---

### 6. Nested Set Design

Determine how the **kalnoy/nestedset** package should be implemented.

Specify:

* required columns
* parent-child relationships
* migration changes
* model configuration
* Eloquent relationships
* query examples

---

## Deliverables

After completing the analysis, provide the following:

1. Analysis of the existing database schema.
2. Identification of design issues and potential improvements.
3. Recommended hierarchical database structure.
4. Updated ERD (Entity Relationship Diagram).
5. Required migration changes.
6. Table relationships and foreign keys.
7. Eloquent model relationships.
8. User authorization strategy based on the hierarchy.
9. Cost Center integration strategy.
10. Implementation roadmap with the recommended order of development.

## Constraints

* Do not modify the database until the analysis is complete.
* Follow Laravel 12/13 best practices.
* Use the **kalnoy/nestedset** package for hierarchical data.
* Maintain database normalization.
* Design for scalability and maintainability.
* Ensure the solution supports future expansion without requiring major schema changes.

The final output should be a detailed architectural analysis and implementation proposal before any code or migrations are generated.
