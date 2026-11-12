-- ════════════════════════════════════════════════════════════════════
-- FIX: Two TaskFlow API products were matched by the same ILIKE pattern in
-- the bulk SEO scripts and ended up with an identical slug + SEO content.
-- This gives each product a unique slug and keyword-focused metadata so
-- both pages can be indexed independently (no duplicate content).
-- Match is done by exact ID, so it is safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- Product A: Flask + SQLAlchemy + Flask-JWT-Extended + Swagger/Flasgger
UPDATE products SET
  slug = 'taskflow-flask-rest-api-jwt',
  seo_title = 'TaskFlow Flask REST API — JWT Task Manager with Swagger',
  seo_description = 'TaskFlow is a Flask RESTful task manager API with JWT authentication, SQLAlchemy, RBAC, pagination, rate limiting, and Swagger/OpenAPI docs. Secure task CRUD built with Python.',
  seo_keywords = ARRAY['TaskFlow','Flask REST API','Flask task manager','JWT authentication','SQLAlchemy','Flask-JWT-Extended','Swagger OpenAPI','Python task API','RBAC','RESTful API'],
  updated_at = now()
WHERE id = 'b2a0ef82-3f0f-4135-91eb-d99ec90e7d21';

-- Product B: FastAPI + React + Pydantic + Bcrypt + SlowAPI + ReDoc
UPDATE products SET
  slug = 'taskflow-fastapi-react-task-manager',
  seo_title = 'TaskFlow FastAPI & React Task Manager — JWT & RBAC',
  seo_description = 'TaskFlow is a full-stack task manager built with FastAPI, React, and PostgreSQL. Includes JWT login, role-based access, task CRUD, filtering, Bcrypt hashing, and rate limiting.',
  seo_keywords = ARRAY['TaskFlow','FastAPI task manager','React dashboard','FastAPI PostgreSQL','Pydantic','PyJWT','Bcrypt','SlowAPI','ReDoc','task management system'],
  updated_at = now()
WHERE id = 'b5050e7b-98ac-44c4-8507-ff49c35eaea8';
