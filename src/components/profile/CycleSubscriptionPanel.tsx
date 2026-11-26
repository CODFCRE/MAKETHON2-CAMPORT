import React, { useEffect, useState } from 'react';
import { Bike, Check, Clock3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { earnService, type CycleSubscription } from '../../features/earn/earnService';
import { useUserStore } from '../../store/useUserStore';

const plans = [
  {
    code: 'starter' as const,
    name: 'Starter',
    price: 199,
    rentals: 'Up to 2 rentals per day',
    hours: '2 rental hours per day',
  },
  {
    code: 'plus' as const,
    name: 'Plus',
    price: 299,
    rentals: 'Up to 4 rentals per day',
    hours: '4 rental hours per day',
  },
];

const CycleSubscriptionPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [subscription, setSubscription] = useState<CycleSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [activatingPlan, setActivatingPlan] = useState<'starter' | 'plus' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsLoading(false);
      setSubscription(null);
      return;
    }

    setIsLoading(true);
    earnService.getActiveSubscription(user.id)
      .then((result) => {
        if (active) {
          setSubscription(result);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        console.error('Unable to load cycle subscription:', loadError);
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load cycle plans.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const activatePlan = async (planCode: 'starter' | 'plus') => {
    setActivatingPlan(planCode);
    setError('');
    try {
      await earnService.activateDemoSubscription(planCode);
      toast.success('Demo cycle pass activated. No payment was taken.');
      if (user) {
        try {
          setSubscription(await earnService.getActiveSubscription(user.id));
        } catch (refreshError) {
          console.error('Demo pass activated, but profile could not refresh:', refreshError);
          setError('Demo pass activated, but its status could not be refreshed. Reload the page.');
        }
      }
    } catch (activationError) {
      console.error('Unable to activate demo cycle plan:', activationError);
      const message = activationError instanceof Error ? activationError.message : 'Could not activate this demo plan.';
      setError(message);
      toast.error(message);
    } finally {
      setActivatingPlan(null);
    }
  };

  return (
    <section className="ios-card mx-5 mt-5 overflow-hidden lg:mx-0">
      <div className="flex items-start gap-3 border-b border-white/5 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bike size={19} />
        </span>
        <div>
          <h2 className="text-base font-black">Cycle subscription</h2>
          <p className="mt-1 text-[10px] leading-4 text-on-surface-variant">
            Three-month demo passes include daily rental time. No real payment is processed.
          </p>
        </div>
      </div>

      <div className="p-5">
        {error && <p role="alert" className="mb-4 rounded-xl bg-error/10 px-3 py-2 text-xs text-error">{error}</p>}

        {!user ? (
          <div>
            <p className="text-xs text-on-surface-variant">Sign in to activate a demo pass and save it to your profile.</p>
            <button type="button" onClick={() => navigate('/login')} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-black text-[#191715]">
              Sign in
            </button>
          </div>
        ) : isLoading ? (
          <p className="text-xs text-on-surface-variant">Loading your cycle pass…</p>
        ) : subscription ? (
          <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-success">Active demo pass</p>
                <p className="mt-1 text-lg font-black">{subscription.plan_code === 'starter' ? 'Starter' : 'Plus'} · ₹{subscription.price_inr}</p>
              </div>
              <Check size={19} className="text-success" />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-on-surface-variant">
              <Clock3 size={12} /> Expires {new Date(subscription.ends_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => (
              <article key={plan.code} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-black">{plan.name}</h3>
                  <p className="text-xl font-black text-primary">₹{plan.price}<span className="ml-1 text-[9px] font-semibold text-on-surface-variant">/ 3 months</span></p>
                </div>
                <p className="mt-3 text-[10px] font-semibold text-on-surface-variant">{plan.rentals}</p>
                <p className="mt-1 text-[10px] font-semibold text-on-surface-variant">{plan.hours}</p>
                <button
                  type="button"
                  disabled={!user || activatingPlan !== null}
                  onClick={() => void activatePlan(plan.code)}
                  className="mt-4 h-10 w-full rounded-full bg-primary text-xs font-black text-[#191715] disabled:opacity-50"
                >
                  {activatingPlan === plan.code ? 'Activating…' : `Try ${plan.name} demo`}
                </button>
              </article>
            ))}
          </div>
        )}

        <p className="mt-4 text-[9px] leading-4 text-on-surface-variant">
          Rentals beyond the included daily pass allowance cost 40 credits per hour. Credits cannot be used to buy subscriptions.
        </p>
      </div>
    </section>
  );
};

export default CycleSubscriptionPanel;
