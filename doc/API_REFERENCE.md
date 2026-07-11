# API & Server Actions Reference

Guide to server-side operations and data fetching patterns.

---

## 🔗 Server-Side Clients

### Browser Client (Client-Side)
**Location**: `lib/supabase/browser.ts`

Used in client components with `'use client'` directive.

```tsx
'use client';

import { createClient } from '@/lib/supabase/browser';
import { useEffect, useState } from 'react';

export function StudentComponent() {
  const supabase = createClient();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'active');

      if (error) console.error(error);
      else setCourses(data);
    }

    fetchCourses();
  }, [supabase]);

  return <div>{/* render courses */}</div>;
}
```

---

### Server Client (Server-Side)
**Location**: `lib/supabase/server.ts`

Used in server components, server actions, and API routes.

```tsx
// app/courses/page.tsx (server component)
import { createClient } from '@/lib/supabase/server';

export default async function CoursesPage() {
  const supabase = await createClient();
  
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'active');

  if (error) throw error;

  return (
    <div>
      {courses.map(course => (
        <div key={course.id}>{course.title}</div>
      ))}
    </div>
  );
}
```

---

### Public Client (Unauthenticated)
**Location**: `lib/supabase/public.ts`

For public data without authentication.

```tsx
import { createPublicClient } from '@/lib/supabase/public';

export async function getPublicCourses() {
  const supabase = createPublicClient();
  
  const { data } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail_url')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return data || [];
}
```

---

## 🔄 Server Actions

Server functions that can be called from client components. Defined in `actions.ts` files.

### Admin Actions
**Location**: `app/admin/actions.ts`

```tsx
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Create Course
export async function createCourse(formData: CourseInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Verify admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('courses')
    .insert([{
      title: formData.title,
      description: formData.description,
      duration_weeks: formData.weeks,
      // ... other fields
      created_by: user.id
    }])
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/admin/courses');
  return data;
}

// Grade Submission
export async function submitGrade(
  submissionId: string,
  score: number,
  feedback: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('feedback')
    .insert([{
      submission_id: submissionId,
      mentor_id: user?.id,
      score,
      feedback_text: feedback,
      submitted_at: new Date().toISOString()
    }]);

  if (error) throw error;

  revalidatePath('/admin/submissions');
  return { success: true };
}

// Update Student Status
export async function updateStudentStatus(
  studentId: string,
  enrollmentId: string,
  newStatus: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('enrollments')
    .update({ status: newStatus })
    .eq('id', enrollmentId)
    .eq('student_id', studentId);

  if (error) throw error;

  revalidatePath(`/admin/students/${studentId}`);
  return { success: true };
}
```

### Usage in Client Component
```tsx
'use client';

import { submitGrade } from '@/app/admin/actions';
import { useState } from 'react';

export function GradeForm({ submissionId }: { submissionId: string }) {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await submitGrade(submissionId, score, feedback);
      alert('Grade submitted!');
      setScore(0);
      setFeedback('');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={score}
        onChange={(e) => setScore(parseInt(e.target.value))}
        placeholder="Score (0-100)"
      />
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Feedback"
      />
      <button disabled={isLoading} type="submit">
        Submit Grade
      </button>
    </form>
  );
}
```

---

## 📡 Common Data Fetching Patterns

### Fetch with Error Handling
```tsx
// lib/utils.ts
export async function fetchWithError<T>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await promise;
  
  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message || 'Database error');
  }
  
  if (!data) {
    throw new Error('No data returned');
  }
  
  return data;
}

// Usage
const courses = await fetchWithError(
  supabase
    .from('courses')
    .select('*')
    .eq('status', 'active')
);
```

### Paginated Queries
```tsx
export async function getPaginatedCourses(
  page: number = 1,
  pageSize: number = 10
) {
  const supabase = createPublicClient();
  
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data: courses, count } = await supabase
    .from('courses')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .range(start, end)
    .order('created_at', { ascending: false });

  return {
    courses: courses || [],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
    currentPage: page
  };
}
```

### Filtered and Sorted Queries
```tsx
export async function searchCourses(
  searchTerm: string,
  difficulty: string,
  sortBy: 'popularity' | 'newest' | 'title' = 'newest'
) {
  const supabase = createPublicClient();
  
  let query = supabase
    .from('courses')
    .select('*')
    .eq('status', 'active');

  if (searchTerm) {
    query = query.ilike('title', `%${searchTerm}%`);
  }

  if (difficulty) {
    query = query.eq('difficulty_level', difficulty);
  }

  // Sort
  if (sortBy === 'popularity') {
    query = query.order('popularity_score', { ascending: false });
  } else if (sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'title') {
    query = query.order('title', { ascending: true });
  }

  const { data } = await query;
  return data || [];
}
```

### Real-time Subscription
```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function RealtimeProgress({ enrollmentId }: { enrollmentId: string }) {
  const supabase = createClient();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    // Subscribe to changes
    const subscription = supabase
      .from('progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'progress',
          filter: `enrollment_id=eq.${enrollmentId}`
        },
        (payload) => {
          setProgress(payload.new);
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [enrollmentId, supabase]);

  return <div>{/* render progress */}</div>;
}
```

---

## 🔐 Authenticated Queries

### Get Current User
```tsx
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  return user;
}
```

### Get User Profile
```tsx
export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}
```

### Check User Role
```tsx
export async function checkAdminRole(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}
```

---

## 📊 Complex Queries

### Student Progress with Enrollments
```tsx
export async function getStudentProgressReport(studentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      course_id,
      status,
      progress_percentage,
      start_date,
      completion_date,
      courses (
        title,
        duration_weeks
      ),
      progress (
        average_score,
        tasks_completed,
        tasks_total
      )
    `)
    .eq('student_id', studentId);

  if (error) throw error;
  return data;
}
```

### Course Analytics
```tsx
export async function getCourseAnalytics(courseId: string) {
  const supabase = await createClient();

  // Total enrollments
  const { count: enrollmentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  // Completions
  const { count: completionCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'completed');

  // Average score
  const { data: scoreData } = await supabase
    .rpc('get_course_average_score', { course_id: courseId });

  return {
    totalEnrolled: enrollmentCount || 0,
    completed: completionCount || 0,
    completionRate: completionCount && enrollmentCount 
      ? (completionCount / enrollmentCount * 100).toFixed(2)
      : 0,
    averageScore: scoreData?.avg_score || 0
  };
}
```

---

## ⚡ Performance Optimization

### Select Only Needed Fields
```tsx
// ❌ Fetches all columns
const { data } = await supabase
  .from('users')
  .select('*');

// ✅ Only what you need
const { data } = await supabase
  .from('users')
  .select('id, email, full_name, role');
```

### Use Limit and Range
```tsx
// ❌ Fetches all records
const { data } = await supabase
  .from('submissions')
  .select('*');

// ✅ Paginated
const { data } = await supabase
  .from('submissions')
  .select('*')
  .range(0, 9)  // First 10 records
  .order('created_at', { ascending: false });
```

### Cache with revalidatePath
```tsx
import { revalidatePath } from 'next/cache';

export async function updateCourse(courseId: string, updates: object) {
  // ... update logic
  
  // Revalidate related pages
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath(`/courses/${courseId}`);
}
```

---

## 🛡️ Error Handling

### Consistent Error Pattern
```tsx
export async function safeFetch<T>(
  operation: Promise<{ data: T | null; error: any }>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const { data, error } = await operation;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Usage
const result = await safeFetch(
  supabase.from('courses').select('*')
);

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

---

## 🔄 Mutations

### Insert
```tsx
export async function submitTask(
  taskId: string,
  studentId: string,
  content: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('submissions')
    .insert([{
      task_id: taskId,
      student_id: studentId,
      submission_content: content,
      submitted_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Update
```tsx
export async function updateProfile(userId: string, updates: Partial<User>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Delete
```tsx
export async function deleteCourse(courseId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) throw error;
  return { success: true };
}
```

---

## 📋 Utility Functions

**Location**: `lib/utils.ts`

Common helpers:
```tsx
// Type utilities
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Date utilities
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

// Array utilities
export function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

// String utilities
export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Class merging
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

---

See [DATABASE.md](DATABASE.md) for schema details and [ADMIN_FEATURES.md](ADMIN_FEATURES.md) for admin operations.
