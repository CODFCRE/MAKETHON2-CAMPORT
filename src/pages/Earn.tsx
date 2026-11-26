import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bike, Camera, Check, Clock3, Coins, MapPin, Send, ShieldCheck, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { EarnDashboard, GarbageReportCategory, ReviewQueueItem } from '../features/earn/earnService';
import { earnService } from '../features/earn/earnService';
import { useUserStore } from '../store/useUserStore';

const categoryOptions: { value: GarbageReportCategory; label: string }[] = [
  { value: 'street_litter', label: 'Litter on the street' },
  { value: 'illegal_dumping', label: 'Illegal dumping' },
  { value: 'overflowing_bin', label: 'Overflowing public bin' },
  { value: 'other', label: 'Other garbage issue' },
];

const Earn: React.FC = () => {
  const { user } = useUserStore();
  const [dashboard, setDashboard] = useState<EarnDashboard | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [pageError, setPageError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  const [category, setCategory] = useState<GarbageReportCategory>('street_litter');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!user) return;
    setPageError('');
    try {
      const nextDashboard = await earnService.getDashboard(user.id);
      setDashboard(nextDashboard);
      setReviewQueue(nextDashboard.isReviewer ? await earnService.getReviewQueue(user.id) : []);
    } catch (error) {
      console.error('Unable to load earn dashboard:', error);
      setPageError(error instanceof Error ? error.message : 'Unable to load your credits and reports.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestLocation = () => {
    setPageError('');
    if (!navigator.geolocation) {
      setPageError('Location services are not available in this browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setIsLocating(false);
      },
      (error) => {
        setPageError(error.message || 'Could not get your location. Allow location access and try again.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleSubmitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !photo || !location) {
      setPageError('Add a photo and share your location before submitting.');
      return;
    }
    setIsSubmitting(true);
    setPageError('');
    try {
      await earnService.submitReport(user.id, {
        category,
        description,
        latitude: location.latitude,
        longitude: location.longitude,
        photo,
      });
      setDescription('');
      setPhoto(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setLocation(null);
      toast.success('Report submitted for review.');
      await refresh();
    } catch (error) {
      console.error('Unable to submit garbage report:', error);
      const message = error instanceof Error ? error.message : 'Could not submit the report.';
      setPageError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (reportId: string, decision: 'approved' | 'rejected') => {
    setProcessingReportId(reportId);
    setPageError('');
    try {
      await earnService.reviewReport(reportId, decision, reviewNotes[reportId] ?? '');
      toast.success(decision === 'approved' ? 'Report approved and credits awarded.' : 'Report rejected.');
      await refresh();
    } catch (error) {
      console.error('Unable to review garbage report:', error);
      const message = error instanceof Error ? error.message : 'Could not review this report.';
      setPageError(message);
      toast.error(message);
    } finally {
      setProcessingReportId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-6 bg-background px-5 pb-32 pt-5 text-on-surface lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Make your neighborhood better</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight lg:text-4xl">Earn credits</h1>
        <p className="mt-1 text-xs text-on-surface-variant lg:text-sm">Report garbage hotspots and earn credits when a report is approved.</p>
      </header>

      {pageError && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-[26px] border border-primary/20 bg-gradient-to-br from-primary/20 via-surface to-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Credit balance</p>
            <p className="mt-2 text-4xl font-black">{dashboard?.balance ?? 0}</p>
            <p className="mt-1 text-xs text-on-surface-variant">1 credit = ₹1 toward cycle rentals</p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Coins size={23} />
          </span>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2.5 text-xs font-semibold text-on-surface-variant">
          <ShieldCheck size={15} className="shrink-0 text-primary" />
          Earn 2 credits for each approved garbage report.
        </div>
      </section>

      {dashboard?.subscription && (
        <section className="ios-card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <Bike size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Cycle pass · {dashboard.subscription.plan_code}</p>
            <p className="mt-1 text-[10px] text-on-surface-variant">
              Demo access until {new Date(dashboard.subscription.ends_at).toLocaleDateString()}
            </p>
          </div>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[9px] font-black uppercase text-success">Demo</span>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <section className="ios-card p-5">
          <div className="mb-5">
            <h2 className="text-lg font-black">Report a garbage hotspot</h2>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">A photo, your location, and a short description are required. Reports are reviewed before credits are awarded.</p>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-4">
            <label className="block text-xs font-bold text-on-surface-variant">
              Issue type
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as GarbageReportCategory)}
                className="booking-field mt-2 h-12 w-full rounded-xl border border-white/10 px-3 text-sm text-on-surface outline-none"
              >
                {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="block text-xs font-bold text-on-surface-variant">
              Description
              <textarea
                required
                minLength={10}
                maxLength={1000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what you found and where it is..."
                className="booking-field mt-2 min-h-24 w-full resize-y rounded-xl border border-white/10 p-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
              />
            </label>

            <label className="block text-xs font-bold text-on-surface-variant">
              Photo evidence
              <span className="mt-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 text-sm">
                <Camera size={17} className="text-primary" />
                <span className="min-w-0 flex-1 truncate">{photo?.name ?? 'Choose JPG, PNG, or WebP · max 10 MB'}</span>
                <input
                  ref={photoInputRef}
                  required
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
              </span>
            </label>

            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Report location</p>
                  <p className="mt-0.5 truncate text-[10px] text-on-surface-variant">
                    {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Your current GPS location is required'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={isLocating}
                  className="rounded-full bg-primary/10 px-3 py-2 text-[10px] font-extrabold text-primary disabled:opacity-50"
                >
                  {isLocating ? 'Locating…' : location ? 'Update' : 'Use location'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !photo || !location}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-black text-[#191715] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {isSubmitting ? 'Submitting report…' : 'Submit for review'}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black">My reports</h2>
                <p className="mt-0.5 text-[10px] text-on-surface-variant">Credits arrive after approval</p>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant">{dashboard?.reports.length ?? 0} reports</span>
            </div>
            {dashboard?.reports.length ? (
              <div className="space-y-2.5">
                {dashboard.reports.map((report) => (
                  <article key={report.id} className="ios-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold">{categoryOptions.find((option) => option.value === report.category)?.label ?? 'Garbage report'}</p>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-on-surface-variant">{report.description}</p>
                      </div>
                      <ReportStatus status={report.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-on-surface-variant">
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      <span className={report.status === 'approved' ? 'font-bold text-success' : ''}>
                        {report.status === 'approved' ? '+2 credits' : report.status === 'pending' ? '2 credits pending' : 'No credits'}
                      </span>
                    </div>
                    {report.review_note && <p className="mt-2 rounded-lg bg-white/[0.04] px-2.5 py-2 text-[10px] text-on-surface-variant">{report.review_note}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="ios-card px-4 py-6 text-center">
                <p className="text-sm font-bold">No reports yet</p>
                <p className="mt-1 text-[10px] text-on-surface-variant">Your submitted reports and review status will appear here.</p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-black">Credit activity</h2>
              <p className="mt-0.5 text-[10px] text-on-surface-variant">Latest credits earned and used</p>
            </div>
            {dashboard?.transactions.length ? (
              <div className="ios-card divide-y divide-white/5 overflow-hidden">
                {dashboard.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${transaction.amount > 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                      {transaction.amount > 0 ? <Check size={15} /> : <Coins size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{transaction.description}</span>
                      <span className="mt-0.5 block text-[9px] text-on-surface-variant">{new Date(transaction.created_at).toLocaleString()}</span>
                    </span>
                    <span className={`text-xs font-black ${transaction.amount > 0 ? 'text-success' : 'text-on-surface'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ios-card px-4 py-5 text-center text-xs text-on-surface-variant">Your credit activity will appear here.</div>
            )}
          </section>
        </div>
      </div>

      {dashboard?.isReviewer && (
        <section className="border-t border-white/10 pt-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <div>
              <h2 className="text-lg font-black">Reviewer queue</h2>
              <p className="text-[10px] text-on-surface-variant">Approvals award credits; decisions cannot be changed.</p>
            </div>
          </div>
          {reviewQueue.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {reviewQueue.map((report) => (
                <article key={report.id} className="ios-card overflow-hidden">
                  <img src={report.evidenceUrl} alt="Garbage report evidence" className="h-48 w-full object-cover" />
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold">{categoryOptions.find((option) => option.value === report.category)?.label}</p>
                      <span className="text-[10px] text-on-surface-variant">{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs leading-5 text-on-surface-variant">{report.description}</p>
                    <p className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                      <MapPin size={12} /> {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                    </p>
                    <textarea
                      value={reviewNotes[report.id] ?? ''}
                      onChange={(event) => setReviewNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                      maxLength={500}
                      placeholder="Optional note for the user"
                      className="booking-field min-h-16 w-full resize-y rounded-xl border border-white/10 p-3 text-xs outline-none placeholder:text-on-surface-variant/60"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={processingReportId === report.id}
                        onClick={() => void handleReview(report.id, 'rejected')}
                        className="flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 text-xs font-bold text-on-surface-variant disabled:opacity-50"
                      >
                        <X size={14} /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={processingReportId === report.id}
                        onClick={() => void handleReview(report.id, 'approved')}
                        className="flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-xs font-black text-[#191715] disabled:opacity-50"
                      >
                        <Check size={14} /> Approve · +2
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ios-card flex items-center gap-3 p-4 text-xs text-on-surface-variant">
              <Clock3 size={16} /> No reports waiting for review.
            </div>
          )}
        </section>
      )}
    </div>
  );
};

const ReportStatus: React.FC<{ status: 'pending' | 'approved' | 'rejected' }> = ({ status }) => {
  const styles = {
    pending: 'bg-warning/10 text-warning',
    approved: 'bg-success/10 text-success',
    rejected: 'bg-error/10 text-error',
  }[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${styles}`}>
      {status}
    </span>
  );
};

export default Earn;
