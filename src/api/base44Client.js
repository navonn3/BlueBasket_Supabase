import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68eae2c02e717028fc90ff6a", 
  requiresAuth: true // Ensure authentication is required for all operations
});
