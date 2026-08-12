import { useEffect, useState } from 'react';
import { healthApi } from '../services/api/healthApi';

export function useHealth() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void healthApi.get()
      .then((response) => {
        if (isCurrent) setIsOnline(response.status === 'ok' && response.valhalla === 'available');
      })
      .catch(() => {
        if (isCurrent) setIsOnline(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  return isOnline;
}
