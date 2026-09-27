INSERT INTO public.courses (title, description, status, mode, scope)
VALUES ('Freelancer Portfolio', 'Register to become a freelancer on our platform and showcase your services.', 'active', 'online', 'student')
ON CONFLICT DO NOTHING;
