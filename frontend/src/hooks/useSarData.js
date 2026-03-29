import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * Fetches a SAR and its study plan versions in parallel.
 * Returns { sar, versions, loading, error, reload }.
 */
const useSarData = (sarId) => {
  const [sar, setSar] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!sarId) return;
    setLoading(true);
    setError('');
    try {
      const [sarResponse, versionsResponse] = await Promise.all([
        api.get(`/sars/${sarId}`),
        api.get(`/sars/${sarId}/study-plan/versions`),
      ]);
      setSar(sarResponse.data?.data || null);
      setVersions(versionsResponse.data?.data || []);
    } catch (err) {
      setError(err);
      setSar(null);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [sarId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { sar, versions, loading, error, reload };
};

export default useSarData;
