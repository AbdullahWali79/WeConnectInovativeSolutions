alter table public.admin_notification_settings
  add column if not exists registration_message_template text not null default $$
Assalam o Alaikum,

A new student registration has been received.

Student Name: {{student_name}}
Course: {{course_name}}
Phone: {{phone}}
Status: {{status}}

Please review this application from the admin panel.
$$,
  add column if not exists pending_summary_message_template text not null default $$
Assalam o Alaikum,

Daily pending task summary:

Total Pending Tasks: {{total_pending_tasks}}
Overdue Tasks: {{overdue_tasks}}
Submitted but Ungraded: {{submitted_but_ungraded}}
Date: {{date_label}}

Please review them from the admin dashboard.
$$,
  add column if not exists approved_student_message_template text not null default $$
Assalam o Alaikum {{student_name}},

Welcome to WeConnectInnovation!
Course: {{course_name}}.
Aap ka admission approve ho gaya hai.
Aap ab We Connect Software House join kar sakte hain.
Address: Sharqi Colony Back Side of Cookooz Cafe, Near Main Masjid.

Ap ka Internship Record start ho jaye ga jab aap apni payment fees submit karwa den ge aur apna Github Repo ka link upload kar den ge.
Payment kar k screen shot lazmi send kary please.
Jazz Cash: 03046983794
Account Title: Muhammad Abdullah
$$;
