# EWP Production Flow — Project Spec

## Background

The client (Keith Menzel, EWP — a small cabinet manufacturing company) currently tracks all production jobs in a crude Excel file (`New Production Flow 4.20.2026.xlsm`). The goal is to digitize this into a new **"Production Flow"** tab inside the existing EWP quoting web app hosted at `ewpquote.vercel.app`.

The existing app is a web-based quoting tool built with HTML/CSS/JS (vanilla, no framework) deployed on Vercel. The new tab must match the existing app's design language exactly.

---

## Core Concept

Jobs move through a pipeline with three main statuses:

| Status | Meaning |
|---|---|
| **Bid** | Quote submitted, awaiting approval |
| **Active** | Job accepted, in production |
| **Final Punch** | Job complete, pending final payment/closeout |
| **Closed** | Job fully done and paid |

Within Active jobs, there is also a free-text **Notes** field used to track sub-status (e.g. "Building now", "Finishing", "Next", "Need drawings", "ASAP", "August 17th install").

---

## Data Fields

Each job has the following fields:

| Field | Type | Notes |
|---|---|---|
| `job_name` | Text | Required |
| `status` | Enum | Bid / Active / Final Punch / Closed |
| `priority` | Number | Lower = higher priority. 1 is top. 99 = no priority set |
| `due_date` | Date | Optional |
| `contract_amount` | Currency (USD) | Total contract value |
| `balance` | Currency (USD) | Amount still outstanding |
| `notes` | Text | Free-form production notes |

---

## Key Feature: Auto-populate from Quote

When a quote is approved/accepted in the quoting tab, it should be possible to **push that job directly into the Production Flow** as a new Bid or Active job, pre-filling:
- `job_name` from the quote
- `contract_amount` from the quote total
- `balance` = `contract_amount` (full amount outstanding at start)

This is a priority feature Keith specifically requested ("port in estimate name and dollars if its approved").

---

## UI Layout

### Tab Structure
Add a **"Production Flow"** tab to the existing app navigation, alongside the current tabs.

### Main View — Kanban or Tabbed by Status
Display jobs grouped by status. Recommended approach: **three visible columns or tab-filtered table**:
- Bid
- Active
- Final Punch

(Closed jobs archived/hidden by default, accessible via a filter toggle.)

### Job Table Columns (per status group)
| Column | Notes |
|---|---|
| Priority | Editable inline, sortable |
| Job Name | Clickable to open detail/edit panel |
| Notes | Editable inline |
| Contract Amount | Formatted as USD |
| Balance | Formatted as USD, color-coded (red if balance > 0, green if 0) |
| Due Date | Optional, shown if set |
| Actions | Move to next status, Edit, Delete |

### Summary Row (top of page)
Display totals across all active jobs:
- Total Contract Value
- Total Balance Outstanding
- Number of jobs per status

These match the aggregate numbers visible in the Excel file header row (`983,531 / 1,821,470.25 / 2,805,001.25`).

---

## Actions & Interactions

### Add New Job
- Button: **"+ New Job"**
- Opens a modal/form with all fields
- Status defaults to **Bid**

### Move Job Through Pipeline
Each job should have a **"Promote"** button to advance it:
- Bid → Active
- Active → Final Punch
- Final Punch → Closed

### Edit Job
- Inline editing for Priority and Notes
- Full edit modal for all other fields

### Delete Job
- Confirmation prompt before delete

### Filter & Sort
- Filter by Status (default: show Bid + Active + Final Punch)
- Sort by Priority (default), Due Date, Contract Amount, Balance
- Search by Job Name

---

## Data Persistence

Use the same persistence mechanism already in the existing app (likely `localStorage` or a simple backend). If the existing app uses `localStorage`, use the same for the production flow data under a new key e.g. `ewp_production_jobs`.

If the existing app uses a backend/database, add a `jobs` table/collection with the fields above.

---

## Seed Data

Load the following jobs from the Excel file as initial data for testing. All amounts in USD.

### Active Jobs
| Priority | Job Name | Notes | Contract Amount | Balance |
|---|---|---|---|---|
| 1 | Nordlund Kitchen Daves Aunt | Finishing | 30216.55 | 15331.55 |
| 1 | Hildreth Kitchen Wall | Finishing | 11500 | 6000 |
| 1 | SD Custom Homes 1908 South Lane | Building | 154000 | 82620 |
| 2 | 25465 Park Tim Brown | Building now | 72115 | 51115 |
| 2 | Jeff Gross Laundry Room otro | Waiting on payment | 13000 | 13000 |
| 3 | Gary Woodward Bathroom | Next | 6660 | 3330 |
| 3 | 25315 Park Tim Brown | Need drawings, ready to go | 68172 | 68172 |
| 3 | 6456 Yosemite Tim Brown Spec Home | ASAP | 76798 | 76798 |
| 3 | 6444 Yosemite Chilipala TimBrown | | 75000 | 75000 |
| 3 | Hair District Remodel Edina | | 50000 | 50000 |
| 4 | Divine Homes Wilber | August 17th install | 93490 | 38490 |
| 4 | Diversified Pet Place | | 13500 | 13500 |
| 5 | Lake Country Kesatbaum | Ready to go | 5000 | 5000 |
| 5 | PD Vera Wang | Ready to go next | 122400 | 122400 |
| 8 | Lowertown Dispensary | | 82180 | 82180 |
| 8 | PD Shadow Boxes | Built | 28350 | 18900 |
| 12 | Lake Country Damiani Rice Lake | September Build | 224723 | 180723 |
| 14 | Boyer Conway Cabinets | | 46424.70 | 46424.70 |
| 15 | MN Fine Homes Plecko | | 32000 | 32000 |
| 15 | Michels Kitchen remodel | | 76785 | 76785 |
| 15 | Michael Paul Homes Brandt | Cabinets in August | 104074 | 104074 |
| 20 | MPC Orders | | 25000 | 25000 |
| 20 | Boyer Broberg | | 18000 | 18000 |
| 88 | Jeff Gross Whole Home Build | | 50000 | 50000 |
| 99 | Boyer Constable New Home | | 116490 | 116490 |
| 99 | LG Orders Estimate 2026 | | 125000 | 125000 |
| 99 | Tim Brown Walnut Grove #1 | | 55000 | 55000 |
| 99 | Tim Brown Walnut Grove #2 | | 55000 | 55000 |
| 99 | Trap Cannabis | | 49000 | 49000 |
| 99 | Boyer Swanson Phase 1 and 2 | | 50000 | 50000 |

### Final Punch Jobs
| Priority | Job Name | Notes | Contract Amount | Balance |
|---|---|---|---|---|
| 1 | Diversified Red Cow | Installed | 26555 | 13938 |
| 1 | Zimmerman Hair Saloon | Done | 30420 | 0 |
| 1 | Lake Country Gardner Hair Salon LC | Built | 86345 | 45345 |
| 1 | Lake Country Gardner Glass Wall for Saloon | Building next | 4500 | 4500 |
| 1 | Brass Strips Wine Door - Jimenez | Done | 1300 | 1300 |
| 1 | Boyer Kenny Bathroom 2850 Gale Road | Delivered | 4175 | 4175 |
| 1 | Long Lake Eye Clinic Source Group | Tops this week | 67040 | 40469 |
| 1 | Diversified Bussin Tacos | Building next | 13010 | 6410 |
| 1 | Servpro Fire Jessica Leimann | Done | 33365 | 0 |
| 1 | Coke Additional Shelves | Back splash | 1100 | 1100 |
| 2 | Source Group Pet Hospital | Done | 12970 | 648.50 |
| 3 | Jessica Lehman Adds | Done | 1200 | 1200 |
| 7 | Coke Remodel | Done | 58205 | 3892.50 |

### Bid Jobs
| Priority | Job Name | Contract Amount | Balance |
|---|---|---|---|
| 1 | Diversified StrongForme Pilates | 14850 | 14850 |
| 8 | Boyer Bure Kitchen | 55235 | 55235 |
| 9 | Bublotz Closet | 21500 | 21500 |
| 15 | Lake Country Krane Bathroom Remodel | 12905 | 12905 |
| 99 | Diversified Halo Yoga | 28485 | 28485 |
| 99 | Source Group 55 Homes Mahtomedi | 1376000 | 1376000 |
| 99 | Lake Country Shulte Spears Baths | 13100 | 13100 |
| 99 | Diversified Trollhaugen | 46000 | 28000 |
| 99 | Divine Wentzel | 151000 | 151000 |
| 99 | Lake Country Rekow Robertson | 51195 | 51195 |
| 99 | Ungmann Old House Fire House Jones | 92228 | 92228 |
| 99 | Vira Detox Cabinets Add Ons | 13380 | 13380 |
| 99 | Anna Hovila Bench | 7140 | 7140 |
| 99 | Lake Country Shroeder | 30000 | 30000 |
| 99 | Lake Country Gwen Spring Park | 87650 | 87650 |
| 99 | Boyer Harber Bathrooms | 20810 | 20810 |
| 99 | Divine Homes Cartenstean | 203760 | 203760 |
| 99 | Diversified The Spot | 27840 | 27840 |
| 99 | Source Group Nedia Saloon | 52000 | 52000 |
| 99 | Lake Country Kirkpatrick | 15775 | 15775 |
| 99 | Lake Country Engeman Minnetonka Phase 2 | 65000 | 65000 |
| 99 | Lake Country Masica | 43500 | 43500 |

---

## Existing App Reference

- **Live URL**: https://ewpquote.vercel.app
- **Repo**: (provide repo link to the new chat)
- Built with vanilla HTML/CSS/JS, no framework
- Deployed on Vercel
- Match existing UI styling: colors, fonts, button styles, modal patterns exactly

---

## Out of Scope (for now)

- User authentication / multi-user access
- Email notifications
- Gantt / timeline view
- Lauren & Grace SEO work (separate project, on hold)

---

## Estimated Effort

20–25 hours for full implementation including seed data and quote-to-production auto-populate feature.
