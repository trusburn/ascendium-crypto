-- Add foreign key relationships
ALTER TABLE public.purchased_signals 
ADD CONSTRAINT fk_purchased_signals_signal 
FOREIGN KEY (signal_id) REFERENCES public.signals(id);

ALTER TABLE public.trades 
ADD CONSTRAINT fk_trades_signal 
FOREIGN KEY (signal_id) REFERENCES public.signals(id);

ALTER TABLE public.trades 
ADD CONSTRAINT fk_trades_purchased_signal 
FOREIGN KEY (purchased_signal_id) REFERENCES public.purchased_signals(id);