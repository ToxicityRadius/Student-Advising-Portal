export const NOTIFICATION_FALLBACK_PATH = '/notifications';

export function getNotificationTargetPath(notification) {
  const rawPath =
    typeof notification?.targetPath === 'string' ? notification.targetPath.trim() : '';

  if (rawPath && rawPath.length <= 512 && rawPath.startsWith('/') && !rawPath.startsWith('//')) {
    return rawPath;
  }

  return NOTIFICATION_FALLBACK_PATH;
}
