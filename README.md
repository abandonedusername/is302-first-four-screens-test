# RAFT front desk: First Four Screens

A four-screen website (Home, Client lookup, Dashboard, Add or edit a record) for the RAFT front desk. It reads from and writes to the `raft` schema in Supabase.

Live site: https://abandonedusername.github.io/is302-first-four-screens-test/

## AI tool

Codex (OpenAI), run from the codex command line.

## First prompt

I used the brief from the assignment unchanged, with my Project URL, my publishable key and the create table statements from the RAFT 3 Implementation Solution filled in. I added one line asking it not to run npm install and to edit only the project files.

## What the AI got wrong or left out, and how I fixed it

- Home showed "Today's appointments" as empty, because all of the sample appointments are from October 2024. I asked it to fall back to upcoming appointments, then the most recent ones, with a heading saying which it is.
- In Client lookup, a person's roles in a family ran together ("FatherComic"). I asked it to separate them.
- It told me to put the site behind access-controlled hosting. The assignment needs a public URL with no login, so I told it not to add any login.
- My Step 7 change came back with a question mark where a separator should be ("2 appointments ? 150 min"). I asked it to fix that.
- It did not change the database. I compared the raft tables, columns and constraints before and after and they matched.

## Step 7 change

I added a "Room usage" statistic to the Dashboard: for each room, the number of appointments and the total minutes booked, calculated from the Appointment table. The front desk books rooms, so knowing which rooms are busy is useful.
