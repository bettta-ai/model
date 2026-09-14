# SCOUT - Model Portfolio Form (Next.js)

A working 5-step portfolio form with localStorage persistence, photo uploads, and auto-save.

## Setup (Mac)

### Step 1: Install Dependencies
Open Terminal and run:
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
Go to: **http://localhost:3000**

## Features

✅ **5-Step Wizard**
- Step 1: Contact Info
- Step 2: Photo Upload
- Step 3: Measurements & Attributes
- Step 4: About You
- Step 5: Review & Submit

✅ **localStorage Persistence**
- All data auto-saves as you type
- Data persists after browser refresh
- Data persists after closing/reopening browser

✅ **Photo Upload**
- Drag-and-drop support
- Multiple photos
- Remove individual photos

✅ **Features**
- Progress bar
- Form validation
- Contact preferences (Email/Phone/SMS)
- Hair color options including "Any" and "Pattern"
- Date of birth picker
- Responsive design

## Testing

1. Fill out form steps 1-4 completely
2. Navigate to Step 5 (Review)
3. **All your data should appear** (not blank dashes)
4. Refresh page (Cmd+R)
5. **Data should still be there** after refresh

## Build for Production

```bash
npm run build
npm start
```

---

**Data Storage:** Browser's localStorage (all data stays on your machine)
