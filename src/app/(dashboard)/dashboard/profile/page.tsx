"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Profile</h1>
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm w-full max-w-md">
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-slate-500">Ship name</dt>
            <dd className="text-slate-900 font-medium">{user?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Login ID</dt>
            <dd className="text-slate-900">{user?.login_id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Role</dt>
            <dd className="text-slate-900 capitalize">{user?.role ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
