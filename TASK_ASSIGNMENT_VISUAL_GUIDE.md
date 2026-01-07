# Task Assignment Feature - Visual Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CARMANTRA SYSTEM                         │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────▼──────┐  ┌────▼────┐  ┌───▼────┐
         │   SERVICES  │  │  TASKS  │  │ ADMIN  │
         └──────┬──────┘  └────┬────┘  └───┬────┘
                │              │           │
      ┌─────────▼──────────────┼───────────┘
      │                        │
      │  🔗 Link via           │
      │  serviceBookingId      │
      │                        │
┌─────▼──────────────┐  ┌─────▼──────────────┐
│  bookedServices    │  │  tasks             │
│  ┌────────────────┐│  │  ┌────────────────┐│
│  │ jobCardNo      ││  │  │ serviceBookingId││ ◄── NEW LINK
│  │ customeName    ││  │  │ jobCardNo      ││ ◄── NEW FIELD
│  │ vehicleBrand   ││  │  │ assignedTo     ││
│  │ numberPlate    ││  │  │ observedBy     ││ ◄── NEW FIELD
│  │ scheduledDate  ││  │  │ priority       ││
│  │ category       ││  │  │ deadline       ││
│  │ status         ││  │  │ bookingDetails ││ ◄── NEW OBJECT
│  └────────────────┘│  │  └────────────────┘│
└────────────────────┘  └────────────────────┘
```

---

## 📊 Data Flow Diagram

```
ADMIN CREATES BOOKING
        │
        ▼
   ┌─────────────────────────────────────────┐
   │   Book Service Dialog                   │
   │ ┌───────────────────────────────────────┤
   │ │ • Customer Details                    │
   │ │ • Vehicle Details                     │
   │ │ ┌─────────────────────────────────────┤
   │ │ │ TASK ASSIGNMENT (NEW)               │
   │ │ │ ✓ Select Employees                  │
   │ │ │ ✓ Choose Observer                   │
   │ │ │ ✓ Set Priority                      │
   │ │ │ ✓ Choose Category                   │
   │ │ │ ✓ Pick Deadline                     │
   │ │ └─────────────────────────────────────┤
   │ └───────────────────────────────────────┘
        │
        ▼
   SUBMIT BOOKING
        │
        ├─── Save to bookedServices
        │         │
        │         ▼
        │    ✅ Booking Created
        │
        └─── If employees selected:
                 │
                 ▼
            CREATE TASK
                 │
                 ├─── serviceBookingId = booking.id
                 ├─── jobCardNo = booking.jobCardNo
                 ├─── bookingDetails = booking data
                 ├─── observedBy = observer role
                 └─── assignedTo = selected employees
                         │
                         ▼
                    ✅ Task Created in Firestore
                         │
                         ▼
        EMPLOYEE NOTIFICATIONS
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
         My Tasks Page      Email Alert
         (if enabled)       (if enabled)
```

---

## 🎬 Feature Workflows

### Workflow 1: Create Task During Booking

```
ADMIN/MANAGER
     │
     ├─ Go to Services
     │
     ├─ Click "Book Service"
     │
     ├─ Fill in:
     │  ├─ Service Details
     │  ├─ Customer Details
     │  └─ Vehicle Details
     │
     ├─ Scroll to "Assign Task to Employee"
     │
     ├─ Click "+ Add Task" to expand
     │
     ├─ Check employees:
     │  └─ ☑ Employee 1
     │  └─ ☑ Employee 2
     │
     ├─ Set Task Details:
     │  ├─ Observed By: Admin/Manager/Sales/Accounts
     │  ├─ Priority: Low/Medium/High/Urgent
     │  ├─ Category: Maintenance/Service/Inspection/Other
     │  └─ Deadline: [Date]
     │
     ├─ Click "Submit"
     │
     └─ ✅ TASK CREATED
        ├─ Stored in Firestore
        ├─ Linked to booking
        └─ Visible to employees

EMPLOYEE 1 & 2 SEE TASK:
     │
     ├─ Go to "My Tasks"
     │
     ├─ See "Service: J123456"
     │  ├─ Job Card: J123456 (clickable)
     │  ├─ Customer: John Doe
     │  ├─ Vehicle: Toyota Camry
     │  ├─ Plate: ABC-1234
     │  └─ Service: Car Wash
     │
     ├─ Update Task Status
     │  ├─ Not Started
     │  ├─ In Progress
     │  ├─ Completed
     │  └─ Verified
     │
     └─ Click Job Card → See Full Booking
```

### Workflow 2: Add Task from Booking Detail

```
ADMIN/MANAGER
     │
     ├─ Open Booking Details
     │
     ├─ Scroll to "Assigned Tasks"
     │
     ├─ Click "+ Add Task"
     │
     ├─ Modal Opens:
     │  ├─ Select Employees
     │  ├─ Choose Observer
     │  ├─ Set Priority
     │  ├─ Choose Category
     │  └─ Set Deadline
     │
     ├─ Click "Create Task"
     │
     └─ ✅ TASK CREATED
        ├─ Linked to current booking
        ├─ Visible immediately
        └─ Status message shows success

EMPLOYEE SEES:
     │
     └─ Task in "My Tasks"
        └─ With full booking context
```

### Workflow 3: Employee Reviews Task

```
EMPLOYEE
     │
     ├─ Go to "My Tasks"
     │
     ├─ See Task Card:
     │  ├─ Title: "Service: J123456"
     │  ├─ Job Card (Link): J123456 ← CLICKABLE
     │  ├─ Customer: John Doe
     │  ├─ Vehicle: Toyota Camry ABC-1234
     │  ├─ Service: Car Wash
     │  ├─ Observed By: Admin
     │  ├─ Priority: Medium
     │  ├─ Deadline: Jan 10, 2026
     │  └─ Status: Not Started
     │
     ├─ Click Job Card:
     │  └─ Opens Full Booking in New Tab
     │     ├─ Service details
     │     ├─ Pre-inspection section
     │     ├─ Assigned tasks list
     │     ├─ Quotation/invoice status
     │     └─ All booking history
     │
     ├─ Update Task Status:
     │  ├─ Click "In Progress"
     │  ├─ Click "Completed"
     │  ├─ Click "Verified"
     │  └─ Status updates real-time
     │
     └─ Work on Service & Mark Complete
```

---

## 🎨 UI Component Hierarchy

### Booking Form Structure
```
DialogContent
├── DialogHeader
│   └── DialogTitle: "Book Services"
│
└── form
    ├── Service Details Section
    │   ├── Job Card No
    │   ├── Date & Time
    │   └── Category
    │
    ├── Customer Details Section
    │   ├── First Name / Last Name
    │   ├── Mobile / Email
    │   └── Country / State / City
    │
    ├── Vehicle Details Section
    │   ├── Vehicle Type
    │   ├── Brand / Model
    │   ├── Number Plate
    │   └── Mulkiya Upload
    │
    ├── ★ Task Assignment Section ★ (NEW)
    │   ├── Toggle Button "+ Add Task"
    │   │
    │   └── [if expanded]
    │       ├── Employee Selection (Checkboxes)
    │       ├── Observer Role (Dropdown)
    │       ├── Priority (Dropdown)
    │       ├── Category (Dropdown)
    │       └── Deadline (Date Picker)
    │
    ├── Pre-Inspection Info
    │
    └── Buttons
        ├── Submit
        └── Close
```

### Booking Detail Structure
```
div.space-y-6
├── Header
│   ├── Title: "Service Booking"
│   ├── Job Card No
│   └── Back Button
│
├── Service Cards
│   ├── Service Details Card
│   ├── Customer Details Card
│   ├── Vehicle Details Card
│   │
│   ├── ★ Assigned Tasks Card ★ (NEW)
│   │   ├── Title: "Assigned Tasks (N)"
│   │   ├── "+ Add Task" Button
│   │   │
│   │   └── Task List
│   │       └── Task Card
│   │           ├── Title & Priority Badge
│   │           ├── Job Card Link
│   │           ├── Assigned To
│   │           ├── Observer Role
│   │           ├── Status
│   │           ├── Deadline
│   │           └── "View Task" Link
│   │
│   ├── Pre-Inspection Card
│   ├── Quotation Card
│   ├── Billing Card
│   └── History Timeline
│
└── ★ Task Modal ★ (NEW)
    ├── DialogHeader
    │   └── Title: "Add Task for [Job Card]"
    │
    └── Form
        ├── Employee Selection
        ├── Observer Role
        ├── Priority
        ├── Category
        ├── Deadline
        │
        └── Buttons
            ├── Cancel
            └── Create Task
```

### Employee Task List Structure
```
div.space-y-6
├── Header
│   ├── Title: "My Tasks"
│   └── Description
│
├── Statistics Cards
│   ├── Total
│   ├── To Do
│   ├── In Progress
│   ├── Done
│   └── Overdue
│
├── Filters
│   ├── Search
│   ├── Status Filter
│   └── Priority Filter
│
└── Task List
    └── Task Card (repeated)
        ├── Title & Job Card Link ★ (NEW)
        │
        ├── ★ Booking Details Box ★ (NEW)
        │   ├── Customer Name
        │   ├── Vehicle Brand/Model
        │   ├── Number Plate
        │   └── Service Category
        │
        ├── Priority Badge
        ├── Category Badge
        ├── ★ Observer Badge ★ (NEW)
        ├── Deadline with Calendar Icon
        ├── Description
        │
        ├── Status Buttons
        │   ├── Not Started
        │   ├── In Progress
        │   ├── Completed
        │   └── Verified
        │
        └── Progress Bar
```

---

## 🔐 Permission & Access Matrix

```
                    Admin  Manager  Sales  Accounts  Employee
Create Booking        ✅      ✅       ✅      ✅        ❌
Assign Task           ✅      ✅       ✅      ✅        ❌
View All Tasks        ✅      ✅       ✅      ✅        ❌
View My Tasks         ✅      ✅       ✅      ✅        ✅
Update Task Status    ✅      ✅       ✅      ✅        ✅ (own)
View Booking          ✅      ✅       ✅      ✅        ✅
Create Quotation      ✅      ✅       ❌      ❌        ❌
Create Invoice        ✅      ✅       ❌      ✅        ❌
```

---

## 📱 Responsive Breakpoints

```
Mobile (< 640px)
├── Single column layouts
├── Full-width buttons
├── Stacked forms
├── Smaller headings
└── Touch-optimized

Tablet (640px - 1024px)
├── 2-column grids
├── Wider modals
├── Better spacing
└── Flexible layouts

Desktop (> 1024px)
├── 2-3 column grids
├── Full-width modals
├── Complete information
└── Multi-column views
```

---

## 🔄 Real-time Updates

```
Firestore Collection Changes
        │
        ▼
    onSnapshot Listeners
        │
        ├─ Task Data Changes
        │  └─ Update tasks[] state
        │     └─ Re-render components
        │        └─ Employee sees updates
        │
        └─ Booking Data Changes
           └─ Update service state
              └─ Re-render cards
                 └─ Shows latest info
```

---

## 📊 Data Relationships

```
┌─────────────────────────────┐
│    bookedServices/{id}      │
├─────────────────────────────┤
│ jobCardNo: "J123456"        │
│ customeName: "John Doe"     │
│ vehicleBrand: "Toyota"      │
│ modelName: "Camry"          │
│ numberPlate: "ABC-1234"     │
│ scheduledDate: Timestamp    │
│ category: "Car Wash"        │
│ status: "pending"           │
│ createdAt: Timestamp        │
│ ...other fields...          │
└────────────┬────────────────┘
             │
             │ 1 to Many
             │ (via serviceBookingId)
             │
             ▼
┌─────────────────────────────┐
│      tasks/{id} (NEW)       │
├─────────────────────────────┤
│ serviceBookingId: "..." ◄───┘
│ jobCardNo: "J123456"
│ assignedTo: ["emp1", "emp2"]
│ observedBy: "admin"
│ priority: "medium"
│ category: "service"
│ deadline: "2026-01-10"
│ status: "inProgress"
│ bookingDetails: {
│   customerName: "John Doe"
│   vehicleBrand: "Toyota"
│   vehicleModel: "Camry"
│   numberPlate: "ABC-1234"
│   serviceCategory: "Car Wash"
│ }
│ createdAt: Timestamp
│ ...other fields...
└─────────────────────────────┘
```

---

## ✅ Implementation Complete!

**All Features:** ✅ Implemented  
**All Responsive Designs:** ✅ Implemented  
**Error Handling:** ✅ Complete  
**Documentation:** ✅ Complete  
**Testing Checklist:** ✅ Ready  
**Production Status:** 🟢 Ready to Deploy

---

*Last Updated: January 5, 2026*  
*Version: 1.0.0*
