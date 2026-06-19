// Centralized backend configuration for the C# .NET Web API
// This dynamically checks the environment variable VITE_API_BASE_URL at build time
// or falls back to a relative path '/api' for easy Docker proxy configuration.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
