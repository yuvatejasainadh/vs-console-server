import { seedDevelopmentData } from '../src/database/seed';
import { Logger } from '../src/common/logger';

export { seedDevelopmentData };

if (require.main === module) {
  seedDevelopmentData().then(() => {
    Logger.info('Successfully seeded development data for VoiceShield Console');
  });
}
