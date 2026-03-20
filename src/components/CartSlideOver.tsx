import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useSedes } from '@/hooks/useSedes';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

const CartSlideOver = () => {
  const { items, isOpen, setCartOpen, updateQuantity, removeItem, totalPrice } = useCartStore();
  const navigate = useNavigate();
  const { tiendas } = useSedes();
  const whatsappNum = tiendas[0]?.whatsapp || '573158924567';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-md max-w-[100vw] bg-card border-l shadow-elevated flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-display text-xl flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Tu Pedido
              </h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-full hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="Cerrar carrito"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <ShoppingCart className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-medium text-foreground">Tu carrito está vacío</p>
                <p className="text-sm mt-1.5">Explora nuestro menú y añade tus delicias favoritas.</p>
              </div>
            ) : (
              <>
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-2" 
                  aria-live="polite" 
                  aria-atomic="true"
                >
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.product.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="flex gap-3 p-3 bg-background rounded-xl border"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                          <p className="text-primary font-bold text-sm">{formatPrice(item.product.price * item.quantity)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary hover:bg-muted transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary hover:bg-muted transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeItem(item.product.id)}
                              className="ml-auto p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="border-t p-5 space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total estimado</span>
                    <span className="text-2xl font-display font-bold text-primary">{formatPrice(totalPrice())}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Completa tus datos para confirmar el pedido</p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setCartOpen(false); navigate('/checkout'); }}
                    className="w-full py-3.5 rounded-xl bg-gradient-gold font-semibold text-primary-foreground text-sm shadow-gold hover:shadow-elevated transition-shadow"
                  >
                    Finalizar Compra →
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSlideOver;