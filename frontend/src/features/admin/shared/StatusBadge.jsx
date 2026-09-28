import { Badge } from '../../../components/ui';
import { STATUS_TONES } from '../../../config';

export default function StatusBadge({ status, label }) {
  return <Badge tone={STATUS_TONES[status] || 'neutral'} dot>{label}</Badge>;
}
