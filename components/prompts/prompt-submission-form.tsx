"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Toast, type ToastState } from "@/components/toast";
import { lookupSubmitterProfile, submitPublicPrompt, uploadPromptImage } from "@/app/prompts/submit/actions";

const POPULAR_CATEGORIES = [
  "Image Generation",
  "Writing & Copywriting",
  "Social Media",
  "Web Development",
  "Marketing & Ads",
  "Coding & Dev",
  "AI Chatbots",
  "Education",
];

const POPULAR_MODELS = [
  "ChatGPT",
  "Midjourney",
  "Gemini",
  "Claude",
  "Flux",
  "Ideogram",
  "DALL-E 3",
  "Leonardo AI",
];

export function PromptSubmissionForm() {
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  // Student Identity
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [isKnownSubmitter, setIsKnownSubmitter] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Prompt Fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Image Generation");
  const [customCategory, setCustomCategory] = useState("");
  const [model, setModel] = useState("ChatGPT");
  const [customModel, setCustomModel] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");

  // Media (Images)
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDriveInput, setShowDriveInput] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success State
  const [submittedPrompt, setSubmittedPrompt] = useState<{
    id: string;
    title: string;
    studentName: string;
  } | null>(null);

  // Load saved student identity from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("weconnect_submitter_info");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.name) {
          setFullName(parsed.name);
          setIsKnownSubmitter(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Check phone number on change/blur
  const handlePhoneBlur = async (inputPhone: string) => {
    const digits = inputPhone.replace(/\D/g, "");
    if (digits.length < 9) return;

    setCheckingPhone(true);
    const res = await lookupSubmitterProfile(inputPhone);
    setCheckingPhone(false);

    if (res.success && res.found && res.name) {
      setFullName(res.name);
      setIsKnownSubmitter(true);
      try {
        localStorage.setItem("weconnect_submitter_info", JSON.stringify({ phone: inputPhone, name: res.name }));
      } catch {
        // ignore
      }
    }
  };

  // Image Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaUrls.length + files.length > 6) {
      setToast({ type: "error", message: "You can upload a maximum of 6 images." });
      return;
    }

    setUploadingImage(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadPromptImage(formData);
      if (res.success && res.url) {
        newUrls.push(res.url);
      } else {
        setToast({ type: "error", message: res.error || `Failed to upload ${file.name}` });
      }
    }

    setMediaUrls((prev) => [...prev, ...newUrls]);
    setUploadingImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMediaUrl = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addDriveUrl = () => {
    if (!driveUrlInput.trim()) return;
    if (mediaUrls.length >= 6) {
      setToast({ type: "error", message: "Maximum 6 output previews allowed." });
      return;
    }
    setMediaUrls((prev) => [...prev, driveUrlInput.trim()]);
    setDriveUrlInput("");
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveCategory = category === "Other" ? customCategory.trim() : category;
    const effectiveModel = model === "Other" ? customModel.trim() : model;

    if (!fullName.trim()) {
      setToast({ type: "error", message: "Please enter your full name." });
      return;
    }
    if (!phone.trim()) {
      setToast({ type: "error", message: "Please enter your WhatsApp / phone number." });
      return;
    }
    if (!effectiveCategory) {
      setToast({ type: "error", message: "Please select or specify a category." });
      return;
    }
    if (!effectiveModel) {
      setToast({ type: "error", message: "Please select or specify the AI model." });
      return;
    }
    if (mediaUrls.length === 0) {
      setToast({ type: "error", message: "Please upload at least one image/screenshot preview of your prompt output." });
      return;
    }

    startTransition(async () => {
      const res = await submitPublicPrompt({
        fullName,
        phone,
        title,
        category: effectiveCategory,
        model: effectiveModel,
        description,
        template,
        mediaUrls,
      });

      if (res.success && res.id) {
        // Save identity in localStorage for future visits
        try {
          localStorage.setItem("weconnect_submitter_info", JSON.stringify({ phone, name: fullName }));
        } catch {
          // ignore
        }

        setSubmittedPrompt({
          id: res.id,
          title,
          studentName: fullName,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setToast({ type: "error", message: res.error || "Submission failed." });
      }
    });
  };

  const handleResetForAnotherPrompt = () => {
    setTitle("");
    setDescription("");
    setTemplate("");
    setMediaUrls([]);
    setSubmittedPrompt(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submittedPrompt) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-10 shadow-xl text-center space-y-6 max-w-2xl mx-auto">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl">
          <Icon name="check_circle" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Submission Received!
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">
            Thank you, {submittedPrompt.studentName}!
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
            Your prompt <span className="font-bold text-gray-900">&ldquo;{submittedPrompt.title}&rdquo;</span> has been sent to our admin team for review. It will be published to the prompt library shortly.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handleResetForAnotherPrompt}
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-blue-800 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Icon name="add" className="text-lg" />
            Submit Another Prompt
          </button>
          <Link
            href="/prompts"
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="arrow_back" className="text-lg" />
            Back to Prompt Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Toast toast={toast} onClear={() => setToast(null)} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student / Contributor Identity Section */}
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Icon name="account_circle" className="text-primary text-xl" />
                Contributor Information
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Apna phone number aur name darj karein. Next time aap ko apna name dobara likhna nahi parega.
              </p>
            </div>
            {isKnownSubmitter && (
              <span className="shrink-0 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Icon name="verified" className="text-xs" /> Recognized
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Phone / WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={(e) => handlePhoneBlur(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                />
                {checkingPhone && (
                  <span className="absolute right-3 top-3 text-xs text-gray-400 flex items-center gap-1">
                    <Icon name="sync" className="animate-spin text-sm" /> Checking...
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
          </div>

          {isKnownSubmitter && (
            <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <Icon name="waving_hand" className="text-sm" />
              Welcome back, <span className="font-bold">{fullName}</span>! You can share multiple prompts under this profile anytime.
            </p>
          )}
        </div>

        {/* Prompt Information Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 space-y-5 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Icon name="auto_awesome" className="text-amber-500 text-xl" />
            Prompt Details
          </h3>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Prompt Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modern Logo Generator for Tech Startups"
              className="w-full h-11 rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    category === cat
                      ? "bg-primary text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCategory("Other")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  category === "Other"
                    ? "bg-primary text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Other...
              </button>
            </div>
            {category === "Other" && (
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category..."
                className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3.5 text-xs text-gray-900 outline-none focus:border-primary"
              />
            )}
          </div>

          {/* AI Model */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Target AI Model <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {POPULAR_MODELS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    model === m
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {m}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setModel("Other")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  model === "Other"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Other...
              </button>
            </div>
            {model === "Other" && (
              <input
                type="text"
                required
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Enter AI model name (e.g. Mistral, DeepSeek)..."
                className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3.5 text-xs text-gray-900 outline-none focus:border-primary"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this prompt creates, who it is for, and any special tips..."
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs resize-none"
            />
          </div>

          {/* Template Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Prompt Text / Template <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-primary font-semibold">
                Use &#123;&#123;variable&#125;&#125; for dynamic fields
              </span>
            </div>
            <textarea
              required
              minLength={15}
              rows={5}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="e.g. Create a vector logo for {{BrandName}}, in the style of {{Style}} with a {{ColorTheme}} palette."
              className="w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-xs text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs resize-none"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Tip: Jo cheez user badal sake usay double curly braces mein likhein (e.g., <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">&#123;&#123;Topic&#125;&#125;</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">&#123;&#123;StudentName&#125;&#125;</code>).
            </p>
          </div>
        </div>

        {/* Output Previews / Image Upload Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Icon name="image" className="text-emerald-600 text-xl" />
                Prompt Output Images / Previews <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                AI se banai hui output images/screenshots upload karein (1 to 6 images). Ye automatically public viewable hongi.
              </p>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              {mediaUrls.length} / 6
            </span>
          </div>

          {/* Upload Button & Area */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="prompt-image-upload"
            />
            <label
              htmlFor="prompt-image-upload"
              className={`w-full sm:w-auto px-5 py-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                uploadingImage || mediaUrls.length >= 6 ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Icon name={uploadingImage ? "sync" : "cloud_upload"} className={`text-lg ${uploadingImage ? "animate-spin" : ""}`} />
              {uploadingImage ? "Uploading images..." : "Upload Screenshots / Images"}
            </label>

            <button
              type="button"
              onClick={() => setShowDriveInput((prev) => !prev)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline cursor-pointer"
            >
              {showDriveInput ? "Hide Google Drive input" : "Or paste Google Drive link"}
            </button>
          </div>

          {/* Optional Drive link input */}
          {showDriveInput && (
            <div className="flex gap-2">
              <input
                type="url"
                value={driveUrlInput}
                onChange={(e) => setDriveUrlInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view"
                className="flex-1 h-10 rounded-xl border border-gray-300 bg-white px-3 text-xs text-gray-900 outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={addDriveUrl}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Add Link
              </button>
            </div>
          )}

          {/* Preview Grid */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {mediaUrls.map((url, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeMediaUrl(i)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                      title="Remove image"
                    >
                      <Icon name="delete" className="text-sm" />
                      Remove
                    </button>
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded font-mono">
                    Image {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || uploadingImage}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-blue-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icon name={isPending ? "sync" : "send"} className={isPending ? "animate-spin text-lg" : "text-lg"} />
          {isPending ? "Submitting Prompt..." : "Submit Prompt for Review"}
        </button>
      </form>
    </div>
  );
}
