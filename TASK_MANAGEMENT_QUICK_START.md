# Task Management Module - Quick Start Guide

## 🚀 Quick Navigation

### Admin/Manager/Sales Access
- **Create/Manage Tasks:** `/admin/tasks`
- **View Task Details:** `/admin/tasks/[taskId]`

### Employee Access
- **View My Tasks:** `/employee/tasks`

---

## 📋 Quick Features Overview

### Task Management Dashboard (`/admin/tasks`)

**What You Can Do:**
1. **Create Task** - Click "New Task", fill form, submit
2. **Edit Task** - Click pencil icon on any task
3. **Delete Task** - Click trash icon (confirmation required)
4. **View Details** - Click "View" button
5. **Search** - Use search bar to find tasks
6. **Filter** - By status or priority

**Form Fields:**
- Title *(required)*
- Description
- Assign To *(required)* - Select employees
- Priority - Low/Medium/High/Urgent
- Category - Maintenance/Service/Inspection/Other
- Deadline *(required)*

---

### Task Details Page (`/admin/tasks/[id]`)

**Features:**
- Full task information
- Status management (4 levels)
- Comment system
- Task timeline
- Completion tracking

**Status Levels:**
1. ⏳ **Not Started** - Default
2. ⚙️ **In Progress** - Work started
3. ✅ **Completed** - Work done
4. ✅✅ **Verified** - Confirmed

**Comments:**
- Add comments
- See author & timestamp
- View full history

---

### Employee Task Dashboard (`/employee/tasks`)

**Quick Stats:**
- Total assigned tasks
- Tasks to do
- In progress
- Completed
- Overdue count

**On Each Task Card:**
- Title & description
- Priority (color-coded)
- Deadline
- Category
- Progress bar
- Quick status buttons

**Actions:**
- Click status buttons to update
- Click "View Details" for full info
- Use filters to find tasks
- Search by keyword

---

## 🎨 Color Reference

### Priority Colors
- 🟢 **Low** - Green
- 🟡 **Medium** - Yellow
- 🟠 **High** - Orange
- 🔴 **Urgent** - Red

### Status Colors
- ⏳ **Not Started** - Gray
- ⚙️ **In Progress** - Blue
- ✅ **Completed** - Green
- ✅✅ **Verified** - Purple

### Overdue Alert
- 🚨 Red text when past deadline
- Only if status is not Completed/Verified

---

## 🔧 Common Tasks

### How to Create a Task
```
1. Go to /admin/tasks
2. Click "New Task"
3. Enter task title (required)
4. Add description (optional)
5. Select employees to assign (required)
6. Choose priority level
7. Select category
8. Pick deadline date (required)
9. Click "Create Task"
```

### How to Assign Multiple Employees
```
1. In task form, see "Assign To" section
2. Check multiple employee boxes
3. Assigned names appear in list
4. Uncheck to remove assignment
```

### How to Update Task Status
```
Option 1 (Admin/Manager/Sales):
1. Go to task list
2. Click "View" button on task
3. Click desired status button
4. Status updates immediately

Option 2 (Employee):
1. Go to /employee/tasks
2. On task card, click status button
3. Can change between statuses
4. Updates in real-time
```

### How to Add a Comment
```
1. Open task detail page (/admin/tasks/[id])
2. Scroll to "Comments" section
3. Type your comment
4. Click send button (paper airplane icon)
5. Comment appears instantly
```

### How to Edit a Task
```
1. Go to /admin/tasks
2. Click pencil icon on task row
3. Form opens with current values
4. Edit fields
5. Click "Update Task"
```

### How to Delete a Task
```
1. Go to /admin/tasks
2. Click trash icon on task row
3. Confirm deletion when prompted
4. Task removed from list
```

---

## 🔍 Filtering & Searching

### Search Tasks
- Type in search box
- Searches title and description
- Results update instantly
- Clear to reset search

### Filter by Status
```
Options:
- All Status (shows all)
- Not Started
- In Progress
- Completed
- Verified
```

### Filter by Priority
```
Options:
- All Priority (shows all)
- Low
- Medium
- High
- Urgent
```

### Combine Filters
- Use search + status filter together
- Use search + priority filter together
- Mix all three for exact results

---

## 👥 Employee Dashboard Features

### Task Statistics
At the top, see quick counts:
- **Total** - All your tasks
- **To Do** - Not yet started
- **In Progress** - Currently working
- **Done** - Completed + Verified
- **Overdue** - Past deadline, not done

### Task Cards
Each card shows:
- Task title & brief description
- Priority badge (color)
- Category label
- Deadline date
- Progress bar (visual progress)
- Quick status update buttons

### Status Update on Card
Click any status button directly:
- Changes status
- Saves automatically
- Updates immediately
- No form needed

### View Full Task Details
- Click "View Details" button
- Opens full task page
- See all information
- Add comments
- Full status history

---

## ⚙️ Status Workflow

### For Creators (Admin/Manager/Sales)
```
Task Created
    ↓
[Edit / Delete / View] (anytime)
    ↓
Assign to employees
    ↓
Monitor progress
    ↓
Mark as Verified when done
```

### For Assigned Employees
```
See task in dashboard
    ↓
Click "In Progress" when starting
    ↓
Work on task
    ↓
Click "Completed" when done
    ↓
Wait for manager to verify
```

### Complete Status Flow
```
Not Started → In Progress → Completed → Verified
```

---

## 📱 Device Support

### Mobile (Phone)
- ✅ Full functionality
- Stacked layout
- Touch-optimized buttons
- Horizontal scroll for tables

### Tablet
- ✅ Full functionality
- 2-column layouts
- Optimized spacing
- All features available

### Desktop
- ✅ Full functionality
- 3+ column layouts
- Sidebar panels
- Optimized whitespace

### Dark Mode
- ✅ Complete dark mode
- Works on all devices
- System preference
- Toggle in settings

---

## 🚨 Common Issues

### Task Not Showing Up
- **Check:** Is it assigned to your department?
- **Check:** Did you hit "Create Task" button?
- **Fix:** Refresh page to sync

### Can't Edit/Delete Task
- **Check:** Are you admin/manager/sales?
- **Check:** Did you create the task?
- **Fix:** Ask your manager for permissions

### Comments Not Saving
- **Check:** Is internet connection active?
- **Check:** Did you click send button?
- **Fix:** Try refreshing page

### Status Won't Change
- **Check:** Do you have permission?
- **Check:** Is network active?
- **Fix:** Click status button again

### Page Loading Slow
- **Check:** Network connection
- **Check:** Browser cache (clear if needed)
- **Fix:** Close other tabs/apps

---

## 🎯 Best Practices

### Creating Tasks
- ✅ Write clear, specific titles
- ✅ Add detailed descriptions
- ✅ Set realistic deadlines
- ✅ Assign to right people
- ❌ Don't create duplicate tasks
- ❌ Don't mix multiple tasks in one

### Assigning Tasks
- ✅ Verify employee availability
- ✅ Check employee skills
- ✅ Realistic deadline for scope
- ❌ Don't overload employees
- ❌ Don't assign beyond role

### Managing Tasks
- ✅ Update status regularly
- ✅ Add comments for clarity
- ✅ Check deadlines daily
- ✅ Verify completed work
- ❌ Don't leave status stale
- ❌ Don't miss overdue tasks

### Comments
- ✅ Be clear and professional
- ✅ Include specific details
- ✅ Mention if feedback needed
- ❌ Don't use for chat
- ❌ Don't forget to save

---

## 📞 Support & Help

### Quick Help
- Hover over icons for tooltips
- Check status labels for meanings
- Use search if unsure where task is

### Stuck?
1. Check Quick Start section above
2. Review color reference
3. Try refreshing page
4. Check internet connection
5. Contact your manager

### Report Issues
- Note what you were doing
- Take screenshot if possible
- Share error message
- Tell your admin

---

## 🔐 Permissions Guide

### Who Can Do What?

**Admin:**
- ✅ Create any task
- ✅ Edit any task
- ✅ Delete any task
- ✅ Verify all tasks
- ✅ See all tasks

**Manager:**
- ✅ Create tasks
- ✅ Edit own tasks
- ✅ Delete own tasks
- ✅ Verify tasks
- ✅ See team tasks

**Sales/Other Roles:**
- ✅ Create tasks
- ✅ Edit own tasks
- ✅ Delete own tasks
- ❌ Verify tasks
- ✅ See assigned tasks

**Employees:**
- ❌ Create tasks
- ✅ View assigned tasks
- ✅ Update own task status
- ✅ Add comments
- ❌ Delete/verify tasks

---

## 🎓 Learning Resources

### For Beginners
1. Start at `/employee/tasks` to see examples
2. Read task cards carefully
3. Understand status colors
4. Practice using filters

### For Power Users
1. Use advanced filters effectively
2. Master comment system
3. Monitor team capacity
4. Track overdue tasks daily

### For Managers
1. Create clear task descriptions
2. Set realistic deadlines
3. Assign to appropriate people
4. Verify work regularly
5. Use comments for feedback

---

## 🌙 Dark Mode

**Automatic:**
- System preference applied
- Toggle in app settings
- Persists across sessions

**Manual:**
- Find theme toggle in settings
- Select Dark/Light/Auto
- Changes immediately

---

## 📊 Statistics Explained

### On Employee Dashboard

**Total:** All tasks assigned to you (active + completed)

**To Do:** Tasks marked "Not Started" (action needed)

**In Progress:** Tasks you're currently working on

**Done:** Completed + Verified tasks (finished work)

**Overdue:** Tasks past deadline that aren't done (urgent!)

---

## ⏰ Time Displays

### Date Format
- Shows as: `Mon, Jan 3, 2025`
- Sortable by date
- Color warning if overdue

### Timestamps
- Created: When task was made
- Updated: Last change time
- Completed: When marked done

### Overdue Indicator
- Red text on deadline = ⚠️ **Past deadline**
- Only if status is not Completed/Verified
- Check first thing each morning

---

## 🔄 Real-Time Updates

**Everything syncs instantly:**
- ✅ Task creation visible to all
- ✅ Status changes update immediately
- ✅ Comments appear in real-time
- ✅ Assignments update across devices
- ✅ Multiple users see changes instantly

**No need to refresh** - Updates happen automatically!

---

## ✨ Tips & Tricks

1. **Search Tips:** Use specific keywords for better results
2. **Filter Tips:** Combine filters for precise view
3. **Status Tips:** Update regularly to keep accurate
4. **Comment Tips:** Use clear language for clarity
5. **Deadline Tips:** Set dates early to avoid rush
6. **Assign Tips:** Check capacity before assigning
7. **Delete Tips:** Only delete false/duplicate tasks
8. **Mobile Tips:** Use filters to reduce scrolling

---

**Last Updated:** Today  
**Version:** Phase 1 Complete  
**Status:** ✅ Production Ready  

For detailed technical information, see: `TASK_MANAGEMENT_PHASE1_COMPLETE.md`
