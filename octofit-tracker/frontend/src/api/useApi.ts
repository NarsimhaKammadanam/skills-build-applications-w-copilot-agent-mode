import { useEffect, useState } from 'react';
import { getJson } from './client.js';

export function useApi<T>(path: string, load: (path: string) => Promise<T> = getJson) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    load(path).then((result) => {
      if (active) setData(result);
    }).catch((failure: unknown) => {
      if (active) setError(`Unable to load data: ${failure instanceof Error ? failure.message : 'Unknown error'}`);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [path, version, load]);

  return { data, loading, error, reload: () => setVersion((value) => value + 1) };
}
