import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Product, useCartStore } from '@/store/cartStore';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

const ProductCard = ({ product }: { product: Product }) => {
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast.success(`${product.name} añadido al carrito`);
    setCartOpen(true);
  };

  return (
    <Link to={`/producto/${product.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      <div className="overflow-hidden rounded-2xl bg-card transition-all duration-300 hover:shadow-elevated border border-border/40">
        <div className="relative overflow-hidden aspect-[4/3]">
          {product.requiresAdvanceNotice && (
            <div className="absolute top-3 right-3 z-10 bg-amber-500 text-white text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full shadow-md">
              Aviso 24h
            </div>
          )}
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        </div>

        <div className="p-5">
          <h3 className="font-display text-lg text-foreground leading-tight">{product.name}</h3>
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{product.description}</p>
          <div className="flex items-center justify-between mt-4">
            <p className="text-primary font-bold text-lg dark:text-primary-foreground/90">{formatPrice(product.price)}</p>
            <motion.button
              onClick={handleAdd}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold shadow-sm hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Añadir ${product.name} al carrito`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Pedir
            </motion.button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
