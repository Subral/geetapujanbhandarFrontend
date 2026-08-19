// Shared order-status badge for the storefront — used by Orders.js and
// OrderDetail.js so the status colors/labels are defined exactly once,
// not duplicated between the two (the admin console has its own
// equivalent under components/admin/StatusPill.js, scoped to adm-*
// tokens; this is the sf-* counterpart for customer-facing pages).
//
// Matches the four real order_status values the API returns
// (pending | confirmed | shipped | delivered) plus cancelled.

const STATUS_STYLES = {
  pending:   { label: 'Pending',   bg: 'bg-sf-secondary-container/40', text: 'text-sf-secondary' },
  confirmed: { label: 'Confirmed', bg: 'bg-sf-primary-container/10',   text: 'text-sf-primary' },
  shipped:   { label: 'Shipped',   bg: 'bg-blue-100',                 text: 'text-blue-700' },
  delivered: { label: 'Delivered', bg: 'bg-green-100',                text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',                  text: 'text-red-700' },
};

const StatusPill = ({ status, size = 'md' }) => {
  const style = STATUS_STYLES[status] || { label: status, bg: 'bg-sf-surface-container-low', text: 'text-sf-on-surface-variant' };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs md:text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-bold capitalize ${sizeClasses} ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

export default StatusPill;
