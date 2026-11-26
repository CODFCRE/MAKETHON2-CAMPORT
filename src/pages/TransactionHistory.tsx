import React from 'react';
import { History, Download, ArrowUpRight, ArrowDownLeft, Filter, Wallet } from 'lucide-react';
import { cn } from '../utils/helpers';

const TransactionHistory: React.FC = () => {
  const transactions = [
    { id: 'TX-9021', type: 'purchase', title: 'Logo Design Project', amount: '₹1,200', date: 'Oct 24, 2024', status: 'Completed' },
    { id: 'TX-8842', type: 'payout', title: 'Weekly Earnings Withdrawal', amount: '₹4,500', date: 'Oct 20, 2024', status: 'Processing' },
    { id: 'TX-7531', type: 'purchase', title: 'React Performance Audit', amount: '₹5,000', date: 'Oct 15, 2024', status: 'Completed' },
    { id: 'TX-6420', type: 'purchase', title: 'UI Kit Implementation', amount: '₹800', date: 'Oct 12, 2024', status: 'Cancelled' },
  ];

  return (
    <div className="pt-24 pb-32 max-w-screen-md mx-auto px-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-on-surface tracking-tighter">Finances</h1>
            <p className="text-on-surface-variant text-sm font-medium opacity-60 uppercase tracking-widest">Transaction History</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-white/5">
             <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
                <Wallet size={20} />
             </div>
             <div className="pr-4">
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest leading-none">Balance</p>
                <p className="text-lg font-black text-white">₹12,450.00</p>
             </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 overflow-x-auto no-scrollbar">
         {['All', 'Purchases', 'Payouts', 'Refunds'].map((f, i) => (
           <button key={i} className={cn(
             "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
             i === 0 ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10"
           )}>
             {f}
           </button>
         ))}
         <button className="ml-auto p-2 text-zinc-500 hover:text-white transition-colors">
            <Filter size={18} />
         </button>
      </div>

      <div className="space-y-4">
        {transactions.map((tx) => (
          <div key={tx.id} className="group bg-surface-container-low rounded-[2rem] p-6 border border-white/5 hover:bg-surface-container-highest transition-all flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                tx.type === 'purchase' ? "bg-error/10 text-error" : "bg-green-500/10 text-green-500"
              )}>
                {tx.type === 'purchase' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{tx.title}</span>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-tighter">{tx.id} • {tx.date}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "text-lg font-black tracking-tighter",
                tx.type === 'purchase' ? "text-white" : "text-green-500"
              )}>
                {tx.type === 'purchase' ? '-' : '+'}{tx.amount}
              </span>
              <span className={cn(
                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                tx.status === 'Completed' ? "bg-green-500/10 text-green-500" :
                tx.status === 'Processing' ? "bg-primary/10 text-primary animate-pulse" :
                "bg-zinc-800 text-zinc-500"
              )}>
                {tx.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 py-8 border-t border-white/5 flex items-center justify-between">
         <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40">Export data for tax filing</p>
         <button className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:underline transition-all">
            <Download size={14} /> Download PDF Statement
         </button>
      </div>
    </div>
  );
};

export default TransactionHistory;
