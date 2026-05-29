/**
 * Reusable animated loading spinner.
 * @param {string}  size    - 'sm' | 'lg' (default: 'sm')
 * @param {string}  className - extra classes
 */
const Spinner = ({ size = 'sm', className = '' }) => {
  const cls = size === 'lg' ? 'spinner spinner-lg' : 'spinner';
  return <div className={`${cls} ${className}`} role="status" aria-label="Loading" />;
};

export default Spinner;
