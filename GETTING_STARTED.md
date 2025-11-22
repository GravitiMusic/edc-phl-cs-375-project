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

# Edit .env with your PostgreSQL password and Judge0 API Key
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


## For Devs

Problem demo link: http://localhost:3000/pages/problems/problem-0-addition/ (until we add navigation)


### How to add a new problem - annotations also exist in demo files
0. Create a new problem folder in `/public/pages/problems`, copy over the html and js files from the demo problem and change names
#### HTML File
1. Add challenge title
2. Add challenge description
3. Add example 
4. Add which js file to use
#### JS File
5. Add easy template (syntax only)
6. Add medium template (entire problem)
7. Add hard template (optimization)
8. Add test suite
9. Add submission suite
10. Add link from challenges page to problem

## To Do:
- Update challenge page to list problems
- Upon submission, run 10 tests against the user's code and display results including time and memory used (judge0 gives both)
- Upon submission, if in hard mode, compare timing
- Upon submission, update the user's statistics
- Let user see which tests failed
- Add ability to see user statistics via home page and account settings page
- If we feel like it, streamline problem addition via templates/database somehow
- Remove the index page, as it looks like it's no longer needed
- Update daily challenge (maybe just make it a link to a problem page to simplify it)
---