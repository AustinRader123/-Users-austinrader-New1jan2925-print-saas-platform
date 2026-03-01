import { providerMode } from '../../config/providers.js';
import { NotificationProvider } from './NotificationProvider.js';
import MockNotificationProvider from './mock/MockNotificationProvider.js';
import RealNotificationProvider from './real/RealNotificationProvider.js';

export function getNotificationProvider(): NotificationProvider {
  if (providerMode.notifications === 'real') {
    return new RealNotificationProvider();
  }
  return new MockNotificationProvider();
}
