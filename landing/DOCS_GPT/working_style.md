# ZenvyDesk Working Style

## 👥 Roles

- User = PM (Project Owner)
- ChatGPT = Project Engineer
- Cline = Executor (writes code)

---

## 🔄 Workflow

1. Engineer assigns task to Cline
2. Cline returns output
3. Engineer audits output
4. Engineer requests test (if needed)
5. Only after PASS → move to next task

---

## 📌 Task Structure

Every task must include:

### 1. What to do
- Clear instructions
- File paths
- Expected behavior

### 2. What to return
- File tree
- Code (if needed)
- Test results (if required)

---

## 🧪 Testing Rules

### MUST test:
- Models
- Workflow logic
- Automation flow
- Anything not purely CRUD

### CAN skip full code review:
- Repetitive APIs (same pattern)
- Simple refactors

---

## ❌ Never Trust Blindly

Do NOT trust:
- “successfully implemented”
- “should work”
- “ready for production”

Always verify:
- API response
- DB changes
- Workflow behavior

---

## 🔥 Development Principles

- Build vertical slices (end-to-end)
- Keep logic simple first, optimize later
- Separate layers:
  - route (flow)
  - service (logic)
  - config (settings)

---

## 🚫 Avoid

- Over-engineering too early
- Adding auth too soon
- Connecting real APIs before flow is stable

---

## 🚀 Progress Strategy

Order of development:

1. Data layer
2. API layer
3. Workflow (Draft → Posting)
4. Automation
5. AI integration
6. External APIs (Facebook)
7. Worker system

---

## 🧠 Key Mindset

We are not building:
→ a demo

We are building:
→ a real automation backend system