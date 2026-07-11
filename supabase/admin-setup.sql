-- Replace ADMIN_EMAIL_HERE with the email you used to sign up in the app.
update public.profiles
set role = 'admin', status = 'approved'
where lower(email) = lower('ADMIN_EMAIL_HERE');
