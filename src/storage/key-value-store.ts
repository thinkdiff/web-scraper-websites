import { Actor } from 'apify';
import { RunSummary } from '../config/types.js';
import { appLogger } from '../utils/logger.js';

export async function saveRunSummary(summary: RunSummary): Promise<void> {
  appLogger.info('SUMMARY', 'Run summary report:', summary);

  try {
    await Actor.setValue('OUTPUT', summary);
    await Actor.setValue('RUN_SUMMARY', summary);
    appLogger.info('SUMMARY', 'Run summary saved to Key-Value Store.');
  } catch (err) {
    appLogger.warn('SUMMARY', 'Failed to save summary to Key-Value Store', err);
  }
}
