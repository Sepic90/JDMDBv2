import { Check, X } from 'lucide-react';

export default function Toast({ message, type }) {
  return (
    <div className={`toast ${type}`}>
      {type === 'success' ? <Check /> : <X />}
      {message}
    </div>
  );
}
