const LOG_LEVEL = (process.env.DE_LOG_LEVEL || process.env.NEXT_PUBLIC_DE_LOG_LEVEL || 'info').toLowerCase();
if (!['info', 'error', 'warning', 'debug', 'off'].includes(LOG_LEVEL)) {
    throw new Error(`Undefined log level: ${LOG_LEVEL}`);
}

const shouldLog = (level: string) => {
    return level === LOG_LEVEL || LOG_LEVEL === 'debug';
}

export const logger = {
    info: shouldLog('info') ? console.info : () => { },
    error: !shouldLog('off') ? console.error : () => { },
    debug: shouldLog('debug') ? console.debug : () => { },
    warn: (shouldLog('info') || shouldLog('warning')) ? console.warn : () => { },
}