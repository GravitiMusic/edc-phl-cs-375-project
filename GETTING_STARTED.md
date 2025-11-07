# 🚀 Getting Started - Daily Workflow

## 📋 First-Time Setup (Do Once)

### 1. Clone and Install
```bash
cd edc-phl-cs-375-project
npm install
```

### 2. Configure Environment
```bash
# Copy the template
cp env.example .env

# Edit .env with your PostgreSQL password
# Change: DATABASE_PASSWORD=your_postgres_password_here
```

### 3. Set Up Database
```bash
# One command to create database + add admin user
npm run reset
```

This will:
- Drop and recreate the `oneup` database
- Create all tables (users, session, challenges, submissions)
- Create the leaderboard view
- Add an admin account

**Admin Credentials:**
- Username: `admin`
- Password: `admin`
- Email: `admin@oneup.dev`

### 4. Start the Server
```bash
npm start
```

### 5. Test It
Open `http://localhost:3000` and login with `admin` / `admin`

---

## 🔄 Resetting the Database

If you mess up data or want a fresh start:

```bash
# Reset everything (database + admin user)
npm run reset
```

Or manually:
```bash
# Just recreate tables
npm run setup

# Just add admin user (if missing)
npm run seed
```

---

## 📝 Useful Commands

| Command | What it Does |
|---------|--------------|
| `npm start` | Start the server (port 3000) |
| `npm run setup` | Create/reset database tables |
| `npm run seed` | Add admin user (safe to run multiple times) |
| `npm run reset` | Full reset (setup + seed) |

---

## 🆘 Common Issues

### Issue: "Session expired immediately"
**Solution:**
1. Check `SESSION_SECRET` is set in `.env`
2. Clear browser cookies
3. Restart the server

---