
-- The INSERT policies with WITH CHECK (true) on orders and quotations are intentional
-- since unauthenticated customers need to create these records.
-- Let's add column-level restrictions to mitigate abuse:
-- Orders: customers can only insert with 'pending' status
DROP POLICY "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders with pending status" ON public.orders
  FOR INSERT WITH CHECK (status = 'pending');

-- Quotations: customers can only insert with 'pending' status
DROP POLICY "Anyone can create quotations" ON public.quotations;
CREATE POLICY "Anyone can create quotations with pending status" ON public.quotations
  FOR INSERT WITH CHECK (status = 'pending');
