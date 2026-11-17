import { label } from '../utils.js';

export const SeverityBadge = ({ value }) => <span className={`badge sev-${value}`}>{label(value)}</span>;
export const StatusBadge = ({ value }) => <span className={`badge st-${value}`}>{label(value)}</span>;
