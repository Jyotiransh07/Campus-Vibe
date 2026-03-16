import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Users, Clock, AlertCircle } from 'lucide-react';
import { EventSlot } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SlotBookingProps {
  slots: EventSlot[];
  onBook: (slotId: number) => Promise<void>;
  isBooking: boolean;
}

export const SlotBooking: React.FC<SlotBookingProps> = ({ slots, onBook, isBooking }) => {
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleBookClick = async () => {
    if (selectedSlotId === null) return;
    try {
      await onBook(selectedSlotId);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 bg-white rounded-2xl border border-black/5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-zinc-900">Select a Time Slot</h3>
        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-100 border border-zinc-200" />
            <span>Full</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((slot) => {
          const isFull = slot.available_seats <= 0;
          const isSelected = selectedSlotId === slot.id;

          return (
            <button
              key={slot.id}
              disabled={isFull || isBooking}
              onClick={() => setSelectedSlotId(slot.id)}
              className={cn(
                "relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200 text-left group",
                isFull 
                  ? "bg-zinc-50 border-zinc-100 opacity-60 cursor-not-allowed" 
                  : isSelected
                    ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                    : "bg-white border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/30"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2 text-zinc-900 font-medium">
                  <Clock className={cn("w-4 h-4", isSelected ? "text-emerald-600" : "text-zinc-400")} />
                  <span>{slot.start_time} - {slot.end_time}</span>
                </div>
                {isSelected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="w-5 h-5 text-emerald-600" />
                  </motion.div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className={cn("w-4 h-4", isSelected ? "text-emerald-600" : "text-zinc-400")} />
                <span className={cn(
                  "font-medium",
                  isFull ? "text-zinc-400" : isSelected ? "text-emerald-700" : "text-zinc-600"
                )}>
                  {isFull ? "No seats left" : `${slot.available_seats} seats remaining`}
                </span>
              </div>

              {/* Progress bar for seats */}
              {!isFull && (
                <div className="w-full h-1 bg-zinc-100 rounded-full mt-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(slot.available_seats / slot.total_seats) * 100}%` }}
                    className={cn(
                      "h-full rounded-full",
                      isSelected ? "bg-emerald-500" : "bg-emerald-400"
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        <button
          disabled={selectedSlotId === null || isBooking}
          onClick={handleBookClick}
          className={cn(
            "w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20",
            selectedSlotId === null || isBooking
              ? "bg-zinc-300 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
          )}
        >
          {isBooking ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Confirm Booking</>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl z-50"
          >
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">Booking confirmed successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
