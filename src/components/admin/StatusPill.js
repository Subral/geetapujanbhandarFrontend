// Shared status pill for order rows — used by AdminDashboard (Recent Orders)
// and AdminOrders (Order table). Colors ported from the Stitch canvas;
// the source designs used differing invented statuses per screen
// ("Processing" vs "Pending", plus a "PROCESSING" that doesn't exist
// in the backend) — normalized here to the four real order_status
// values the API returns: pending | confirmed | shipped | delivered,
// plus cancelled.

const STATUS_STYLES = {
  pending:   { label: 'Pending',   bg: '#fed65b33', text: '#735c00' },
  confirmed: { label: 'Confirmed', bg: '#b7131a1a', text: '#b7131a' },
  shipped:   { label: 'Shipped',   bg: '#dbeafe',   text: '#1d4ed8' },
  delivered: { label: 'Delivered', bg: '#dcfce7',   text: '#15803d' },
  cancelled: { label: 'Cancelled', bg: '#ffdad6',   text: '#93000a' },
};

const StatusPill = ({ status, size = 'md' }) => {
  const style = STATUS_STYLES[status] || { label: status, bg: '#f0dfd9', text: '#5b403d' };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${sizeClasses}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
};

export default StatusPill;
