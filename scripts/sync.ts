import { runScrape, runScrapeTm } from '../lib/scrapeRunner';

async function main() {
  console.log('=== Starting Footy Canada Tracker Sync ===');
  console.log('[1/2] Syncing FotMob player stats and recent match ratings...');
  const fotmobSuccess = await runScrape();
  if (!fotmobSuccess) {
    console.error('FotMob sync encountered errors.');
  }

  console.log('\n[2/2] Syncing Transfermarkt transfer rumours...');
  const tmSuccess = await runScrapeTm();
  if (!tmSuccess) {
    console.error('Transfermarkt sync encountered errors.');
  }

  console.log('\n=== Sync completed successfully! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
