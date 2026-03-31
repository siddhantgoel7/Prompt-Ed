'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/hooks/useAccount';
import { ConfirmDeleteDialog } from '@/components/instructor/ConfirmDeleteDialog';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, LogOut, Trash2 } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const account = useAccount();

  if (account.loading) {
    return <LoadingScreen />;
  }

  const fullName = account.user?.user_metadata?.full_name || 'Instructor';
  const email = account.user?.email || 'N/A';

  return (
    <div className="min-h-screen bg-surface-base">
      <header className="glass sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <AppLogo size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-10 md:px-8 md:py-16">
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/instructor_dashboard')}
              className="p-2 transition-colors duration-150 rounded-full hover:bg-surface-raised text-content-secondary"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-content-primary">Your Account</h1>
          </div>

          <div className="rounded-[20px] bg-surface-raised border border-line-default p-8 shadow-sm">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-brand-50 text-brand-500 mb-2">
                <User size={48} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-content-primary">{fullName}</h2>
                <p className="text-content-muted">{email}</p>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-4">
              <Button
                onClick={account.handleLogout}
                disabled={account.loggingOut || account.deleting}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 py-6 rounded-xl border-line-default text-content-secondary hover:bg-surface-base transition-all duration-150"
              >
                <LogOut className="w-5 h-5" />
                {account.loggingOut ? 'Logging out...' : 'Log Out'}
              </Button>

              <div className="py-2 flex items-center gap-3">
                <div className="flex-1 h-px bg-line-default" />
                <span className="text-xs font-medium text-content-muted uppercase tracking-wider">Danger Zone</span>
                <div className="flex-1 h-px bg-line-default" />
              </div>

              <Button
                onClick={() => account.setShowDeleteConfirm(true)}
                disabled={account.loggingOut || account.deleting}
                className="w-full flex items-center justify-center gap-2 py-6 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all duration-150 shadow-none font-semibold"
              >
                <Trash2 className="w-5 h-5" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </main>

      <ConfirmDeleteDialog
        open={account.showDeleteConfirm}
        onOpenChange={account.setShowDeleteConfirm}
        title="Delete Account?"
        description={
          <div className="space-y-4">
            <p className="text-content-secondary">
              Are you sure you want to delete your account? This action is permanent and will delete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-content-secondary pl-2">
              <li>All your courses and lessons</li>
              <li>All discussion records and responses</li>
              <li>Your AI preferences and settings</li>
            </ul>
            <p className="font-bold text-red-600">This action cannot be undone.</p>
          </div>
        }
        error={account.error}
        deleting={account.deleting}
        onCancel={() => account.setShowDeleteConfirm(false)}
        onConfirm={account.handleDeleteAccount}
      />
    </div>
  );
}
