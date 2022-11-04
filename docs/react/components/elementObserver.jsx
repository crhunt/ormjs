import { useEffect, useState } from 'react';

const DEFAULT_OPTIONS = {
    config: { attributes: true, childList: true, subtree: true },
};

export function useMutationObservable(targetEl, _callback, options = DEFAULT_OPTIONS) {
    const [observer, setObserver] = useState(null);
  
    useEffect(() => {
        if (observer) return;
        const obs = new MutationObserver(_callback);
        setObserver(obs);
    }, [_callback, options, setObserver]);
  
    useEffect(() => {
        if (!observer) return;
        if (! targetEl) return
        const { config } = options;
        observer.observe(targetEl, config);
        /*return () => {
            if (observer) {
            observer.disconnect();
            }
        };*/
    }, [observer, targetEl, options]);
}