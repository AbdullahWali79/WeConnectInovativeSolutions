set local session_replication_role = replica;

insert into public.course_categories (name, description)
select
  'Python Development',
  'Advanced Python development courses and project-based learning roadmaps.'
where not exists (
  select 1
  from public.course_categories
  where lower(name) = lower('Python Development')
);

insert into public.courses (
  title,
  description,
  duration,
  level,
  status,
  category_id
)
select
  'Advanced Python Development',
  'A 30-project advanced Python roadmap covering automation, APIs, web scraping, data analysis, Flask, databases, GUIs, deployment, and AI integrations.',
  '30 Days',
  'Advanced',
  'active',
  category.id
from public.course_categories category
where lower(category.name) = lower('Python Development')
  and not exists (
    select 1
    from public.courses
    where lower(title) = lower('Advanced Python Development')
  )
limit 1;

update public.courses
set
  description = 'A 30-project advanced Python roadmap covering automation, APIs, web scraping, data analysis, Flask, databases, GUIs, deployment, and AI integrations.',
  duration = '30 Days',
  level = 'Advanced',
  status = 'active',
  category_id = (
    select id
    from public.course_categories
    where lower(name) = lower('Python Development')
    order by created_at asc
    limit 1
  )
where lower(title) = lower('Advanced Python Development');

set local session_replication_role = origin;

with selected_course as (
  select id
  from public.courses
  where lower(title) = lower('Advanced Python Development')
  order by created_at asc
  limit 1
),
rows(day_number, title, covered_days, concepts) as (
  values
    (1, 'CLI Expense Tracker with Data Validation', 'Day 1-4 (Basics, Strings, Loops)', 'Functions, While loops, Input validation, String formatting.'),
    (2, 'Password Generator & Strength Analyzer', 'Day 5-8 (Lists, Random, Modules)', 'Random module, Lists, Loop logic, ASCII art generation.'),
    (3, 'Student Grade Manager (Dictionary/Nested)', 'Day 9-12 (Dictionaries, Nesting)', 'Nested dictionaries, Data manipulation, Conditional logic.'),
    (4, 'OOP Banking System (Deposit/Withdraw)', 'Day 13-16 (OOP, Classes, Objects)', 'Classes, Constructors, Class methods, Encapsulation.'),
    (5, 'Turtle Racing Game (User Betting)', 'Day 17-20 (Turtle Graphics, Events)', 'Turtle module, Event listeners, Random logic, GUI basics.'),
    (6, 'Pong Game (2-Player Arcade)', 'Day 21-24 (Turtle, OOP, Collision)', 'Classes (Paddle, Ball), Collision detection, Screen updates.'),
    (7, 'Snake Game with High Score File Storage', 'Day 25-27 (File I/O, Exceptions)', 'File handling (Read/Write), Try-Except, OOP inheritance.'),
    (8, 'Habit Tracker using Pixela API', 'Day 28-31 (REST APIs, Requests)', 'HTTP requests (GET/POST), JSON parsing, API authentication.'),
    (9, 'ISS Overhead Notifier (Email Alert)', 'Day 32-35 (APIs, SMTP, Time module)', 'SMTP (email sending), Time/Date handling, API error handling.'),
    (10, 'Spotify "Top 100" Playlist Creator', 'Day 36-39 (Web Scraping - Beautiful Soup)', 'BeautifulSoup, URL requests, Data extraction, Spotify API.'),
    (11, 'Amazon Price Tracker (Email Alert)', 'Day 40-43 (Web Scraping - BS4, Headers)', 'User-agent headers, Price parsing, SMTP alerts.'),
    (12, 'Job Application Bot (LinkedIn Automation)', 'Day 44-47 (Selenium WebDriver)', 'Selenium setup, Web element interaction, Form filling automation.'),
    (13, 'NBA Player Data Analyzer (Pandas)', 'Day 48-51 (Pandas, DataFrames)', 'DataFrames, Data cleaning, CSV manipulation.'),
    (14, 'Stock Trading Alert Bot (Twilio SMS)', 'Day 52-55 (APIs, Pandas, DataViz)', 'Stock API, Data comparison, SMS (Twilio) alerts.'),
    (15, 'Flight Club - Cheap Flight Finder', 'Day 56-59 (OOP + APIs integration)', 'OOP structure, API fetching, Data processing, File storage.'),
    (16, 'Personal Portfolio Website (HTML/CSS)', 'Day 60-63 (Web Foundation, HTML, CSS)', 'HTML structure, CSS Flexbox/Grid, Website deployment intro.'),
    (17, 'Flask Blog (CRUD without Database)', 'Day 64-67 (Flask Intro, Jinja Templating)', 'Flask app, Routing, Jinja templates, Static files.'),
    (18, 'Book Collection Database (SQLite)', 'Day 68-71 (SQLite, SQLAlchemy)', 'Database creation, ORM, CRUD operations.'),
    (19, 'Authentication System (Login/Signup)', 'Day 72-75 (WTForms, Flask Login)', 'Password hashing, Session management, Flask forms.'),
    (20, 'RESTful Cafe API (JSON Endpoints)', 'Day 76-79 (REST APIs with Flask)', 'GET, POST, PUT, DELETE endpoints, Postman testing.'),
    (21, 'Weather Dashboard (Tkinter + API)', 'Day 80-83 (Tkinter GUI, API)', 'Tkinter widgets, API requests, GUI layout management.'),
    (22, 'Crypto Price Tracker (Real-Time)', 'Day 84-87 (Advanced API, Web requests)', 'Live Crypto APIs, Data refresh, Error handling.'),
    (23, 'Deployed Flask App on Render/Heroku', 'Day 88-91 (Deployment, Environment Variables)', 'Deployment process, Environment variables (secrets).'),
    (24, 'Excel Data Automation (OpenPyXL)', 'Day 92-94 (Data Science, Excel files)', 'OpenPyXL library, Spreadsheet creation, Data formatting.'),
    (25, 'Data Visualization (US Births Analysis)', 'Day 95-97 (Matplotlib, Data Science)', 'Line charts, Bar charts, Data filtering, Pandas + Matplotlib.'),
    (26, 'Tkinter Notepad Application (GUI)', 'Day 98 (Tkinter Advanced)', 'Menu bars, File dialogs, Text widgets, Event binding.'),
    (27, 'Automated Email Sender with Attachments', 'Day 99 (SMTP, MIME)', 'MIME attachments, SMTP server, Bulk email sending.'),
    (28, 'AI Text-to-Speech Converter (gTTS)', 'Day 100 (Libraries, Final Project)', 'gTTS (Google Text-to-Speech), MP3 file generation.'),
    (29, 'AI Chatbot using OpenAI API', 'Bonus (Post-Course)', 'OpenAI GPT API integration, Prompt engineering.'),
    (30, 'Full-Stack Expense Tracker (Flask + SQL)', 'Capstone - All Concepts', 'Full-stack integration: Flask, SQL, Auth, DataViz, Deployment.')
)
insert into public.course_topics (
  course_id,
  day_number,
  title,
  english_video,
  urdu_video,
  practice_project
)
select
  selected_course.id,
  rows.day_number,
  rows.title,
  rows.covered_days,
  null,
  rows.concepts
from selected_course
cross join rows
on conflict (course_id, day_number) do update
set
  title = excluded.title,
  english_video = excluded.english_video,
  urdu_video = excluded.urdu_video,
  practice_project = excluded.practice_project;
