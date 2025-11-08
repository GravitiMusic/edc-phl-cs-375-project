# CS-375 Project - Group: EDC Philadelphia

---

## Project: One Up
The goal for this project is to have a working daily coding challenge game, where users can compete with friends and others across the web for the best solution to a generated coding challenge every day.

---

## Running Locally

1. Set password in env.json
2. Make sure you're in the root directory
3. `npm i`
4. `npm run setup`
5. `npm run start`

## Project Goals:
* Deployment
* Users can create accounts
* Users can select coding challenges (hard coded by us)
* Users can submit code using an in-built editor OR uploading files
* User code is run against test cases
  * Results are displayed to user along with statistics
* User can see a list of past submissions & whether they passed or failed
  * How many test cases are passed
* Can publish a submission & add text describing it that others can see when looking at the problem/solution
* Some sort of global visualization/ranking of submission stats
  * Could be runtime, github commits, etc.
* Users will have some level of sample code & will be able to code in a series of different supported languag

---

## Quick Start

**First time setup:**
```bash
npm install                 # Install dependencies
cp env.example .env        # Create config file (then edit with your password)
npm run reset              # Create database + admin user
npm start                  # Start server → http://localhost:3000
```

**Daily workflow:**
```bash
npm start                  # Start the server
# Login: admin / admin
```

📖 **New to the project?** See [`GETTING_STARTED.md`](GETTING_STARTED.md) for detailed instructions.