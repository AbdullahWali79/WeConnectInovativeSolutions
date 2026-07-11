// Standalone Test Script for Student Portal Task Submissions and Screenshot Uploads
// Run with: npx tsx lib/test-task-submissions.ts

import * as assert from "assert";

// Core logic functions to test
export function validateScreenshotsCount(count: number): { valid: boolean; error?: string } {
  if (count === 0) {
    return { valid: false, error: "Please upload at least 1 screenshot." };
  }
  if (count > 5) {
    return { valid: false, error: "You can upload up to 5 screenshots." };
  }
  return { valid: true };
}

export function validateScreenshotFile(filename: string, sizeBytes: number): { valid: boolean; error?: string } {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const allowed = ["jpg", "jpeg", "png", "webp"];
  if (!allowed.includes(ext)) {
    return { valid: false, error: "Invalid file type. Only jpg, jpeg, png, webp are allowed." };
  }
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (sizeBytes > maxBytes) {
    return { valid: false, error: "File size too large. Maximum size is 5MB." };
  }
  return { valid: true };
}

export function isTaskEditable(taskStatus: string): { editable: boolean; error?: string } {
  if (taskStatus === "reviewed") {
    return { editable: false, error: "Accepted tasks cannot be edited." };
  }
  return { editable: true };
}

// Database schema / metadata mapping validator
export function validateScreenshotMetadata(meta: {
  id?: string;
  task_submission_id: string;
  student_id: string;
  task_id: string;
  github_url: string;
  cdn_url: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
}) {
  assert.ok(meta.task_submission_id, "Missing task_submission_id");
  assert.ok(meta.student_id, "Missing student_id");
  assert.ok(meta.task_id, "Missing task_id");
  assert.ok(meta.github_url.startsWith("https://github.com"), "github_url must point to GitHub");
  assert.ok(meta.cdn_url, "Missing cdn_url");
  assert.ok(meta.original_filename, "Missing original_filename");
  assert.ok(meta.file_size > 0, "file_size must be positive");
  assert.ok(["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(meta.mime_type), "Invalid mime_type");
}

function runTests() {
  console.log("=== RUNNING TASK SUBMISSION & EDITING TESTS ===");

  // 1. Screenshot count checks
  console.log("Testing screenshot count validation...");
  assert.deepStrictEqual(validateScreenshotsCount(0), { valid: false, error: "Please upload at least 1 screenshot." });
  assert.deepStrictEqual(validateScreenshotsCount(1), { valid: true });
  assert.deepStrictEqual(validateScreenshotsCount(5), { valid: true });
  assert.deepStrictEqual(validateScreenshotsCount(6), { valid: false, error: "You can upload up to 5 screenshots." });
  console.log("✅ Screenshot count validations passed!");

  // 2. File size & format checks
  console.log("Testing file type and size validation...");
  assert.deepStrictEqual(validateScreenshotFile("image.jpg", 1024), { valid: true });
  assert.deepStrictEqual(validateScreenshotFile("screenshot.PNG", 4 * 1024 * 1024), { valid: true });
  assert.deepStrictEqual(validateScreenshotFile("doc.pdf", 1024), { valid: false, error: "Invalid file type. Only jpg, jpeg, png, webp are allowed." });
  assert.deepStrictEqual(validateScreenshotFile("large.png", 6 * 1024 * 1024), { valid: false, error: "File size too large. Maximum size is 5MB." });
  console.log("✅ File type and size validations passed!");

  // 3. Task edit lock checks
  console.log("Testing task edit locks...");
  assert.deepStrictEqual(isTaskEditable("pending"), { editable: true });
  assert.deepStrictEqual(isTaskEditable("submitted"), { editable: true });
  assert.deepStrictEqual(isTaskEditable("revision_required"), { editable: true });
  assert.deepStrictEqual(isTaskEditable("reviewed"), { editable: false, error: "Accepted tasks cannot be edited." });
  console.log("✅ Task edit lock validations passed!");

  // 4. Metadata verification
  console.log("Testing screenshot database metadata mapping...");
  const validMeta = {
    task_submission_id: "7db8e82d-1144-4861-bf99-8ea873db8741",
    student_id: "aa83dba2-b60b-462d-8776-626dcd8283e1",
    task_id: "b218e82d-1144-4861-bf99-8ea873db8742",
    github_url: "https://github.com/owner/repo/blob/main/screenshot.png",
    cdn_url: "https://cdn.jsdelivr.net/gh/owner/repo@main/screenshot.png",
    original_filename: "screenshot.png",
    file_size: 2048,
    mime_type: "image/png",
  };
  validateScreenshotMetadata(validMeta);
  console.log("✅ Screenshot database metadata validations passed!");

  console.log("=== ALL TESTS PASSED SUCCESSFULLY ===");
}

runTests();
