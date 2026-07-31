import { createNavigationContainerRef } from '@react-navigation/native';

// Global navigation ref so non-component code (push-notification tap handler in
// AuthContext) can route without a navigation prop.
export const navigationRef = createNavigationContainerRef<any>();
