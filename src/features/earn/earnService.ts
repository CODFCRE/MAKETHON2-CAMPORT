import { supabase } from '../../lib/supabaseClient';
import type { Booking } from '../../types/booking';

export type GarbageReportCategory =
  | 'street_litter'
  | 'illegal_dumping'
  | 'overflowing_bin'
  | 'other';

export type GarbageReportStatus = 'pending' | 'approved' | 'rejected';

export interface GarbageReport {
  id: string;
  category: GarbageReportCategory;
  description: string;
  latitude: number;
  longitude: number;
  evidence_path: string;
  status: GarbageReportStatus;
  reward_credits: number;
  review_note: string | null;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  reason: 'garbage_report_approved' | 'cycle_rental';
  description: string;
  created_at: string;
}

export interface CycleSubscription {
  id: string;
  plan_code: 'starter' | 'plus';
  price_inr: number;
  starts_at: string;
  ends_at: string;
}

export interface EarnDashboard {
  balance: number;
  transactions: CreditTransaction[];
  reports: GarbageReport[];
  isReviewer: boolean;
  subscription: CycleSubscription | null;
}

export interface ReportSubmission {
  category: GarbageReportCategory;
  description: string;
  latitude: number;
  longitude: number;
  photo: File;
}

export interface ReviewQueueItem extends GarbageReport {
  evidenceUrl: string;
}

export interface CycleRentalResult {
  booking_id: string;
  billing_source: 'credits' | 'subscription';
  credits_charged: number;
  balance: number;
  rental_hours: number;
}

const REPORT_FIELDS =
  'id, category, description, latitude, longitude, evidence_path, status, reward_credits, review_note, created_at';

const throwIfError = (error: { message: string } | null): void => {
  if (error) throw new Error(error.message);
};

export const earnService = {
  async getDashboard(userId: string): Promise<EarnDashboard> {
    const [wallet, transactions, reports, reviewer, subscription] = await Promise.all([
      supabase.from('credit_wallets').select('balance').eq('user_id', userId).single(),
      supabase
        .from('credit_transactions')
        .select('id, amount, reason, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('garbage_reports')
        .select(REPORT_FIELDS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.rpc('is_garbage_report_reviewer'),
      this.getActiveSubscription(userId),
    ]);

    throwIfError(wallet.error);
    throwIfError(transactions.error);
    throwIfError(reports.error);
    throwIfError(reviewer.error);
    if (!wallet.data) throw new Error('Credit wallet was not found. Please contact support.');

    return {
      balance: wallet.data.balance,
      transactions: (transactions.data ?? []) as CreditTransaction[],
      reports: (reports.data ?? []) as GarbageReport[],
      isReviewer: reviewer.data === true,
      subscription,
    };
  },

  async getActiveSubscription(userId: string): Promise<CycleSubscription | null> {
    const { data, error } = await supabase
      .from('cycle_subscriptions')
      .select('id, plan_code, price_inr, starts_at, ends_at')
      .eq('user_id', userId)
      .eq('status', 'demo_active')
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfError(error);
    return data as CycleSubscription | null;
  },

  async submitReport(userId: string, submission: ReportSubmission): Promise<void> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024;
    if (!allowedTypes.includes(submission.photo.type)) {
      throw new Error('Choose a JPG, PNG, or WebP photo.');
    }
    if (submission.photo.size > maxSizeBytes) {
      throw new Error('The photo must be 10 MB or smaller.');
    }

    const extension = submission.photo.type.split('/')[1].replace('jpeg', 'jpg');
    const evidencePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const storage = supabase.storage.from('garbage-report-evidence');
    const { error: uploadError } = await storage.upload(evidencePath, submission.photo, {
      contentType: submission.photo.type,
      upsert: false,
    });
    throwIfError(uploadError);

    const { error: insertError } = await supabase.from('garbage_reports').insert({
      category: submission.category,
      description: submission.description.trim(),
      latitude: submission.latitude,
      longitude: submission.longitude,
      evidence_path: evidencePath,
    });

    if (insertError) {
      const { error: cleanupError } = await storage.remove([evidencePath]);
      if (cleanupError) {
        console.error('Unable to remove unlinked report evidence:', cleanupError);
      }
      throw new Error(insertError.message);
    }
  },

  async getReviewQueue(reviewerId: string): Promise<ReviewQueueItem[]> {
    const { data, error } = await supabase
      .from('garbage_reports')
      .select(REPORT_FIELDS)
      .eq('status', 'pending')
      .neq('user_id', reviewerId)
      .order('created_at', { ascending: true });
    throwIfError(error);

    return await Promise.all(
      ((data ?? []) as GarbageReport[]).map(async (report) => {
        const { data: signedUrl, error: signedUrlError } = await supabase.storage
          .from('garbage-report-evidence')
          .createSignedUrl(report.evidence_path, 300);
        throwIfError(signedUrlError);
        if (!signedUrl) throw new Error('Could not create an evidence preview link.');
        return { ...report, evidenceUrl: signedUrl.signedUrl };
      }),
    );
  },

  async reviewReport(reportId: string, decision: 'approved' | 'rejected', reviewNote: string): Promise<void> {
    const { error } = await supabase.rpc('review_garbage_report', {
      p_report_id: reportId,
      p_decision: decision,
      p_review_note: reviewNote.trim() || null,
    });
    throwIfError(error);
  },

  async activateDemoSubscription(planCode: 'starter' | 'plus'): Promise<void> {
    const { error } = await supabase.rpc('activate_demo_cycle_subscription', {
      p_plan_code: planCode,
    });
    throwIfError(error);
  },

  async bookCycleRental(pickupLocation: string, rentalHours: number): Promise<CycleRentalResult> {
    const { data, error } = await supabase.rpc('create_cycle_rental', {
      p_pickup_location: pickupLocation,
      p_rental_hours: rentalHours,
    });
    throwIfError(error);
    return data as CycleRentalResult;
  },

  async getCycleRentalBookings(userId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('rent_bookings')
      .select('id, pickup_location, rental_hours, estimated_total, credits_charged, billing_source, created_at')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });
    throwIfError(error);

    return (data ?? []).map((rental) => ({
      id: rental.id,
      serviceId: 'cycle-rental',
      serviceName: 'Cycle rental',
      type: 'rent',
      amount: Number(rental.estimated_total),
      quantity: rental.rental_hours,
      pickup: rental.pickup_location,
      destination: '',
      fulfillment: 'rental',
      status: 'Requested',
      createdAt: rental.created_at,
      billingSource: rental.billing_source as 'credits' | 'subscription',
      creditsCharged: rental.credits_charged,
    }));
  },
};
