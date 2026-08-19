import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Package } from 'lucide-react';
import StatusPill from '../components/StatusPill';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Restyled to storefront-shell/sf-* tokens. All real logic (fetchOrders)
// unchanged. Status icon/color switch statements replaced with the new
// shared StatusPill component — same one OrderDetail.js uses, so the
// two pages can't drift out of sync on what a given status looks like.

const Orders = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-3xl text-sf-primary">progress_activity</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="storefront-shell min-h-screen bg-sf-background flex flex-col items-center justify-center py-12 px-4 text-center animate-page-enter">
        <Package className="h-14 w-14 md:h-20 md:w-20 mb-4 text-sf-primary" />
        <h2 className="font-headline-lg text-xl md:text-3xl text-sf-primary mb-2">No orders yet</h2>
        <p className="text-sf-on-surface-variant mb-4 max-w-sm">Your order history will appear here once you place your first order.</p>
        <Link to="/products">
          <button className="px-6 py-3 md:px-8 md:py-4 rounded font-semibold text-sm md:text-base bg-sf-primary text-sf-on-primary hover:opacity-90" data-testid="start-shopping-button">
            Start Shopping
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="storefront-shell min-h-screen bg-sf-background py-6 md:py-12 px-4 pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-headline-lg text-2xl md:text-4xl text-sf-on-surface mb-4 md:mb-8 animate-page-enter">My Orders</h1>

        <div className="space-y-3 md:space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="sacred-card card-hover block rounded-xl p-4 md:p-6"
              data-testid={`order-${order.id}`}
            >
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div>
                  <p className="text-xs md:text-sm text-sf-on-surface-variant">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs md:text-sm text-sf-on-surface-variant">
                    Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <StatusPill status={order.order_status} />
              </div>

              <div className="space-y-2 mb-3 md:mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 md:gap-4">
                    <img loading="lazy" src={item.image} alt={item.name} className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base text-sf-on-surface line-clamp-1">{item.name}</p>
                      <p className="text-xs md:text-sm text-sf-on-surface-variant">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-sm md:text-base text-sf-primary">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-sf-outline-variant">
                <span className="font-medium text-sm md:text-base text-sf-on-surface">Total Amount</span>
                <span className="text-lg md:text-2xl font-bold text-sf-primary">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;
